"""T2: 신뢰도 곡선 (λ 튜닝)"""

from __future__ import annotations

import os
from datetime import datetime

import numpy as np

from cf_models import Category
from cf_data_generator import generate_all
from cf_engine import CFEngine


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def test_t2_confidence_curve(report: list[str]):
    report.append(f"\n{'='*60}")
    report.append(f"  T2: 신뢰도 곡선 (λ 튜닝)")
    report.append(f"{'='*60}\n")

    data = generate_all(n_users=100, seed=42)
    users = data.clean_users()

    # 특정 쌍을 골라서 겹치는 기록을 점진적으로 늘려가며 적합도 변화 관찰
    # 가장 많이 겹치는 쌍 찾기
    best_pair = None
    best_overlap = 0
    for i in range(min(30, len(users))):
        for j in range(i + 1, min(30, len(users))):
            overlap = len(data.overlapping_items(users[i].id, users[j].id, Category.RESTAURANT))
            if overlap > best_overlap:
                best_overlap = overlap
                best_pair = (users[i].id, users[j].id)

    if not best_pair:
        report.append("겹치는 기록이 충분한 쌍을 찾지 못함")
        return

    report.append(f"테스트 쌍: {best_pair[0]} ↔ {best_pair[1]} (최대 겹침: {best_overlap}개)")

    # 최종 적합도 (전체 겹침)
    engine_full = CFEngine(data, D=6.0, lam=7.0)
    final_sim = engine_full.similarity(best_pair[0], best_pair[1], Category.RESTAURANT)
    report.append(f"전체 겹침 적합도: {final_sim.similarity:.3f}\n")

    # λ별 신뢰도 곡선
    for lam in [3, 5, 7, 10, 15]:
        report.append(f"\n--- λ = {lam} ---")
        report.append(f"{'겹침 수':>8} {'적합도':>8} {'신뢰도':>8} {'가중치':>8} {'최종과 차이':>12}")

        overlapping = data.overlapping_items(best_pair[0], best_pair[1], Category.RESTAURANT)
        for n in [1, 2, 3, 5, 7, 10, 15, 20, min(30, len(overlapping))]:
            if n > len(overlapping):
                break
            # n개만으로 적합도 계산 (서브셋)
            subset = overlapping[:n]
            recs_a = {r.item_id: r.score for r in data.user_records(best_pair[0], Category.RESTAURANT)}
            recs_b = {r.item_id: r.score for r in data.user_records(best_pair[1], Category.RESTAURANT)}

            # mean-centering
            all_a = data.user_records(best_pair[0], Category.RESTAURANT)
            all_b = data.user_records(best_pair[1], Category.RESTAURANT)
            mean_a_x = np.mean([r.score.x for r in all_a])
            mean_a_y = np.mean([r.score.y for r in all_a])
            mean_b_x = np.mean([r.score.x for r in all_b])
            mean_b_y = np.mean([r.score.y for r in all_b])

            distances = []
            for item in subset:
                if item in recs_a and item in recs_b:
                    dx = (recs_a[item].x - mean_a_x) - (recs_b[item].x - mean_b_x)
                    dy = (recs_a[item].y - mean_a_y) - (recs_b[item].y - mean_b_y)
                    distances.append((dx**2 + dy**2)**0.5)

            if not distances:
                continue

            avg_dist = np.mean(distances)
            sim = max(0, 1 - avg_dist / 6.0)
            conf = n / (n + lam)
            weight = sim * conf
            diff = abs(sim - final_sim.similarity)

            report.append(f"{n:>8} {sim:>8.3f} {conf:>8.3f} {weight:>8.3f} {diff:>12.3f}")

    # 결론: λ별 "유의미한 수준(conf≥0.5)" 도달 기록 수
    report.append(f"\n--- λ별 conf≥0.5 도달 기록 수 ---")
    for lam in [3, 5, 7, 10, 15]:
        n_half = lam  # conf = n/(n+λ) ≥ 0.5 → n ≥ λ
        report.append(f"  λ={lam}: {n_half}개 이상 필요")


def main():
    report: list[str] = []
    report.append(f"Nyam CF 시뮬레이션 — T2: 신뢰도 곡선")
    report.append(f"실행: {_timestamp()}")

    test_t2_confidence_curve(report)

    output = "\n".join(report)
    print(output)

    os.makedirs("REPORTS", exist_ok=True)
    filename = f"REPORTS/test_cf_confidence_{_timestamp()}.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(output)
    print(f"\n→ 저장: {filename}")


if __name__ == "__main__":
    main()
