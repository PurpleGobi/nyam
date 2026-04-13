"""
Nyam CF 시뮬레이션: 아이템 희소성 가중치 효과 검증
- 10,000 유저, 500 식당 (50 프랜차이즈 + 450 니치)
- 5개 취향 클러스터
- 오염 유저: 프랜차이즈 대량 리뷰 후 타겟 식당 점수 조작
- 비교: 희소성 가중치 적용 전/후 MAE + 공격 방어 효과
"""

import numpy as np
from dataclasses import dataclass
from typing import Optional
import time

np.random.seed(42)

# ─── 설정 ───────────────────────────────────────────────
N_USERS = 10_000
N_RESTAURANTS = 500
N_FRANCHISE = 50        # 프랜차이즈 (인기 식당)
N_NICHE = 450           # 니치 식당
N_CLUSTERS = 5          # 취향 클러스터
N_ATTACKERS = 1000      # 오염 유저 수 (10%)
N_TARGET_RESTAURANTS = 10  # 공격 대상 식당 수
N_ULTRA_NICHE = 10      # 극소수 기록 식당 (타겟용)
LAMBDA = 7              # 신뢰도 파라미터
D = 60                  # 적합도 정규화 상수
MIN_OVERLAP = 3         # 최소 겹침 수

# ─── 1. 식당 생성 ────────────────────────────────────────
print("=" * 60)
print("Nyam CF 시뮬레이션: 아이템 희소성 가중치 효과 검증")
print("=" * 60)
print(f"\n설정: {N_USERS:,}명 유저, {N_RESTAURANTS}개 식당 ({N_FRANCHISE} 프랜차이즈 + {N_NICHE} 니치)")
print(f"오염 유저: {N_ATTACKERS}명 ({N_ATTACKERS/N_USERS*100:.1f}%)")
print(f"공격 대상: {N_TARGET_RESTAURANTS}개 니치 식당\n")

# 프랜차이즈: 방문 확률 높음 (60~90%)
# 일반 니치: 방문 확률 낮음 (1~10%)
# 극소수 니치 (타겟): 방문 확률 극히 낮음 (0.05~0.1% → 약 5~10명)
franchise_visit_prob = np.random.uniform(0.6, 0.9, N_FRANCHISE)
normal_niche_visit_prob = np.random.uniform(0.01, 0.10, N_NICHE - N_ULTRA_NICHE)
# 극소수 니치: 정직한 유저 중 ~20~30명만 방문 (0.2~0.3%)
# 공격자 1000명이 전원 기록하면 기록자의 대다수가 공격자
ultra_niche_visit_prob = np.random.uniform(0.002, 0.003, N_ULTRA_NICHE)
niche_visit_prob = np.concatenate([normal_niche_visit_prob, ultra_niche_visit_prob])
visit_prob = np.concatenate([franchise_visit_prob, niche_visit_prob])

print("식당 방문 확률 분포:")
print(f"  프랜차이즈 (0~{N_FRANCHISE-1}): 평균 {franchise_visit_prob.mean():.1%}")
print(f"  일반 니치 ({N_FRANCHISE}~{N_RESTAURANTS-N_ULTRA_NICHE-1}): 평균 {normal_niche_visit_prob.mean():.1%}")
print(f"  극소수 니치 ({N_RESTAURANTS-N_ULTRA_NICHE}~{N_RESTAURANTS-1}): 평균 {ultra_niche_visit_prob.mean():.2%} (약 {int(ultra_niche_visit_prob.mean()*N_USERS)}명)")

# ─── 2. 유저 & 취향 클러스터 ─────────────────────────────
# 각 클러스터의 "기본 취향" (X, Y 평균)
cluster_centers = np.array([
    [70, 75],  # 클러스터 0: 고퀄 선호
    [40, 80],  # 클러스터 1: 분위기 중시
    [80, 50],  # 클러스터 2: 음식만 중요
    [55, 55],  # 클러스터 3: 중간
    [30, 35],  # 클러스터 4: 전반적 까다로움
])

# 유저별 클러스터 배정
user_clusters = np.random.randint(0, N_CLUSTERS, N_USERS)

# 유저별 개인 취향 오프셋 (클러스터 중심에서 약간 벗어남)
user_taste = cluster_centers[user_clusters] + np.random.normal(0, 8, (N_USERS, 2))

# ─── 3. 식당별 "진짜 특성" ───────────────────────────────
# 각 식당의 객관적 특성 (X, Y)
restaurant_true = np.random.uniform(20, 90, (N_RESTAURANTS, 2))

# ─── 4. 리뷰 생성 ───────────────────────────────────────
print("\n리뷰 생성 중...")
t0 = time.time()

# ratings[u][r] = (x, y) or None
# 메모리 효율을 위해 sparse 방식 사용
user_ratings = {}  # {user_id: {restaurant_id: (x, y)}}

for u in range(N_USERS):
    visited = np.random.random(N_RESTAURANTS) < visit_prob
    visited_ids = np.where(visited)[0]

    if len(visited_ids) == 0:
        continue

    ratings = {}
    for r in visited_ids:
        # 점수 = 식당 특성에 대한 유저 취향 반응 + 노이즈
        taste_diff = restaurant_true[r] - user_taste[u]
        # 취향과 식당이 맞으면 높은 점수, 안 맞으면 낮은 점수
        base_score = 50 + (100 - np.abs(taste_diff)) * 0.5
        noise = np.random.normal(0, 5, 2)
        score = np.clip(base_score + noise, 0, 100)
        ratings[r] = (float(score[0]), float(score[1]))

    user_ratings[u] = ratings

total_reviews = sum(len(r) for r in user_ratings.values())
print(f"총 리뷰: {total_reviews:,}개 ({time.time()-t0:.1f}초)")
print(f"유저당 평균: {total_reviews/N_USERS:.1f}개")

# 식당별 기록자 수
restaurant_reviewer_count = np.zeros(N_RESTAURANTS, dtype=int)
for u, ratings in user_ratings.items():
    for r in ratings:
        restaurant_reviewer_count[r] += 1

print(f"\n식당별 기록자 수:")
print(f"  프랜차이즈 평균: {restaurant_reviewer_count[:N_FRANCHISE].mean():.0f}명")
print(f"  일반 니치 평균: {restaurant_reviewer_count[N_FRANCHISE:N_RESTAURANTS-N_ULTRA_NICHE].mean():.0f}명")
print(f"  극소수 니치 평균: {restaurant_reviewer_count[N_RESTAURANTS-N_ULTRA_NICHE:].mean():.0f}명")

# ─── 5. 공격자 설정 ──────────────────────────────────────
# 공격 대상: 극소수 니치 식당 (기록자 5~10명)
target_restaurants = np.array(range(N_RESTAURANTS - N_ULTRA_NICHE, N_RESTAURANTS))

# 공격자: 마지막 100명
attacker_ids = list(range(N_USERS - N_ATTACKERS, N_USERS))

print(f"\n공격자 설정:")
print(f"  공격자 {len(attacker_ids)}명 (유저 {attacker_ids[0]}~{attacker_ids[-1]})")
print(f"  타겟 식당: {target_restaurants.tolist()}")

# 공격 전략: 프랜차이즈만 정직 리뷰 + 타겟 식당만 조작. 다른 니치 기록 없음.
for u in attacker_ids:
    # 기존 기록 전부 삭제 (공격자는 백지 상태에서 시작)
    user_ratings[u] = {}

    # 프랜차이즈 전부 정직하게 리뷰 (취향에 맞게)
    for r in range(N_FRANCHISE):
        taste_diff = restaurant_true[r] - user_taste[u]
        base_score = 50 + (100 - np.abs(taste_diff)) * 0.5
        noise = np.random.normal(0, 5, 2)
        score = np.clip(base_score + noise, 0, 100)
        user_ratings[u][r] = (float(score[0]), float(score[1]))

    # 타겟 식당만 조작 (95, 95). 다른 니치 식당 기록 없음.
    for r in target_restaurants:
        user_ratings[u][r] = (95.0, 95.0)

# 기록자 수 재계산
restaurant_reviewer_count = np.zeros(N_RESTAURANTS, dtype=int)
for u, ratings in user_ratings.items():
    for r in ratings:
        restaurant_reviewer_count[r] += 1

print(f"  공격 후 타겟 식당 평균 기록자 수: {restaurant_reviewer_count[target_restaurants].mean():.0f}명")

# 타겟 식당별 정직/공격자 기록자 분석
attacker_set = set(attacker_ids)
for r in target_restaurants:
    honest_count = sum(1 for u, ratings in user_ratings.items() if r in ratings and u not in attacker_set)
    attack_count = sum(1 for u in attacker_ids if r in user_ratings.get(u, {}))
    total = honest_count + attack_count
    print(f"    식당 {r}: 정직 {honest_count}명 + 공격 {attack_count}명 = 총 {total}명 (공격자 비율 {attack_count/max(total,1)*100:.0f}%)")

# ─── 6. 아이템 희소성 가중치 계산 ────────────────────────
item_rarity_weight = np.log(N_USERS / np.maximum(restaurant_reviewer_count, 1))

print(f"\n아이템 희소성 가중치:")
print(f"  프랜차이즈 평균: {item_rarity_weight[:N_FRANCHISE].mean():.2f}")
print(f"  니치 평균: {item_rarity_weight[N_FRANCHISE:].mean():.2f}")
print(f"  타겟 식당 평균: {item_rarity_weight[target_restaurants].mean():.2f}")

# ─── 7. CF 엔진 ──────────────────────────────────────────

def compute_user_mean(ratings: dict) -> tuple:
    """유저의 평균 (X, Y) 계산"""
    if not ratings:
        return (50.0, 50.0)
    xs = [v[0] for v in ratings.values()]
    ys = [v[1] for v in ratings.values()]
    return (np.mean(xs), np.mean(ys))


def compute_similarity(
    ratings_a: dict, ratings_b: dict,
    mean_a: tuple, mean_b: tuple,
    use_rarity: bool = False
) -> tuple:
    """두 유저 간 적합도 + 신뢰도 계산"""
    overlap = set(ratings_a.keys()) & set(ratings_b.keys())
    n = len(overlap)

    if n < MIN_OVERLAP:
        return (0.0, 0.0, 0)

    distances = []
    weights = []

    for r in overlap:
        ax, ay = ratings_a[r]
        bx, by = ratings_b[r]
        # mean-centering
        ax_c, ay_c = ax - mean_a[0], ay - mean_a[1]
        bx_c, by_c = bx - mean_b[0], by - mean_b[1]

        dist = np.sqrt((ax_c - bx_c)**2 + (ay_c - by_c)**2)

        if use_rarity:
            w = item_rarity_weight[r]
        else:
            w = 1.0

        distances.append(dist)
        weights.append(w)

    distances = np.array(distances)
    weights = np.array(weights)

    if weights.sum() == 0:
        return (0.0, 0.0, n)

    avg_dist = np.average(distances, weights=weights)
    similarity = max(0.0, 1.0 - avg_dist / D)
    confidence = n / (n + LAMBDA)

    return (similarity, confidence, n)


def predict_score(
    target_user: int, target_restaurant: int,
    all_ratings: dict, user_means: dict,
    use_rarity: bool = False,
    exclude_attackers: bool = False
) -> Optional[float]:
    """타겟 유저의 타겟 식당 Nyam 점수 예측"""
    if target_user not in all_ratings:
        return None

    target_ratings = all_ratings[target_user]
    target_mean = user_means[target_user]

    # 해당 식당의 다른 기록자 찾기
    raters = []
    for u, ratings in all_ratings.items():
        if u == target_user:
            continue
        if exclude_attackers and u in set(attacker_ids):
            continue
        if target_restaurant in ratings:
            raters.append(u)

    if not raters:
        return None

    weighted_sum_x = 0.0
    weighted_sum_y = 0.0
    weight_total = 0.0

    for rater in raters:
        rater_ratings = all_ratings[rater]
        rater_mean = user_means[rater]

        sim, conf, n_overlap = compute_similarity(
            target_ratings, rater_ratings,
            target_mean, rater_mean,
            use_rarity=use_rarity
        )

        weight = sim * conf
        if weight < 0.01:
            continue

        # 해당 식당의 점수 (mean-centered)
        rx, ry = rater_ratings[target_restaurant]
        dev_x = rx - rater_mean[0]
        dev_y = ry - rater_mean[1]

        weighted_sum_x += weight * dev_x
        weighted_sum_y += weight * dev_y
        weight_total += abs(weight)

    if weight_total == 0:
        return None

    pred_x = target_mean[0] + weighted_sum_x / weight_total
    pred_y = target_mean[1] + weighted_sum_y / weight_total

    pred_x = np.clip(pred_x, 0, 100)
    pred_y = np.clip(pred_y, 0, 100)

    satisfaction = (pred_x + pred_y) / 2
    return satisfaction


# ─── 8. 시뮬레이션 실행 ──────────────────────────────────
print("\n" + "=" * 60)
print("시뮬레이션 실행")
print("=" * 60)

# 유저 평균 계산
print("\n유저 평균 계산 중...")
user_means = {}
for u in range(N_USERS):
    if u in user_ratings:
        user_means[u] = compute_user_mean(user_ratings[u])
    else:
        user_means[u] = (50.0, 50.0)

# 테스트 유저 샘플 (정직한 유저에서 200명)
honest_users = [u for u in range(N_USERS - N_ATTACKERS) if u in user_ratings and len(user_ratings[u]) >= 10]
test_users = np.random.choice(honest_users, min(200, len(honest_users)), replace=False)

print(f"테스트 유저: {len(test_users)}명 (정직한 유저 중 기록 10개 이상)")

# ─── 테스트 A: 일반 니치 식당 예측 정확도 ─────────────────
print("\n--- 테스트 A: 일반 니치 식당 예측 정확도 ---")
print("(타겟이 아닌 니치 식당, 정직한 유저의 실제 점수 vs 예측)")

# 타겟이 아닌 니치 식당 중 샘플
non_target_niche = [r for r in range(N_FRANCHISE, N_RESTAURANTS) if r not in target_restaurants]
test_restaurants_a = np.random.choice(non_target_niche, 30, replace=False)

results_a = {"no_rarity": [], "with_rarity": []}

t0 = time.time()
test_count = 0
for u in test_users[:50]:  # 50명 × 30개 = 1500 예측
    for r in test_restaurants_a:
        if r not in user_ratings[u]:
            continue

        # 실제 점수
        actual = (user_ratings[u][r][0] + user_ratings[u][r][1]) / 2

        # 예측을 위해 해당 기록을 임시 제거
        saved = user_ratings[u].pop(r)
        saved_mean = user_means[u]
        user_means[u] = compute_user_mean(user_ratings[u])

        for mode, use_rarity in [("no_rarity", False), ("with_rarity", True)]:
            pred = predict_score(u, r, user_ratings, user_means, use_rarity=use_rarity)
            if pred is not None:
                results_a[mode].append(abs(actual - pred))

        # 복원
        user_ratings[u][r] = saved
        user_means[u] = saved_mean
        test_count += 1

print(f"  예측 수행: {test_count}건 ({time.time()-t0:.1f}초)")
for mode in ["no_rarity", "with_rarity"]:
    errors = results_a[mode]
    if errors:
        print(f"  {mode:>15}: MAE = {np.mean(errors):.2f} (중앙값 {np.median(errors):.2f}, n={len(errors)})")

# ─── 테스트 B: 프랜차이즈 공격 방어 ─────────────────────
print("\n--- 테스트 B: 프랜차이즈 공격 방어 효과 ---")
print("(타겟 식당에 대한 정직한 유저의 예측 왜곡 측정)")

results_b = {"no_rarity": [], "with_rarity": [], "no_attacker": []}

t0 = time.time()
test_count = 0
for u in test_users:
    for r in target_restaurants:
        if r not in user_ratings[u]:
            continue

        actual = (user_ratings[u][r][0] + user_ratings[u][r][1]) / 2

        saved = user_ratings[u].pop(r)
        saved_mean = user_means[u]
        user_means[u] = compute_user_mean(user_ratings[u])

        # 공격자 포함, 희소성 없음
        pred = predict_score(u, r, user_ratings, user_means, use_rarity=False)
        if pred is not None:
            results_b["no_rarity"].append(abs(actual - pred))

        # 공격자 포함, 희소성 있음
        pred = predict_score(u, r, user_ratings, user_means, use_rarity=True)
        if pred is not None:
            results_b["with_rarity"].append(abs(actual - pred))

        # 공격자 제외 (기준선)
        pred = predict_score(u, r, user_ratings, user_means, use_rarity=False, exclude_attackers=True)
        if pred is not None:
            results_b["no_attacker"].append(abs(actual - pred))

        user_ratings[u][r] = saved
        user_means[u] = saved_mean
        test_count += 1

print(f"  예측 수행: {test_count}건 ({time.time()-t0:.1f}초)")
for mode, label in [
    ("no_attacker", "공격자 없음 (기준)"),
    ("no_rarity", "공격 + 희소성 없음"),
    ("with_rarity", "공격 + 희소성 있음"),
]:
    errors = results_b[mode]
    if errors:
        print(f"  {label:>20}: MAE = {np.mean(errors):.2f} (중앙값 {np.median(errors):.2f}, n={len(errors)})")

# ─── 테스트 C: 공격자의 적합도 분석 ──────────────────────
print("\n--- 테스트 C: 공격자 적합도 분석 ---")
print("(정직한 유저와 공격자 간 적합도 비교)")

# 샘플 정직 유저 20명과 공격자/정직 유저 간 적합도 비교
sample_honest = np.random.choice(test_users, 20, replace=False)
sample_attackers = np.random.choice(attacker_ids, 20, replace=False)
sample_honest_others = np.random.choice(
    [u for u in honest_users if u not in sample_honest], 20, replace=False
)

sim_honest_honest = {"no_rarity": [], "with_rarity": []}
sim_honest_attacker = {"no_rarity": [], "with_rarity": []}

for u in sample_honest:
    for other in sample_honest_others:
        for mode, use_rarity in [("no_rarity", False), ("with_rarity", True)]:
            sim, conf, n = compute_similarity(
                user_ratings[u], user_ratings[other],
                user_means[u], user_means[other],
                use_rarity=use_rarity
            )
            if n >= MIN_OVERLAP:
                sim_honest_honest[mode].append(sim)

    for attacker in sample_attackers:
        for mode, use_rarity in [("no_rarity", False), ("with_rarity", True)]:
            sim, conf, n = compute_similarity(
                user_ratings[u], user_ratings[attacker],
                user_means[u], user_means[attacker],
                use_rarity=use_rarity
            )
            if n >= MIN_OVERLAP:
                sim_honest_attacker[mode].append(sim)

print(f"\n  정직↔정직 적합도:")
for mode in ["no_rarity", "with_rarity"]:
    sims = sim_honest_honest[mode]
    if sims:
        print(f"    {mode:>15}: 평균 {np.mean(sims):.3f}, 중앙값 {np.median(sims):.3f} (n={len(sims)})")

print(f"\n  정직↔공격자 적합도:")
for mode in ["no_rarity", "with_rarity"]:
    sims = sim_honest_attacker[mode]
    if sims:
        print(f"    {mode:>15}: 평균 {np.mean(sims):.3f}, 중앙값 {np.median(sims):.3f} (n={len(sims)})")

# gap 계산
print(f"\n  적합도 gap (정직-공격자):")
for mode in ["no_rarity", "with_rarity"]:
    hh = np.mean(sim_honest_honest[mode]) if sim_honest_honest[mode] else 0
    ha = np.mean(sim_honest_attacker[mode]) if sim_honest_attacker[mode] else 0
    print(f"    {mode:>15}: {hh - ha:.3f}")

# ─── 테스트 D: 공격자의 예측 왜곡 방향 분석 ──────────────
print("\n--- 테스트 D: 타겟 식당 점수 왜곡 방향 ---")
print("(공격자가 점수를 얼마나 끌어올렸는가)")

bias_results = {"no_rarity": [], "with_rarity": [], "no_attacker": []}

for u in test_users:
    for r in target_restaurants:
        if r not in user_ratings[u]:
            continue

        actual = (user_ratings[u][r][0] + user_ratings[u][r][1]) / 2

        saved = user_ratings[u].pop(r)
        saved_mean = user_means[u]
        user_means[u] = compute_user_mean(user_ratings[u])

        pred_no_rarity = predict_score(u, r, user_ratings, user_means, use_rarity=False)
        pred_with_rarity = predict_score(u, r, user_ratings, user_means, use_rarity=True)
        pred_no_attacker = predict_score(u, r, user_ratings, user_means, use_rarity=False, exclude_attackers=True)

        if pred_no_rarity is not None:
            bias_results["no_rarity"].append(pred_no_rarity - actual)
        if pred_with_rarity is not None:
            bias_results["with_rarity"].append(pred_with_rarity - actual)
        if pred_no_attacker is not None:
            bias_results["no_attacker"].append(pred_no_attacker - actual)

        user_ratings[u][r] = saved
        user_means[u] = saved_mean

print(f"\n  평균 편향 (양수 = 점수 부풀림):")
for mode, label in [
    ("no_attacker", "공격자 없음 (기준)"),
    ("no_rarity", "공격 + 희소성 없음"),
    ("with_rarity", "공격 + 희소성 있음"),
]:
    biases = bias_results[mode]
    if biases:
        print(f"    {label:>20}: {np.mean(biases):+.2f} (std {np.std(biases):.2f}, n={len(biases)})")

# ─── 요약 ────────────────────────────────────────────────
print("\n" + "=" * 60)
print("요약")
print("=" * 60)

print(f"""
설정:
  유저 {N_USERS:,}명, 식당 {N_RESTAURANTS}개 ({N_FRANCHISE} 프랜차이즈 + {N_NICHE} 니치)
  공격자 {N_ATTACKERS}명 → 프랜차이즈 {N_FRANCHISE}개 정직 리뷰 + 타겟 {N_TARGET_RESTAURANTS}개 조작 (95,95)

결과:""")

# 테스트 A 요약
if results_a["no_rarity"] and results_a["with_rarity"]:
    mae_a_no = np.mean(results_a["no_rarity"])
    mae_a_yes = np.mean(results_a["with_rarity"])
    print(f"\n  [일반 예측 정확도]")
    print(f"    희소성 없음: MAE {mae_a_no:.2f}")
    print(f"    희소성 있음: MAE {mae_a_yes:.2f}")
    diff = (mae_a_no - mae_a_yes) / mae_a_no * 100
    print(f"    → 차이: {diff:+.1f}%")

# 테스트 B 요약
if results_b["no_attacker"] and results_b["no_rarity"] and results_b["with_rarity"]:
    mae_base = np.mean(results_b["no_attacker"])
    mae_no = np.mean(results_b["no_rarity"])
    mae_yes = np.mean(results_b["with_rarity"])
    print(f"\n  [타겟 식당 공격 방어]")
    print(f"    공격자 없음 (기준):  MAE {mae_base:.2f}")
    print(f"    공격 + 희소성 없음:  MAE {mae_no:.2f} (기준 대비 +{mae_no-mae_base:.2f})")
    print(f"    공격 + 희소성 있음:  MAE {mae_yes:.2f} (기준 대비 +{mae_yes-mae_base:.2f})")
    defense_pct = (1 - (mae_yes - mae_base) / max(mae_no - mae_base, 0.001)) * 100
    print(f"    → 공격 피해 감소율: {defense_pct:.1f}%")

# 테스트 C 요약
if sim_honest_honest["no_rarity"] and sim_honest_attacker["no_rarity"]:
    print(f"\n  [공격자 적합도 감쇠]")
    for mode, label in [("no_rarity", "희소성 없음"), ("with_rarity", "희소성 있음")]:
        hh = np.mean(sim_honest_honest[mode])
        ha = np.mean(sim_honest_attacker[mode])
        print(f"    {label}: 정직↔정직 {hh:.3f} vs 정직↔공격자 {ha:.3f} (gap {hh-ha:.3f})")

# 테스트 D 요약
if bias_results["no_rarity"] and bias_results["with_rarity"]:
    print(f"\n  [점수 부풀림 (타겟 식당)]")
    bias_no = np.mean(bias_results["no_rarity"])
    bias_yes = np.mean(bias_results["with_rarity"])
    bias_base = np.mean(bias_results["no_attacker"])
    print(f"    공격자 없음:        {bias_base:+.2f}")
    print(f"    공격 + 희소성 없음: {bias_no:+.2f}")
    print(f"    공격 + 희소성 있음: {bias_yes:+.2f}")

print()
