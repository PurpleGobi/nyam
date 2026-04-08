"""T1: 적합도 정확성 (2D + 식당/와인 분리) + T3: Mean-centering 효과"""

from __future__ import annotations

import os
from datetime import datetime

import numpy as np

from cf_models import Category, RestaurantCluster, WineCluster
from cf_data_generator import generate_all
from cf_engine import CFEngine


def _welch_ttest(a: list[float], b: list[float]) -> tuple[float, float]:
    """Welch's t-test (scipy 불필요). t-stat과 근사 p-value 반환."""
    import math
    na, nb = len(a), len(b)
    ma, mb = np.mean(a), np.mean(b)
    va, vb = np.var(a, ddof=1), np.var(b, ddof=1)
    se = math.sqrt(va / na + vb / nb) if (va / na + vb / nb) > 0 else 1e-9
    t = (ma - mb) / se
    # Welch–Satterthwaite degrees of freedom
    num = (va / na + vb / nb) ** 2
    den = (va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1) if (nb > 1 and na > 1) else 1
    df = num / den if den > 0 else 1
    # 근사 p-value (정규 분포 근사, df 충분히 크면 OK)
    # 2-tailed: P(|T| > |t|) ≈ erfc(|t|/√2)
    p = math.erfc(abs(t) / math.sqrt(2))
    return t, p


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _header(title: str) -> str:
    return f"\n{'='*60}\n  {title}\n{'='*60}\n"


# ─── T1: 적합도 정확성 ───

def test_t1_similarity_accuracy(report: list[str]):
    report.append(_header("T1: 적합도 정확성 (2D + 식당/와인 분리)"))

    data = generate_all(n_users=100, seed=42)

    for D_val in [2, 4, 6, 8, 10]:
        engine = CFEngine(data, D=D_val)
        report.append(f"\n--- D = {D_val} ---")

        # 식당 적합도
        same_sims, diff_sims = [], []
        users = data.clean_users()

        for i in range(min(50, len(users))):
            for j in range(i + 1, min(50, len(users))):
                sim = engine.similarity(users[i].id, users[j].id, Category.RESTAURANT)
                if sim.n_overlap < 3:
                    continue
                if users[i].restaurant_cluster == users[j].restaurant_cluster:
                    same_sims.append(sim.similarity)
                else:
                    diff_sims.append(sim.similarity)

        if same_sims and diff_sims:
            report.append(f"  식당 — 같은 클러스터: {np.mean(same_sims):.3f} ± {np.std(same_sims):.3f} (n={len(same_sims)})")
            report.append(f"  식당 — 다른 클러스터: {np.mean(diff_sims):.3f} ± {np.std(diff_sims):.3f} (n={len(diff_sims)})")
            gap = np.mean(same_sims) - np.mean(diff_sims)
            t_stat, p_val = _welch_ttest(same_sims, diff_sims)
            report.append(f"  식당 — 분리도: {gap:.3f}, t={t_stat:.2f}, p={p_val:.4f} ({'✅ 유의미' if p_val < 0.05 else '❌ 유의미하지 않음'})")

        # 와인 적합도
        engine.clear_cache()
        w_same, w_diff = [], []
        for i in range(min(50, len(users))):
            for j in range(i + 1, min(50, len(users))):
                sim = engine.similarity(users[i].id, users[j].id, Category.WINE)
                if sim.n_overlap < 2:
                    continue
                if users[i].wine_cluster == users[j].wine_cluster:
                    w_same.append(sim.similarity)
                else:
                    w_diff.append(sim.similarity)

        if w_same and w_diff:
            report.append(f"  와인 — 같은 클러스터: {np.mean(w_same):.3f} ± {np.std(w_same):.3f} (n={len(w_same)})")
            report.append(f"  와인 — 다른 클러스터: {np.mean(w_diff):.3f} ± {np.std(w_diff):.3f} (n={len(w_diff)})")
            gap = np.mean(w_same) - np.mean(w_diff)
            t_stat, p_val = _welch_ttest(w_same, w_diff)
            report.append(f"  와인 — 분리도: {gap:.3f}, t={t_stat:.2f}, p={p_val:.4f} ({'✅ 유의미' if p_val < 0.05 else '❌ 유의미하지 않음'})")

    # 교차 검증: 식당 같고 와인 다른 쌍
    report.append(f"\n--- 교차 검증 ---")
    engine = CFEngine(data, D=6.0)
    cross_rest_same, cross_wine_diff = [], []
    for i in range(min(50, len(users))):
        for j in range(i + 1, min(50, len(users))):
            if (users[i].restaurant_cluster == users[j].restaurant_cluster and
                    users[i].wine_cluster != users[j].wine_cluster):
                r_sim = engine.similarity(users[i].id, users[j].id, Category.RESTAURANT)
                w_sim = engine.similarity(users[i].id, users[j].id, Category.WINE)
                if r_sim.n_overlap >= 3 and w_sim.n_overlap >= 2:
                    cross_rest_same.append(r_sim.similarity)
                    cross_wine_diff.append(w_sim.similarity)

    if cross_rest_same:
        report.append(f"  식당 클러스터 같고 와인 다른 쌍 (n={len(cross_rest_same)}):")
        report.append(f"    식당 적합도: {np.mean(cross_rest_same):.3f}")
        report.append(f"    와인 적합도: {np.mean(cross_wine_diff):.3f}")
        report.append(f"    → 식당 > 와인이면 분리 검증 성공")

    # 2D vs 1D 비교
    report.append(f"\n--- 2D vs 1D 비교 ---")
    engine_2d = CFEngine(data, D=6.0)
    engine_1d_proxy = CFEngine(data, D=6.0)  # 같은 엔진이지만 1D 근사

    sims_2d, sims_1d_diff = [], []
    for i in range(min(30, len(users))):
        for j in range(i + 1, min(30, len(users))):
            sim_2d = engine_2d.similarity(users[i].id, users[j].id, Category.RESTAURANT)
            if sim_2d.n_overlap < 5:
                continue
            # 1D 근사: 만족도만으로 거리 계산
            overlapping = data.overlapping_items(users[i].id, users[j].id, Category.RESTAURANT)
            recs_a = {r.item_id: r.score for r in data.user_records(users[i].id, Category.RESTAURANT)}
            recs_b = {r.item_id: r.score for r in data.user_records(users[j].id, Category.RESTAURANT)}
            mean_sat_a = np.mean([recs_a[item].satisfaction for item in recs_a])
            mean_sat_b = np.mean([recs_b[item].satisfaction for item in recs_b])
            diffs_1d = [abs((recs_a[item].satisfaction - mean_sat_a) - (recs_b[item].satisfaction - mean_sat_b)) for item in overlapping]
            sim_1d = max(0, 1 - np.mean(diffs_1d) / 3.0) if diffs_1d else 0

            sims_2d.append(sim_2d.similarity)
            sims_1d_diff.append(abs(sim_2d.similarity - sim_1d))

    if sims_2d:
        report.append(f"  2D-1D 적합도 차이 평균: {np.mean(sims_1d_diff):.3f}")
        report.append(f"  → 차이가 크면 2D가 더 많은 정보를 포착하는 것")


# ─── T3: Mean-centering 효과 ───

def test_t3_mean_centering(report: list[str]):
    report.append(_header("T3: Mean-centering 효과"))

    data = generate_all(n_users=100, seed=42)
    engine = CFEngine(data, D=6.0)

    users = data.clean_users()

    # 후한 유저 ↔ 박한 유저 (같은 클러스터)
    generous = [u for u in users if u.bias_x > 1.0 or u.bias_y > 1.0]
    strict = [u for u in users if u.bias_x < -1.0 or u.bias_y < -1.0]

    report.append(f"후한 유저 수: {len(generous)}, 박한 유저 수: {len(strict)}")

    # 같은 클러스터인 후한-박한 쌍
    pairs_mc_on, pairs_mc_off = [], []
    for g in generous:
        for s in strict:
            if g.restaurant_cluster == s.restaurant_cluster:
                sim_on = engine.similarity(g.id, s.id, Category.RESTAURANT, use_mean_centering=True)
                sim_off = engine.similarity(g.id, s.id, Category.RESTAURANT, use_mean_centering=False)
                # 캐시 무효화 (mean-centering off 용)
                engine._sim_cache.pop((g.id, s.id, Category.RESTAURANT), None)
                engine._sim_cache.pop((s.id, g.id, Category.RESTAURANT), None)
                sim_off = engine.similarity(g.id, s.id, Category.RESTAURANT, use_mean_centering=False)

                if sim_on.n_overlap >= 3:
                    pairs_mc_on.append(sim_on.similarity)
                    pairs_mc_off.append(sim_off.similarity)

    if pairs_mc_on:
        report.append(f"\n같은 클러스터 후한↔박한 쌍 (n={len(pairs_mc_on)}):")
        report.append(f"  Mean-centering ON:  적합도 {np.mean(pairs_mc_on):.3f}")
        report.append(f"  Mean-centering OFF: 적합도 {np.mean(pairs_mc_off):.3f}")
        improvement = np.mean(pairs_mc_on) - np.mean(pairs_mc_off)
        report.append(f"  → 개선: +{improvement:.3f} ({'OK: 편향 보정 효과' if improvement > 0.05 else 'WEAK'})")
    else:
        report.append("  (같은 클러스터 후한↔박한 쌍이 부족)")


# ─── 메인 ───

def main():
    report: list[str] = []
    report.append(f"Nyam CF 시뮬레이션 — T1: 적합도 정확성 + T3: Mean-centering")
    report.append(f"실행: {_timestamp()}")

    test_t1_similarity_accuracy(report)
    test_t3_mean_centering(report)

    output = "\n".join(report)
    print(output)

    os.makedirs("REPORTS", exist_ok=True)
    filename = f"REPORTS/test_cf_similarity_{_timestamp()}.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(output)
    print(f"\n→ 저장: {filename}")


if __name__ == "__main__":
    main()
