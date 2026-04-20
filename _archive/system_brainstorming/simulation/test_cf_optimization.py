"""T11: 속도 최적화 전략 검증

3단계 필터링의 정확도 손실 + 속도 개선을 측정한다.
- 1단계: 겹침 0 드랍
- 2단계: 최소 겹침 필터 (min_overlap)
- 3단계: Top-K (가중치 상위 K명만)

목표:
- 단건 예측: < 10ms (기록자 1,000명+ 환경)
- 20건 피드: < 200ms
- 정확도 손실: MAE 증가 < 0.5점 (100점 만점)
"""

from __future__ import annotations

import os
import time
from datetime import datetime

import numpy as np

from cf_models import Category, Relation, QuadrantScore, Record
from cf_data_generator import generate_all, GeneratedData
from cf_engine import CFEngine


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _header(title: str) -> str:
    return f"\n{'='*60}\n  {title}\n{'='*60}\n"


class OptimizedCFEngine(CFEngine):
    """최적화된 CF 엔진. 3단계 필터링 적용."""

    def __init__(
        self,
        data: GeneratedData,
        min_overlap: int = 0,
        top_k: int = 0,
        **kwargs,
    ):
        super().__init__(data, **kwargs)
        self.min_overlap = min_overlap  # 0이면 비활성
        self.top_k = top_k              # 0이면 비활성
        self.stats = {"total_raters": 0, "after_overlap_filter": 0, "after_topk": 0}

    def predict(self, user_id, item_id, category, scope_user_ids=None):
        """최적화된 predict. 필터링 단계를 적용."""
        item_recs = self.data.item_records(item_id)
        raters = [r for r in item_recs if r.user_id != user_id]
        if scope_user_ids is not None:
            scope_set = set(scope_user_ids)
            raters = [r for r in raters if r.user_id in scope_set]

        if not raters:
            return None

        self.stats["total_raters"] += len(raters)

        # 1단계 + 2단계: 겹침 필터
        if self.min_overlap > 0:
            filtered = []
            for rec in raters:
                n_overlap = len(self.data.overlapping_items(user_id, rec.user_id, category))
                if n_overlap >= self.min_overlap:
                    filtered.append(rec)
            raters = filtered
        else:
            # 최소한 겹침 0은 드랍 (가중치 0이므로)
            filtered = []
            for rec in raters:
                n_overlap = len(self.data.overlapping_items(user_id, rec.user_id, category))
                if n_overlap > 0:
                    filtered.append(rec)
            raters = filtered

        self.stats["after_overlap_filter"] += len(raters)

        if not raters:
            return None

        # 3단계: Top-K (가중치 기준)
        if self.top_k > 0 and len(raters) > self.top_k:
            scored = []
            for rec in raters:
                sim = self.similarity(user_id, rec.user_id, category)
                relation = self.data.get_relation(user_id, rec.user_id)
                boost = self.boost.get(relation, 1.0)
                w = sim.similarity * sim.confidence * boost
                scored.append((w, rec))
            scored.sort(key=lambda x: x[0], reverse=True)
            raters = [rec for _, rec in scored[:self.top_k]]

        self.stats["after_topk"] += len(raters)

        # 이하 기존 predict 로직
        my_mean = self._user_mean(user_id, category)
        weighted_dx_sum = 0.0
        weighted_dy_sum = 0.0
        weight_abs_sum = 0.0
        weights_for_confidence = []
        deviations_x = []
        deviations_y = []

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
            deviations_x.append(dx)
            deviations_y.append(dy)

        if weight_abs_sum < 1e-9:
            return None

        from cf_engine import PredictionResult
        pred_x = max(0.0, min(10.0, my_mean.x + weighted_dx_sum / weight_abs_sum))
        pred_y = max(0.0, min(10.0, my_mean.y + weighted_dy_sum / weight_abs_sum))
        pred_conf = self._prediction_confidence(weights_for_confidence, deviations_x, deviations_y)

        return PredictionResult(
            predicted_x=round(pred_x, 2),
            predicted_y=round(pred_y, 2),
            prediction_confidence=round(pred_conf, 3),
            n_raters=len(weights_for_confidence),
            method="optimized_cf",
        )

    def reset_stats(self):
        self.stats = {"total_raters": 0, "after_overlap_filter": 0, "after_topk": 0}


def _measure_holdout(data, engine, category=None):
    holdout = [r for r in data.records if r.is_holdout]
    if category:
        holdout = [r for r in holdout if r.category == category]
    clean_ids = {u.id for u in data.clean_users()}
    holdout = [r for r in holdout if r.user_id in clean_ids]

    predictions = []
    for rec in holdout:
        pred = engine.predict(rec.user_id, rec.item_id, rec.category)
        if pred:
            predictions.append((rec.score, pred))
    return engine.mae(predictions)


# ─── T11-A: 필터링 단계별 정확도 손실 ───

def test_t11a_accuracy_loss(report: list[str]):
    report.append(_header("T11-A: 필터링 단계별 정확도 손실 (100점 만점 기준)"))

    data = generate_all(n_users=100, holdout_ratio=0.2, seed=42)

    # 기준선: 필터 없음
    baseline_engine = CFEngine(data)
    baseline_mae = _measure_holdout(data, baseline_engine)

    configs = [
        ("기준선 (필터 없음)", 0, 0),
        ("겹침 ≥1 (0 드랍)", 1, 0),
        ("겹침 ≥3", 3, 0),
        ("겹침 ≥5", 5, 0),
        ("겹침 ≥7", 7, 0),
        ("겹침 ≥3 + Top-100", 3, 100),
        ("겹침 ≥3 + Top-50", 3, 50),
        ("겹침 ≥3 + Top-30", 3, 30),
        ("겹침 ≥3 + Top-20", 3, 20),
        ("겹침 ≥3 + Top-10", 3, 10),
        ("겹침 ≥5 + Top-50", 5, 50),
        ("겹침 ≥5 + Top-30", 5, 30),
        ("겹침 ≥5 + Top-20", 5, 20),
    ]

    report.append(f"{'설정':<25} {'MAE_sat':>8} {'×10':>6} {'손실':>8} {'예측수':>6} {'평균평가자':>10}")
    report.append("-" * 70)

    for name, min_ov, top_k in configs:
        if name == "기준선 (필터 없음)":
            engine = CFEngine(data)
        else:
            engine = OptimizedCFEngine(data, min_overlap=min_ov, top_k=top_k)

        engine_for_stats = engine if isinstance(engine, OptimizedCFEngine) else None
        if engine_for_stats:
            engine_for_stats.reset_stats()

        mae = _measure_holdout(data, engine)
        mae_100 = mae['mae_sat'] * 10  # 100점 스케일
        loss = mae_100 - baseline_mae['mae_sat'] * 10

        if engine_for_stats and engine_for_stats.stats["total_raters"] > 0:
            n_preds = mae['n']
            avg_raters = engine_for_stats.stats["after_topk"] / n_preds if n_preds > 0 else 0
        else:
            avg_raters = 0

        report.append(
            f"{name:<25} {mae['mae_sat']:>8.3f} {mae_100:>6.1f} {loss:>+7.1f}{'점':>1} {mae['n']:>6d} {avg_raters:>9.1f}"
        )

    report.append(f"\n목표: 손실 < 0.5점 (100점 만점)")


# ─── T11-B: 대규모 데이터 속도 테스트 ───

def test_t11b_speed_at_scale(report: list[str]):
    report.append(_header("T11-B: 대규모 데이터 속도 테스트"))

    for n_users, label in [(200, "200명"), (500, "500명"), (1000, "1,000명")]:
        data = generate_all(n_users=n_users, seed=42)

        test_user = data.clean_users()[0]
        test_items = data.restaurants[:20]

        configs = [
            ("필터 없음", CFEngine(data)),
            ("겹침≥3", OptimizedCFEngine(data, min_overlap=3)),
            ("겹침≥3+Top50", OptimizedCFEngine(data, min_overlap=3, top_k=50)),
            ("겹침≥3+Top30", OptimizedCFEngine(data, min_overlap=3, top_k=30)),
            ("겹침≥5+Top30", OptimizedCFEngine(data, min_overlap=5, top_k=30)),
        ]

        report.append(f"\n--- {label} ---")
        report.append(f"{'설정':<20} {'단건 평균':>10} {'20건 합계':>10} {'단건 목표':>10}")
        report.append("-" * 55)

        for name, engine in configs:
            # 워밍업
            engine.predict(test_user.id, test_items[0].id, Category.RESTAURANT)
            engine.clear_cache()

            # 20건 측정
            times = []
            for item in test_items:
                start = time.perf_counter()
                engine.predict(test_user.id, item.id, Category.RESTAURANT)
                elapsed = (time.perf_counter() - start) * 1000
                times.append(elapsed)

            avg_ms = sum(times) / len(times)
            total_ms = sum(times)
            ok = "✅" if avg_ms < 10 else "⚠️" if avg_ms < 50 else "❌"

            report.append(f"{name:<20} {avg_ms:>8.1f}ms {total_ms:>8.1f}ms {ok:>10}")

    report.append(f"\n목표: 단건 < 10ms, 20건 < 200ms")


# ─── T11-C: Top-K의 커버리지 영향 ───

def test_t11c_coverage(report: list[str]):
    report.append(_header("T11-C: Top-K 커버리지 (점수를 보여줄 수 있는 비율)"))

    data = generate_all(n_users=100, holdout_ratio=0.2, seed=42)
    clean_ids = {u.id for u in data.clean_users()}
    holdout = [r for r in data.records if r.is_holdout and r.user_id in clean_ids]

    configs = [
        ("기준선", CFEngine(data)),
        ("겹침≥1", OptimizedCFEngine(data, min_overlap=1)),
        ("겹침≥3", OptimizedCFEngine(data, min_overlap=3)),
        ("겹침≥5", OptimizedCFEngine(data, min_overlap=5)),
        ("겹침≥3+Top50", OptimizedCFEngine(data, min_overlap=3, top_k=50)),
        ("겹침≥3+Top30", OptimizedCFEngine(data, min_overlap=3, top_k=30)),
        ("겹침≥5+Top30", OptimizedCFEngine(data, min_overlap=5, top_k=30)),
    ]

    report.append(f"{'설정':<20} {'예측 성공':>8} {'전체':>6} {'커버리지':>8}")
    report.append("-" * 45)

    for name, engine in configs:
        success = 0
        for rec in holdout:
            pred = engine.predict(rec.user_id, rec.item_id, rec.category)
            if pred:
                success += 1
        coverage = success / len(holdout) * 100
        report.append(f"{name:<20} {success:>8d} {len(holdout):>6d} {coverage:>7.1f}%")


# ─── T11-D: 기록자 수별 최적 설정 탐색 ───

def test_t11d_optimal_per_rater_count(report: list[str]):
    report.append(_header("T11-D: 기록자 수별 필터링 효과"))

    data = generate_all(n_users=500, seed=42)
    test_user = data.clean_users()[0]

    # 기록자 수별로 식당을 분류
    buckets: dict[str, list] = {
        "1~10명": [], "11~30명": [], "31~50명": [],
        "51~100명": [], "100+명": [],
    }

    for rest in data.restaurants:
        recs = data.item_records(rest.id)
        n = len(recs)
        if n <= 10:
            buckets["1~10명"].append(rest)
        elif n <= 30:
            buckets["11~30명"].append(rest)
        elif n <= 50:
            buckets["31~50명"].append(rest)
        elif n <= 100:
            buckets["51~100명"].append(rest)
        else:
            buckets["100+명"].append(rest)

    report.append(f"{'기록자 수':<12} {'식당 수':>6} {'필터없음':>10} {'겹침≥3':>10} {'겹침≥3+T30':>12}")
    report.append("-" * 55)

    for bucket_name, restaurants in buckets.items():
        if not restaurants:
            report.append(f"{bucket_name:<12} {'0':>6}")
            continue

        samples = restaurants[:10]

        engines = {
            "필터없음": CFEngine(data),
            "겹침≥3": OptimizedCFEngine(data, min_overlap=3),
            "겹침≥3+T30": OptimizedCFEngine(data, min_overlap=3, top_k=30),
        }

        times_by_engine = {k: [] for k in engines}
        for rest in samples:
            for ename, engine in engines.items():
                engine.clear_cache()
                start = time.perf_counter()
                engine.predict(test_user.id, rest.id, Category.RESTAURANT)
                elapsed = (time.perf_counter() - start) * 1000
                times_by_engine[ename].append(elapsed)

        t1 = np.mean(times_by_engine["필터없음"])
        t2 = np.mean(times_by_engine["겹침≥3"])
        t3 = np.mean(times_by_engine["겹침≥3+T30"])
        report.append(
            f"{bucket_name:<12} {len(restaurants):>6d} {t1:>8.1f}ms {t2:>8.1f}ms {t3:>10.1f}ms"
        )


# ─── 메인 ───

def main():
    report: list[str] = []
    report.append(f"Nyam CF 시뮬레이션 — T11: 속도 최적화 전략 검증")
    report.append(f"실행: {_timestamp()}")
    report.append(f"\n목표: 단건 < 10ms, 20건 피드 < 200ms, 정확도 손실 < 0.5점 (100점 만점)")

    test_t11a_accuracy_loss(report)
    test_t11b_speed_at_scale(report)
    test_t11c_coverage(report)
    test_t11d_optimal_per_rater_count(report)

    # 결론
    report.append(_header("결론"))
    report.append("위 결과를 기반으로 최적 설정을 확정한다.")
    report.append("정확도 손실 < 0.5점 & 속도 목표 달성하는 가장 공격적인 필터를 선택.")

    output = "\n".join(report)
    print(output)

    os.makedirs("REPORTS", exist_ok=True)
    filename = f"REPORTS/test_cf_optimization_{_timestamp()}.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(output)
    print(f"\n→ 저장: {filename}")


if __name__ == "__main__":
    main()
