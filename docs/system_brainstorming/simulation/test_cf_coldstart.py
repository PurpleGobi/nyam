"""T6: 콜드스타트 성능"""

from __future__ import annotations

import os
from datetime import datetime

import numpy as np

from cf_models import Category, Relation
from cf_data_generator import generate_all
from cf_engine import CFEngine


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def test_t6_coldstart(report: list[str]):
    report.append(f"\n{'='*60}")
    report.append(f"  T6: 콜드스타트 성능")
    report.append(f"{'='*60}\n")

    data = generate_all(n_users=100, holdout_ratio=0.2, n_coldstart_users=30, seed=42)  # V2: 저기록 유저 30명
    engine = CFEngine(data)

    users = data.clean_users()

    # 기록 수별 그룹
    groups = {
        "1~3개": [], "4~7개": [], "8~15개": [],
        "16~30개": [], "31+개": [],
    }

    for user in users:
        recs = data.user_records(user.id)
        n = len(recs)
        if n <= 3:
            groups["1~3개"].append(user)
        elif n <= 7:
            groups["4~7개"].append(user)
        elif n <= 15:
            groups["8~15개"].append(user)
        elif n <= 30:
            groups["16~30개"].append(user)
        else:
            groups["31+개"].append(user)

    report.append(f"{'그룹':<12} {'유저 수':>8} {'MAE_sat':>8} {'MAE_x':>8} {'MAE_y':>8} {'커버리지':>8}")
    report.append("-" * 55)

    for group_name, group_users in groups.items():
        if not group_users:
            report.append(f"{group_name:<12} {'0':>8} {'N/A':>8} {'N/A':>8} {'N/A':>8} {'N/A':>8}")
            continue

        predictions = []
        total_holdout = 0
        for user in group_users:
            holdout = [r for r in data.records if r.user_id == user.id and r.is_holdout]
            total_holdout += len(holdout)
            for rec in holdout:
                pred = engine.predict(rec.user_id, rec.item_id, rec.category)
                if pred:
                    predictions.append((rec.score, pred))

        mae = engine.mae(predictions)
        coverage = len(predictions) / total_holdout * 100 if total_holdout > 0 else 0
        report.append(
            f"{group_name:<12} {len(group_users):>8d} {mae['mae_sat']:>8.3f} "
            f"{mae['mae_x']:>8.3f} {mae['mae_y']:>8.3f} {coverage:>7.1f}%"
        )

    # 팔로잉 수별 MAE
    report.append(f"\n--- 팔로잉 수별 MAE ---")
    follow_groups = {"0명": [], "1~5명": [], "6~10명": [], "11+명": []}
    for user in users:
        n_following = len(data.follows.get(user.id, set()))
        if n_following == 0:
            follow_groups["0명"].append(user)
        elif n_following <= 5:
            follow_groups["1~5명"].append(user)
        elif n_following <= 10:
            follow_groups["6~10명"].append(user)
        else:
            follow_groups["11+명"].append(user)

    report.append(f"{'팔로잉':>10} {'유저 수':>8} {'MAE_sat':>8}")
    report.append("-" * 30)
    for fname, fusers in follow_groups.items():
        if not fusers:
            continue
        preds = []
        for user in fusers:
            holdout = [r for r in data.records if r.user_id == user.id and r.is_holdout]
            for rec in holdout:
                pred = engine.predict(rec.user_id, rec.item_id, rec.category)
                if pred:
                    preds.append((rec.score, pred))
        mae = engine.mae(preds)
        report.append(f"{fname:>10} {len(fusers):>8d} {mae['mae_sat']:>8.3f}")


def main():
    report: list[str] = []
    report.append(f"Nyam CF 시뮬레이션 — T6: 콜드스타트")
    report.append(f"실행: {_timestamp()}")

    test_t6_coldstart(report)

    output = "\n".join(report)
    print(output)

    os.makedirs("REPORTS", exist_ok=True)
    filename = f"REPORTS/test_cf_coldstart_{_timestamp()}.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(output)
    print(f"\n→ 저장: {filename}")


if __name__ == "__main__":
    main()
