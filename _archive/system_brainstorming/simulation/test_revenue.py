"""
시뮬레이션 3: 식당 광고 수익 모델
- 성장 시뮬레이션의 DAU/MAU 데이터를 기반으로 수익 추산
- 3가지 과금 모델 비교 (CPM, CPC, CPA)
- 보수적/기본/낙관적 시나리오

실행: python3 test_revenue.py
"""

from __future__ import annotations
from dataclasses import dataclass


# ═══════════════════════════════════════════
#  성장 시뮬레이션 결과 (월별 DAU/MAU)
#  test_growth.py에서 가져온 데이터
# ═══════════════════════════════════════════

GROWTH_DATA = {
    "보수적": {  # seed 200, viral 0.3, marketing 100→600
        "monthly_dau": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],  # 너무 작아서 제외
    },
    "기본": {  # seed 500, viral 0.5, marketing 300→3000
        "monthly_dau":    [25, 25, 35, 44, 57, 80, 99, 120, 136, 161, 208, 251],
        "monthly_wau":    [58, 77, 93, 130, 187, 242, 309, 371, 414, 516, 613, 831],
        "monthly_mau":    [132, 162, 198, 282, 382, 520, 681, 817, 886, 1138, 1358, 1809],
        "total_users":    [760, 1179, 1665, 2277, 3084, 4266, 5667, 7331, 9117, 11420, 14391, 18112],
    },
    "낙관적": {  # seed 1000, viral 0.8, marketing 500→8000, retention x1.3
        "monthly_dau":    [64, 59, 79, 123, 177, 239, 316, 417, 577, 766, 960, 1173],
        "monthly_wau":    [337, 407, 567, 907, 1292, 1730, 2198, 2931, 4183, 5505, 6777, 8405],
        "monthly_mau":    [337, 407, 567, 907, 1292, 1730, 2198, 2931, 4183, 5505, 6777, 8405],
        "total_users":    [1569, 2294, 3212, 5060, 7413, 10303, 14181, 19417, 26716, 36026, 47161, 60359],
    },
}


# ═══════════════════════════════════════════
#  광고 수익 파라미터
# ═══════════════════════════════════════════

@dataclass
class AdConfig:
    """광고 수익 설정"""
    name: str

    # 유저 행동
    sessions_per_dau: float      # DAU당 평균 세션 수
    ads_per_session: float       # 세션당 광고 노출 수 (추천에 1개씩)
    recommend_view_rate: float   # 추천 탭 조회율 (DAU 중 추천 탭 보는 비율)

    # 광고 성과
    ctr: float                   # 클릭율 (광고 클릭 / 노출)
    visit_rate: float            # 방문 전환율 (클릭 → 실제 방문)

    # 단가 (원)
    cpm: int                     # 1,000 노출당 (브랜딩)
    cpc: int                     # 클릭당
    cpa: int                     # 방문(전환)당

    # 광고 시작 시점 (월)
    ad_start_month: int          # 이 월부터 광고 시작

    # 광고주 확보
    initial_advertisers: int     # 초기 광고주 수
    monthly_advertiser_growth: float  # 월 광고주 증가율


AD_SCENARIOS = {
    "보수적": AdConfig(
        name="보수적",
        sessions_per_dau=1.5,
        ads_per_session=1.0,
        recommend_view_rate=0.4,      # DAU의 40%가 추천 탭 봄
        ctr=0.015,                     # 1.5% (네이티브 광고 하단)
        visit_rate=0.05,               # 5% (클릭→방문)
        cpm=3000,                      # ₩3,000/CPM
        cpc=300,                       # ₩300/클릭
        cpa=5000,                      # ₩5,000/방문
        ad_start_month=7,              # 7개월차부터
        initial_advertisers=10,
        monthly_advertiser_growth=0.15,
    ),
    "기본": AdConfig(
        name="기본",
        sessions_per_dau=2.0,
        ads_per_session=1.0,
        recommend_view_rate=0.5,       # 50%
        ctr=0.025,                     # 2.5% (맞춤 추천형)
        visit_rate=0.08,               # 8%
        cpm=8000,                      # ₩8,000/CPM (타겟팅 프리미엄)
        cpc=800,                       # ₩800/클릭
        cpa=8000,                      # ₩8,000/방문
        ad_start_month=6,
        initial_advertisers=20,
        monthly_advertiser_growth=0.20,
    ),
    "낙관적": AdConfig(
        name="낙관적",
        sessions_per_dau=2.5,
        ads_per_session=1.0,
        recommend_view_rate=0.6,       # 60%
        ctr=0.035,                     # 3.5% (고정밀 맞춤)
        visit_rate=0.12,               # 12%
        cpm=15000,                     # ₩15,000/CPM (프리미엄 타겟팅)
        cpc=1500,                      # ₩1,500/클릭
        cpa=12000,                     # ₩12,000/방문
        ad_start_month=4,
        initial_advertisers=30,
        monthly_advertiser_growth=0.25,
    ),
}

# 한국 식당 광고 시장 벤치마크
BENCHMARKS = {
    "네이버 플레이스 광고": {"cpc": "₩500~2,000", "ctr": "1~3%"},
    "카카오 로컬 광고":     {"cpc": "₩300~1,500", "ctr": "1~2%"},
    "인스타 음식 광고":     {"cpc": "₩300~1,000", "ctr": "0.5~1.5%"},
    "캐치테이블 프로모션":   {"cpa": "₩3,000~15,000", "conversion": "5~15%"},
    "Nyam (예상)":         {"cpc": "₩300~1,500", "ctr": "1.5~3.5%", "note": "초정밀 타겟팅 프리미엄"},
}


# ═══════════════════════════════════════════
#  수익 계산
# ═══════════════════════════════════════════

@dataclass
class MonthlyRevenue:
    month: int
    dau: int
    impressions: int
    clicks: int
    visits: int
    revenue_cpm: int
    revenue_cpc: int
    revenue_cpa: int
    revenue_blend: int       # 혼합 모델
    active_advertisers: int


def calculate_revenue(
    growth_scenario: str,
    ad_scenario: str,
) -> list[MonthlyRevenue]:
    """월별 수익 계산"""
    growth = GROWTH_DATA[growth_scenario]
    ad = AD_SCENARIOS[ad_scenario]

    results = []
    advertisers = ad.initial_advertisers

    for month in range(1, 13):
        dau = growth["monthly_dau"][month - 1]

        if month < ad.ad_start_month:
            results.append(MonthlyRevenue(
                month=month, dau=dau,
                impressions=0, clicks=0, visits=0,
                revenue_cpm=0, revenue_cpc=0, revenue_cpa=0,
                revenue_blend=0, active_advertisers=0,
            ))
            continue

        # 광고주 증가
        months_since_start = month - ad.ad_start_month
        advertisers = int(ad.initial_advertisers * (1 + ad.monthly_advertiser_growth) ** months_since_start)

        # 일간 노출 → 월간
        daily_impressions = int(dau * ad.sessions_per_dau * ad.ads_per_session * ad.recommend_view_rate)
        monthly_impressions = daily_impressions * 30

        # 광고주 수에 의한 노출 상한 (광고주당 월 최대 노출 = 전체의 1/광고주수 × 3)
        # 광고주가 적으면 같은 광고 반복 → 실제 노출 제한 없음 (fill rate로 처리)
        fill_rate = min(1.0, advertisers / max(dau * 0.1, 1))  # 광고주 충분하면 fill 100%
        effective_impressions = int(monthly_impressions * fill_rate)

        clicks = int(effective_impressions * ad.ctr)
        visits = int(clicks * ad.visit_rate)

        # 수익 (3가지 모델)
        revenue_cpm = int(effective_impressions / 1000 * ad.cpm)
        revenue_cpc = clicks * ad.cpc
        revenue_cpa = visits * ad.cpa

        # 혼합 모델: 소형 식당은 CPC, 프리미엄은 CPA, 나머지 CPM
        # 비율: CPM 20%, CPC 50%, CPA 30%
        revenue_blend = int(revenue_cpm * 0.2 + revenue_cpc * 0.5 + revenue_cpa * 0.3)

        results.append(MonthlyRevenue(
            month=month, dau=dau,
            impressions=effective_impressions, clicks=clicks, visits=visits,
            revenue_cpm=revenue_cpm, revenue_cpc=revenue_cpc, revenue_cpa=revenue_cpa,
            revenue_blend=revenue_blend, active_advertisers=advertisers,
        ))

    return results


def format_krw(amount: int) -> str:
    """한국 원화 포맷"""
    if amount >= 100_000_000:
        return f"₩{amount/100_000_000:.1f}억"
    if amount >= 10_000:
        return f"₩{amount/10_000:.0f}만"
    return f"₩{amount:,}"


def bar(value: int, max_val: int, width: int = 20) -> str:
    if max_val == 0:
        return ""
    filled = int(value / max_val * width)
    return "█" * filled + "░" * (width - filled)


# ═══════════════════════════════════════════
#  실행
# ═══════════════════════════════════════════

def run():
    print("=" * 75)
    print("  Nyam 식당 광고 수익 시뮬레이션")
    print("=" * 75)

    # 벤치마크
    print(f"\n  📊 한국 식당 광고 시장 벤치마크:")
    print(f"  {'플랫폼':<22} {'CPC':>15} {'CTR':>12} {'비고':>20}")
    print(f"  {'─'*70}")
    for name, info in BENCHMARKS.items():
        cpc = info.get("cpc", "—")
        ctr = info.get("ctr", "—")
        note = info.get("note", info.get("cpa", info.get("conversion", "")))
        print(f"  {name:<22} {cpc:>15} {ctr:>12} {note:>20}")

    # 각 조합 실행
    combos = [
        ("기본", "보수적"),
        ("기본", "기본"),
        ("기본", "낙관적"),
        ("낙관적", "기본"),
        ("낙관적", "낙관적"),
    ]

    all_results = {}

    for growth_s, ad_s in combos:
        key = f"{growth_s}성장 + {ad_s}광고"
        results = calculate_revenue(growth_s, ad_s)
        all_results[key] = results

        ad = AD_SCENARIOS[ad_s]
        growth = GROWTH_DATA[growth_s]

        print(f"\n\n{'='*75}")
        print(f"  💰 {key}")
        print(f"{'='*75}")
        print(f"  성장: 시드 {growth_s} | 12개월 총 가입 {growth['total_users'][-1]:,}")
        print(f"  광고: CTR {ad.ctr*100:.1f}% | CPC ₩{ad.cpc:,} | CPA ₩{ad.cpa:,} | CPM ₩{ad.cpm:,}")
        print(f"  시작: {ad.ad_start_month}개월차 | 초기 광고주 {ad.initial_advertisers}개")

        print(f"\n  {'월':>3} {'DAU':>6} {'노출/월':>9} {'클릭':>6} {'방문':>5} {'광고주':>5} │ {'CPM':>10} {'CPC':>10} {'CPA':>10} {'혼합':>10}")
        print(f"  {'─'*85}")

        total_blend = 0
        for r in results:
            total_blend += r.revenue_blend
            if r.impressions == 0:
                print(f"  {r.month:>3} {r.dau:>6} {'—':>9} {'—':>6} {'—':>5} {'—':>5} │ {'—':>10} {'—':>10} {'—':>10} {'—':>10}")
            else:
                print(
                    f"  {r.month:>3} {r.dau:>6,} {r.impressions:>9,} {r.clicks:>6,} {r.visits:>5,} {r.active_advertisers:>5} │ "
                    f"{format_krw(r.revenue_cpm):>10} {format_krw(r.revenue_cpc):>10} "
                    f"{format_krw(r.revenue_cpa):>10} {format_krw(r.revenue_blend):>10}"
                )

        # 연간 합계
        yr_impressions = sum(r.impressions for r in results)
        yr_clicks = sum(r.clicks for r in results)
        yr_visits = sum(r.visits for r in results)
        yr_cpm = sum(r.revenue_cpm for r in results)
        yr_cpc = sum(r.revenue_cpc for r in results)
        yr_cpa = sum(r.revenue_cpa for r in results)
        yr_blend = sum(r.revenue_blend for r in results)

        print(f"  {'─'*85}")
        print(
            f"  {'합':>3} {'':>6} {yr_impressions:>9,} {yr_clicks:>6,} {yr_visits:>5,} {'':>5} │ "
            f"{format_krw(yr_cpm):>10} {format_krw(yr_cpc):>10} "
            f"{format_krw(yr_cpa):>10} {format_krw(yr_blend):>10}"
        )

        # 12개월차 월간 수익
        last = results[-1]
        print(f"\n  📌 12개월차 월간 수익:")
        print(f"    CPM 모델: {format_krw(last.revenue_cpm)}/월")
        print(f"    CPC 모델: {format_krw(last.revenue_cpc)}/월")
        print(f"    CPA 모델: {format_krw(last.revenue_cpa)}/월")
        print(f"    혼합 모델: {format_krw(last.revenue_blend)}/월")
        print(f"\n  📌 연간 합계 (혼합): {format_krw(yr_blend)}")

        # 유저당 수익
        if growth["total_users"][-1] > 0:
            arpu_monthly = last.revenue_blend / max(growth["monthly_dau"][-1], 1)
            arpu_yearly = yr_blend / growth["total_users"][-1]
            print(f"  📌 ARPDAU (12개월차): {format_krw(int(arpu_monthly))}/일")
            print(f"  📌 연간 유저당 수익: {format_krw(int(arpu_yearly))}/유저")

    # ─── 전체 비교 ───

    print(f"\n\n{'='*75}")
    print(f"  📊 시나리오 비교 요약")
    print(f"{'='*75}")

    print(f"\n  {'시나리오':<25} {'12월 DAU':>8} {'12월 혼합/월':>12} {'연간 혼합':>12} {'ARPDAU':>10}")
    print(f"  {'─'*68}")

    for key, results in all_results.items():
        last = results[-1]
        yr_blend = sum(r.revenue_blend for r in results)
        arpdau = last.revenue_blend / max(last.dau, 1)
        print(
            f"  {key:<25} {last.dau:>8,} "
            f"{format_krw(last.revenue_blend):>12} "
            f"{format_krw(yr_blend):>12} "
            f"{format_krw(int(arpdau)):>10}"
        )

    # ─── 광고 단가 민감도 분석 ───

    print(f"\n\n{'='*75}")
    print(f"  📊 CPC 단가 민감도 (기본성장, 12개월차 기준)")
    print(f"{'='*75}")

    base_growth = GROWTH_DATA["기본"]
    base_ad = AD_SCENARIOS["기본"]
    dau_12 = base_growth["monthly_dau"][-1]
    daily_imp = int(dau_12 * base_ad.sessions_per_dau * base_ad.ads_per_session * base_ad.recommend_view_rate)
    monthly_imp = daily_imp * 30
    clicks_12 = int(monthly_imp * base_ad.ctr)

    print(f"\n  기준: DAU {dau_12} | 월 노출 {monthly_imp:,} | CTR {base_ad.ctr*100:.1f}% | 월 클릭 {clicks_12:,}")
    print(f"\n  {'CPC':>8} {'월 수익':>12} {'연 환산':>12} {'비고':<20}")
    print(f"  {'─'*55}")
    for cpc in [200, 300, 500, 800, 1000, 1500, 2000]:
        monthly = clicks_12 * cpc
        yearly = monthly * 12
        note = ""
        if cpc == 300: note = "← 최저 (소형 식당)"
        elif cpc == 800: note = "← 기본 시나리오"
        elif cpc == 1500: note = "← 프리미엄 (타겟팅)"
        print(f"  ₩{cpc:>5,} {format_krw(monthly):>12} {format_krw(yearly):>12} {note}")

    # ─── 손익분기 분석 ───

    print(f"\n\n{'='*75}")
    print(f"  📊 손익분기 분석")
    print(f"{'='*75}")

    monthly_costs = {
        "서버 (Supabase Pro + Edge)": 200_000,
        "AI API (Gemini Vision)": 300_000,
        "도메인/SSL/기타": 50_000,
        "최소 인건비 (1인)": 3_000_000,
    }

    total_monthly_cost = sum(monthly_costs.values())
    print(f"\n  월 고정비:")
    for name, cost in monthly_costs.items():
        print(f"    {name:<30} {format_krw(cost)}")
    print(f"    {'─'*40}")
    print(f"    {'합계':<30} {format_krw(total_monthly_cost)}")

    print(f"\n  손익분기 도달 시점:")
    for key, results in all_results.items():
        bep_month = None
        for r in results:
            if r.revenue_blend >= total_monthly_cost:
                bep_month = r.month
                break
        if bep_month:
            print(f"    {key:<25} → {bep_month}개월차 ({format_krw(results[bep_month-1].revenue_blend)}/월)")
        else:
            last_rev = results[-1].revenue_blend
            gap = total_monthly_cost - last_rev
            print(f"    {key:<25} → 12개월 내 미달 (12월 {format_krw(last_rev)}/월, 부족 {format_krw(gap)})")

    # 필요 DAU 역산
    print(f"\n  손익분기 필요 DAU (혼합 모델 기준):")
    for ad_name, ad in AD_SCENARIOS.items():
        daily_rev_per_dau = (
            ad.sessions_per_dau * ad.ads_per_session * ad.recommend_view_rate
            * ad.ctr * ad.cpc * 0.5  # CPC 50% 비중
            + ad.sessions_per_dau * ad.ads_per_session * ad.recommend_view_rate
            / 1000 * ad.cpm * 0.2    # CPM 20% 비중
            + ad.sessions_per_dau * ad.ads_per_session * ad.recommend_view_rate
            * ad.ctr * ad.visit_rate * ad.cpa * 0.3  # CPA 30% 비중
        )
        needed_dau = int(total_monthly_cost / 30 / max(daily_rev_per_dau, 0.01))
        print(f"    {ad_name} 광고: DAU {needed_dau:,}명 필요 (ARPDAU ₩{daily_rev_per_dau:.0f})")


if __name__ == "__main__":
    run()
