"""T8: 예측 확신도 검증"""

from __future__ import annotations

import os
from datetime import datetime

import numpy as np

from cf_models import Category
from cf_data_generator import generate_all
from cf_engine import CFEngine


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def test_t8_prediction_confidence(report: list[str]):
    report.append(f"\n{'='*60}")
    report.append(f"  T8: 예측 확신도 검증")
    report.append(f"{'='*60}\n")

    data = generate_all(n_users=100, holdout_ratio=0.2, seed=42)
    engine = CFEngine(data)
    clean_ids = {u.id for u in data.clean_users()}

    holdout = [r for r in data.records if r.is_holdout and r.user_id in clean_ids]

    # 모든 예측에 대해 확신도와 실제 오차 수집
    conf_error_pairs = []  # (prediction_confidence, actual_error)

    for rec in holdout:
        pred = engine.predict(rec.user_id, rec.item_id, rec.category)
        if pred:
            error = abs(rec.score.satisfaction - pred.predicted_satisfaction)
            conf_error_pairs.append((pred.prediction_confidence, error))

    if not conf_error_pairs:
        report.append("예측 데이터 부족")
        return

    confs = np.array([p[0] for p in conf_error_pairs])
    errors = np.array([p[1] for p in conf_error_pairs])

    report.append(f"총 예측 수: {len(conf_error_pairs)}")
    report.append(f"확신도 범위: {confs.min():.3f} ~ {confs.max():.3f}")
    report.append(f"오차 범위: {errors.min():.3f} ~ {errors.max():.3f}")

    # 확신도 구간별 MAE
    bins = [
        ("낮음 (0~0.3)", 0.0, 0.3),
        ("보통 (0.3~0.5)", 0.3, 0.5),
        ("높음 (0.5~0.7)", 0.5, 0.7),
        ("매우 높음 (0.7+)", 0.7, 1.1),
    ]

    report.append(f"\n{'구간':<20} {'MAE':>8} {'N':>6} {'판정':>8}")
    report.append("-" * 45)

    prev_mae = float('inf')
    monotonic = True
    for label, lo, hi in bins:
        mask = (confs >= lo) & (confs < hi)
        if mask.sum() == 0:
            report.append(f"{label:<20} {'N/A':>8} {'0':>6}")
            continue
        bin_mae = float(np.mean(errors[mask]))
        n = int(mask.sum())
        judge = "OK" if bin_mae <= prev_mae else "INVERTED"
        if bin_mae > prev_mae:
            monotonic = False
        report.append(f"{label:<20} {bin_mae:>8.3f} {n:>6d} {judge:>8}")
        prev_mae = bin_mae

    # 상관계수
    if len(conf_error_pairs) > 10:
        correlation = float(np.corrcoef(confs, errors)[0, 1])
        report.append(f"\n확신도-오차 상관계수: {correlation:.3f}")
        report.append(f"  → 음의 상관 (확신도↑ → 오차↓)이면 OK")
        report.append(f"  → 목표: < -0.3 (현재: {correlation:.3f}, {'OK' if correlation < -0.3 else 'WEAK'})")

    report.append(f"\n단조 감소 여부: {'OK — 확신도가 높을수록 MAE가 낮음' if monotonic else 'WARNING — 단조 아님'}")


def main():
    report: list[str] = []
    report.append(f"Nyam CF 시뮬레이션 — T8: 예측 확신도 검증")
    report.append(f"실행: {_timestamp()}")

    test_t8_prediction_confidence(report)

    output = "\n".join(report)
    print(output)

    os.makedirs("REPORTS", exist_ok=True)
    filename = f"REPORTS/test_cf_prediction_conf_{_timestamp()}.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(output)
    print(f"\n→ 저장: {filename}")


if __name__ == "__main__":
    main()
