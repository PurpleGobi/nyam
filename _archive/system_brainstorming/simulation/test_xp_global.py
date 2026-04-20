"""
시뮬레이션 7: 글로벌 성장 인원 기준 XP/레벨 분포 시뮬레이션

test_global.py의 월별 가입/잔존 데이터를 기반으로
24개월간 코호트별 XP 축적 + 종합/카테고리 레벨 분포 추적

실행: python3 test_xp_global.py
"""

from __future__ import annotations
import random
from dataclasses import dataclass, field
from collections import Counter, defaultdict

random.seed(42)


# ═══════════════════════════════════════════
#  글로벌 월별 신규 가입 (test_global.py 결과 역산)
# ═══════════════════════════════════════════

# 월별 (총가입, 잔존) → 신규 = 이번 달 총가입 - 지난 달 총가입
GLOBAL_MONTHLY = [
    # (month, total_signups, alive, dau)
    (1,    2050,   1945,   349),
    (2,    4500,   2800,   504),
    (3,    9191,   4169,   748),
    (4,   15000,   5200,   936),
    (5,   20000,   6100,  1098),
    (6,   25052,   7194,  1291),
    (7,   33000,   8800,  1584),
    (8,   42000,  10500,  1890),
    (9,   51856,  12895,  2317),
    (10,  65000,  16000,  2880),
    (11,  82000,  20000,  3600),
    (12, 101452,  24342,  4379),
    (13, 125000,  29000,  5220),
    (14, 152000,  35000,  6300),
    (15, 193805,  44992,  8095),
    (16, 235000,  53000,  9540),
    (17, 290000,  66000, 11880),
    (18, 366111,  84685, 15239),
    (19, 440000, 100000, 18000),
    (20, 530000, 125000, 22500),
    (21, 704639, 167811, 30203),
    (22, 900000, 220000, 39600),
    (23,1100000, 280000, 50400),
    (24,1421528, 358919, 64602),
]


# ═══════════════════════════════════════════
#  XP 시스템 (test_xp_table.py와 동일)
# ═══════════════════════════════════════════

XP_BY_QUALITY = {"name": 0, "score": 3, "photo": 8, "full": 18}  # XP_SYSTEM §4-1
CATEGORY_XP = 5  # 카테고리 전용 (종합에 미포함)

REGIONS = ["광화문", "을지로", "강남", "성수", "이태원", "홍대", "청담", "한남", "여의도", "잠실"]
FOOD_GENRES = ["한식", "일식", "양식", "중식", "이탈리안", "프렌치", "동남아", "멕시칸"]
WINE_REGIONS = ["보르도", "부르고뉴", "나파밸리", "토스카나", "리오하", "바로사밸리", "모젤", "말보로"]
WINE_GRAPES = ["카베르네소비뇽", "피노누아", "샤르도네", "소비뇽블랑", "메를로", "시라", "리슬링", "산지오베제"]


def xp_to_level(xp: int) -> int:
    """XP_SYSTEM.md §5 레벨 테이블 기반. models.py와 동일한 앵커 포인트 보간."""
    from models import xp_to_level as _xp_to_level
    return _xp_to_level(xp)


# 유저 등급별 월간 행동
TIERS = {
    "좀비":   {"ratio": 0.40, "rest": (0,0),   "wine": (0,0), "qw": {"name":.8,"score":.2,"photo":0,"full":0},
               "social": 0, "r_div": 1, "f_div": 1, "w_div": 0},
    "슬리퍼": {"ratio": 0.25, "rest": (1,2),   "wine": (0,0), "qw": {"name":.3,"score":.4,"photo":.2,"full":.1},
               "social": 1, "r_div": 2, "f_div": 2, "w_div": 0},
    "캐주얼": {"ratio": 0.20, "rest": (3,6),   "wine": (0,1), "qw": {"name":.1,"score":.2,"photo":.4,"full":.3},
               "social": 3, "r_div": 3, "f_div": 3, "w_div": 2},
    "활동적": {"ratio": 0.10, "rest": (6,12),  "wine": (1,3), "qw": {"name":.05,"score":.1,"photo":.4,"full":.45},
               "social": 8, "r_div": 5, "f_div": 5, "w_div": 3},
    "파워":   {"ratio": 0.05, "rest": (12,25), "wine": (3,8), "qw": {"name":.02,"score":.08,"photo":.3,"full":.6},
               "social": 15, "r_div": 7, "f_div": 6, "w_div": 5},
}


@dataclass
class User:
    tier: str
    signup_month: int
    total_xp: int = 0
    region_xp: dict = field(default_factory=lambda: defaultdict(int))
    food_xp: dict = field(default_factory=lambda: defaultdict(int))
    wine_region_xp: dict = field(default_factory=lambda: defaultdict(int))
    wine_grape_xp: dict = field(default_factory=lambda: defaultdict(int))
    records: int = 0
    rest_records: int = 0
    wine_records: int = 0
    churned: bool = False

    @property
    def level(self): return xp_to_level(self.total_xp)

    def top_lv(self, xp_dict):
        if not xp_dict: return 0
        return xp_to_level(max(xp_dict.values()))


def pick_q(weights):
    r = random.random()
    c = 0
    for q, w in weights.items():
        c += w
        if r <= c: return q
    return "score"


# 리텐션 커브 (월 단위 간략화)
MONTHLY_RETENTION = {
    0: 1.0, 1: 0.55, 2: 0.35, 3: 0.25, 4: 0.20, 5: 0.16, 6: 0.12,
    7: 0.10, 8: 0.09, 9: 0.08, 10: 0.07, 11: 0.065, 12: 0.06,
    13: 0.055, 14: 0.052, 15: 0.050, 16: 0.048, 17: 0.046, 18: 0.044,
    19: 0.042, 20: 0.041, 21: 0.040, 22: 0.039, 23: 0.038, 24: 0.037,
}


def run():
    print("=" * 85)
    print("  Nyam XP/레벨 분포 — 글로벌 성장 인원 기준 24개월")
    print("=" * 85)

    # ═══ XP 부여 도표 출력 ═══
    print(f"\n  📋 XP 부여 전체 도표")
    print(f"  {'─'*80}")
    print(f"  {'행위':<30} {'XP':>4} {'대상':<15} {'비고'}")
    print(f"  {'─'*80}")
    rows = [
        ("식당/와인 이름만 등록", 0, "종합 XP", "XP 없음"),
        ("+ 사분면 점수", 3, "종합 XP", ""),
        ("+ 사진 (EXIF GPS 검증)", 8, "종합 XP", "실제 방문 증거"),
        ("+ 풀 기록 (리뷰+상황+메뉴)", 18, "종합 XP", "핵심 보상"),
        ("", 0, "", ""),
        ("지역 XP", 5, "카테고리 전용", "기록당 자동, 종합 미포함"),
        ("음식장르 XP", 5, "카테고리 전용", "식당 기록당, 종합 미포함"),
        ("와인산지 XP", 5, "카테고리 전용", "와인 기록당, 종합 미포함"),
        ("와인품종 XP", 5, "카테고리 전용", "와인 기록당, 종합 미포함"),
        ("", 0, "", ""),
        ("버블에 공유", 1, "종합 XP", ""),
        ("좋아요/찜 받음", 1, "종합 XP", "일 20 상한"),
        ("팔로워 획득 (버블/개인)", 1, "종합 XP", "일 10 상한"),
        ("맞팔 성사", 2, "종합 XP", "일 10 상한, 양쪽"),
        ("", 0, "", ""),
        ("온보딩 완료", 10, "종합 XP", "1회"),
        ("첫 기록", 5, "종합 XP", "1회"),
        ("첫 버블 생성", 5, "종합 XP", "1회"),
        ("첫 버블 공유", 3, "종합 XP", "1회"),
    ]
    for name, xp, target, note in rows:
        if not name:
            print(f"  {'':>30}")
            continue
        print(f"  {name:<30} {xp:>4} {target:<15} {note}")
    print(f"  {'─'*80}")
    print(f"  * 같은 식당 점수: 6개월 1회 | 소셜 로그인 1:1 | Trimmed mean(5%)")

    # ═══ 코호트 시뮬레이션 ═══

    print(f"\n\n{'='*85}")
    print(f"  📊 24개월 코호트 시뮬레이션")
    print(f"{'='*85}")

    # 1/100 샘플링 (142만 → ~14,200명으로 축소, 비율 유지)
    SAMPLE_RATE = 100

    all_users: list[User] = []
    cohorts: list[tuple[int, list[User]]] = []  # (month, users)

    for i, (month, total, alive, dau) in enumerate(GLOBAL_MONTHLY):
        prev_total = GLOBAL_MONTHLY[i-1][1] if i > 0 else 0
        new_this_month = max(1, (total - prev_total) // SAMPLE_RATE)

        # 신규 유저 생성
        new_users = []
        for _ in range(new_this_month):
            # 등급 선택
            r = random.random()
            c = 0
            tier_name = "좀비"
            for tn, tc in TIERS.items():
                c += tc["ratio"]
                if r <= c:
                    tier_name = tn
                    break
            u = User(tier=tier_name, signup_month=month)
            # 온보딩 보너스
            u.total_xp += 10
            new_users.append(u)

        cohorts.append((month, new_users))
        all_users.extend(new_users)

    # 월별 활동 시뮬레이션
    for current_month in range(1, 25):
        for cohort_month, users in cohorts:
            if cohort_month > current_month:
                continue

            months_active = current_month - cohort_month
            retention = MONTHLY_RETENTION.get(months_active, 0.037)

            for u in users:
                if u.churned:
                    continue
                # 이탈 판정
                if months_active > 0 and random.random() > retention / MONTHLY_RETENTION.get(months_active - 1, retention):
                    if random.random() < 0.3:  # 점진적 이탈
                        u.churned = True
                        continue

                tc = TIERS[u.tier]

                # 식당 기록
                n_rest = random.randint(*tc["rest"])
                my_regions = random.sample(REGIONS, min(tc["r_div"], len(REGIONS)))
                my_foods = random.sample(FOOD_GENRES, min(tc["f_div"], len(FOOD_GENRES)))

                for _ in range(n_rest):
                    q = pick_q(tc["qw"])
                    u.total_xp += XP_BY_QUALITY[q]
                    u.records += 1
                    u.rest_records += 1

                    reg = random.choice(my_regions)
                    food = random.choice(my_foods)
                    u.region_xp[reg] += CATEGORY_XP
                    u.food_xp[food] += CATEGORY_XP

                # 와인 기록
                n_wine = random.randint(*tc["wine"])
                if tc["w_div"] > 0:
                    my_wr = random.sample(WINE_REGIONS, min(tc["w_div"], len(WINE_REGIONS)))
                    my_wg = random.sample(WINE_GRAPES, min(tc["w_div"], len(WINE_GRAPES)))
                else:
                    my_wr, my_wg = [], []

                for _ in range(n_wine):
                    q = pick_q(tc["qw"])
                    u.total_xp += XP_BY_QUALITY[q]
                    u.records += 1
                    u.wine_records += 1

                    if my_wr:
                        u.wine_region_xp[random.choice(my_wr)] += CATEGORY_XP
                    if my_wg:
                        u.wine_grape_xp[random.choice(my_wg)] += CATEGORY_XP
                    if my_regions:
                        u.region_xp[random.choice(my_regions)] += CATEGORY_XP

                # 소셜
                for _ in range(random.randint(0, tc["social"])):
                    u.total_xp += random.choice([1, 1, 1, 2, 2, 3])

    # ═══ 결과 분석 ═══

    alive_users = [u for u in all_users if not u.churned]
    active_users = [u for u in alive_users if u.records > 0]

    print(f"\n  샘플: {len(all_users):,}명 (1/{SAMPLE_RATE} 샘플링)")
    print(f"  실제 환산: 총 가입 ~{len(all_users)*SAMPLE_RATE:,}")
    print(f"  잔존 샘플: {len(alive_users):,} (환산 ~{len(alive_users)*SAMPLE_RATE:,}, {len(alive_users)/len(all_users)*100:.1f}%)")
    print(f"  1회+ 기록: {len(active_users):,} (환산 ~{len(active_users)*SAMPLE_RATE:,})")

    # ─── 등급별 요약 ───

    print(f"\n  📊 등급별 요약 (잔존 유저)")
    print(f"  {'등급':<8} {'인원':>7} {'평균XP':>8} {'평균Lv':>7} {'기록':>6} {'식당':>5} {'와인':>5} │ {'지역Lv':>6} {'장르Lv':>6} {'산지Lv':>6} {'품종Lv':>6}")
    print(f"  {'─'*90}")

    for tier_name in TIERS:
        tier_users = [u for u in alive_users if u.tier == tier_name]
        if not tier_users:
            continue
        n = len(tier_users)
        print(
            f"  {tier_name:<8} {n:>7,} "
            f"{sum(u.total_xp for u in tier_users)/n:>8.0f} "
            f"{sum(u.level for u in tier_users)/n:>7.1f} "
            f"{sum(u.records for u in tier_users)/n:>6.1f} "
            f"{sum(u.rest_records for u in tier_users)/n:>5.1f} "
            f"{sum(u.wine_records for u in tier_users)/n:>5.1f} │ "
            f"{sum(u.top_lv(u.region_xp) for u in tier_users)/n:>6.1f} "
            f"{sum(u.top_lv(u.food_xp) for u in tier_users)/n:>6.1f} "
            f"{sum(u.top_lv(u.wine_region_xp) for u in tier_users)/n:>6.1f} "
            f"{sum(u.top_lv(u.wine_grape_xp) for u in tier_users)/n:>6.1f}"
        )

    # ─── 종합 레벨 구간별 카테고리 레벨 ───

    print(f"\n  📊 종합 레벨 구간별 카테고리 레벨 (잔존 유저)")

    level_groups = [
        ("Lv.1", 1, 1), ("Lv.2-3", 2, 3), ("Lv.4-6", 4, 6),
        ("Lv.7-10", 7, 10), ("Lv.11-15", 11, 15), ("Lv.16-20", 16, 20),
        ("Lv.21-30", 21, 30), ("Lv.31-50", 31, 50), ("Lv.51+", 51, 99),
    ]

    print(f"  {'구간':<12} {'인원':>8} {'비율':>6} │ {'지역':>6} {'장르':>6} {'산지':>6} {'품종':>6} │ {'기록':>6} {'식당':>5} {'와인':>5}")
    print(f"  {'─'*80}")

    for gname, gmin, gmax in level_groups:
        gu = [u for u in alive_users if gmin <= u.level <= gmax]
        n = len(gu)
        if n == 0:
            pct = 0
            print(f"  {gname:<12} {0:>8} {pct:>5.1f}% │ {'—':>6} {'—':>6} {'—':>6} {'—':>6} │ {'—':>6} {'—':>5} {'—':>5}")
            continue
        pct = n / len(alive_users) * 100
        avg_reg = sum(u.top_lv(u.region_xp) for u in gu) / n
        avg_food = sum(u.top_lv(u.food_xp) for u in gu) / n
        avg_wr = sum(u.top_lv(u.wine_region_xp) for u in gu) / n
        avg_wg = sum(u.top_lv(u.wine_grape_xp) for u in gu) / n
        avg_rec = sum(u.records for u in gu) / n
        avg_rest = sum(u.rest_records for u in gu) / n
        avg_wine = sum(u.wine_records for u in gu) / n
        print(
            f"  {gname:<12} {n:>8,} {pct:>5.1f}% │ "
            f"Lv.{avg_reg:<3.0f} Lv.{avg_food:<3.0f} Lv.{avg_wr:<3.0f} Lv.{avg_wg:<3.0f} │ "
            f"{avg_rec:>6.0f} {avg_rest:>5.0f} {avg_wine:>5.0f}"
        )

    # ─── 레벨 분포 바 차트 ───

    print(f"\n  📊 종합 레벨 분포 (잔존 {len(alive_users):,}명)")
    level_counter = Counter(u.level for u in alive_users)
    groups_count = defaultdict(int)
    for lv, cnt in level_counter.items():
        for gname, gmin, gmax in level_groups:
            if gmin <= lv <= gmax:
                groups_count[gname] += cnt
                break

    max_c = max(groups_count.values()) if groups_count else 1
    for gname, _, _ in level_groups:
        cnt = groups_count.get(gname, 0)
        pct = cnt / len(alive_users) * 100
        filled = int(min(cnt / max_c, 1.0) * 25)
        b = "█" * filled + "░" * (25 - filled)
        print(f"    {gname:<12} {b} {cnt:>8,} ({pct:>5.1f}%)")

    # 인플레이션 지표
    lv10 = sum(c for l, c in level_counter.items() if l >= 10)
    lv20 = sum(c for l, c in level_counter.items() if l >= 20)
    max_lv = max(level_counter.keys()) if level_counter else 0
    n_alive = len(alive_users)

    print(f"\n  인플레이션 지표:")
    print(f"    Lv.10+: {lv10:,} ({lv10/n_alive*100:.1f}%)", end="")
    print(f" {'🚨' if lv10/n_alive*100 > 15 else '⚠️' if lv10/n_alive*100 > 8 else '✅'}")
    print(f"    Lv.20+: {lv20:,} ({lv20/n_alive*100:.1f}%)", end="")
    print(f" {'🚨' if lv20/n_alive*100 > 5 else '⚠️' if lv20/n_alive*100 > 2 else '✅'}")
    print(f"    최고 레벨: Lv.{max_lv}")

    # ─── 상위 20명 ───

    print(f"\n  🏆 상위 20명")
    print(f"  {'#':>3} {'등급':<6} {'XP':>7} {'Lv':>4} {'기록':>5} {'식당':>4} {'와인':>4} │ {'지역':>8} {'장르':>8} {'산지':>8} {'품종':>8} │ {'가입월':>5}")
    print(f"  {'─'*85}")

    top20 = sorted(alive_users, key=lambda u: u.total_xp, reverse=True)[:20]
    for i, u in enumerate(top20):
        tr = max(u.region_xp.items(), key=lambda x: x[1]) if u.region_xp else ("—", 0)
        tf = max(u.food_xp.items(), key=lambda x: x[1]) if u.food_xp else ("—", 0)
        twr = max(u.wine_region_xp.items(), key=lambda x: x[1]) if u.wine_region_xp else ("—", 0)
        twg = max(u.wine_grape_xp.items(), key=lambda x: x[1]) if u.wine_grape_xp else ("—", 0)

        print(
            f"  {i+1:>3} {u.tier:<6} {u.total_xp:>7,} Lv.{u.level:<2} {u.records:>5} {u.rest_records:>4} {u.wine_records:>4} │ "
            f"{tr[0][:4]}Lv.{xp_to_level(tr[1]):<3} {tf[0][:4]}Lv.{xp_to_level(tf[1]):<3} "
            f"{twr[0][:4] if twr[0]!='—' else '—':>4}Lv.{xp_to_level(twr[1]):<3} "
            f"{twg[0][:4] if twg[0]!='—' else '—':>4}Lv.{xp_to_level(twg[1]):<3} │ "
            f"M{u.signup_month:>2}"
        )

    # ─── 가입 시기별 레벨 분포 ───

    print(f"\n  📊 가입 시기별 평균 레벨 (잔존 유저)")
    print(f"  {'가입월':>5} {'잔존':>7} {'평균Lv':>7} {'평균XP':>8} {'평균기록':>7} │ {'지역Lv':>6} {'장르Lv':>6}")
    print(f"  {'─'*55}")

    for m in [1, 3, 6, 9, 12, 15, 18, 21, 24]:
        mu = [u for u in alive_users if u.signup_month == m]
        if not mu:
            continue
        n = len(mu)
        print(
            f"  M{m:>3} {n:>7,} "
            f"{sum(u.level for u in mu)/n:>7.1f} "
            f"{sum(u.total_xp for u in mu)/n:>8.0f} "
            f"{sum(u.records for u in mu)/n:>7.1f} │ "
            f"{sum(u.top_lv(u.region_xp) for u in mu)/n:>6.1f} "
            f"{sum(u.top_lv(u.food_xp) for u in mu)/n:>6.1f}"
        )


if __name__ == "__main__":
    run()
