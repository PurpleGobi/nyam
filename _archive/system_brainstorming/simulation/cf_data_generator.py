"""Nyam CF 시뮬레이션 — 합성 데이터 생성기

유저 100명, 식당 200개, 와인 150개, 기록 ~6,000건의 현실적 데이터를 생성한다.
오염 유저 생성 기능 포함.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field

import numpy as np

from cf_models import (
    User, Restaurant, Wine, Record, Bubble, QuadrantScore,
    Category, RestaurantCluster, WineCluster, PollutionType, Relation,
    RESTAURANT_CLUSTER_OFFSETS, WINE_CLUSTER_OFFSETS,
    RESTAURANT_CLUSTER_DIST, WINE_CLUSTER_DIST,
)


def _clamp(v: float, lo: float = 0.0, hi: float = 10.0) -> float:
    return max(lo, min(hi, v))


def _weighted_choice(dist: dict) -> object:
    """가중치 분포에서 하나 선택"""
    items = list(dist.keys())
    weights = list(dist.values())
    return random.choices(items, weights=weights, k=1)[0]


@dataclass
class GeneratedData:
    """생성된 전체 데이터"""
    users: list[User]
    restaurants: list[Restaurant]
    wines: list[Wine]
    records: list[Record]
    follows: dict[str, set[str]]       # user_id → {following_ids}
    mutuals: set[tuple[str, str]]      # 맞팔 쌍 (정렬된 tuple)
    bubbles: list[Bubble]

    def get_user(self, user_id: str) -> User:
        return next(u for u in self.users if u.id == user_id)

    def get_relation(self, from_id: str, to_id: str) -> Relation:
        pair = tuple(sorted([from_id, to_id]))
        if pair in self.mutuals:
            return Relation.MUTUAL
        if to_id in self.follows.get(from_id, set()):
            return Relation.FOLLOWING
        return Relation.NONE

    def user_records(self, user_id: str, category: Category | None = None) -> list[Record]:
        recs = [r for r in self.records if r.user_id == user_id and not r.is_holdout]
        if category:
            recs = [r for r in recs if r.category == category]
        return recs

    def item_records(self, item_id: str) -> list[Record]:
        return [r for r in self.records if r.item_id == item_id and not r.is_holdout]

    def overlapping_items(self, user_a: str, user_b: str, category: Category) -> list[str]:
        """두 유저가 공통으로 기록한 아이템 ID 목록"""
        items_a = {r.item_id for r in self.user_records(user_a, category)}
        items_b = {r.item_id for r in self.user_records(user_b, category)}
        return list(items_a & items_b)

    def clean_users(self) -> list[User]:
        return [u for u in self.users if not u.is_polluted]

    def polluted_users(self) -> list[User]:
        return [u for u in self.users if u.is_polluted]


# ─── 식당/와인 생성 ───

GENRES = ["한식", "일식", "중식", "양식", "이탈리안", "프렌치", "태국", "베트남",
          "멕시칸", "인도", "퓨전", "카페", "고기", "해산물", "분식", "디저트"]
AREAS = ["강남", "홍대", "이태원", "성수", "여의도", "종로", "잠실", "판교"]
WINE_TYPES = ["red", "white", "rose", "sparkling", "orange", "fortified", "dessert"]
WINE_REGIONS = ["보르도", "부르고뉴", "토스카나", "리오하", "나파밸리", "바로사", "모젤", "상파뉴"]


def generate_restaurants(n: int = 200, seed: int = 42) -> list[Restaurant]:
    rng = random.Random(seed)
    restaurants = []
    for i in range(n):
        restaurants.append(Restaurant(
            id=f"R{i:03d}",
            true_food_quality=round(rng.uniform(3.0, 9.5), 1),
            true_experience=round(rng.uniform(3.0, 9.5), 1),
            genre=rng.choice(GENRES),
            area=rng.choice(AREAS),
        ))
    return restaurants


def generate_wines(n: int = 150, seed: int = 43) -> list[Wine]:
    rng = random.Random(seed)
    wines = []
    for i in range(n):
        wines.append(Wine(
            id=f"W{i:03d}",
            true_structure=round(rng.uniform(3.0, 9.5), 1),
            true_pleasure=round(rng.uniform(3.0, 9.5), 1),
            wine_type=rng.choice(WINE_TYPES),
            region=rng.choice(WINE_REGIONS),
        ))
    return wines


# ─── 유저 생성 ───

def generate_users(n: int = 100, seed: int = 44) -> list[User]:
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)
    users = []
    for i in range(n):
        r_cluster = _weighted_choice(RESTAURANT_CLUSTER_DIST)
        w_cluster = _weighted_choice(WINE_CLUSTER_DIST)
        users.append(User(
            id=f"U{i:03d}",
            name=f"유저{i:03d}",
            restaurant_cluster=r_cluster,
            wine_cluster=w_cluster,
            bias_x=round(float(np_rng.normal(0, 0.8)), 2),
            bias_y=round(float(np_rng.normal(0, 0.8)), 2),
            noise=round(float(np_rng.uniform(0.3, 1.0)), 2),  # V2: 노이즈 축소
        ))
    return users


# ─── 오염 유저 생성 ───

def generate_polluted_users(
    pollution_type: PollutionType,
    count: int,
    target_item_ids: list[str] | None = None,
    start_index: int = 100,
    seed: int = 99,
) -> list[User]:
    """오염 유저 생성. target_item_ids는 광고/폄하/집단 조작 대상."""
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)
    users = []
    for i in range(count):
        idx = start_index + i
        user = User(
            id=f"P{idx:03d}",
            name=f"오염{idx:03d}",
            restaurant_cluster=_weighted_choice(RESTAURANT_CLUSTER_DIST),
            wine_cluster=_weighted_choice(WINE_CLUSTER_DIST),
            bias_x=round(float(np_rng.normal(0, 0.8)), 2),
            bias_y=round(float(np_rng.normal(0, 0.8)), 2),
            noise=round(float(np_rng.uniform(0.3, 1.0)), 2),  # V2: 노이즈 축소
            pollution_type=pollution_type,
            pollution_target_ids=target_item_ids or [],
        )
        if pollution_type == PollutionType.SUBTLE:
            user.pollution_bias = 2.0
        users.append(user)
    return users


# ─── 기록 생성 ───

def _score_restaurant(user: User, restaurant: Restaurant, rng: random.Random) -> QuadrantScore:
    """유저가 식당을 평가. 오염 유형에 따라 다르게 동작."""
    if user.pollution_type == PollutionType.RANDOM:
        return QuadrantScore(
            x=round(_clamp(rng.uniform(0, 10)), 1),
            y=round(_clamp(rng.uniform(0, 10)), 1),
        )

    if user.pollution_type == PollutionType.AD_BOOST and restaurant.id in user.pollution_target_ids:
        return QuadrantScore(
            x=round(_clamp(rng.uniform(9.0, 10.0)), 1),
            y=round(_clamp(rng.uniform(9.0, 10.0)), 1),
        )

    if user.pollution_type == PollutionType.MALICIOUS and restaurant.id in user.pollution_target_ids:
        return QuadrantScore(
            x=round(_clamp(rng.uniform(0.0, 1.0)), 1),
            y=round(_clamp(rng.uniform(0.0, 1.0)), 1),
        )

    if user.pollution_type == PollutionType.COORDINATED and restaurant.id in user.pollution_target_ids:
        return QuadrantScore(x=9.5, y=9.5)

    # 정상 또는 은밀한 조작 (장르별 편향)
    off = RESTAURANT_CLUSTER_OFFSETS[user.restaurant_cluster]
    extra_bias = user.pollution_bias if user.pollution_type == PollutionType.SUBTLE else 0.0
    x = restaurant.true_food_quality + off[0] + user.bias_x + rng.gauss(0, user.noise)
    y = restaurant.true_experience + off[1] + user.bias_y + rng.gauss(0, user.noise) + extra_bias
    return QuadrantScore(x=round(_clamp(x), 1), y=round(_clamp(y), 1))


def _score_wine(user: User, wine: Wine, rng: random.Random) -> QuadrantScore:
    """유저가 와인을 평가."""
    if user.pollution_type == PollutionType.RANDOM:
        return QuadrantScore(
            x=round(_clamp(rng.uniform(0, 10)), 1),
            y=round(_clamp(rng.uniform(0, 10)), 1),
        )

    off = WINE_CLUSTER_OFFSETS[user.wine_cluster]
    extra_bias = user.pollution_bias if user.pollution_type == PollutionType.SUBTLE else 0.0
    x = wine.true_structure + off[0] + user.bias_x + rng.gauss(0, user.noise)
    y = wine.true_pleasure + off[1] + user.bias_y + rng.gauss(0, user.noise) + extra_bias
    return QuadrantScore(x=round(_clamp(x), 1), y=round(_clamp(y), 1))


def generate_records(
    users: list[User],
    restaurants: list[Restaurant],
    wines: list[Wine],
    holdout_ratio: float = 0.0,
    seed: int = 45,
) -> list[Record]:
    """유저별 기록 생성. holdout_ratio > 0이면 해당 비율을 hold-out으로 마킹."""
    rng = random.Random(seed)
    records: list[Record] = []

    for user in users:
        # V2: 콜드스타트 유저 (이름에 'cold' 포함)면 기록 적게
        is_cold = "cold" in user.name.lower()
        # 식당 기록
        n_rest = rng.randint(2, 10) if is_cold else rng.randint(15, 60)
        visited = rng.sample(restaurants, min(n_rest, len(restaurants)))
        for rest in visited:
            score = _score_restaurant(user, rest, rng)
            records.append(Record(
                user_id=user.id,
                item_id=rest.id,
                category=Category.RESTAURANT,
                score=score,
            ))

        # 와인 기록
        n_wine = rng.randint(1, 5) if is_cold else rng.randint(5, 30)
        tasted = rng.sample(wines, min(n_wine, len(wines)))
        for wine in tasted:
            score = _score_wine(user, wine, rng)
            records.append(Record(
                user_id=user.id,
                item_id=wine.id,
                category=Category.WINE,
                score=score,
            ))

    # Hold-out 마킹
    if holdout_ratio > 0:
        user_records: dict[str, list[Record]] = {}
        for r in records:
            user_records.setdefault(r.user_id, []).append(r)
        for uid, recs in user_records.items():
            n_holdout = max(1, int(len(recs) * holdout_ratio))
            holdouts = rng.sample(recs, n_holdout)
            for h in holdouts:
                h.is_holdout = True

    return records


# ─── 팔로우 관계 생성 ───

def generate_follows(
    users: list[User],
    same_cluster_prob: float = 0.5,  # V4: 현실 반영 (친구/지인 팔로우 → 50:50)
    follow_range: tuple[int, int] = (5, 15),
    mutual_rate: float = 0.4,
    seed: int = 46,
) -> tuple[dict[str, set[str]], set[tuple[str, str]]]:
    """팔로우/맞팔 관계 생성. 같은 클러스터 내 팔로우 확률 높게."""
    rng = random.Random(seed)
    follows: dict[str, set[str]] = {u.id: set() for u in users}

    for user in users:
        n_follow = rng.randint(*follow_range)
        candidates = [u for u in users if u.id != user.id]
        same = [u for u in candidates if u.restaurant_cluster == user.restaurant_cluster]
        diff = [u for u in candidates if u.restaurant_cluster != user.restaurant_cluster]

        targets: list[User] = []
        for _ in range(n_follow):
            if same and rng.random() < same_cluster_prob:
                t = rng.choice(same)
                same.remove(t)
                targets.append(t)
            elif diff:
                t = rng.choice(diff)
                diff.remove(t)
                targets.append(t)

        for t in targets:
            follows[user.id].add(t.id)

    # 맞팔 생성
    mutuals: set[tuple[str, str]] = set()
    for uid, fset in follows.items():
        for fid in fset:
            if uid in follows.get(fid, set()):
                pair = tuple(sorted([uid, fid]))
                if rng.random() < mutual_rate:
                    mutuals.add(pair)

    return follows, mutuals


# ─── 버블 생성 ───

def generate_bubbles(users: list[User], seed: int = 47) -> list[Bubble]:
    rng = random.Random(seed)
    clean = [u for u in users if not u.is_polluted]

    foodie_users = [u for u in clean if u.restaurant_cluster == RestaurantCluster.FOODIE]
    balanced_users = [u for u in clean if u.restaurant_cluster == RestaurantCluster.BALANCED]
    strict_users = [u for u in clean if u.restaurant_cluster == RestaurantCluster.STRICT]
    ambiance_users = [u for u in clean if u.restaurant_cluster == RestaurantCluster.AMBIANCE]

    bubbles = [
        Bubble(
            id="B_ilsik", name="일식 마니아", context="장르",
            member_ids=[u.id for u in foodie_users[:8]] + [u.id for u in balanced_users[:4]],
        ),
        Bubble(
            id="B_gangnam", name="강남 맛집", context="지역",
            member_ids=[u.id for u in rng.sample(clean, min(15, len(clean)))],
        ),
        Bubble(
            id="B_value", name="가성비 클럽", context="가치관",
            member_ids=[u.id for u in strict_users[:6]] + [u.id for u in balanced_users[4:8]],
        ),
        Bubble(
            id="B_friends", name="대학동기", context="인간관계",
            member_ids=[u.id for u in rng.sample(clean, min(8, len(clean)))],
        ),
        Bubble(
            id="B_wine", name="와인 모임", context="관심사",
            member_ids=[u.id for u in rng.sample(clean, min(12, len(clean)))],
        ),
    ]
    return bubbles


# ─── 전체 데이터 생성 ───

def generate_all(
    n_users: int = 100,
    n_restaurants: int = 200,
    n_wines: int = 150,
    holdout_ratio: float = 0.0,
    pollution_config: list[tuple[PollutionType, int, list[str] | None]] | None = None,
    n_coldstart_users: int = 0,
    seed: int = 42,
) -> GeneratedData:
    """전체 합성 데이터 생성.

    pollution_config: [(오염유형, 인원수, 타겟아이템IDs), ...]
    n_coldstart_users: 콜드스타트 유저 수 (기록 2~10개로 제한)
    """
    restaurants = generate_restaurants(n_restaurants, seed)
    wines = generate_wines(n_wines, seed + 1)
    users = generate_users(n_users, seed + 2)

    # V2: 콜드스타트 유저 추가
    if n_coldstart_users > 0:
        np_rng = np.random.default_rng(seed + 99)
        for i in range(n_coldstart_users):
            idx = n_users + 500 + i
            users.append(User(
                id=f"C{idx:03d}",
                name=f"cold{idx:03d}",
                restaurant_cluster=_weighted_choice(RESTAURANT_CLUSTER_DIST),
                wine_cluster=_weighted_choice(WINE_CLUSTER_DIST),
                bias_x=round(float(np_rng.normal(0, 0.8)), 2),
                bias_y=round(float(np_rng.normal(0, 0.8)), 2),
                noise=round(float(np_rng.uniform(0.3, 1.0)), 2),
            ))

    # 오염 유저 추가
    if pollution_config:
        idx = n_users
        for p_type, p_count, p_targets in pollution_config:
            polluted = generate_polluted_users(p_type, p_count, p_targets, idx, seed + idx)
            users.extend(polluted)
            idx += p_count

    records = generate_records(users, restaurants, wines, holdout_ratio, seed + 3)
    follows, mutuals = generate_follows(users, seed=seed + 4)
    bubbles = generate_bubbles(users, seed + 5)

    return GeneratedData(
        users=users,
        restaurants=restaurants,
        wines=wines,
        records=records,
        follows=follows,
        mutuals=mutuals,
        bubbles=bubbles,
    )
