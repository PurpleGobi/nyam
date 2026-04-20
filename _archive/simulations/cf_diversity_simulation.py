"""
Nyam CF 시뮬레이션: 겹침 다양성 기반 신뢰도 보정 효과 검증
- 10,000 유저, 500 식당 (50 프랜차이즈 + 440 일반 니치 + 10 극소수 니치)
- 공격자 시나리오: 별로인 식당이 공격자 10명 고용, 프랜차이즈만 리뷰 후 타겟 100점
- 비교: 기본 CF vs 겹침 다양성 보정
"""

import numpy as np
from typing import Optional
import time

np.random.seed(42)

# ─── 설정 ───────────────────────────────────────────────
N_USERS = 10_000
N_RESTAURANTS = 500
N_FRANCHISE = 50
N_ULTRA_NICHE = 10          # 극소수 식당 (타겟)
N_NORMAL_NICHE = N_RESTAURANTS - N_FRANCHISE - N_ULTRA_NICHE
N_CLUSTERS = 5
LAMBDA = 7
D = 60
MIN_OVERLAP = 3

# 공격 시나리오: 현실적 — 소규모 고용
N_ATTACKERS_SCENARIOS = [10, 50, 100, 500]

# 니치 판별 기준: 기록자 N명 이하면 니치
NICHE_THRESHOLD_RATIO = 0.1  # 전체 유저의 10% 이하면 니치

print("=" * 70)
print("Nyam CF 시뮬레이션: 겹침 다양성 기반 신뢰도 보정")
print("=" * 70)

# ─── 1. 식당 생성 ────────────────────────────────────────
franchise_visit_prob = np.random.uniform(0.6, 0.9, N_FRANCHISE)
normal_niche_visit_prob = np.random.uniform(0.01, 0.10, N_NORMAL_NICHE)
# 극소수 니치: 정직한 유저 중 ~20~30명만 방문
ultra_niche_visit_prob = np.random.uniform(0.002, 0.003, N_ULTRA_NICHE)
visit_prob = np.concatenate([franchise_visit_prob, normal_niche_visit_prob, ultra_niche_visit_prob])

print(f"\n유저: {N_USERS:,}명, 식당: {N_RESTAURANTS}개")
print(f"  프랜차이즈 (0~{N_FRANCHISE-1}): {N_FRANCHISE}개, 방문 확률 평균 {franchise_visit_prob.mean():.0%}")
print(f"  일반 니치 ({N_FRANCHISE}~{N_FRANCHISE+N_NORMAL_NICHE-1}): {N_NORMAL_NICHE}개, 방문 확률 평균 {normal_niche_visit_prob.mean():.1%}")
print(f"  극소수 니치 ({N_RESTAURANTS-N_ULTRA_NICHE}~{N_RESTAURANTS-1}): {N_ULTRA_NICHE}개, 방문 확률 평균 {ultra_niche_visit_prob.mean():.2%}")

# ─── 2. 유저 & 취향 ─────────────────────────────────────
cluster_centers = np.array([
    [70, 75], [40, 80], [80, 50], [55, 55], [30, 35],
])
user_clusters = np.random.randint(0, N_CLUSTERS, N_USERS)
user_taste = cluster_centers[user_clusters] + np.random.normal(0, 8, (N_USERS, 2))

# ─── 3. 식당 특성 ───────────────────────────────────────
restaurant_true = np.random.uniform(20, 90, (N_RESTAURANTS, 2))
# 극소수 니치(타겟)는 실제로 별로인 식당: 특성이 낮음
for r in range(N_RESTAURANTS - N_ULTRA_NICHE, N_RESTAURANTS):
    restaurant_true[r] = np.random.uniform(20, 40, 2)  # 실제 퀄리티 낮음

# ─── 4. 리뷰 생성 ───────────────────────────────────────
print("\n리뷰 생성 중...")
t0 = time.time()
user_ratings = {}

for u in range(N_USERS):
    visited = np.random.random(N_RESTAURANTS) < visit_prob
    visited_ids = np.where(visited)[0]
    if len(visited_ids) == 0:
        continue
    ratings = {}
    for r in visited_ids:
        taste_diff = restaurant_true[r] - user_taste[u]
        base_score = 50 + (100 - np.abs(taste_diff)) * 0.5
        noise = np.random.normal(0, 5, 2)
        score = np.clip(base_score + noise, 0, 100)
        ratings[r] = (float(score[0]), float(score[1]))
    user_ratings[u] = ratings

total_reviews = sum(len(r) for r in user_ratings.values())
print(f"총 리뷰: {total_reviews:,}개 ({time.time()-t0:.1f}초)")

# 식당별 기록자 수
restaurant_reviewer_count = np.zeros(N_RESTAURANTS, dtype=int)
for u, ratings in user_ratings.items():
    for r in ratings:
        restaurant_reviewer_count[r] += 1

# 니치 판별 기준
niche_threshold = N_USERS * NICHE_THRESHOLD_RATIO
print(f"\n식당별 기록자 수:")
print(f"  프랜차이즈 평균: {restaurant_reviewer_count[:N_FRANCHISE].mean():.0f}명")
print(f"  일반 니치 평균: {restaurant_reviewer_count[N_FRANCHISE:N_RESTAURANTS-N_ULTRA_NICHE].mean():.0f}명")
print(f"  극소수 니치 평균: {restaurant_reviewer_count[N_RESTAURANTS-N_ULTRA_NICHE:].mean():.0f}명")
print(f"  니치 판별 기준: 기록자 {niche_threshold:.0f}명 이하")

# 타겟 식당
target_restaurants = np.array(range(N_RESTAURANTS - N_ULTRA_NICHE, N_RESTAURANTS))

# ─── 5. CF 엔진 ──────────────────────────────────────────

def compute_user_mean(ratings: dict) -> tuple:
    if not ratings:
        return (50.0, 50.0)
    xs = [v[0] for v in ratings.values()]
    ys = [v[1] for v in ratings.values()]
    return (np.mean(xs), np.mean(ys))


def compute_similarity_and_confidence(
    ratings_a: dict, ratings_b: dict,
    mean_a: tuple, mean_b: tuple,
    mode: str = "baseline"  # "baseline" | "diversity"
) -> tuple:
    """적합도 + 신뢰도 계산. mode에 따라 신뢰도 보정."""
    overlap = set(ratings_a.keys()) & set(ratings_b.keys())
    n = len(overlap)

    if n < MIN_OVERLAP:
        return (0.0, 0.0, 0)

    distances = []
    niche_overlap_count = 0

    for r in overlap:
        ax, ay = ratings_a[r]
        bx, by = ratings_b[r]
        ax_c, ay_c = ax - mean_a[0], ay - mean_a[1]
        bx_c, by_c = bx - mean_b[0], by - mean_b[1]
        dist = np.sqrt((ax_c - bx_c)**2 + (ay_c - by_c)**2)
        distances.append(dist)

        if restaurant_reviewer_count[r] <= niche_threshold:
            niche_overlap_count += 1

    avg_dist = np.mean(distances)
    similarity = max(0.0, 1.0 - avg_dist / D)

    # 신뢰도 계산
    base_confidence = n / (n + LAMBDA)

    if mode == "diversity":
        # 겹침 다양성 보정: 니치 겹침 비율을 곱함
        niche_ratio = niche_overlap_count / n if n > 0 else 0.0
        confidence = base_confidence * niche_ratio
    else:
        confidence = base_confidence

    return (similarity, confidence, n)


def predict_score(
    target_user: int, target_restaurant: int,
    all_ratings: dict, user_means: dict,
    mode: str = "baseline",
    exclude_users: set = None,
) -> Optional[tuple]:
    """Nyam 점수 예측. (satisfaction, n_raters) 또는 None 반환."""
    if target_user not in all_ratings:
        return None

    target_ratings = all_ratings[target_user]
    target_mean = user_means[target_user]

    raters = []
    for u, ratings in all_ratings.items():
        if u == target_user:
            continue
        if exclude_users and u in exclude_users:
            continue
        if target_restaurant in ratings:
            raters.append(u)

    if not raters:
        return None

    weighted_sum_x = 0.0
    weighted_sum_y = 0.0
    weight_total = 0.0
    n_effective = 0

    for rater in raters:
        rater_ratings = all_ratings[rater]
        rater_mean = user_means[rater]

        sim, conf, n_overlap = compute_similarity_and_confidence(
            target_ratings, rater_ratings,
            target_mean, rater_mean,
            mode=mode
        )

        weight = sim * conf
        if weight < 0.01:
            continue

        rx, ry = rater_ratings[target_restaurant]
        dev_x = rx - rater_mean[0]
        dev_y = ry - rater_mean[1]

        weighted_sum_x += weight * dev_x
        weighted_sum_y += weight * dev_y
        weight_total += abs(weight)
        n_effective += 1

    if weight_total == 0:
        return None

    pred_x = target_mean[0] + weighted_sum_x / weight_total
    pred_y = target_mean[1] + weighted_sum_y / weight_total
    pred_x = np.clip(pred_x, 0, 100)
    pred_y = np.clip(pred_y, 0, 100)

    satisfaction = (pred_x + pred_y) / 2
    return (satisfaction, n_effective)


# ─── 6. 테스트 유저 준비 ─────────────────────────────────
user_means = {}
for u in range(N_USERS):
    if u in user_ratings:
        user_means[u] = compute_user_mean(user_ratings[u])
    else:
        user_means[u] = (50.0, 50.0)

honest_users = [u for u in range(N_USERS) if u in user_ratings and len(user_ratings[u]) >= 10]
test_users = np.random.choice(honest_users, min(200, len(honest_users)), replace=False)

# ─── 7. 공격 시나리오별 테스트 ───────────────────────────
print("\n" + "=" * 70)
print("공격 시나리오별 테스트")
print("=" * 70)

# 원본 백업
original_ratings = {u: dict(ratings) for u, ratings in user_ratings.items()}
original_means = dict(user_means)

for n_attackers in N_ATTACKERS_SCENARIOS:
    print(f"\n{'─' * 70}")
    print(f"시나리오: 공격자 {n_attackers}명, 타겟 {N_ULTRA_NICHE}개 극소수 니치 식당")
    print(f"{'─' * 70}")

    # 원본 복원
    user_ratings = {u: dict(ratings) for u, ratings in original_ratings.items()}
    user_means = dict(original_means)

    # 공격자 설정
    attacker_ids = list(range(N_USERS - n_attackers, N_USERS))
    attacker_set = set(attacker_ids)

    for u in attacker_ids:
        user_ratings[u] = {}

        # 프랜차이즈 전부 정직하게 리뷰
        for r in range(N_FRANCHISE):
            taste_diff = restaurant_true[r] - user_taste[u]
            base_score = 50 + (100 - np.abs(taste_diff)) * 0.5
            noise = np.random.normal(0, 5, 2)
            score = np.clip(base_score + noise, 0, 100)
            user_ratings[u][r] = (float(score[0]), float(score[1]))

        # 타겟 식당만 100점 조작
        for r in target_restaurants:
            user_ratings[u][r] = (100.0, 100.0)

        user_means[u] = compute_user_mean(user_ratings[u])

    # 기록자 수 재계산
    rc = np.zeros(N_RESTAURANTS, dtype=int)
    for u, ratings in user_ratings.items():
        for r in ratings:
            rc[r] += 1

    # 타겟 식당 기록자 분석
    for r in target_restaurants[:3]:  # 3개만 표시
        honest_c = sum(1 for u, ratings in user_ratings.items() if r in ratings and u not in attacker_set)
        attack_c = sum(1 for u in attacker_ids if r in user_ratings.get(u, {}))
        total = honest_c + attack_c
        print(f"  식당 {r}: 정직 {honest_c}명 + 공격 {attack_c}명 = 총 {total}명 (공격자 {attack_c/max(total,1)*100:.0f}%)")

    # 실제 점수 (별로인 식당이므로 낮아야 함)
    actual_scores = []
    for u in test_users:
        for r in target_restaurants:
            if r in original_ratings.get(u, {}):
                s = (original_ratings[u][r][0] + original_ratings[u][r][1]) / 2
                actual_scores.append(s)
    if actual_scores:
        print(f"  타겟 식당 실제 평균 점수: {np.mean(actual_scores):.1f} (정직한 유저 기준)")
    else:
        print(f"  타겟 식당에 방문한 테스트 유저 없음 — 전체 정직 유저로 대체 계산")
        # 타겟에 기록이 있는 아무 정직한 유저로 계산
        for r in target_restaurants:
            for u in range(N_USERS - n_attackers):
                if u in original_ratings and r in original_ratings[u]:
                    s = (original_ratings[u][r][0] + original_ratings[u][r][1]) / 2
                    actual_scores.append(s)
        if actual_scores:
            print(f"  타겟 식당 실제 평균 점수: {np.mean(actual_scores):.1f} (방문한 정직 유저 기준)")

    # 예측 테스트
    results = {
        "no_attack": [],      # 공격 없음 (기준선)
        "baseline": [],       # 기본 CF (공격 포함)
        "diversity": [],      # 겹침 다양성 보정 (공격 포함)
    }
    bias = {
        "no_attack": [],
        "baseline": [],
        "diversity": [],
    }

    t0 = time.time()
    test_count = 0

    # 타겟 식당에 기록이 있는 테스트 유저가 적을 수 있으므로, 전체 정직 유저 중 기록 있는 사람을 찾음
    test_pairs = []
    for u in test_users:
        for r in target_restaurants:
            if r in user_ratings[u] and u not in attacker_set:
                test_pairs.append((u, r))

    # 테스트 유저 부족하면 더 찾기
    if len(test_pairs) < 20:
        for u in honest_users:
            if u in set(test_users):
                continue
            for r in target_restaurants:
                if r in user_ratings.get(u, {}) and u not in attacker_set:
                    test_pairs.append((u, r))
            if len(test_pairs) >= 50:
                break

    print(f"  테스트 쌍: {len(test_pairs)}건")

    for u, r in test_pairs:
        actual = (user_ratings[u][r][0] + user_ratings[u][r][1]) / 2

        # 해당 기록 임시 제거
        saved = user_ratings[u].pop(r)
        saved_mean = user_means[u]
        user_means[u] = compute_user_mean(user_ratings[u])

        # 공격 없음 (기준)
        pred = predict_score(u, r, user_ratings, user_means, mode="baseline", exclude_users=attacker_set)
        if pred is not None:
            results["no_attack"].append(abs(actual - pred[0]))
            bias["no_attack"].append(pred[0] - actual)

        # 기본 CF (공격 포함)
        pred = predict_score(u, r, user_ratings, user_means, mode="baseline")
        if pred is not None:
            results["baseline"].append(abs(actual - pred[0]))
            bias["baseline"].append(pred[0] - actual)

        # 겹침 다양성 보정 (공격 포함)
        pred = predict_score(u, r, user_ratings, user_means, mode="diversity")
        if pred is not None:
            results["diversity"].append(abs(actual - pred[0]))
            bias["diversity"].append(pred[0] - actual)

        # 복원
        user_ratings[u][r] = saved
        user_means[u] = saved_mean
        test_count += 1

    print(f"  소요: {time.time()-t0:.1f}초")

    # 결과 출력
    print(f"\n  {'모드':<25} {'MAE':>6} {'편향(+부풀림)':>14} {'n':>5}")
    print(f"  {'─' * 55}")
    for mode, label in [
        ("no_attack", "공격 없음 (기준)"),
        ("baseline", "기본 CF (공격 포함)"),
        ("diversity", "다양성 보정 (공격 포함)"),
    ]:
        if results[mode]:
            mae = np.mean(results[mode])
            b = np.mean(bias[mode])
            n = len(results[mode])
            print(f"  {label:<25} {mae:>6.2f} {b:>+13.2f} {n:>5}")
        else:
            print(f"  {label:<25} {'N/A':>6} {'N/A':>14} {'0':>5}")

    # 방어 효과
    if results["baseline"] and results["diversity"] and results["no_attack"]:
        attack_damage = np.mean(bias["baseline"]) - np.mean(bias["no_attack"])
        diversity_damage = np.mean(bias["diversity"]) - np.mean(bias["no_attack"])
        if abs(attack_damage) > 0.01:
            reduction = (1 - diversity_damage / attack_damage) * 100
            print(f"\n  공격으로 인한 점수 부풀림: {attack_damage:+.2f}")
            print(f"  다양성 보정 후 부풀림:     {diversity_damage:+.2f}")
            print(f"  → 부풀림 감소율: {reduction:.1f}%")

# ─── 8. 일반 니치 예측 정확도 (부작용 확인) ──────────────
print(f"\n{'=' * 70}")
print("부작용 확인: 일반 니치 식당 예측 정확도")
print(f"{'=' * 70}")

# 공격 없는 상태로 복원
user_ratings = {u: dict(ratings) for u, ratings in original_ratings.items()}
user_means = dict(original_means)

non_target_niche = [r for r in range(N_FRANCHISE, N_RESTAURANTS - N_ULTRA_NICHE)]
test_restaurants_normal = np.random.choice(non_target_niche, 30, replace=False)

results_normal = {"baseline": [], "diversity": []}

for u in test_users[:50]:
    for r in test_restaurants_normal:
        if r not in user_ratings.get(u, {}):
            continue

        actual = (user_ratings[u][r][0] + user_ratings[u][r][1]) / 2

        saved = user_ratings[u].pop(r)
        saved_mean = user_means[u]
        user_means[u] = compute_user_mean(user_ratings[u])

        for mode in ["baseline", "diversity"]:
            pred = predict_score(u, r, user_ratings, user_means, mode=mode)
            if pred is not None:
                results_normal[mode].append(abs(actual - pred[0]))

        user_ratings[u][r] = saved
        user_means[u] = saved_mean

print(f"\n  {'모드':<25} {'MAE':>6} {'n':>5}")
print(f"  {'─' * 40}")
for mode, label in [("baseline", "기본 CF"), ("diversity", "다양성 보정")]:
    if results_normal[mode]:
        mae = np.mean(results_normal[mode])
        n = len(results_normal[mode])
        print(f"  {label:<25} {mae:>6.2f} {n:>5}")

if results_normal["baseline"] and results_normal["diversity"]:
    diff = np.mean(results_normal["diversity"]) - np.mean(results_normal["baseline"])
    pct = diff / np.mean(results_normal["baseline"]) * 100
    print(f"\n  다양성 보정의 일반 예측 영향: MAE {diff:+.2f} ({pct:+.1f}%)")
    if pct > 5:
        print(f"  ⚠️  일반 예측 정확도가 {pct:.1f}% 악화됨 — 부작용 있음")
    elif pct < -1:
        print(f"  ✓ 일반 예측도 오히려 개선됨")
    else:
        print(f"  ✓ 일반 예측에 유의미한 영향 없음")

print()
