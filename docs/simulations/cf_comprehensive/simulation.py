"""
Nyam CF 종합 시뮬레이션
강남구 10,000명 규모. 성장 단계별 × 유저 그룹별 × 공격 시나리오별 검증.
설계: DESIGN.md 참조.
"""

import numpy as np
from collections import defaultdict
import time
import json

np.random.seed(42)

# ═══════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════

N_USERS_MAX = 10_000
N_RESTAURANTS = 1000
LAMBDA = 7
D = 60
MIN_OVERLAP = 3

# 식당 등급별 설정 (수, 방문 확률 범위, 퀄리티 범위)
RESTAURANT_TIERS = {
    'S': {'count': 30,  'visit_prob': (0.40, 0.70), 'quality': (45, 65), 'quality_std': 5},
    'A': {'count': 70,  'visit_prob': (0.15, 0.35), 'quality': (40, 65), 'quality_std': 8},
    'B': {'count': 150, 'visit_prob': (0.05, 0.15), 'quality': (55, 85), 'quality_std': 10},
    'C': {'count': 400, 'visit_prob': (0.01, 0.05), 'quality': (30, 70), 'quality_std': 15},
    'D': {'count': 250, 'visit_prob': (0.003, 0.01), 'quality': (20, 90), 'quality_std': 20},
    'E': {'count': 100, 'visit_prob': (0.0005, 0.003), 'quality': (15, 45), 'quality_std': 12},
}

# 유저 그룹별 설정
USER_GROUPS = {
    'heavy':  {'records': (50, 200)},
    'active': {'records': (20, 50)},
    'normal': {'records': (5, 20)},
    'light':  {'records': (2, 5)},
    'new':    {'records': (0, 2)},
}

# 그룹별 식당 등급 방문 가중치
VISIT_WEIGHTS = {
    'heavy':  {'S': 1.0, 'A': 1.2, 'B': 2.0, 'C': 1.5, 'D': 3.0, 'E': 0.5},
    'active': {'S': 1.0, 'A': 1.2, 'B': 2.5, 'C': 1.0, 'D': 1.0, 'E': 0.3},
    'normal': {'S': 2.0, 'A': 1.5, 'B': 1.5, 'C': 0.8, 'D': 0.3, 'E': 0.1},
    'light':  {'S': 3.0, 'A': 2.0, 'B': 0.5, 'C': 0.3, 'D': 0.1, 'E': 0.05},
    'new':    {'S': 3.0, 'A': 1.0, 'B': 0.3, 'C': 0.1, 'D': 0.05, 'E': 0.02},
}

# 취향 클러스터 (X_offset, Y_offset, 설명)
CLUSTERS = {
    'value':      {'ratio': 0.25, 'x_off': -5,  'y_off': +10, 'desc': '가성비파'},
    'ambiance':   {'ratio': 0.20, 'x_off': -10, 'y_off': +15, 'desc': '분위기파'},
    'gourmet':    {'ratio': 0.10, 'x_off': +15, 'y_off': +5,  'desc': '미식가'},
    'convenience':{'ratio': 0.25, 'x_off': -5,  'y_off': -5,  'desc': '편의파'},
    'sns':        {'ratio': 0.10, 'x_off': -8,  'y_off': +12, 'desc': 'SNS파'},
    'health':     {'ratio': 0.10, 'x_off': +10, 'y_off': +8,  'desc': '건강파'},
}

# 성장 단계
STAGES = [100, 500, 1000, 3000, 5000, 10000]

# 단계별 유저 그룹 구성 비율
STAGE_COMPOSITION = {
    100:   {'heavy': 0.20, 'active': 0.30, 'normal': 0.30, 'light': 0.15, 'new': 0.05},
    500:   {'heavy': 0.15, 'active': 0.25, 'normal': 0.35, 'light': 0.20, 'new': 0.05},
    1000:  {'heavy': 0.10, 'active': 0.20, 'normal': 0.40, 'light': 0.20, 'new': 0.10},
    3000:  {'heavy': 0.08, 'active': 0.18, 'normal': 0.40, 'light': 0.22, 'new': 0.12},
    5000:  {'heavy': 0.06, 'active': 0.16, 'normal': 0.40, 'light': 0.23, 'new': 0.15},
    10000: {'heavy': 0.05, 'active': 0.15, 'normal': 0.40, 'light': 0.25, 'new': 0.15},
}

# 팔로우 설정
FOLLOW_COUNT = {
    'heavy': 15, 'active': 8, 'normal': 3, 'light': 1, 'new': 0,
}

# 공격 시나리오
ATTACK_SCENARIOS = {
    'A_small':     {'n_attackers': 10,  'n_targets': 1, 'target_tier': 'E', 'fake_score': 100, 'honest_tiers': ['S']},
    'B_medium':    {'n_attackers': 50,  'n_targets': 3, 'target_tier': 'E', 'fake_score': 100, 'honest_tiers': ['S', 'A']},
    'C_organized': {'n_attackers': 200, 'n_targets': 5, 'target_tier': 'E', 'fake_score': 95,  'honest_tiers': ['S', 'A', 'B']},
}

# ═══════════════════════════════════════════════════════════
# 1. 식당 생성
# ═══════════════════════════════════════════════════════════

print("=" * 70)
print("Nyam CF 종합 시뮬레이션 — 강남구 10,000명")
print("=" * 70)

restaurants = []  # [(tier, base_visit_prob, quality_x, quality_y)]
restaurant_tiers = []
tier_ranges = {}
idx = 0

for tier, cfg in RESTAURANT_TIERS.items():
    start_idx = idx
    for _ in range(cfg['count']):
        vp = np.random.uniform(*cfg['visit_prob'])
        qx = np.clip(np.random.normal(
            np.mean(cfg['quality']), cfg['quality_std']
        ), 5, 95)
        qy = np.clip(np.random.normal(
            np.mean(cfg['quality']), cfg['quality_std']
        ), 5, 95)
        restaurants.append((tier, vp, qx, qy))
        restaurant_tiers.append(tier)
        idx += 1
    tier_ranges[tier] = (start_idx, idx)

restaurant_tiers = np.array(restaurant_tiers)
restaurant_quality = np.array([(r[2], r[3]) for r in restaurants])
restaurant_base_vp = np.array([r[1] for r in restaurants])

# 니치 판별: 10,000명 기준 10% = 1000명 이하
NICHE_THRESHOLD = 1000

print(f"\n식당: {N_RESTAURANTS}개")
for tier, (start, end) in tier_ranges.items():
    avg_vp = restaurant_base_vp[start:end].mean()
    avg_q = restaurant_quality[start:end].mean()
    print(f"  {tier}: {end-start}개, 방문확률 {avg_vp:.1%}, 퀄리티 평균 ({restaurant_quality[start:end, 0].mean():.0f}, {restaurant_quality[start:end, 1].mean():.0f})")

# ═══════════════════════════════════════════════════════════
# 2. 전체 10,000명 유저 생성 (풀에서 단계별로 샘플링)
# ═══════════════════════════════════════════════════════════

print("\n유저 생성 중...")

# 클러스터 배정
cluster_names = list(CLUSTERS.keys())
cluster_probs = [CLUSTERS[c]['ratio'] for c in cluster_names]
user_cluster_ids = np.random.choice(len(cluster_names), N_USERS_MAX, p=cluster_probs)
user_clusters = [cluster_names[i] for i in user_cluster_ids]

# 개인 오프셋
user_personal_offset = np.random.normal(0, 6, (N_USERS_MAX, 2))

# 그룹 배정 (10,000명 기준 비율)
group_names = list(USER_GROUPS.keys())
final_comp = STAGE_COMPOSITION[10000]
group_assignments = np.random.choice(
    group_names,
    N_USERS_MAX,
    p=[final_comp[g] for g in group_names]
)

# 팔로우 네트워크 생성
print("팔로우 네트워크 생성 중...")
user_following = defaultdict(set)  # user -> set of followed users
for u in range(N_USERS_MAX):
    group = group_assignments[u]
    n_follow = FOLLOW_COUNT[group]
    if n_follow == 0:
        continue
    # 같은 클러스터 70%, 다른 클러스터 30%
    same_cluster = [i for i in range(N_USERS_MAX) if i != u and user_clusters[i] == user_clusters[u]]
    diff_cluster = [i for i in range(N_USERS_MAX) if i != u and user_clusters[i] != user_clusters[u]]

    n_same = min(int(n_follow * 0.7), len(same_cluster))
    n_diff = min(n_follow - n_same, len(diff_cluster))

    if n_same > 0:
        follows = list(np.random.choice(same_cluster, n_same, replace=False))
    else:
        follows = []
    if n_diff > 0:
        follows += list(np.random.choice(diff_cluster, n_diff, replace=False))

    user_following[u] = set(follows)

# ═══════════════════════════════════════════════════════════
# 3. 리뷰 생성
# ═══════════════════════════════════════════════════════════

print("리뷰 생성 중...")
t0 = time.time()

user_ratings = {}  # {user_id: {restaurant_id: (x, y)}}

def score_restaurant(user_id, restaurant_id):
    """유저가 식당을 평가한 점수 생성"""
    qx, qy = restaurant_quality[restaurant_id]
    cluster = user_clusters[user_id]
    cx = CLUSTERS[cluster]['x_off']
    cy = CLUSTERS[cluster]['y_off']
    px, py = user_personal_offset[user_id]
    noise = np.random.normal(0, 6, 2)

    x = np.clip(qx + cx + px + noise[0], 0, 100)
    y = np.clip(qy + cy + py + noise[1], 0, 100)
    return (float(x), float(y))

for u in range(N_USERS_MAX):
    group = group_assignments[u]
    target_records = np.random.randint(*USER_GROUPS[group]['records'])
    if target_records == 0:
        user_ratings[u] = {}
        continue

    # 방문 확률 = 식당 기본 확률 × 그룹별 등급 가중치
    weights = VISIT_WEIGHTS[group]
    visit_probs = np.array([
        restaurant_base_vp[r] * weights[restaurant_tiers[r]]
        for r in range(N_RESTAURANTS)
    ])
    visit_probs = visit_probs / visit_probs.sum()

    # target_records개 식당 선택 (중복 없이)
    n_visit = min(target_records, N_RESTAURANTS)
    visited = np.random.choice(N_RESTAURANTS, n_visit, replace=False, p=visit_probs)

    ratings = {}
    for r in visited:
        ratings[r] = score_restaurant(u, r)
    user_ratings[u] = ratings

total_reviews = sum(len(r) for r in user_ratings.values())
print(f"총 리뷰: {total_reviews:,}개 ({time.time()-t0:.1f}초)")

# 식당별 기록자 수 (전체 10,000명 기준)
full_reviewer_count = np.zeros(N_RESTAURANTS, dtype=int)
for u, ratings in user_ratings.items():
    for r in ratings:
        full_reviewer_count[r] += 1

# ═══════════════════════════════════════════════════════════
# 4. CF 엔진
# ═══════════════════════════════════════════════════════════

def compute_user_mean(ratings):
    if not ratings:
        return (50.0, 50.0)
    xs = [v[0] for v in ratings.values()]
    ys = [v[1] for v in ratings.values()]
    return (float(np.mean(xs)), float(np.mean(ys)))


def compute_sim_conf(ratings_a, ratings_b, mean_a, mean_b,
                     mode="baseline", reviewer_count=None):
    overlap = set(ratings_a.keys()) & set(ratings_b.keys())
    n = len(overlap)
    if n < MIN_OVERLAP:
        return (0.0, 0.0, 0)

    distances = []
    niche_count = 0
    for r in overlap:
        ax_c = ratings_a[r][0] - mean_a[0]
        ay_c = ratings_a[r][1] - mean_a[1]
        bx_c = ratings_b[r][0] - mean_b[0]
        by_c = ratings_b[r][1] - mean_b[1]
        dist = np.sqrt((ax_c - bx_c)**2 + (ay_c - by_c)**2)
        distances.append(dist)
        if reviewer_count is not None and reviewer_count[r] <= NICHE_THRESHOLD:
            niche_count += 1

    avg_dist = np.mean(distances)
    similarity = max(0.0, 1.0 - avg_dist / D)
    base_confidence = n / (n + LAMBDA)

    if mode == "diversity" and reviewer_count is not None:
        niche_ratio = niche_count / n
        confidence = base_confidence * niche_ratio
    else:
        confidence = base_confidence

    return (similarity, confidence, n)


def predict_score(target_user, target_restaurant, ratings_pool, means_pool,
                  mode="baseline", reviewer_count=None, following_set=None,
                  exclude_users=None):
    if target_user not in ratings_pool or not ratings_pool[target_user]:
        return None

    t_ratings = ratings_pool[target_user]
    t_mean = means_pool[target_user]

    raters = [u for u, r in ratings_pool.items()
              if u != target_user
              and target_restaurant in r
              and (exclude_users is None or u not in exclude_users)]

    if not raters:
        return None

    ws_x, ws_y, w_total = 0.0, 0.0, 0.0
    n_eff = 0
    weights_list = []

    for rater in raters:
        sim, conf, _ = compute_sim_conf(
            t_ratings, ratings_pool[rater],
            t_mean, means_pool[rater],
            mode=mode, reviewer_count=reviewer_count
        )
        weight = sim * conf

        # 팔로우 부스트 (CF+다양성+부스트 모드)
        if mode == "diversity_boost" and following_set:
            if rater in following_set.get(target_user, set()):
                weight *= 1.5

        if weight < 0.01:
            continue

        rx, ry = ratings_pool[rater][target_restaurant]
        rm = means_pool[rater]
        ws_x += weight * (rx - rm[0])
        ws_y += weight * (ry - rm[1])
        w_total += abs(weight)
        n_eff += 1
        weights_list.append(weight)

    if w_total == 0:
        return None

    pred_x = np.clip(t_mean[0] + ws_x / w_total, 0, 100)
    pred_y = np.clip(t_mean[1] + ws_y / w_total, 0, 100)
    sat = (pred_x + pred_y) / 2

    # 확신도
    n_factor = n_eff / (n_eff + 7)
    if len(weights_list) > 1:
        w_arr = np.array(weights_list)
        agreement = 1.0 - min(np.std(w_arr) / 2, 1.0)
        quality = np.mean(w_arr) / (np.mean(w_arr) + 0.3)
    else:
        agreement = 0.3
        quality = 0.1
    confidence_score = n_factor * 0.50 + agreement * 0.35 + quality * 0.15

    return (float(sat), float(confidence_score), n_eff)


def simple_average(target_restaurant, ratings_pool, exclude_users=None):
    """단순 평균 (네이버/구글 방식)"""
    scores = []
    for u, r in ratings_pool.items():
        if exclude_users and u in exclude_users:
            continue
        if target_restaurant in r:
            x, y = r[target_restaurant]
            scores.append((x + y) / 2)
    if not scores:
        return None
    return float(np.mean(scores))


# ═══════════════════════════════════════════════════════════
# 5. 성장 단계별 시뮬레이션
# ═══════════════════════════════════════════════════════════

results = {}

for stage_n in STAGES:
    print(f"\n{'=' * 70}")
    print(f"Stage: {stage_n:,}명")
    print(f"{'=' * 70}")
    t_stage = time.time()

    # 단계별 유저 샘플링 (구성 비율에 맞게)
    comp = STAGE_COMPOSITION[stage_n]
    stage_users = []

    for group in group_names:
        n_group = int(stage_n * comp[group])
        candidates = [u for u in range(N_USERS_MAX) if group_assignments[u] == group]
        selected = np.random.choice(candidates, min(n_group, len(candidates)), replace=False)
        stage_users.extend(selected)

    stage_users = stage_users[:stage_n]
    stage_user_set = set(stage_users)

    # 이 단계의 ratings pool
    stage_ratings = {u: user_ratings[u] for u in stage_users if u in user_ratings}
    stage_means = {u: compute_user_mean(stage_ratings.get(u, {})) for u in stage_users}

    # 식당별 기록자 수 (이 단계 기준)
    stage_rc = np.zeros(N_RESTAURANTS, dtype=int)
    for u in stage_users:
        for r in stage_ratings.get(u, {}):
            stage_rc[r] += 1

    # 그룹별 유저 수
    group_users = defaultdict(list)
    for u in stage_users:
        group_users[group_assignments[u]].append(u)

    print(f"  구성: " + ", ".join(f"{g}={len(group_users[g])}" for g in group_names))

    # ─── 테스트: 그룹별 예측 정확도 + 확신도 ────────────
    stage_results = {}

    for group in group_names:
        g_users = [u for u in group_users[group]
                   if u in stage_ratings and len(stage_ratings[u]) >= 2]

        if not g_users:
            stage_results[group] = {'n_tests': 0}
            continue

        # 테스트 유저 샘플 (최대 30명)
        test_sample = np.random.choice(g_users, min(30, len(g_users)), replace=False)

        group_result = {
            'n_tests': 0,
            'simple_avg': {'mae': [], 'bias': []},
            'baseline':   {'mae': [], 'bias': [], 'confidence': []},
            'diversity':  {'mae': [], 'bias': [], 'confidence': []},
            'div_boost':  {'mae': [], 'bias': [], 'confidence': []},
        }

        for u in test_sample:
            rated = list(stage_ratings[u].keys())
            if len(rated) < 2:
                continue

            # 테스트할 식당 (최대 5개)
            test_restaurants = np.random.choice(rated, min(5, len(rated)), replace=False)

            for r in test_restaurants:
                actual = (stage_ratings[u][r][0] + stage_ratings[u][r][1]) / 2

                # 임시 제거
                saved = stage_ratings[u].pop(r)
                saved_mean = stage_means[u]
                stage_means[u] = compute_user_mean(stage_ratings[u])

                # 단순 평균
                sa = simple_average(r, stage_ratings)
                if sa is not None:
                    group_result['simple_avg']['mae'].append(abs(actual - sa))
                    group_result['simple_avg']['bias'].append(sa - actual)

                # CF 모드별
                for mode_key, mode_name in [
                    ('baseline', 'baseline'),
                    ('diversity', 'diversity'),
                    ('div_boost', 'diversity_boost'),
                ]:
                    pred = predict_score(
                        u, r, stage_ratings, stage_means,
                        mode=mode_name, reviewer_count=stage_rc,
                        following_set=user_following
                    )
                    if pred is not None:
                        sat, conf, n_eff = pred
                        group_result[mode_key]['mae'].append(abs(actual - sat))
                        group_result[mode_key]['bias'].append(sat - actual)
                        group_result[mode_key]['confidence'].append(conf)

                group_result['n_tests'] += 1

                # 복원
                stage_ratings[u][r] = saved
                stage_means[u] = saved_mean

        stage_results[group] = group_result

    # ─── 결과 출력 ───────────────────────────────────────
    print(f"\n  {'그룹':<8} {'테스트':>5} │ {'단순평균':>8} │ {'기본CF':>8} {'확신도':>6} │ {'다양성':>8} {'확신도':>6} │ {'최종':>8} {'확신도':>6}")
    print(f"  {'─' * 90}")

    for group in group_names:
        gr = stage_results[group]
        n = gr['n_tests']
        if n == 0:
            print(f"  {group:<8} {0:>5} │ {'N/A':>8} │ {'N/A':>8} {'N/A':>6} │ {'N/A':>8} {'N/A':>6} │ {'N/A':>8} {'N/A':>6}")
            continue

        sa_mae = f"{np.mean(gr['simple_avg']['mae']):.1f}" if gr['simple_avg']['mae'] else "N/A"

        row = f"  {group:<8} {n:>5} │ {sa_mae:>8} │"
        for mode in ['baseline', 'diversity', 'div_boost']:
            if gr[mode]['mae']:
                mae = np.mean(gr[mode]['mae'])
                conf = np.mean(gr[mode]['confidence'])
                row += f" {mae:>7.1f} {conf:>6.2f} │"
            else:
                row += f" {'N/A':>7} {'N/A':>6} │"
        print(row)

    # 확신도 분포
    print(f"\n  확신도 경험 분포 (CF+다양성+부스트):")
    print(f"  {'그룹':<8} │ {'데이터부족':>10} {'참고용':>8} {'정상':>8} │ {'경험률':>8}")
    print(f"  {'─' * 60}")

    stage_confidence_data = {}

    for group in group_names:
        gr = stage_results[group]
        confs = gr.get('div_boost', {}).get('confidence', [])
        if not confs:
            print(f"  {group:<8} │ {'N/A':>10} {'N/A':>8} {'N/A':>8} │ {'N/A':>8}")
            stage_confidence_data[group] = {'low': 0, 'mid': 0, 'high': 0, 'rate': 0}
            continue

        confs = np.array(confs)
        low = np.mean(confs < 0.3) * 100
        mid = np.mean((confs >= 0.3) & (confs < 0.5)) * 100
        high = np.mean(confs >= 0.5) * 100
        rate = mid + high

        stage_confidence_data[group] = {
            'low': float(low), 'mid': float(mid), 'high': float(high), 'rate': float(rate)
        }

        print(f"  {group:<8} │ {low:>9.0f}% {mid:>7.0f}% {high:>7.0f}% │ {rate:>7.0f}%")

    # 확신도별 MAE
    print(f"\n  확신도별 MAE (CF+다양성+부스트):")
    all_mae = []
    all_conf = []
    for group in group_names:
        gr = stage_results[group]
        if gr.get('div_boost', {}).get('mae'):
            all_mae.extend(gr['div_boost']['mae'])
            all_conf.extend(gr['div_boost']['confidence'])

    if all_mae:
        mae_arr = np.array(all_mae)
        conf_arr = np.array(all_conf)
        for label, lo, hi in [("데이터 부족", 0, 0.3), ("참고용", 0.3, 0.5), ("정상", 0.5, 1.0)]:
            mask = (conf_arr >= lo) & (conf_arr < hi)
            if mask.sum() > 0:
                print(f"    {label}: MAE {mae_arr[mask].mean():.1f} (n={mask.sum()})")
            else:
                print(f"    {label}: N/A")

    results[stage_n] = {
        'stage_results': {g: {
            'n_tests': stage_results[g]['n_tests'],
            'simple_avg_mae': float(np.mean(stage_results[g]['simple_avg']['mae'])) if stage_results[g].get('simple_avg', {}).get('mae') else None,
            'baseline_mae': float(np.mean(stage_results[g]['baseline']['mae'])) if stage_results[g].get('baseline', {}).get('mae') else None,
            'diversity_mae': float(np.mean(stage_results[g]['diversity']['mae'])) if stage_results[g].get('diversity', {}).get('mae') else None,
            'div_boost_mae': float(np.mean(stage_results[g]['div_boost']['mae'])) if stage_results[g].get('div_boost', {}).get('mae') else None,
            'avg_confidence': float(np.mean(stage_results[g]['div_boost']['confidence'])) if stage_results[g].get('div_boost', {}).get('confidence') else None,
        } for g in group_names},
        'confidence_data': stage_confidence_data,
    }

    print(f"\n  소요: {time.time()-t_stage:.1f}초")


# ═══════════════════════════════════════════════════════════
# 6. 공격 시나리오 테스트 (10,000명 기준)
# ═══════════════════════════════════════════════════════════

print(f"\n{'=' * 70}")
print("공격 시나리오 테스트 (10,000명 기준)")
print(f"{'=' * 70}")

attack_results = {}

for scenario_name, scenario in ATTACK_SCENARIOS.items():
    print(f"\n{'─' * 70}")
    print(f"시나리오 {scenario_name}: 공격자 {scenario['n_attackers']}명, 타겟 {scenario['n_targets']}개")
    print(f"{'─' * 70}")

    # 원본 복사
    atk_ratings = {u: dict(r) for u, r in user_ratings.items()}

    # 타겟 식당 선택 (해당 등급에서)
    tier_start, tier_end = tier_ranges[scenario['target_tier']]
    target_rs = np.random.choice(
        range(tier_start, tier_end),
        scenario['n_targets'],
        replace=False
    )

    # 공격자 설정 (마지막 N명)
    attacker_ids = list(range(N_USERS_MAX - scenario['n_attackers'], N_USERS_MAX))
    attacker_set = set(attacker_ids)

    # 공격자 리뷰 생성
    honest_tier_ranges = []
    for t in scenario['honest_tiers']:
        honest_tier_ranges.extend(range(*tier_ranges[t]))

    for u in attacker_ids:
        atk_ratings[u] = {}
        # 정직 리뷰 (해당 등급 식당들)
        for r in honest_tier_ranges:
            atk_ratings[u][r] = score_restaurant(u, r)
        # 타겟 조작
        fs = scenario['fake_score']
        for r in target_rs:
            atk_ratings[u][r] = (float(fs), float(fs))

    atk_means = {u: compute_user_mean(atk_ratings.get(u, {})) for u in range(N_USERS_MAX)}

    atk_rc = np.zeros(N_RESTAURANTS, dtype=int)
    for u, r in atk_ratings.items():
        for rid in r:
            atk_rc[rid] += 1

    # 타겟 식당 기록자 분석
    for r in target_rs:
        honest_c = sum(1 for u in range(N_USERS_MAX) if r in atk_ratings.get(u, {}) and u not in attacker_set)
        print(f"  식당 {r}: 정직 {honest_c}명 + 공격 {scenario['n_attackers']}명")

    # 테스트: 정직한 유저의 타겟 식당 예측
    test_pairs = []
    honest_users_list = [u for u in range(N_USERS_MAX - scenario['n_attackers'])
                         if len(atk_ratings.get(u, {})) >= 5]

    for u in np.random.choice(honest_users_list, min(200, len(honest_users_list)), replace=False):
        for r in target_rs:
            if r in atk_ratings.get(u, {}):
                test_pairs.append((u, r))

    # 추가 탐색
    if len(test_pairs) < 20:
        for u in honest_users_list:
            for r in target_rs:
                if r in atk_ratings.get(u, {}) and (u, r) not in set(test_pairs):
                    test_pairs.append((u, r))
            if len(test_pairs) >= 50:
                break

    print(f"  테스트 쌍: {len(test_pairs)}건")

    atk_bias = {'simple': [], 'baseline': [], 'diversity': [], 'no_attack': []}

    for u, r in test_pairs:
        actual = (atk_ratings[u][r][0] + atk_ratings[u][r][1]) / 2
        saved = atk_ratings[u].pop(r)
        saved_mean = atk_means[u]
        atk_means[u] = compute_user_mean(atk_ratings[u])

        # 단순 평균 (공격 포함)
        sa = simple_average(r, atk_ratings)
        if sa is not None:
            atk_bias['simple'].append(sa - actual)

        # 기본 CF
        pred = predict_score(u, r, atk_ratings, atk_means, mode="baseline", reviewer_count=atk_rc)
        if pred is not None:
            atk_bias['baseline'].append(pred[0] - actual)

        # CF + 다양성
        pred = predict_score(u, r, atk_ratings, atk_means, mode="diversity", reviewer_count=atk_rc)
        if pred is not None:
            atk_bias['diversity'].append(pred[0] - actual)

        # 공격 없음 (기준)
        pred = predict_score(u, r, atk_ratings, atk_means, mode="baseline",
                           reviewer_count=atk_rc, exclude_users=attacker_set)
        if pred is not None:
            atk_bias['no_attack'].append(pred[0] - actual)

        atk_ratings[u][r] = saved
        atk_means[u] = saved_mean

    print(f"\n  {'모드':<25} {'편향(+부풀림)':>14} {'n':>5}")
    print(f"  {'─' * 50}")
    for mode, label in [
        ('no_attack', '공격 없음 (기준)'),
        ('simple', '단순 평균 (공격 포함)'),
        ('baseline', '기본 CF (공격 포함)'),
        ('diversity', 'CF+다양성 (공격 포함)'),
    ]:
        if atk_bias[mode]:
            b = np.mean(atk_bias[mode])
            print(f"  {label:<25} {b:>+13.2f} {len(atk_bias[mode]):>5}")
        else:
            print(f"  {label:<25} {'N/A':>14} {'0':>5}")

    attack_results[scenario_name] = {
        'n_attackers': scenario['n_attackers'],
        'n_targets': scenario['n_targets'],
        'bias': {k: float(np.mean(v)) if v else None for k, v in atk_bias.items()},
    }

# ═══════════════════════════════════════════════════════════
# 7. 종합 요약 출력
# ═══════════════════════════════════════════════════════════

print(f"\n{'=' * 70}")
print("종합 요약")
print(f"{'=' * 70}")

# 의미있는 정보 경험률 매트릭스
print(f"\n의미있는 정보 경험률 (확신도 >= 0.3, CF+다양성+부스트)")
print(f"{'그룹':<8}", end="")
for s in STAGES:
    print(f" │ {s:>6}명", end="")
print()
print("─" * 70)

for group in group_names:
    print(f"{group:<8}", end="")
    for s in STAGES:
        cd = results[s]['confidence_data'].get(group, {})
        rate = cd.get('rate', 0)
        if rate > 0:
            print(f" │ {rate:>5.0f}%", end="")
        else:
            print(f" │   N/A", end="")
    print()

# MAE 비교 매트릭스 (최종 모드)
print(f"\nMAE (CF+다양성+부스트)")
print(f"{'그룹':<8}", end="")
for s in STAGES:
    print(f" │ {s:>6}명", end="")
print()
print("─" * 70)

for group in group_names:
    print(f"{group:<8}", end="")
    for s in STAGES:
        sr = results[s]['stage_results'].get(group, {})
        mae = sr.get('div_boost_mae')
        if mae is not None:
            print(f" │ {mae:>6.1f}", end="")
        else:
            print(f" │   N/A", end="")
    print()

# 단순 평균 vs CF 비교
print(f"\n단순 평균 MAE")
print(f"{'그룹':<8}", end="")
for s in STAGES:
    print(f" │ {s:>6}명", end="")
print()
print("─" * 70)

for group in group_names:
    print(f"{group:<8}", end="")
    for s in STAGES:
        sr = results[s]['stage_results'].get(group, {})
        mae = sr.get('simple_avg_mae')
        if mae is not None:
            print(f" │ {mae:>6.1f}", end="")
        else:
            print(f" │   N/A", end="")
    print()

# 공격 방어 요약
print(f"\n공격 방어 요약 (점수 부풀림)")
print(f"{'시나리오':<15} │ {'공격없음':>8} {'단순평균':>8} {'기본CF':>8} {'CF+다양성':>10}")
print("─" * 60)
for name, ar in attack_results.items():
    b = ar['bias']
    no = f"{b['no_attack']:+.1f}" if b['no_attack'] is not None else "N/A"
    si = f"{b['simple']:+.1f}" if b['simple'] is not None else "N/A"
    ba = f"{b['baseline']:+.1f}" if b['baseline'] is not None else "N/A"
    di = f"{b['diversity']:+.1f}" if b['diversity'] is not None else "N/A"
    print(f"{name:<15} │ {no:>8} {si:>8} {ba:>8} {di:>10}")

# JSON 결과 저장
output = {
    'stages': {str(s): results[s] for s in STAGES},
    'attacks': attack_results,
}

with open('/Users/jkm4/Documents/GitHub/nyam/docs/simulations/cf_comprehensive/results.json', 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"\n결과 JSON 저장: results.json")
print("완료.")
