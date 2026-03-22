"""
Nyam XP System v2 Simulation
- v1 문제점: 볼륨이 질을 압도, 어뷰저 1-2주만에 Lv.5
- v2 해결: 고유 장소 기반 XP + 품질 가중 + 체감 수익

핵심 변경:
1. 고유 장소 보너스: 새로운 식당/와인일수록 XP 높음
2. 재방문 체감: 같은 곳 반복할수록 XP 감소
3. 일일 축별 XP 상한
4. 품질 기록 보상 강화
5. 레벨 테이블 재조정
"""

import random
import math
from dataclasses import dataclass, field
from typing import Dict, List, Tuple
from collections import defaultdict

# ============================================================
# v2 레벨 테이블 (후보 비교)
# ============================================================

LEVEL_TABLES = {
    "v1_현행": [
        (1, 0), (2, 30), (3, 80), (4, 160), (5, 280),
        (6, 450), (7, 700), (8, 1050), (9, 1500), (10, 2100),
    ],
    "v2_강화": [
        (1, 0), (2, 40), (3, 100), (4, 200), (5, 350),
        (6, 560), (7, 850), (8, 1250), (9, 1800), (10, 2500),
    ],
}

LEVEL_COLORS = {
    1: '-', 2: 'green', 3: 'green', 4: 'blue', 5: 'blue',
    6: 'purple', 7: 'purple', 8: 'orange', 9: 'orange', 10: 'gold',
}

def get_level(xp: int, table_name: str = "v2_강화") -> int:
    table = LEVEL_TABLES[table_name]
    lvl = 1
    for l, threshold in table:
        if xp >= threshold:
            lvl = l
    return lvl


# ============================================================
# v2 XP 규칙
# ============================================================

class XPRulesV2:
    """
    v2 XP 규칙:
    - 새 장소 기록: 기본 XP (높음)
    - 재방문: 체감 수익 (3회까지 풀, 이후 감소)
    - 품질 보너스: 사진+한줄평+메뉴/팁 조합에 따른 가산
    - 일일 축별 상한: 하루에 한 축에 적립할 수 있는 XP 제한
    - 같은 식당 같은 날: 0 XP (유지)
    """

    # 기본 기록
    BASE_NEW = 8          # 새 장소 기본
    BASE_REVISIT = [       # 재방문 횟수별 (같은 식당 누적)
        (1, 10),           # 1차 재방문: 10 (첫 재방문은 보너스)
        (2, 8),            # 2차: 8
        (3, 6),            # 3차: 6
        (5, 4),            # 4-5차: 4
        (999, 2),          # 6차+: 2 (최소값)
    ]

    # 품질 보너스 (조합형)
    COMMENT = 3
    PHOTO = 3
    MENU_TAG = 2
    TIPS = 2
    # 풀입력 보너스 (사진+한줄평+메뉴태그 모두 입력 시 추가)
    FULL_RECORD_BONUS = 3

    # 와인 전용
    WINE_AROMA = 5
    WINE_DEPTH = 3

    # 소셜 (P2)
    BUBBLE_SHARE = 1
    LIKE_RECEIVED = 1      # 기록당 1회 한정

    # 제한
    DAILY_AXIS_CAP = 40    # 하루에 한 축(지역/품종)에 적립 가능한 최대 XP
    SAME_DAY_SAME_PLACE = 0  # 같은 날 같은 식당 = 0 XP

    # 고유 장소 보너스: N번째 새 장소 발견 시
    DISCOVERY_MILESTONES = {
        5: 10,    # 5번째 새 장소 → +10 보너스
        10: 15,   # 10번째 → +15
        20: 20,   # 20번째 → +20
        30: 25,
        50: 30,
    }

    @classmethod
    def get_revisit_xp(cls, visit_count: int) -> int:
        """재방문 횟수에 따른 기본 XP"""
        for max_count, xp in cls.BASE_REVISIT:
            if visit_count <= max_count:
                return xp
        return 2


# ============================================================
# 유저 페르소나
# ============================================================

@dataclass
class Persona:
    name: str
    description: str
    records_per_week: float
    revisit_rate: float
    comment_rate: float
    photo_rate: float
    menu_tag_rate: float
    tips_rate: float
    wine_ratio: float
    wine_aroma_rate: float
    wine_depth_rate: float
    same_day_dup_rate: float
    bubble_share_rate: float
    like_rate: float
    area_count: int
    variety_count: int
    # 새 식당 방문 다양성 (높을수록 다양한 식당)
    restaurant_diversity: float  # 0~1


PERSONAS = [
    Persona("🥄 라이트 (직장인)", "주 1-2회, 점심 위주",
        records_per_week=1.5, revisit_rate=0.35, comment_rate=0.3,
        photo_rate=0.2, menu_tag_rate=0.1, tips_rate=0.05,
        wine_ratio=0.0, wine_aroma_rate=0.0, wine_depth_rate=0.0,
        same_day_dup_rate=0.0, bubble_share_rate=0.2, like_rate=0.1,
        area_count=2, variety_count=0, restaurant_diversity=0.5),

    Persona("🍽️ 미들 (맛잘알)", "주 3-4회, 꼼꼼 기록",
        records_per_week=3.5, revisit_rate=0.25, comment_rate=0.7,
        photo_rate=0.8, menu_tag_rate=0.5, tips_rate=0.3,
        wine_ratio=0.1, wine_aroma_rate=0.3, wine_depth_rate=0.2,
        same_day_dup_rate=0.0, bubble_share_rate=0.5, like_rate=0.3,
        area_count=4, variety_count=2, restaurant_diversity=0.7),

    Persona("🔥 헤비 (식도락가)", "주 5-7회, 풀입력",
        records_per_week=6.0, revisit_rate=0.2, comment_rate=0.9,
        photo_rate=0.95, menu_tag_rate=0.8, tips_rate=0.5,
        wine_ratio=0.15, wine_aroma_rate=0.6, wine_depth_rate=0.5,
        same_day_dup_rate=0.0, bubble_share_rate=0.7, like_rate=0.5,
        area_count=6, variety_count=3, restaurant_diversity=0.85),

    Persona("🍷 와인 러버", "주 2-3회, 와인 위주",
        records_per_week=2.5, revisit_rate=0.15, comment_rate=0.8,
        photo_rate=0.7, menu_tag_rate=0.3, tips_rate=0.2,
        wine_ratio=0.7, wine_aroma_rate=0.85, wine_depth_rate=0.7,
        same_day_dup_rate=0.0, bubble_share_rate=0.6, like_rate=0.4,
        area_count=3, variety_count=5, restaurant_diversity=0.7),

    Persona("📸 최소 입력러", "주 2회, 필수만",
        records_per_week=2.0, revisit_rate=0.1, comment_rate=0.05,
        photo_rate=0.05, menu_tag_rate=0.0, tips_rate=0.0,
        wine_ratio=0.0, wine_aroma_rate=0.0, wine_depth_rate=0.0,
        same_day_dup_rate=0.0, bubble_share_rate=0.1, like_rate=0.05,
        area_count=2, variety_count=0, restaurant_diversity=0.6),

    Persona("🚨 어뷰저A (스팸)", "매일 5건 최소입력",
        records_per_week=25.0, revisit_rate=0.05, comment_rate=0.0,
        photo_rate=0.0, menu_tag_rate=0.0, tips_rate=0.0,
        wine_ratio=0.0, wine_aroma_rate=0.0, wine_depth_rate=0.0,
        same_day_dup_rate=0.4, bubble_share_rate=0.0, like_rate=0.0,
        area_count=1, variety_count=0, restaurant_diversity=0.3),

    Persona("🚨 어뷰저B (재방문)", "같은 곳만 반복",
        records_per_week=10.0, revisit_rate=0.95, comment_rate=0.0,
        photo_rate=0.0, menu_tag_rate=0.0, tips_rate=0.0,
        wine_ratio=0.0, wine_aroma_rate=0.0, wine_depth_rate=0.0,
        same_day_dup_rate=0.3, bubble_share_rate=0.0, like_rate=0.0,
        area_count=1, variety_count=0, restaurant_diversity=0.1),

    Persona("🚨 어뷰저C (좋아요팜)", "서로 좋아요만",
        records_per_week=5.0, revisit_rate=0.05, comment_rate=0.0,
        photo_rate=0.0, menu_tag_rate=0.0, tips_rate=0.0,
        wine_ratio=0.0, wine_aroma_rate=0.0, wine_depth_rate=0.0,
        same_day_dup_rate=0.0, bubble_share_rate=1.0, like_rate=0.9,
        area_count=1, variety_count=0, restaurant_diversity=0.3),
]


# ============================================================
# v2 시뮬레이션 엔진
# ============================================================

def simulate_v2(persona: Persona, weeks: int = 52, runs: int = 100, table: str = "v2_강화"):
    rules = XPRulesV2

    all_max_area = []
    all_max_variety = []
    all_total = []
    all_effective = []
    all_total_records = []
    all_breakdowns = []
    all_unique_places = []

    areas = [f"area_{i}" for i in range(persona.area_count)]
    varieties = [f"var_{i}" for i in range(max(1, persona.variety_count))]

    for run in range(runs):
        xp_by_area = defaultdict(int)
        xp_by_variety = defaultdict(int)
        total_xp = 0
        total_records = 0
        effective_records = 0
        breakdown = defaultdict(int)

        # 장소별 방문 횟수 추적
        visit_counts = defaultdict(int)  # restaurant_id → 누적 방문 횟수
        # 축별 고유 장소 수 추적
        unique_places_by_area = defaultdict(set)
        # 같은 날 같은 장소 추적
        daily_visits = defaultdict(set)
        # 일일 축별 XP 추적
        daily_axis_xp = defaultdict(lambda: defaultdict(int))

        restaurant_pool = 0  # 새 식당 ID 카운터

        for week in range(weeks):
            n_records = max(0, int(random.gauss(persona.records_per_week, persona.records_per_week * 0.3)))

            for rec_idx in range(n_records):
                day = week * 7 + random.randint(0, 6)
                total_records += 1

                # 지역 선택
                area_weights = [1.0 / (i + 1) for i in range(len(areas))]
                area = random.choices(areas, weights=area_weights, k=1)[0]

                is_wine = random.random() < persona.wine_ratio
                is_revisit = random.random() < persona.revisit_rate

                # 식당 결정
                if is_revisit:
                    # 기존 식당 중 하나 (area 내)
                    known = [p for p in unique_places_by_area[area]]
                    if known:
                        restaurant_id = random.choice(known)
                    else:
                        restaurant_pool += 1
                        restaurant_id = f"{area}_r{restaurant_pool}"
                        is_revisit = False
                else:
                    if random.random() < persona.restaurant_diversity:
                        restaurant_pool += 1
                        restaurant_id = f"{area}_r{restaurant_pool}"
                    else:
                        # 가끔 이미 가본 곳
                        known = list(unique_places_by_area[area])
                        if known:
                            restaurant_id = random.choice(known)
                            is_revisit = True
                        else:
                            restaurant_pool += 1
                            restaurant_id = f"{area}_r{restaurant_pool}"

                # 같은 날 같은 식당 체크
                if restaurant_id in daily_visits[day]:
                    continue  # 0 XP
                if random.random() < persona.same_day_dup_rate:
                    # 어뷰저: 같은 날 같은 곳 시도
                    existing = list(daily_visits[day])
                    if existing and random.random() < 0.5:
                        continue

                daily_visits[day].add(restaurant_id)
                effective_records += 1

                # 방문 횟수 갱신
                visit_counts[restaurant_id] += 1
                is_new_place = restaurant_id not in unique_places_by_area[area]
                unique_places_by_area[area].add(restaurant_id)

                # === XP 계산 ===
                record_xp = 0

                # 1) 기본 XP
                if visit_counts[restaurant_id] == 1:
                    # 첫 방문
                    base = rules.BASE_NEW
                    breakdown['new_place'] += base
                else:
                    # 재방문 체감
                    base = rules.get_revisit_xp(visit_counts[restaurant_id] - 1)
                    breakdown['revisit'] += base
                record_xp += base

                # 2) 고유 장소 마일스톤 보너스
                unique_count = len(unique_places_by_area[area])
                if unique_count in rules.DISCOVERY_MILESTONES:
                    bonus = rules.DISCOVERY_MILESTONES[unique_count]
                    record_xp += bonus
                    breakdown['discovery_bonus'] += bonus

                # 3) 품질 보너스
                has_comment = random.random() < persona.comment_rate
                has_photo = random.random() < persona.photo_rate
                has_menu = random.random() < persona.menu_tag_rate
                has_tips = random.random() < persona.tips_rate

                if has_comment:
                    record_xp += rules.COMMENT
                    breakdown['comment'] += rules.COMMENT
                if has_photo:
                    record_xp += rules.PHOTO
                    breakdown['photo'] += rules.PHOTO

                if not is_wine:
                    if has_menu:
                        record_xp += rules.MENU_TAG
                        breakdown['menu_tag'] += rules.MENU_TAG
                    if has_tips:
                        record_xp += rules.TIPS
                        breakdown['tips'] += rules.TIPS

                    # 풀입력 보너스 (사진+한줄평+메뉴태그 모두)
                    if has_comment and has_photo and has_menu:
                        record_xp += rules.FULL_RECORD_BONUS
                        breakdown['full_bonus'] += rules.FULL_RECORD_BONUS

                # 4) 와인 전용
                if is_wine:
                    has_aroma = random.random() < persona.wine_aroma_rate
                    has_depth = random.random() < persona.wine_depth_rate
                    if has_aroma:
                        record_xp += rules.WINE_AROMA
                        breakdown['wine_aroma'] += rules.WINE_AROMA
                    if has_depth:
                        record_xp += rules.WINE_DEPTH
                        breakdown['wine_depth'] += rules.WINE_DEPTH
                    # 와인 풀입력 보너스 (사진+한줄평+향팔레트)
                    if has_comment and has_photo and has_aroma:
                        record_xp += rules.FULL_RECORD_BONUS
                        breakdown['full_bonus'] += rules.FULL_RECORD_BONUS

                # 5) 소셜
                if random.random() < persona.bubble_share_rate:
                    record_xp += rules.BUBBLE_SHARE
                    breakdown['bubble_share'] += rules.BUBBLE_SHARE
                if random.random() < persona.like_rate:
                    record_xp += rules.LIKE_RECEIVED
                    breakdown['like_received'] += rules.LIKE_RECEIVED

                # 6) 일일 축별 상한 적용
                if daily_axis_xp[day][area] + record_xp > rules.DAILY_AXIS_CAP:
                    record_xp = max(0, rules.DAILY_AXIS_CAP - daily_axis_xp[day][area])
                    breakdown['capped'] = breakdown.get('capped', 0) + 1

                daily_axis_xp[day][area] += record_xp
                total_xp += record_xp
                xp_by_area[area] += record_xp

                if is_wine:
                    variety = random.choices(varieties,
                        weights=[1.0 / (i + 1) for i in range(len(varieties))], k=1)[0]
                    xp_by_variety[variety] += record_xp

        max_area = max(xp_by_area.values()) if xp_by_area else 0
        max_var = max(xp_by_variety.values()) if xp_by_variety else 0
        all_max_area.append(max_area)
        all_max_variety.append(max_var)
        all_total.append(total_xp)
        all_effective.append(effective_records)
        all_total_records.append(total_records)
        all_breakdowns.append(dict(breakdown))
        total_unique = sum(len(v) for v in unique_places_by_area.values())
        all_unique_places.append(total_unique)

    n = runs
    avg_area = int(sum(all_max_area) / n)
    avg_var = int(sum(all_max_variety) / n)
    avg_total = int(sum(all_total) / n)
    avg_eff = int(sum(all_effective) / n)
    avg_rec = int(sum(all_total_records) / n)
    avg_unique = int(sum(all_unique_places) / n)

    avg_bd = {}
    all_keys = set()
    for bd in all_breakdowns:
        all_keys.update(bd.keys())
    for k in all_keys:
        avg_bd[k] = int(sum(bd.get(k, 0) for bd in all_breakdowns) / n)

    return {
        'name': persona.name,
        'total_records': avg_rec,
        'effective': avg_eff,
        'unique_places': avg_unique,
        'total_xp': avg_total,
        'max_area_xp': avg_area,
        'max_area_lv': get_level(avg_area, table),
        'max_var_xp': avg_var,
        'max_var_lv': get_level(avg_var, table),
        'breakdown': avg_bd,
        'wine_ratio': persona.wine_ratio,
    }


def weeks_to_level_v2(persona: Persona, target_level: int, table: str = "v2_강화",
                       max_weeks: int = 520, runs: int = 100) -> float:
    target_xp = 0
    for l, xp in LEVEL_TABLES[table]:
        if l == target_level:
            target_xp = xp
            break

    rules = XPRulesV2
    areas = [f"area_{i}" for i in range(persona.area_count)]
    weeks_list = []

    for _ in range(runs):
        xp_by_area = defaultdict(int)
        visit_counts = defaultdict(int)
        unique_places = defaultdict(set)
        daily_visits = defaultdict(set)
        daily_axis_xp = defaultdict(lambda: defaultdict(int))
        rpool = 0
        reached = False

        for week in range(max_weeks):
            n = max(0, int(random.gauss(persona.records_per_week, persona.records_per_week * 0.3)))
            for ri in range(n):
                day = week * 7 + random.randint(0, 6)
                area = random.choices(areas, weights=[1.0/(i+1) for i in range(len(areas))], k=1)[0]
                is_revisit = random.random() < persona.revisit_rate

                if is_revisit:
                    known = list(unique_places[area])
                    if known:
                        rid = random.choice(known)
                    else:
                        rpool += 1; rid = f"{area}_r{rpool}"; is_revisit = False
                else:
                    if random.random() < persona.restaurant_diversity:
                        rpool += 1; rid = f"{area}_r{rpool}"
                    else:
                        known = list(unique_places[area])
                        if known:
                            rid = random.choice(known); is_revisit = True
                        else:
                            rpool += 1; rid = f"{area}_r{rpool}"

                if rid in daily_visits[day]: continue
                if random.random() < persona.same_day_dup_rate:
                    if list(daily_visits[day]) and random.random() < 0.5: continue
                daily_visits[day].add(rid)

                visit_counts[rid] += 1
                unique_places[area].add(rid)

                rxp = rules.BASE_NEW if visit_counts[rid] == 1 else rules.get_revisit_xp(visit_counts[rid]-1)
                uc = len(unique_places[area])
                if uc in rules.DISCOVERY_MILESTONES:
                    rxp += rules.DISCOVERY_MILESTONES[uc]

                if random.random() < persona.comment_rate: rxp += rules.COMMENT
                if random.random() < persona.photo_rate: rxp += rules.PHOTO
                if random.random() < persona.menu_tag_rate: rxp += rules.MENU_TAG
                if random.random() < persona.tips_rate: rxp += rules.TIPS

                if daily_axis_xp[day][area] + rxp > rules.DAILY_AXIS_CAP:
                    rxp = max(0, rules.DAILY_AXIS_CAP - daily_axis_xp[day][area])
                daily_axis_xp[day][area] += rxp
                xp_by_area[area] += rxp

                if max(xp_by_area.values()) >= target_xp:
                    weeks_list.append(week + 1)
                    reached = True
                    break
            if reached: break
        if not reached:
            weeks_list.append(max_weeks)

    return sum(weeks_list) / len(weeks_list)


# ============================================================
# 메인
# ============================================================

def main():
    random.seed(42)

    print("=" * 90)
    print("🎮 Nyam XP System v2 시뮬레이션")
    print("=" * 90)

    # --- v1 vs v2 비교 ---
    print("\n" + "=" * 90)
    print("📊 v1(현행) vs v2(개선) — 1년(52주) 시뮬레이션 (100회 평균)")
    print("=" * 90)

    for table_name in ["v1_현행", "v2_강화"]:
        print(f"\n{'─'*90}")
        print(f"  📋 {table_name} 레벨 테이블 + {'v1 XP규칙' if table_name == 'v1_현행' else 'v2 XP규칙'}")
        print(f"{'─'*90}")
        print(f"  {'페르소나':<22} {'총기록':>5} {'유효':>5} {'고유':>5} {'총XP':>7} {'주력XP':>7} {'Lv':>4} {'품종XP':>7} {'Lv':>4}")
        print(f"  {'-'*72}")

        for p in PERSONAS:
            if table_name == "v1_현행":
                # v1은 간단히 기본 계산
                r = simulate_v1_simple(p, 52, 100)
                var_xp = f"{r['max_var_xp']:>7}" if p.wine_ratio > 0 else "      -"
                var_lv = f"Lv.{r['max_var_lv']}" if p.wine_ratio > 0 else "   -"
                print(f"  {p.name:<22} {r['total_records']:>5} {r['effective']:>5} {'?':>5} "
                      f"{r['total_xp']:>7,} {r['max_area_xp']:>7,} Lv.{r['max_area_lv']:<3} "
                      f"{var_xp} {var_lv}")
            else:
                r = simulate_v2(p, 52, 100, table_name)
                var_xp = f"{r['max_var_xp']:>7}" if p.wine_ratio > 0 else "      -"
                var_lv = f"Lv.{r['max_var_lv']}" if p.wine_ratio > 0 else "   -"
                print(f"  {p.name:<22} {r['total_records']:>5} {r['effective']:>5} {r['unique_places']:>5} "
                      f"{r['total_xp']:>7,} {r['max_area_xp']:>7,} Lv.{r['max_area_lv']:<3} "
                      f"{var_xp} {var_lv}")

    # --- v2 레벨 도달 시점 ---
    print("\n" + "=" * 90)
    print("⏱️  v2 레벨별 도달 시점 (주/개월)")
    print("=" * 90)
    target_levels = [3, 5, 7, 10]

    print(f"\n  {'페르소나':<22}", end="")
    for lv in target_levels:
        print(f"  {'Lv.'+str(lv):>12}", end="")
    print()
    print(f"  {'-'*72}")

    for p in PERSONAS:
        print(f"  {p.name:<22}", end="")
        for lv in target_levels:
            w = weeks_to_level_v2(p, lv, "v2_강화", 520, 100)
            if w >= 520:
                print(f"  {'5년+':>12}", end="")
            else:
                m = w / 4.33
                print(f"  {f'{w:.0f}주({m:.0f}월)':>12}", end="")
        print()

    # --- XP 항목별 비중 ---
    print("\n" + "=" * 90)
    print("📋 v2 XP 항목별 비중 분석")
    print("=" * 90)

    for idx in [1, 2, 3]:  # 미들, 헤비, 와인러버
        p = PERSONAS[idx]
        r = simulate_v2(p, 52, 100, "v2_강화")
        print(f"\n  {p.name} — 1년 총 {r['total_xp']:,} XP, 고유 {r['unique_places']}곳")
        total_bd = sum(r['breakdown'].values()) or 1
        for item, xp in sorted(r['breakdown'].items(), key=lambda x: -x[1]):
            if item == 'capped': continue
            pct = xp / total_bd * 100
            bar = "█" * int(pct / 2)
            print(f"    {item:<18} {xp:>5} XP ({pct:>5.1f}%) {bar}")
        if 'capped' in r['breakdown']:
            print(f"    {'(상한 도달 횟수)':<18} {r['breakdown']['capped']:>5}회")

    # --- 어뷰저 효과 분석 ---
    print("\n" + "=" * 90)
    print("🛡️  v2 어뷰징 방지 효과 분석")
    print("=" * 90)

    normal = simulate_v2(PERSONAS[1], 52, 100, "v2_강화")
    heavy = simulate_v2(PERSONAS[2], 52, 100, "v2_강화")
    spam = simulate_v2(PERSONAS[5], 52, 100, "v2_강화")
    revisit_abuse = simulate_v2(PERSONAS[6], 52, 100, "v2_강화")
    like_abuse = simulate_v2(PERSONAS[7], 52, 100, "v2_강화")

    print(f"\n  {'유저 타입':<22} {'1년 총XP':>8} {'주력Lv':>6} {'건당XP':>8} {'고유장소':>8}")
    print(f"  {'-'*60}")
    for name, r in [
        ("미들 유저", normal),
        ("헤비 유저", heavy),
        ("스팸 어뷰저", spam),
        ("재방문 어뷰저", revisit_abuse),
        ("좋아요 어뷰저", like_abuse),
    ]:
        per_rec = r['total_xp'] / r['effective'] if r['effective'] > 0 else 0
        print(f"  {name:<22} {r['total_xp']:>8,} Lv.{r['max_area_lv']:<4} {per_rec:>8.1f} {r['unique_places']:>8}")

    print(f"\n  🔑 핵심 지표:")
    print(f"    미들 vs 스팸: 미들 건당 효율 {normal['total_xp']/normal['effective']:.1f} vs 스팸 {spam['total_xp']/spam['effective']:.1f}")
    print(f"    미들 vs 스팸: 주력지역 레벨 Lv.{normal['max_area_lv']} vs Lv.{spam['max_area_lv']}")
    spam_ratio = spam['max_area_xp'] / normal['max_area_xp'] if normal['max_area_xp'] > 0 else 0
    print(f"    스팸 어뷰저 주력지역 XP = 미들 유저의 {spam_ratio:.1f}배 (v1에서는 ~10배)")

    # --- 최종 v2 레벨 테이블 ---
    print("\n" + "=" * 90)
    print("📐 v2 레벨 테이블")
    print("=" * 90)

    print(f"\n  {'Lv':>4} {'필요XP':>8} {'간격':>8} {'~기록수':>8} {'~고유장소':>8} {'색상':>8}")
    print(f"  {'-'*48}")
    prev_xp = 0
    for lv, xp in LEVEL_TABLES["v2_강화"]:
        gap = xp - prev_xp
        # 미들 유저 기준 평균 XP/기록 ≈ 17
        approx = xp / 17 if xp > 0 else 0
        # 고유 장소 ≈ 기록 * 0.75
        unique = approx * 0.75
        color = LEVEL_COLORS[lv]
        print(f"  {lv:>4} {xp:>8} {gap:>8} {approx:>8.0f} {unique:>8.0f} {color:>8}")
        prev_xp = xp

    # --- v2 XP 규칙 요약 ---
    print("\n" + "=" * 90)
    print("📝 v2 XP 규칙 최종 요약")
    print("=" * 90)

    print("""
  ┌─────────────────────────────────────────────────────────────────────┐
  │ 활동                              │ XP    │ 비고                    │
  ├─────────────────────────────────────────────────────────────────────┤
  │ 새 장소 기록 (필수입력)            │   8   │ 사분면+만족도+상황       │
  │ 재방문 1차                         │  10   │ 첫 재방문 보너스         │
  │ 재방문 2차                         │   8   │ 체감                    │
  │ 재방문 3차                         │   6   │ 체감                    │
  │ 재방문 4-5차                       │   4   │ 체감                    │
  │ 재방문 6차+                        │   2   │ 최소값                  │
  ├─────────────────────────────────────────────────────────────────────┤
  │ + 한줄평                           │  +3   │                        │
  │ + 사진 1장 이상                     │  +3   │                        │
  │ + 추천 메뉴/페어링 메모            │  +2   │ 식당 전용               │
  │ + 사용팁                           │  +2   │ 식당 전용               │
  │ + 풀입력 보너스                     │  +3   │ 사진+한줄평+메뉴 모두    │
  ├─────────────────────────────────────────────────────────────────────┤
  │ + 향 팔레트                        │  +5   │ 와인 전용               │
  │ + 복합성/여운/균형                  │  +3   │ 와인 전용               │
  │ + 와인 풀입력 보너스                │  +3   │ 사진+한줄평+향팔레트     │
  ├─────────────────────────────────────────────────────────────────────┤
  │ 고유 장소 마일스톤 5/10/20/30/50   │+10/15/20/25/30│ 축별 누적       │
  ├─────────────────────────────────────────────────────────────────────┤
  │ 버블 공유 (P2)                     │  +1   │                        │
  │ 좋아요 받음 (P2)                   │  +1   │ 기록당 1회              │
  ├─────────────────────────────────────────────────────────────────────┤
  │ [제한] 같은 식당 같은 날           │   0   │ 중복 불가               │
  │ [제한] 일일 축별 상한              │  40   │ 하루 한 축 최대         │
  └─────────────────────────────────────────────────────────────────────┘

  최대 단건 XP:
  - 식당 (새 장소, 풀입력): 8+3+3+2+2+3 = 21 XP
  - 식당 (재방문 1차, 풀입력): 10+3+3+2+2+3 = 23 XP
  - 와인 (새, 풀입력): 8+3+3+5+3+3 = 25 XP
""")


def simulate_v1_simple(persona, weeks, runs):
    """v1 간단 시뮬레이션 (비교용)"""
    all_area = []
    all_var = []
    all_total = []
    all_eff = []
    all_rec = []
    areas = [f"a{i}" for i in range(persona.area_count)]
    varieties = [f"v{i}" for i in range(max(1, persona.variety_count))]

    for _ in range(runs):
        xp_area = defaultdict(int)
        xp_var = defaultdict(int)
        total = 0; eff = 0; recs = 0
        daily = defaultdict(set)

        for w in range(weeks):
            n = max(0, int(random.gauss(persona.records_per_week, persona.records_per_week*0.3)))
            for ri in range(n):
                day = w*7 + random.randint(0,6)
                recs += 1
                area = random.choices(areas, weights=[1/(i+1) for i in range(len(areas))], k=1)[0]
                rid = f"r{recs}" if random.random() > persona.revisit_rate else f"r{random.randint(0,10)}"
                if rid in daily[day]:
                    if random.random() < persona.same_day_dup_rate: continue
                    else: continue
                daily[day].add(rid); eff += 1
                is_wine = random.random() < persona.wine_ratio
                rxp = 12 if random.random() < persona.revisit_rate else 10
                if random.random() < persona.comment_rate: rxp += 3
                if random.random() < persona.photo_rate: rxp += 3
                if not is_wine:
                    if random.random() < persona.menu_tag_rate: rxp += 2
                    if random.random() < persona.tips_rate: rxp += 2
                if is_wine:
                    if random.random() < persona.wine_aroma_rate: rxp += 5
                    if random.random() < persona.wine_depth_rate: rxp += 3
                if random.random() < persona.bubble_share_rate: rxp += 1
                if random.random() < persona.like_rate: rxp += 1
                total += rxp; xp_area[area] += rxp
                if is_wine:
                    v = random.choices(varieties, weights=[1/(i+1) for i in range(len(varieties))], k=1)[0]
                    xp_var[v] += rxp

        all_area.append(max(xp_area.values()) if xp_area else 0)
        all_var.append(max(xp_var.values()) if xp_var else 0)
        all_total.append(total); all_eff.append(eff); all_rec.append(recs)

    n = runs
    aa = int(sum(all_area)/n); av = int(sum(all_var)/n)
    return {
        'total_records': int(sum(all_rec)/n),
        'effective': int(sum(all_eff)/n),
        'total_xp': int(sum(all_total)/n),
        'max_area_xp': aa, 'max_area_lv': get_level(aa, "v1_현행"),
        'max_var_xp': av, 'max_var_lv': get_level(av, "v1_현행"),
    }


if __name__ == "__main__":
    main()
