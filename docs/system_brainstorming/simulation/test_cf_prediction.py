"""T4: Nyam 점수 예측 정확도 + T5: 관계 부스트 민감도"""

from __future__ import annotations

import os
from datetime import datetime

import numpy as np

from cf_models import Category, Relation, QuadrantScore
from cf_data_generator import generate_all
from cf_engine import CFEngine


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _header(title: str) -> str:
    return f"\n{'='*60}\n  {title}\n{'='*60}\n"


def _measure_holdout(data, engine, category=None) -> dict[str, float]:
    """Hold-out 기록 MAE 측정."""
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


def _measure_holdout_simple_avg(data, engine, category=None) -> dict[str, float]:
    holdout = [r for r in data.records if r.is_holdout]
    if category:
        holdout = [r for r in holdout if r.category == category]
    clean_ids = {u.id for u in data.clean_users()}
    holdout = [r for r in holdout if r.user_id in clean_ids]

    predictions = []
    for rec in holdout:
        pred = engine.predict_simple_avg(rec.item_id, rec.user_id)
        if pred:
            predictions.append((rec.score, pred))
    return engine.mae(predictions)


def _measure_holdout_1d(data, engine, category=None) -> dict[str, float]:
    holdout = [r for r in data.records if r.is_holdout]
    if category:
        holdout = [r for r in holdout if r.category == category]
    clean_ids = {u.id for u in data.clean_users()}
    holdout = [r for r in holdout if r.user_id in clean_ids]

    predictions = []
    for rec in holdout:
        pred = engine.predict_1d_cf(rec.user_id, rec.item_id, rec.category)
        if pred:
            predictions.append((rec.score, pred))
    return engine.mae(predictions)


# ─── T4: 예측 정확도 ───

def test_t4_prediction_accuracy(report: list[str]):
    report.append(_header("T4: Nyam 점수 예측 정확도"))

    data = generate_all(n_users=100, holdout_ratio=0.2, seed=42)

    # (a) 전체 유저 CF (부스트 없음)
    engine_a = CFEngine(data, boost={Relation.MUTUAL: 1.0, Relation.FOLLOWING: 1.0, Relation.NONE: 1.0})
    # (b) 전체 유저 CF + 관계 부스트 (Nyam 점수)
    engine_b = CFEngine(data)
    # (c) 팔로잉만 CF — predict에 scope 제한
    # (d) 단순 평균
    # (e) 1D CF

    methods = {
        "(a) CF (부스트 없음)": lambda cat: _measure_holdout(data, engine_a, cat),
        "(b) CF + 부스트 (Nyam)": lambda cat: _measure_holdout(data, engine_b, cat),
        "(d) 단순 평균": lambda cat: _measure_holdout_simple_avg(data, engine_b, cat),
        "(e) 1D CF": lambda cat: _measure_holdout_1d(data, engine_b, cat),
    }

    for cat_label, cat in [("전체", None), ("식당", Category.RESTAURANT), ("와인", Category.WINE)]:
        report.append(f"\n--- {cat_label} ---")
        report.append(f"{'방식':<25} {'MAE_x':>8} {'MAE_y':>8} {'MAE_sat':>8} {'Dist2D':>8} {'N':>6}")
        report.append("-" * 70)

        for name, fn in methods.items():
            mae = fn(cat)
            report.append(
                f"{name:<25} {mae['mae_x']:>8.3f} {mae['mae_y']:>8.3f} "
                f"{mae['mae_sat']:>8.3f} {mae['dist_2d']:>8.3f} {mae['n']:>6d}"
            )

        report.append("")
        # Nyam vs 단순평균 비교
        nyam_mae = methods["(b) CF + 부스트 (Nyam)"](cat)
        simple_mae = methods["(d) 단순 평균"](cat)
        if simple_mae['mae_sat'] > 0:
            improvement = (1 - nyam_mae['mae_sat'] / simple_mae['mae_sat']) * 100
            report.append(f"  Nyam vs 단순평균: {improvement:+.1f}% {'개선' if improvement > 0 else '악화'}")


# ─── T5: 관계 부스트 민감도 ───

def test_t5_boost_sensitivity(report: list[str]):
    report.append(_header("T5: 관계 부스트 민감도 [V4: 50:50 팔로우]"))

    data = generate_all(n_users=100, holdout_ratio=0.2, seed=42)

    boost_configs = [
        ("5.0/3.0/1.0 (극강)", {Relation.MUTUAL: 5.0, Relation.FOLLOWING: 3.0, Relation.NONE: 1.0}),
        ("3.0/2.0/1.0 (강)", {Relation.MUTUAL: 3.0, Relation.FOLLOWING: 2.0, Relation.NONE: 1.0}),
        ("2.0/1.5/1.0 (현재)", {Relation.MUTUAL: 2.0, Relation.FOLLOWING: 1.5, Relation.NONE: 1.0}),
        ("1.5/1.2/1.0 (약)", {Relation.MUTUAL: 1.5, Relation.FOLLOWING: 1.2, Relation.NONE: 1.0}),
        ("1.0/1.0/1.0 (없음)", {Relation.MUTUAL: 1.0, Relation.FOLLOWING: 1.0, Relation.NONE: 1.0}),
        ("2.0/1.5/0.5 (비팔↓)", {Relation.MUTUAL: 2.0, Relation.FOLLOWING: 1.5, Relation.NONE: 0.5}),
        ("3.0/2.0/0.5 (비팔↓강)", {Relation.MUTUAL: 3.0, Relation.FOLLOWING: 2.0, Relation.NONE: 0.5}),
    ]

    report.append(f"{'부스트 조합':<25} {'MAE_sat':>8} {'MAE_x':>8} {'MAE_y':>8} {'Dist2D':>8}")
    report.append("-" * 60)

    best_mae = float('inf')
    best_config = ""

    for name, boost in boost_configs:
        engine = CFEngine(data, boost=boost)
        mae = _measure_holdout(data, engine)
        report.append(f"{name:<25} {mae['mae_sat']:>8.3f} {mae['mae_x']:>8.3f} {mae['mae_y']:>8.3f} {mae['dist_2d']:>8.3f}")
        if mae['mae_sat'] < best_mae:
            best_mae = mae['mae_sat']
            best_config = name

    report.append(f"\n→ 최적 부스트: {best_config} (MAE_sat = {best_mae:.3f})")

    # V4: 팔로우 유저 vs 비팔로우 유저 분리 분석
    report.append(f"\n--- 팔로우 유저 기여 분석 ---")
    engine = CFEngine(data)
    clean = data.clean_users()
    follow_contrib, nofollow_contrib = [], []
    for user in clean[:20]:
        holdout = [r for r in data.records if r.user_id == user.id and r.is_holdout]
        for rec in holdout:
            item_recs = data.item_records(rec.item_id)
            raters_follow = [r for r in item_recs if r.user_id != user.id and r.user_id in data.follows.get(user.id, set())]
            raters_nofollow = [r for r in item_recs if r.user_id != user.id and r.user_id not in data.follows.get(user.id, set())]
            follow_contrib.append(len(raters_follow))
            nofollow_contrib.append(len(raters_nofollow))

    report.append(f"  평균 평가자 중 팔로우: {np.mean(follow_contrib):.1f}명")
    report.append(f"  평균 평가자 중 비팔로우: {np.mean(nofollow_contrib):.1f}명")
    report.append(f"  비율: 팔로우 {np.mean(follow_contrib)/(np.mean(follow_contrib)+np.mean(nofollow_contrib))*100:.0f}%")


# ─── 메인 ───

def main():
    report: list[str] = []
    report.append(f"Nyam CF 시뮬레이션 — T4: 예측 정확도 + T5: 부스트 민감도")
    report.append(f"실행: {_timestamp()}")

    test_t4_prediction_accuracy(report)
    test_t5_boost_sensitivity(report)

    output = "\n".join(report)
    print(output)

    os.makedirs("REPORTS", exist_ok=True)
    filename = f"REPORTS/test_cf_prediction_{_timestamp()}.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(output)
    print(f"\n→ 저장: {filename}")


if __name__ == "__main__":
    main()
