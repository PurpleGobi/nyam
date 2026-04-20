"""T9: 오염 내성 테스트 (★ 최우선)

T9-A: 오염 유형별 영향 측정
T9-B: CF vs 단순 평균 방어력 비교 (핵심)
T9-C: 오염원 적합도 자동 필터링
T9-D: 팔로우/언팔 방어 효과
T9-E: 오염 비율 한계점
"""

from __future__ import annotations

import sys
import os
from datetime import datetime

import numpy as np

from cf_models import Category, PollutionType, Relation, QuadrantScore
from cf_data_generator import GeneratedData, generate_all
from cf_engine import CFEngine


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _header(title: str) -> str:
    return f"\n{'='*60}\n  {title}\n{'='*60}\n"


# ─── T9-A: 오염 유형별 영향 측정 ───

def test_t9a_pollution_types(report: list[str]):
    report.append(_header("T9-A: 오염 유형별 영향 측정"))

    # 기준선: 오염 없는 데이터
    clean_data = generate_all(n_users=100, holdout_ratio=0.2, seed=42)
    clean_engine = CFEngine(clean_data)
    clean_mae = _measure_holdout_mae(clean_data, clean_engine)
    report.append(f"기준선 MAE (오염 없음): {clean_mae}")

    # 5개 오염 유형 테스트
    target_ids = [f"R{i:03d}" for i in range(5)]  # 처음 5개 식당을 타겟

    pollution_configs = [
        ("랜덤 노이즈", [(PollutionType.RANDOM, 10, None)]),
        ("광고성 조작", [(PollutionType.AD_BOOST, 10, target_ids)]),
        ("악의적 폄하", [(PollutionType.MALICIOUS, 10, target_ids)]),
        ("집단 조작", [(PollutionType.COORDINATED, 10, target_ids)]),
        ("은밀한 조작", [(PollutionType.SUBTLE, 10, None)]),
    ]

    for name, config in pollution_configs:
        data = generate_all(n_users=100, holdout_ratio=0.2, pollution_config=config, seed=42)
        engine = CFEngine(data)
        mae = _measure_holdout_mae(data, engine, clean_users_only=True)
        report.append(f"\n[{name}] 오염 10명 추가")
        report.append(f"  정직한 유저 MAE: {mae}")
        report.append(f"  MAE 증가: sat +{mae['mae_sat'] - clean_mae['mae_sat']:.3f}")

        # 타겟 식당 점수 왜곡 측정
        if target_ids and config[0][0] in (PollutionType.AD_BOOST, PollutionType.MALICIOUS, PollutionType.COORDINATED):
            _measure_target_distortion(data, engine, clean_data, clean_engine, target_ids, name, report)


def _measure_target_distortion(
    polluted_data: GeneratedData,
    polluted_engine: CFEngine,
    clean_data: GeneratedData,
    clean_engine: CFEngine,
    target_ids: list[str],
    label: str,
    report: list[str],
):
    """타겟 식당의 점수 왜곡 측정"""
    clean_user = clean_data.clean_users()[0]
    distortions = []
    for tid in target_ids:
        pred_clean = clean_engine.predict(clean_user.id, tid, Category.RESTAURANT)
        pred_polluted = polluted_engine.predict(clean_user.id, tid, Category.RESTAURANT)
        if pred_clean and pred_polluted:
            diff = abs(pred_polluted.predicted_satisfaction - pred_clean.predicted_satisfaction)
            distortions.append(diff)
    if distortions:
        report.append(f"  타겟 식당 평균 왜곡: {np.mean(distortions):.3f}")


# ─── T9-B: CF vs 단순 평균 방어력 비교 ───

def test_t9b_cf_vs_simple_avg(report: list[str]):
    report.append(_header("T9-B: CF vs 단순 평균 오염 방어력 [V3: holdout MAE 비교]"))

    target_ids = [f"R{i:03d}" for i in range(5)]

    # V3: 동일 holdout에 대해 오염 전/후 MAE를 각 방식별로 비교
    # 핵심: "오염이 추가됐을 때 MAE가 얼마나 증가하는가"

    for pollution_pct in [5, 10, 20]:
        n_polluted = pollution_pct
        report.append(f"\n--- 오염 비율: {n_polluted}명 ---")

        # 오염 없는 데이터
        clean_data = generate_all(n_users=100, holdout_ratio=0.2, seed=42)
        # 오염 있는 데이터 (같은 seed → 같은 clean 유저, 같은 holdout)
        config = [(PollutionType.AD_BOOST, n_polluted, target_ids)]
        poll_data = generate_all(n_users=100, holdout_ratio=0.2, pollution_config=config, seed=42)

        # 각 방식별 MAE 측정
        methods_clean = {}
        methods_polluted = {}

        for label, make_engine in [
            ("단순 평균", lambda d: None),  # 별도 처리
            ("CF (부스트 없음)", lambda d: CFEngine(d, boost={Relation.MUTUAL: 1.0, Relation.FOLLOWING: 1.0, Relation.NONE: 1.0})),
            ("CF + 부스트 (Nyam)", lambda d: CFEngine(d)),
        ]:
            for data_label, data in [("clean", clean_data), ("polluted", poll_data)]:
                clean_ids = {u.id for u in data.clean_users()}
                holdout = [r for r in data.records if r.is_holdout and r.user_id in clean_ids]

                preds = []
                if label == "단순 평균":
                    engine = CFEngine(data)  # 단순평균에도 engine 필요 (item_records)
                    for rec in holdout:
                        pred = engine.predict_simple_avg(rec.item_id, rec.user_id)
                        if pred:
                            preds.append((rec.score, pred))
                else:
                    engine = make_engine(data)
                    for rec in holdout:
                        pred = engine.predict(rec.user_id, rec.item_id, rec.category)
                        if pred:
                            preds.append((rec.score, pred))

                mae = engine.mae(preds) if preds else {"mae_sat": 0, "n": 0}
                if data_label == "clean":
                    methods_clean[label] = mae
                else:
                    methods_polluted[label] = mae

        report.append(f"{'방식':<25} {'Clean MAE':>10} {'오염 MAE':>10} {'증가':>8} {'방어':>8}")
        report.append("-" * 65)

        simple_increase = 0
        for label in ["단순 평균", "CF (부스트 없음)", "CF + 부스트 (Nyam)"]:
            c = methods_clean.get(label, {}).get("mae_sat", 0)
            p = methods_polluted.get(label, {}).get("mae_sat", 0)
            increase = p - c
            if label == "단순 평균":
                simple_increase = increase
            defense = f"{(1 - increase / simple_increase) * 100:.0f}%" if simple_increase > 0.001 else "N/A"
            report.append(f"{label:<25} {c:>10.3f} {p:>10.3f} {increase:>+8.3f} {defense:>8}")


# ─── T9-C: 오염원 적합도 자동 필터링 ───

def test_t9c_pollution_similarity(report: list[str]):
    report.append(_header("T9-C: 오염원 적합도 자동 필터링"))

    config = [(PollutionType.RANDOM, 10, None)]
    data = generate_all(n_users=100, pollution_config=config, seed=42)
    engine = CFEngine(data)

    clean = data.clean_users()
    polluted = data.polluted_users()

    # 정직 ↔ 정직 적합도
    clean_sims = []
    for i in range(min(50, len(clean))):
        for j in range(i + 1, min(50, len(clean))):
            sim = engine.similarity(clean[i].id, clean[j].id, Category.RESTAURANT)
            if sim.n_overlap > 0:
                clean_sims.append(sim.similarity)

    # 정직 ↔ 오염 적합도
    cross_sims = []
    for c in clean[:50]:
        for p in polluted:
            sim = engine.similarity(c.id, p.id, Category.RESTAURANT)
            if sim.n_overlap > 0:
                cross_sims.append(sim.similarity)

    # 오염 ↔ 오염 적합도
    polluted_sims = []
    for i in range(len(polluted)):
        for j in range(i + 1, len(polluted)):
            sim = engine.similarity(polluted[i].id, polluted[j].id, Category.RESTAURANT)
            if sim.n_overlap > 0:
                polluted_sims.append(sim.similarity)

    report.append(f"정직 ↔ 정직 적합도: 평균={np.mean(clean_sims):.3f}, 중앙값={np.median(clean_sims):.3f} (n={len(clean_sims)})")
    report.append(f"정직 ↔ 오염 적합도: 평균={np.mean(cross_sims):.3f}, 중앙값={np.median(cross_sims):.3f} (n={len(cross_sims)})")
    if polluted_sims:
        report.append(f"오염 ↔ 오염 적합도: 평균={np.mean(polluted_sims):.3f}, 중앙값={np.median(polluted_sims):.3f} (n={len(polluted_sims)})")

    report.append(f"\n→ 정직↔오염 적합도가 정직↔정직보다 낮으면 CF가 자동 필터링 중")
    if clean_sims and cross_sims:
        diff = np.mean(clean_sims) - np.mean(cross_sims)
        report.append(f"→ 차이: {diff:.3f} ({'OK: 오염 자동 감쇠' if diff > 0.05 else 'WARNING: 필터링 약함'})")


# ─── T9-D: 팔로우/언팔 방어 효과 ───

def test_t9d_follow_unfollow(report: list[str]):
    report.append(_header("T9-D: 팔로우/언팔 방어 효과"))

    target_ids = [f"R{i:03d}" for i in range(3)]
    config = [(PollutionType.AD_BOOST, 5, target_ids)]
    data = generate_all(n_users=100, pollution_config=config, seed=42)

    test_user = data.clean_users()[0]
    polluted = data.polluted_users()

    # 시나리오 1: 오염 유저 팔로우 안 함 (기본)
    engine_base = CFEngine(data)

    # 시나리오 2: 오염 유저를 팔로우함
    data_follow = generate_all(n_users=100, pollution_config=config, seed=42)
    for p in data_follow.polluted_users():
        data_follow.follows[test_user.id].add(p.id)
    engine_follow = CFEngine(data_follow)

    # 시나리오 3: 오염 유저를 맞팔함 (최악)
    data_mutual = generate_all(n_users=100, pollution_config=config, seed=42)
    for p in data_mutual.polluted_users():
        data_mutual.follows[test_user.id].add(p.id)
        data_mutual.follows.setdefault(p.id, set()).add(test_user.id)
        pair = tuple(sorted([test_user.id, p.id]))
        data_mutual.mutuals.add(pair)
    engine_mutual = CFEngine(data_mutual)

    report.append(f"테스트 유저: {test_user.id}")
    report.append(f"오염 유저: {[p.id for p in polluted]}")

    for tid in target_ids:
        report.append(f"\n  식당 {tid}:")
        pred_base = engine_base.predict(test_user.id, tid, Category.RESTAURANT)
        pred_follow = engine_follow.predict(test_user.id, tid, Category.RESTAURANT)
        pred_mutual = engine_mutual.predict(test_user.id, tid, Category.RESTAURANT)

        if pred_base:
            report.append(f"    팔로우 안 함: {pred_base.predicted_satisfaction:.2f}")
        if pred_follow:
            report.append(f"    팔로우 함:   {pred_follow.predicted_satisfaction:.2f}")
        if pred_mutual:
            report.append(f"    맞팔 함:    {pred_mutual.predicted_satisfaction:.2f}")

        if pred_base and pred_mutual:
            damage = abs(pred_mutual.predicted_satisfaction - pred_base.predicted_satisfaction)
            report.append(f"    → 맞팔 피해: {damage:.3f}")


# ─── T9-E: 오염 비율 한계점 ───

def test_t9e_tipping_point(report: list[str]):
    report.append(_header("T9-E: 오염 비율 한계점 (tipping point)"))

    target_ids = [f"R{i:03d}" for i in range(5)]

    # 기준선
    clean_data = generate_all(n_users=100, holdout_ratio=0.2, seed=42)
    clean_engine = CFEngine(clean_data)
    clean_mae = _measure_holdout_mae(clean_data, clean_engine)

    report.append(f"기준선 MAE_sat: {clean_mae['mae_sat']:.3f}")

    for pct in [5, 10, 20, 30, 50]:
        config = [(PollutionType.AD_BOOST, pct, target_ids)]
        data = generate_all(n_users=100, holdout_ratio=0.2, pollution_config=config, seed=42)

        # CF + 부스트
        engine_boost = CFEngine(data)
        mae_boost = _measure_holdout_mae(data, engine_boost, clean_users_only=True)

        # CF 부스트 없음
        engine_no = CFEngine(data, boost={Relation.MUTUAL: 1.0, Relation.FOLLOWING: 1.0, Relation.NONE: 1.0})
        mae_no = _measure_holdout_mae(data, engine_no, clean_users_only=True)

        mae_increase_boost = mae_boost['mae_sat'] - clean_mae['mae_sat']
        mae_increase_no = mae_no['mae_sat'] - clean_mae['mae_sat']

        report.append(f"\n  오염 {pct}명:")
        report.append(f"    CF+부스트 MAE: {mae_boost['mae_sat']:.3f} (+{mae_increase_boost:.3f})")
        report.append(f"    CF만     MAE: {mae_no['mae_sat']:.3f} (+{mae_increase_no:.3f})")

        if mae_increase_boost > 0.5:
            report.append(f"    ⚠️ MAE 증가 0.5 이상 — 방어 약화 지점")


# ─── 공통 유틸리티 ───

def _measure_holdout_mae(
    data: GeneratedData,
    engine: CFEngine,
    clean_users_only: bool = False,
) -> dict[str, float]:
    """Hold-out 기록으로 MAE 측정."""
    holdout_recs = [r for r in data.records if r.is_holdout]
    if clean_users_only:
        clean_ids = {u.id for u in data.clean_users()}
        holdout_recs = [r for r in holdout_recs if r.user_id in clean_ids]

    predictions = []
    for rec in holdout_recs:
        pred = engine.predict(rec.user_id, rec.item_id, rec.category)
        if pred:
            predictions.append((rec.score, pred))

    return engine.mae(predictions)


# ─── 메인 ───

def main():
    report: list[str] = []
    report.append(f"Nyam CF 시뮬레이션 — T9: 오염 내성 테스트")
    report.append(f"실행: {_timestamp()}")
    report.append(f"{'='*60}")

    test_t9a_pollution_types(report)
    test_t9b_cf_vs_simple_avg(report)
    test_t9c_pollution_similarity(report)
    test_t9d_follow_unfollow(report)
    test_t9e_tipping_point(report)

    # 결과 출력
    output = "\n".join(report)
    print(output)

    # 파일 저장
    os.makedirs("REPORTS", exist_ok=True)
    filename = f"REPORTS/test_cf_pollution_{_timestamp()}.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(output)
    print(f"\n→ 저장: {filename}")


if __name__ == "__main__":
    main()
