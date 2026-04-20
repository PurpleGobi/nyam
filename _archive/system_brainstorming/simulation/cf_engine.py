"""Nyam CF 점수 체계 — 계산 엔진

PRD §3 기반. 적합도, 신뢰도, Nyam 점수, 예측 확신도, 버블 점수를 계산한다.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from cf_models import (
    Category, Relation, QuadrantScore, Record, DEFAULT_BOOST,
)
from cf_data_generator import GeneratedData


@dataclass
class SimilarityResult:
    """두 유저 간 적합도 + 신뢰도"""
    similarity: float    # 0~1 (적합도)
    confidence: float    # 0~1 (신뢰도)
    n_overlap: int       # 겹치는 기록 수

    @property
    def weight(self) -> float:
        return self.similarity * self.confidence


@dataclass
class PredictionResult:
    """한 아이템에 대한 예측 결과"""
    predicted_x: float
    predicted_y: float
    prediction_confidence: float  # 예측 확신도
    n_raters: int                 # 평가자 수
    method: str                   # 사용된 방식

    @property
    def predicted_satisfaction(self) -> float:
        return (self.predicted_x + self.predicted_y) / 2.0


class CFEngine:
    """Collaborative Filtering 계산 엔진"""

    def __init__(
        self,
        data: GeneratedData,
        D: float = 6.0,
        lam: float = 7.0,
        boost: dict[Relation, float] | None = None,
    ):
        self.data = data
        self.D = D
        self.lam = lam
        self.boost = boost or dict(DEFAULT_BOOST)
        # 캐시: (user_a, user_b, category) → SimilarityResult
        self._sim_cache: dict[tuple[str, str, Category], SimilarityResult] = {}

    # ─── 적합도 (Similarity) ───

    def similarity(
        self,
        user_a: str,
        user_b: str,
        category: Category,
        use_mean_centering: bool = True,
    ) -> SimilarityResult:
        """두 유저 간 적합도 + 신뢰도 계산 (2D 유클리드 거리 기반)."""
        cache_key = (user_a, user_b, category)
        if cache_key in self._sim_cache:
            return self._sim_cache[cache_key]

        overlapping = self.data.overlapping_items(user_a, user_b, category)
        n = len(overlapping)

        if n == 0:
            result = SimilarityResult(similarity=0.0, confidence=0.0, n_overlap=0)
            self._sim_cache[cache_key] = result
            return result

        # 유저별 기록 맵
        recs_a = {r.item_id: r.score for r in self.data.user_records(user_a, category)}
        recs_b = {r.item_id: r.score for r in self.data.user_records(user_b, category)}

        if use_mean_centering:
            mean_a = self._user_mean(user_a, category)
            mean_b = self._user_mean(user_b, category)
        else:
            mean_a = QuadrantScore(0.0, 0.0)
            mean_b = QuadrantScore(0.0, 0.0)

        # 2D 유클리드 거리 계산
        distances = []
        for item_id in overlapping:
            sa, sb = recs_a[item_id], recs_b[item_id]
            dx = (sa.x - mean_a.x) - (sb.x - mean_b.x)
            dy = (sa.y - mean_a.y) - (sb.y - mean_b.y)
            dist = math.sqrt(dx * dx + dy * dy)
            distances.append(dist)

        avg_dist = sum(distances) / len(distances)
        sim = max(0.0, 1.0 - avg_dist / self.D)
        conf = n / (n + self.lam)

        result = SimilarityResult(similarity=sim, confidence=conf, n_overlap=n)
        self._sim_cache[cache_key] = result
        # 대칭 캐시
        self._sim_cache[(user_b, user_a, category)] = result
        return result

    def _user_mean(self, user_id: str, category: Category) -> QuadrantScore:
        """유저의 평균 2D 점수 (mean-centering 용)."""
        recs = self.data.user_records(user_id, category)
        if not recs:
            return QuadrantScore(5.0, 5.0)
        mean_x = sum(r.score.x for r in recs) / len(recs)
        mean_y = sum(r.score.y for r in recs) / len(recs)
        return QuadrantScore(mean_x, mean_y)

    # ─── Nyam 점수 (CF 예측) ───

    def predict(
        self,
        user_id: str,
        item_id: str,
        category: Category,
        scope_user_ids: list[str] | None = None,
    ) -> PredictionResult | None:
        """CF 기반 예측. scope_user_ids가 주어지면 해당 유저만으로 예측 (버블 점수).

        Returns None if no raters available.
        """
        # 해당 아이템의 기록자 목록
        item_recs = self.data.item_records(item_id)
        raters = [r for r in item_recs if r.user_id != user_id]

        if scope_user_ids is not None:
            scope_set = set(scope_user_ids)
            raters = [r for r in raters if r.user_id in scope_set]

        if not raters:
            return None

        my_mean = self._user_mean(user_id, category)

        weighted_dx_sum = 0.0
        weighted_dy_sum = 0.0
        weight_abs_sum = 0.0
        weights_for_confidence: list[float] = []
        deviations_x: list[float] = []  # V5: mean-centered 편차
        deviations_y: list[float] = []

        for rec in raters:
            sim_result = self.similarity(user_id, rec.user_id, category)
            relation = self.data.get_relation(user_id, rec.user_id)
            boost = self.boost.get(relation, 1.0)

            w = sim_result.similarity * sim_result.confidence * boost
            if w < 1e-9:
                continue

            rater_mean = self._user_mean(rec.user_id, category)
            dx = rec.score.x - rater_mean.x
            dy = rec.score.y - rater_mean.y

            weighted_dx_sum += w * dx
            weighted_dy_sum += w * dy
            weight_abs_sum += abs(w)
            weights_for_confidence.append(w)
            deviations_x.append(dx)  # V5: 원래 점수가 아니라 편차
            deviations_y.append(dy)

        if weight_abs_sum < 1e-9:
            return None

        pred_x = my_mean.x + weighted_dx_sum / weight_abs_sum
        pred_y = my_mean.y + weighted_dy_sum / weight_abs_sum

        # 0~10 클램프
        pred_x = max(0.0, min(10.0, pred_x))
        pred_y = max(0.0, min(10.0, pred_y))

        # 예측 확신도 계산 (V5: mean-centered 편차 기반)
        pred_conf = self._prediction_confidence(
            weights_for_confidence, deviations_x, deviations_y,
        )

        method = "bubble_cf" if scope_user_ids is not None else "nyam_cf"

        return PredictionResult(
            predicted_x=round(pred_x, 2),
            predicted_y=round(pred_y, 2),
            prediction_confidence=round(pred_conf, 3),
            n_raters=len(weights_for_confidence),
            method=method,
        )

    def predict_simple_avg(
        self,
        item_id: str,
        exclude_user_id: str | None = None,
    ) -> PredictionResult | None:
        """단순 산술평균 (네이버 방식). CF 비교용."""
        item_recs = self.data.item_records(item_id)
        raters = [r for r in item_recs if r.user_id != exclude_user_id]
        if not raters:
            return None
        avg_x = sum(r.score.x for r in raters) / len(raters)
        avg_y = sum(r.score.y for r in raters) / len(raters)
        return PredictionResult(
            predicted_x=round(avg_x, 2),
            predicted_y=round(avg_y, 2),
            prediction_confidence=min(1.0, len(raters) / 20.0),
            n_raters=len(raters),
            method="simple_avg",
        )

    def predict_1d_cf(
        self,
        user_id: str,
        item_id: str,
        category: Category,
    ) -> PredictionResult | None:
        """1D 만족도만으로 CF (2D 비교용)."""
        item_recs = self.data.item_records(item_id)
        raters = [r for r in item_recs if r.user_id != user_id]
        if not raters:
            return None

        # 1D 적합도: 만족도 기반
        my_recs = self.data.user_records(user_id, category)
        my_mean_sat = sum(r.score.satisfaction for r in my_recs) / len(my_recs) if my_recs else 5.0

        weighted_sum = 0.0
        weight_abs_sum = 0.0

        for rec in raters:
            # 1D 적합도 계산
            overlap = self.data.overlapping_items(user_id, rec.user_id, category)
            n = len(overlap)
            if n == 0:
                continue
            my_rec_map = {r.item_id: r.score for r in self.data.user_records(user_id, category)}
            their_rec_map = {r.item_id: r.score for r in self.data.user_records(rec.user_id, category)}

            my_sat_mean = sum(my_rec_map[i].satisfaction for i in overlap) / n
            their_sat_mean = sum(their_rec_map[i].satisfaction for i in overlap) / n

            diffs = [abs((my_rec_map[i].satisfaction - my_sat_mean) - (their_rec_map[i].satisfaction - their_sat_mean)) for i in overlap]
            avg_diff = sum(diffs) / len(diffs)
            sim_1d = max(0.0, 1.0 - avg_diff / (self.D / 2))  # 1D이므로 D 절반
            conf = n / (n + self.lam)

            relation = self.data.get_relation(user_id, rec.user_id)
            boost = self.boost.get(relation, 1.0)
            w = sim_1d * conf * boost
            if w < 1e-9:
                continue

            rater_mean_sat = sum(their_rec_map[i].satisfaction for i in their_rec_map) / len(their_rec_map) if their_rec_map else 5.0
            weighted_sum += w * (rec.score.satisfaction - rater_mean_sat)
            weight_abs_sum += abs(w)

        if weight_abs_sum < 1e-9:
            return None

        pred_sat = my_mean_sat + weighted_sum / weight_abs_sum
        pred_sat = max(0.0, min(10.0, pred_sat))
        return PredictionResult(
            predicted_x=round(pred_sat, 2),
            predicted_y=round(pred_sat, 2),
            prediction_confidence=0.5,
            n_raters=len(raters),
            method="1d_cf",
        )

    # ─── 예측 확신도 ───

    def _prediction_confidence(
        self,
        weights: list[float],
        dev_x: list[float],
        dev_y: list[float],
    ) -> float:
        """V5: 예측 확신도. mean-centered 편차 기반.

        핵심 아이디어: 평가자들의 편차(dx, dy)가 비슷하면
        "같은 방향을 가리키고 있다" → 예측이 정확할 가능성 높음.
        편차가 제각각이면 → 예측이 불안정.
        """
        if not weights:
            return 0.0

        n = len(weights)
        w_arr = np.array(weights)
        total_weight = float(w_arr.sum())
        if total_weight < 1e-9:
            return 0.0

        w_norm = w_arr / total_weight

        # V5c: 유효 평가자 수 — 7명이면 0.5 (λ=7과 일치)
        effective_n = sum(1 for w in weights if w > 0.05)
        n_factor = effective_n / (effective_n + 7.0)

        # 요소 2: 편차의 가중 표준편차 (작을수록 일치 → 정확)
        # 이게 핵심 — 원래 점수가 아니라 mean-centered 편차의 분산
        if n > 1:
            wmean_dx = float(np.average(dev_x, weights=w_norm))
            wmean_dy = float(np.average(dev_y, weights=w_norm))
            wvar_dx = float(np.average((np.array(dev_x) - wmean_dx) ** 2, weights=w_norm))
            wvar_dy = float(np.average((np.array(dev_y) - wmean_dy) ** 2, weights=w_norm))
            wstd = float(np.sqrt((wvar_dx + wvar_dy) / 2.0))
            # 편차 std 0 → 완전 일치(1.0), std 2+ → 불일치(0)
            agreement = max(0.0, 1.0 - wstd / 2.0)
        else:
            agreement = 0.15  # 1명이면 매우 낮은 일치도

        # 요소 3: 가중치 품질 (평균 가중치 — 적합도×신뢰도가 높은 유저가 많은가)
        avg_weight = total_weight / n
        quality = avg_weight / (avg_weight + 0.3)  # 0.3에서 0.5

        # V5c: 평가자 수를 주요 드라이버로 (소수 평가자 → 낮은 확신도)
        conf = n_factor * 0.50 + agreement * 0.35 + quality * 0.15

        return max(0.0, min(1.0, conf))

    # ─── 버블 점수 ───

    def predict_bubble(
        self,
        user_id: str,
        item_id: str,
        category: Category,
        bubble_member_ids: list[str],
    ) -> PredictionResult | None:
        """버블 점수 = 버블 멤버로 스코프 한정한 CF."""
        return self.predict(user_id, item_id, category, scope_user_ids=bubble_member_ids)

    # ─── 유틸리티 ───

    def clear_cache(self):
        self._sim_cache.clear()

    def mae(
        self,
        predictions: list[tuple[QuadrantScore, PredictionResult]],
    ) -> dict[str, float]:
        """MAE 계산. (실제, 예측) 쌍의 리스트를 받아 MAE_x, MAE_y, MAE_sat, dist_2d를 반환."""
        if not predictions:
            return {"mae_x": 0, "mae_y": 0, "mae_sat": 0, "dist_2d": 0, "n": 0}

        errs_x, errs_y, errs_sat, dists = [], [], [], []
        for actual, pred in predictions:
            errs_x.append(abs(actual.x - pred.predicted_x))
            errs_y.append(abs(actual.y - pred.predicted_y))
            errs_sat.append(abs(actual.satisfaction - pred.predicted_satisfaction))
            d = math.sqrt((actual.x - pred.predicted_x)**2 + (actual.y - pred.predicted_y)**2)
            dists.append(d)

        return {
            "mae_x": round(sum(errs_x) / len(errs_x), 3),
            "mae_y": round(sum(errs_y) / len(errs_y), 3),
            "mae_sat": round(sum(errs_sat) / len(errs_sat), 3),
            "dist_2d": round(sum(dists) / len(dists), 3),
            "n": len(predictions),
        }
