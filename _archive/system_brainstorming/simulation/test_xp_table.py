"""
시뮬레이션 6: XP 부여 전체 도표 + 카테고리별 레벨 분포

행위별 XP 부여표를 정의하고,
다양한 유저 유형별 12개월 시뮬레이션 후
종합 레벨 구간별 카테고리(지역/음식장르/와인산지/와인품종) 레벨 분포 확인

실행: python3 test_xp_table.py
"""

from __future__ import annotations
import random
from dataclasses import dataclass, field
from collections import defaultdict, Counter

random.seed(42)


# ═══════════════════════════════════════════
#  XP 부여 전체 도표
# ═══════════════════════════════════════════

XP_TABLE = {
    # ─── 기록 XP (핵심) ───
    "record_name_only":        {"xp": 1,  "category": "기록", "desc": "식당/와인 이름만 등록"},
    "record_with_score":       {"xp": 3,  "category": "기록", "desc": "+ 사분면 점수"},
    "record_with_photo":       {"xp": 10, "category": "기록", "desc": "+ 사진 (EXIF GPS 검증)"},
    "record_full":             {"xp": 15, "category": "기록", "desc": "+ 상세 (리뷰+상황+메뉴)"},

    # ─── 카테고리 XP (기록 시 자동 부여, 종합 XP에는 미포함 — 카테고리 전용) ───
    "category_region":         {"xp": 5,  "category": "카테고리", "desc": "지역 XP (기록당, 카테고리 전용)"},
    "category_food_genre":     {"xp": 5,  "category": "카테고리", "desc": "음식장르 XP (식당 기록당, 카테고리 전용)"},
    "category_wine_region":    {"xp": 5,  "category": "카테고리", "desc": "와인산지 XP (와인 기록당, 카테고리 전용)"},
    "category_wine_grape":     {"xp": 5,  "category": "카테고리", "desc": "와인품종 XP (와인 기록당, 카테고리 전용)"},

    # ─── 소셜 XP ───
    "bubble_share":            {"xp": 1,  "category": "소셜", "desc": "버블에 기록 공유", "daily_cap": None},
    "like_received":           {"xp": 1,  "category": "소셜", "desc": "좋아요 받음", "daily_cap": 20},
    "bookmark_received":       {"xp": 1,  "category": "소셜", "desc": "찜 받음", "daily_cap": 20},
    "follower_bubble":         {"xp": 2,  "category": "소셜", "desc": "버블 팔로워 획득", "daily_cap": 10},
    "follower_personal":       {"xp": 2,  "category": "소셜", "desc": "개인 팔로워 획득", "daily_cap": 10},
    "mutual_follow":           {"xp": 3,  "category": "소셜", "desc": "맞팔 성사 (양쪽)", "daily_cap": 10},

    # ─── 온보딩/보너스 XP ───
    "onboarding_complete":     {"xp": 10, "category": "보너스", "desc": "온보딩 완료"},
    "first_record":            {"xp": 5,  "category": "보너스", "desc": "첫 기록 보너스"},
    "first_bubble_create":     {"xp": 5,  "category": "보너스", "desc": "첫 버블 생성"},
    "first_share":             {"xp": 3,  "category": "보너스", "desc": "첫 버블 공유"},
}

# 레벨 커브: XP → Lv (종합/카테고리 공통)
# 레벨 올라갈수록 필요 XP 증가 (로그 스케일)
def xp_to_level(xp: int) -> int:
    """XP → 레벨 변환. 고레벨일수록 느리게."""
    if xp <= 0:
        return 1
    lv = 1
    required = 15  # Lv.2 필요 XP (낮게 시작 → 초반 레벨업 빠르게)
    total_needed = 0
    while total_needed + required <= xp and lv < 99:
        total_needed += required
        lv += 1
        if lv <= 3:
            required = int(required * 1.10)   # Lv.2~3: 완만
        elif lv <= 5:
            required = int(required * 1.20)   # Lv.4~5: 약간 가속
        elif lv <= 10:
            required = int(required * 1.25)   # Lv.6~10: 본격 가속
        elif lv <= 20:
            required = int(required * 1.30)   # Lv.11~20: 급가속
        elif lv <= 40:
            required = int(required * 1.20)   # Lv.21~40: 둔화
        else:
            required = int(required * 1.15)   # Lv.41+: 매우 느림
    return lv


# 레벨 커브 미리보기
def print_level_curve():
    print(f"\n  📐 레벨 커브 (XP → Lv):")
    print(f"  {'XP':>8} → {'Lv':>4}  │ {'XP':>8} → {'Lv':>4}  │ {'XP':>8} → {'Lv':>4}")
    print(f"  {'─'*50}")
    checkpoints = [0, 30, 65, 100, 150, 250, 500, 750, 1000, 1500,
                   2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000]
    for i in range(0, len(checkpoints), 3):
        parts = []
        for j in range(3):
            if i + j < len(checkpoints):
                xp = checkpoints[i + j]
                lv = xp_to_level(xp)
                parts.append(f"{xp:>8,} → Lv.{lv:<3}")
            else:
                parts.append(" " * 16)
        print(f"  {'  │ '.join(parts)}")


# ═══════════════════════════════════════════
#  시뮬레이션 데이터
# ═══════════════════════════════════════════

REGIONS = ["광화문", "을지로", "강남", "성수", "이태원", "홍대", "청담", "한남", "여의도", "잠실"]
FOOD_GENRES = ["한식", "일식", "양식", "중식", "이탈리안", "프렌치", "동남아", "멕시칸"]
WINE_REGIONS = ["보르도", "부르고뉴", "나파밸리", "토스카나", "리오하", "바로사밸리", "모젤", "말보로"]
WINE_GRAPES = ["카베르네소비뇽", "피노누아", "샤르도네", "소비뇽블랑", "메를로", "시라", "리슬링", "산지오베제"]


@dataclass
class SimUser:
    name: str
    tier: str

    # 종합 XP
    total_xp: int = 0

    # 카테고리별 XP
    region_xp: dict = field(default_factory=lambda: defaultdict(int))
    food_genre_xp: dict = field(default_factory=lambda: defaultdict(int))
    wine_region_xp: dict = field(default_factory=lambda: defaultdict(int))
    wine_grape_xp: dict = field(default_factory=lambda: defaultdict(int))

    # XP 소스 추적
    xp_sources: dict = field(default_factory=lambda: Counter())
    record_count: int = 0
    wine_record_count: int = 0
    restaurant_record_count: int = 0

    @property
    def level(self) -> int:
        return xp_to_level(self.total_xp)

    def top_region(self) -> tuple[str, int]:
        if not self.region_xp: return ("없음", 0)
        top = max(self.region_xp.items(), key=lambda x: x[1])
        return top[0], xp_to_level(top[1])

    def top_food(self) -> tuple[str, int]:
        if not self.food_genre_xp: return ("없음", 0)
        top = max(self.food_genre_xp.items(), key=lambda x: x[1])
        return top[0], xp_to_level(top[1])

    def top_wine_region(self) -> tuple[str, int]:
        if not self.wine_region_xp: return ("없음", 0)
        top = max(self.wine_region_xp.items(), key=lambda x: x[1])
        return top[0], xp_to_level(top[1])

    def top_wine_grape(self) -> tuple[str, int]:
        if not self.wine_grape_xp: return ("없음", 0)
        top = max(self.wine_grape_xp.items(), key=lambda x: x[1])
        return top[0], xp_to_level(top[1])


# 유저 아키타입 (12개월 행동 패턴)
ARCHETYPES = {
    "좀비": {
        "monthly_restaurant": (0, 0),
        "monthly_wine": (0, 0),
        "quality_weights": {"name": 0.8, "score": 0.2, "photo": 0, "full": 0},
        "social_monthly": 0,
        "region_diversity": 1,       # 몇 개 지역에 집중하나
        "food_diversity": 1,
        "wine_diversity": 0,
        "ratio": 0.40,
    },
    "슬리퍼": {
        "monthly_restaurant": (1, 2),
        "monthly_wine": (0, 0),
        "quality_weights": {"name": 0.3, "score": 0.4, "photo": 0.2, "full": 0.1},
        "social_monthly": 1,
        "region_diversity": 2,
        "food_diversity": 2,
        "wine_diversity": 0,
        "ratio": 0.25,
    },
    "캐주얼": {
        "monthly_restaurant": (3, 6),
        "monthly_wine": (0, 1),
        "quality_weights": {"name": 0.1, "score": 0.2, "photo": 0.4, "full": 0.3},
        "social_monthly": 3,
        "region_diversity": 3,
        "food_diversity": 3,
        "wine_diversity": 2,
        "ratio": 0.20,
    },
    "활동적": {
        "monthly_restaurant": (6, 12),
        "monthly_wine": (1, 3),
        "quality_weights": {"name": 0.05, "score": 0.1, "photo": 0.4, "full": 0.45},
        "social_monthly": 8,
        "region_diversity": 5,
        "food_diversity": 5,
        "wine_diversity": 3,
        "ratio": 0.10,
    },
    "파워유저": {
        "monthly_restaurant": (12, 25),
        "monthly_wine": (3, 8),
        "quality_weights": {"name": 0.02, "score": 0.08, "photo": 0.3, "full": 0.6},
        "social_monthly": 15,
        "region_diversity": 7,
        "food_diversity": 6,
        "wine_diversity": 5,
        "ratio": 0.05,
    },
}


def pick_quality(weights: dict) -> str:
    r = random.random()
    cumul = 0
    for q, w in weights.items():
        cumul += w
        if r <= cumul:
            return q
    return "score"


def simulate_user(tier_name: str, months: int) -> SimUser:
    tier = ARCHETYPES[tier_name]
    user = SimUser(name=f"{tier_name}", tier=tier_name)

    # 자주 가는 지역/장르 선택 (편향)
    my_regions = random.sample(REGIONS, min(tier["region_diversity"], len(REGIONS)))
    my_foods = random.sample(FOOD_GENRES, min(tier["food_diversity"], len(FOOD_GENRES)))
    my_wine_regions = random.sample(WINE_REGIONS, min(tier["wine_diversity"], len(WINE_REGIONS))) if tier["wine_diversity"] > 0 else []
    my_wine_grapes = random.sample(WINE_GRAPES, min(tier["wine_diversity"], len(WINE_GRAPES))) if tier["wine_diversity"] > 0 else []

    # 온보딩 보너스
    user.total_xp += XP_TABLE["onboarding_complete"]["xp"]
    user.xp_sources["onboarding_complete"] += XP_TABLE["onboarding_complete"]["xp"]

    first_record_given = False
    first_bubble_given = False
    first_share_given = False

    for month in range(months):
        # 식당 기록
        n_restaurant = random.randint(*tier["monthly_restaurant"])
        for _ in range(n_restaurant):
            quality = pick_quality(tier["quality_weights"])
            xp_key = f"record_{quality}" if quality == "full" else f"record_{'name_only' if quality == 'name' else 'with_' + quality}"
            record_xp = XP_TABLE.get(xp_key, XP_TABLE["record_name_only"])["xp"]

            user.total_xp += record_xp
            user.xp_sources[xp_key] += record_xp
            user.record_count += 1
            user.restaurant_record_count += 1

            # 카테고리 XP (카테고리 전용 — 종합 XP에 미포함)
            region = random.choice(my_regions) if my_regions else random.choice(REGIONS)
            food = random.choice(my_foods) if my_foods else random.choice(FOOD_GENRES)
            cat_xp = XP_TABLE["category_region"]["xp"]
            user.region_xp[region] += cat_xp
            user.xp_sources["category_region"] += cat_xp

            cat_xp_food = XP_TABLE["category_food_genre"]["xp"]
            user.food_genre_xp[food] += cat_xp_food
            user.xp_sources["category_food_genre"] += cat_xp_food

            # 첫 기록 보너스
            if not first_record_given:
                user.total_xp += XP_TABLE["first_record"]["xp"]
                user.xp_sources["first_record"] += XP_TABLE["first_record"]["xp"]
                first_record_given = True

        # 와인 기록
        n_wine = random.randint(*tier["monthly_wine"])
        for _ in range(n_wine):
            quality = pick_quality(tier["quality_weights"])
            xp_key = f"record_{quality}" if quality == "full" else f"record_{'name_only' if quality == 'name' else 'with_' + quality}"
            record_xp = XP_TABLE.get(xp_key, XP_TABLE["record_name_only"])["xp"]

            user.total_xp += record_xp
            user.xp_sources[xp_key] += record_xp
            user.record_count += 1
            user.wine_record_count += 1

            # 와인 카테고리 XP (카테고리 전용 — 종합 XP에 미포함)
            if my_wine_regions:
                wr = random.choice(my_wine_regions)
                cat_xp = XP_TABLE["category_wine_region"]["xp"]
                user.wine_region_xp[wr] += cat_xp
                user.xp_sources["category_wine_region"] += cat_xp

            if my_wine_grapes:
                wg = random.choice(my_wine_grapes)
                cat_xp = XP_TABLE["category_wine_grape"]["xp"]
                user.wine_grape_xp[wg] += cat_xp
                user.xp_sources["category_wine_grape"] += cat_xp

            # 지역 XP (와인바 위치, 카테고리 전용)
            region = random.choice(my_regions) if my_regions else random.choice(REGIONS)
            user.region_xp[region] += XP_TABLE["category_region"]["xp"]
            user.xp_sources["category_region"] += XP_TABLE["category_region"]["xp"]

        # 소셜 활동
        social_events = random.randint(0, tier["social_monthly"])
        for _ in range(social_events):
            event = random.choice(["bubble_share", "like_received", "bookmark_received",
                                   "follower_bubble", "follower_personal", "mutual_follow"])
            sxp = XP_TABLE[event]["xp"]
            user.total_xp += sxp
            user.xp_sources[event] += sxp

            if not first_share_given and event == "bubble_share":
                user.total_xp += XP_TABLE["first_share"]["xp"]
                user.xp_sources["first_share"] += XP_TABLE["first_share"]["xp"]
                first_share_given = True

        # 버블 생성 (한 번)
        if month == 0 and tier_name in ("캐주얼", "활동적", "파워유저") and not first_bubble_given:
            user.total_xp += XP_TABLE["first_bubble_create"]["xp"]
            user.xp_sources["first_bubble_create"] += XP_TABLE["first_bubble_create"]["xp"]
            first_bubble_given = True

    return user


def bar(value: int, max_val: int, width: int = 15) -> str:
    if max_val <= 0: return ""
    filled = int(min(value / max_val, 1.0) * width)
    return "█" * filled + "░" * (width - filled)


# ═══════════════════════════════════════════
#  실행
# ═══════════════════════════════════════════

def run():
    print("=" * 80)
    print("  Nyam XP 시스템 종합 시뮬레이션")
    print("=" * 80)

    # ─── 1. XP 부여 전체 도표 ───

    print(f"\n  📋 XP 부여 전체 도표")
    print(f"  {'─'*75}")
    print(f"  {'행위':<25} {'XP':>4} {'카테고리':<10} {'일상한':>6} {'설명'}")
    print(f"  {'─'*75}")

    for key, info in XP_TABLE.items():
        cap = info.get("daily_cap")
        cap_str = f"{cap}/일" if cap else "—"
        print(f"  {key:<25} {info['xp']:>4} {info['category']:<10} {cap_str:>6} {info['desc']}")

    print(f"  {'─'*75}")
    print(f"  * 기록 XP: 한 기록당 위 항목 중 최고 1개만 (중복 아님)")
    print(f"  * 카테고리 XP: 기록 시 자동으로 해당 카테고리에 +2")
    print(f"  * 같은 식당 점수: 6개월에 1회만 (리뷰/사진은 자유)")

    # ─── 2. 레벨 커브 ───

    print_level_curve()

    # ─── 3. 유저 시뮬레이션 (12개월) ───

    print(f"\n\n{'='*80}")
    print(f"  📊 유저 유형별 12개월 시뮬레이션 (각 200명)")
    print(f"{'='*80}")

    TOTAL_USERS = 1000
    all_users = []
    users_by_tier = {}

    for tier_name, cfg in ARCHETYPES.items():
        count = int(TOTAL_USERS * cfg["ratio"])
        tier_users = []
        for i in range(count):
            u = simulate_user(tier_name, 12)
            tier_users.append(u)
            all_users.append(u)
        users_by_tier[tier_name] = tier_users

    # 유형별 요약
    print(f"\n  {'유형':<10} {'평균XP':>7} {'평균Lv':>7} {'기록':>5} {'식당':>5} {'와인':>5} │ {'최고지역Lv':>10} {'최고장르Lv':>10} {'최고산지Lv':>10} {'최고품종Lv':>10}")
    print(f"  {'─'*100}")

    for tier_name, users in users_by_tier.items():
        avg_xp = sum(u.total_xp for u in users) / len(users)
        avg_lv = sum(u.level for u in users) / len(users)
        avg_rec = sum(u.record_count for u in users) / len(users)
        avg_rest = sum(u.restaurant_record_count for u in users) / len(users)
        avg_wine = sum(u.wine_record_count for u in users) / len(users)

        avg_top_reg = sum(u.top_region()[1] for u in users) / len(users)
        avg_top_food = sum(u.top_food()[1] for u in users) / len(users)
        avg_top_wr = sum(u.top_wine_region()[1] for u in users) / len(users)
        avg_top_wg = sum(u.top_wine_grape()[1] for u in users) / len(users)

        print(
            f"  {tier_name:<10} {avg_xp:>7.0f} {avg_lv:>7.1f} {avg_rec:>5.0f} {avg_rest:>5.0f} {avg_wine:>5.0f} │ "
            f"{avg_top_reg:>10.1f} {avg_top_food:>10.1f} {avg_top_wr:>10.1f} {avg_top_wg:>10.1f}"
        )

    # ─── 4. 종합 레벨 구간별 카테고리 레벨 분포 ───

    print(f"\n\n{'='*80}")
    print(f"  📊 종합 레벨 구간별 카테고리 레벨 분포")
    print(f"{'='*80}")

    level_groups = [
        ("Lv.1", 1, 1),
        ("Lv.2-3", 2, 3),
        ("Lv.4-6", 4, 6),
        ("Lv.7-10", 7, 10),
        ("Lv.11-15", 11, 15),
        ("Lv.16-25", 16, 25),
        ("Lv.26-50", 26, 50),
        ("Lv.51+", 51, 99),
    ]

    print(f"\n  {'종합구간':<12} {'인원':>5} │ {'최고지역':>8} {'최고장르':>8} {'최고산지':>8} {'최고품종':>8} │ {'기록수':>6} {'식당':>5} {'와인':>5}")
    print(f"  {'─'*85}")

    for group_name, lv_min, lv_max in level_groups:
        group_users = [u for u in all_users if lv_min <= u.level <= lv_max]
        if not group_users:
            print(f"  {group_name:<12} {0:>5} │ {'—':>8} {'—':>8} {'—':>8} {'—':>8} │ {'—':>6} {'—':>5} {'—':>5}")
            continue

        n = len(group_users)
        avg_reg = sum(u.top_region()[1] for u in group_users) / n
        avg_food = sum(u.top_food()[1] for u in group_users) / n
        avg_wr = sum(u.top_wine_region()[1] for u in group_users) / n
        avg_wg = sum(u.top_wine_grape()[1] for u in group_users) / n
        avg_rec = sum(u.record_count for u in group_users) / n
        avg_rest = sum(u.restaurant_record_count for u in group_users) / n
        avg_wine = sum(u.wine_record_count for u in group_users) / n

        print(
            f"  {group_name:<12} {n:>5} │ "
            f"Lv.{avg_reg:<5.1f} Lv.{avg_food:<5.1f} Lv.{avg_wr:<5.1f} Lv.{avg_wg:<5.1f} │ "
            f"{avg_rec:>6.0f} {avg_rest:>5.0f} {avg_wine:>5.0f}"
        )

    # ─── 5. 파워유저 상세 프로필 (상위 10명) ───

    print(f"\n\n{'='*80}")
    print(f"  🏆 상위 10명 상세 프로필")
    print(f"{'='*80}")

    top10 = sorted(all_users, key=lambda u: u.total_xp, reverse=True)[:10]

    for i, u in enumerate(top10):
        tr_name, tr_lv = u.top_region()
        tf_name, tf_lv = u.top_food()
        twr_name, twr_lv = u.top_wine_region()
        twg_name, twg_lv = u.top_wine_grape()

        print(f"\n  #{i+1} {u.tier} — 총 XP {u.total_xp:,} (Lv.{u.level})")
        print(f"     기록: {u.record_count} (식당 {u.restaurant_record_count} + 와인 {u.wine_record_count})")
        print(f"     최고 지역: {tr_name} Lv.{tr_lv} | 최고 장르: {tf_name} Lv.{tf_lv}")
        print(f"     최고 산지: {twr_name} Lv.{twr_lv} | 최고 품종: {twg_name} Lv.{twg_lv}")

        # XP 소스 비율
        total = sum(u.xp_sources.values())
        if total > 0:
            record_xp = sum(v for k, v in u.xp_sources.items() if k.startswith("record_"))
            cat_xp = sum(v for k, v in u.xp_sources.items() if k.startswith("category_"))
            social_xp = sum(v for k, v in u.xp_sources.items() if k in XP_TABLE and XP_TABLE[k]["category"] == "소셜")
            bonus_xp = sum(v for k, v in u.xp_sources.items() if k in XP_TABLE and XP_TABLE[k]["category"] == "보너스")
            print(f"     XP 소스: 기록 {record_xp/total*100:.0f}% | 카테고리 {cat_xp/total*100:.0f}% | 소셜 {social_xp/total*100:.0f}% | 보너스 {bonus_xp/total*100:.0f}%")

    # ─── 6. XP 소스 비율 (전체 유저 평균) ───

    print(f"\n\n{'='*80}")
    print(f"  📊 XP 소스 비율 (활성 유저 평균 — 좀비 제외)")
    print(f"{'='*80}")

    active = [u for u in all_users if u.tier != "좀비" and u.total_xp > 0]
    source_totals = Counter()
    for u in active:
        for k, v in u.xp_sources.items():
            source_totals[k] += v

    grand_total = sum(source_totals.values())
    if grand_total > 0:
        # 카테고리별 그룹
        groups = defaultdict(int)
        for k, v in source_totals.items():
            if k in XP_TABLE:
                groups[XP_TABLE[k]["category"]] += v
            else:
                groups["기타"] += v

        print(f"\n  {'카테고리':<12} {'XP 합계':>12} {'비율':>7}")
        print(f"  {'─'*35}")
        for cat in ["기록", "카테고리", "소셜", "보너스"]:
            if cat in groups:
                print(f"  {cat:<12} {groups[cat]:>12,} {groups[cat]/grand_total*100:>6.1f}%")

        print(f"\n  상세:")
        print(f"  {'행위':<25} {'XP 합계':>10} {'비율':>6}")
        print(f"  {'─'*45}")
        for k, v in sorted(source_totals.items(), key=lambda x: x[1], reverse=True):
            if v > 0:
                print(f"  {k:<25} {v:>10,} {v/grand_total*100:>5.1f}%")

    # ─── 7. 종합 레벨 분포 ───

    print(f"\n\n{'='*80}")
    print(f"  📊 전체 종합 레벨 분포 (1,000명)")
    print(f"{'='*80}")

    level_counter = Counter(u.level for u in all_users)
    groups_count = defaultdict(int)
    for lv, cnt in level_counter.items():
        for gname, gmin, gmax in level_groups:
            if gmin <= lv <= gmax:
                groups_count[gname] += cnt
                break

    max_c = max(groups_count.values()) if groups_count else 1
    total_n = len(all_users)
    print(f"\n  {'구간':<12} {bar(0,0)} {'인원':>6} {'비율':>6}")
    print(f"  {'─'*50}")
    for gname, _, _ in level_groups:
        cnt = groups_count.get(gname, 0)
        print(f"  {gname:<12} {bar(cnt, max_c)} {cnt:>6} {cnt/total_n*100:>5.1f}%")

    # 인플레이션 체크
    lv10_plus = sum(cnt for lv, cnt in level_counter.items() if lv >= 10)
    lv20_plus = sum(cnt for lv, cnt in level_counter.items() if lv >= 20)
    max_lv = max(level_counter.keys())
    print(f"\n  Lv.10+: {lv10_plus} ({lv10_plus/total_n*100:.1f}%)")
    print(f"  Lv.20+: {lv20_plus} ({lv20_plus/total_n*100:.1f}%)")
    print(f"  최고: Lv.{max_lv}")
    if lv10_plus/total_n*100 > 15:
        print(f"  🚨 인플레이션 위험")
    elif lv10_plus/total_n*100 > 8:
        print(f"  ⚠️ 주의")
    else:
        print(f"  ✅ 정상")


if __name__ == "__main__":
    run()
