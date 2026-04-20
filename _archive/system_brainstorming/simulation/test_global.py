"""
시뮬레이션 4: 글로벌 런칭 수익 시뮬레이션 (2년)
- 주요 7개 시장 동시 출시
- 시장별 성장률, 광고 단가, 구독 전환율 차등
- 광고 + 프리미엄 구독 복합 수익 모델

실행: python3 test_global.py
"""

from __future__ import annotations
from dataclasses import dataclass, field
import math


# ═══════════════════════════════════════════
#  시장 정의
# ═══════════════════════════════════════════

@dataclass
class Market:
    name: str
    code: str

    # 시장 규모
    population_m: float          # 인구 (백만)
    dining_out_pct: float        # 주 2회+ 외식 인구 비율
    smartphone_pct: float        # 스마트폰 보급률
    tam_ratio: float             # TAM 중 실제 도달 가능 비율

    # 성장
    seed: int                    # 런칭 시드 유저
    marketing_base: int          # 월 마케팅 유입 (1개월차)
    marketing_growth: float      # 월간 마케팅 증가율
    viral_coeff: float           # 바이럴 계수
    retention_mult: float        # 리텐션 배율 (1.0=기본)

    # 수익 (USD 기준)
    cpc_usd: float               # 클릭당 단가
    cpm_usd: float               # 1000노출당
    cpa_usd: float               # 방문당
    sub_price_usd: float         # 월 구독료
    sub_conversion: float        # 구독 전환율 (잔존 유저 중)

    # 와인 시장
    wine_culture: float          # 와인 문화 지수 (0~1, 높을수록 와인 기록 많음)

    @property
    def tam(self) -> int:
        """Total Addressable Market (명)"""
        return int(self.population_m * 1_000_000 * self.dining_out_pct * self.smartphone_pct * self.tam_ratio)


# 현실적 보통 — 제대로 런칭하고, 버블 초대 메커니즘이 작동하는 수준
# 마케팅: ASO + SNS + 푸드 커뮤니티 + 프로덕트헌트 등 적극 활용
# 바이럴: 버블 초대가 핵심 성장 동력, 0.4~0.5 수준
MARKETS = [
    Market(
        name="한국", code="KR",
        population_m=52, dining_out_pct=0.35, smartphone_pct=0.97, tam_ratio=0.03,
        seed=500, marketing_base=500, marketing_growth=0.10, viral_coeff=0.5, retention_mult=1.0,
        cpc_usd=0.60, cpm_usd=6.0, cpa_usd=6.0, sub_price_usd=0, sub_conversion=0,
        wine_culture=0.3,
    ),
    Market(
        name="일본", code="JP",
        population_m=125, dining_out_pct=0.30, smartphone_pct=0.95, tam_ratio=0.02,
        seed=300, marketing_base=300, marketing_growth=0.08, viral_coeff=0.35, retention_mult=1.05,
        cpc_usd=0.80, cpm_usd=8.0, cpa_usd=8.0, sub_price_usd=0, sub_conversion=0,
        wine_culture=0.35,
    ),
    Market(
        name="미국", code="US",
        population_m=335, dining_out_pct=0.40, smartphone_pct=0.92, tam_ratio=0.015,
        seed=500, marketing_base=800, marketing_growth=0.12, viral_coeff=0.4, retention_mult=0.9,
        cpc_usd=1.50, cpm_usd=15.0, cpa_usd=12.0, sub_price_usd=0, sub_conversion=0,
        wine_culture=0.5,
    ),
    Market(
        name="영국", code="UK",
        population_m=68, dining_out_pct=0.35, smartphone_pct=0.93, tam_ratio=0.02,
        seed=200, marketing_base=250, marketing_growth=0.08, viral_coeff=0.35, retention_mult=0.95,
        cpc_usd=1.20, cpm_usd=12.0, cpa_usd=10.0, sub_price_usd=0, sub_conversion=0,
        wine_culture=0.6,
    ),
    Market(
        name="프랑스", code="FR",
        population_m=68, dining_out_pct=0.30, smartphone_pct=0.90, tam_ratio=0.025,
        seed=150, marketing_base=200, marketing_growth=0.08, viral_coeff=0.3, retention_mult=1.0,
        cpc_usd=1.00, cpm_usd=10.0, cpa_usd=9.0, sub_price_usd=0, sub_conversion=0,
        wine_culture=0.8,
    ),
    Market(
        name="동남아(통합)", code="SEA",
        population_m=400, dining_out_pct=0.45, smartphone_pct=0.75, tam_ratio=0.01,
        seed=300, marketing_base=500, marketing_growth=0.15, viral_coeff=0.5, retention_mult=0.85,
        cpc_usd=0.20, cpm_usd=2.0, cpa_usd=2.0, sub_price_usd=0, sub_conversion=0,
        wine_culture=0.15,
    ),
    Market(
        name="호주", code="AU",
        population_m=26, dining_out_pct=0.38, smartphone_pct=0.94, tam_ratio=0.025,
        seed=100, marketing_base=120, marketing_growth=0.08, viral_coeff=0.3, retention_mult=1.0,
        cpc_usd=1.30, cpm_usd=13.0, cpa_usd=11.0, sub_price_usd=0, sub_conversion=0,
        wine_culture=0.7,
    ),
]

# 환율
USD_TO_KRW = 1400

# 리텐션 기본 커브
BASE_RETENTION = {
    0: 1.00, 1: 0.55, 3: 0.35, 7: 0.25, 14: 0.18,
    30: 0.12, 60: 0.09, 90: 0.07, 180: 0.05, 365: 0.04,
}

# 광고 파라미터 (공통)
SESSIONS_PER_DAU = 2.0
ADS_PER_SESSION = 1.0
RECOMMEND_VIEW_RATE = 0.5
CTR = 0.025
VISIT_RATE = 0.08
AD_START_MONTH = 4

# 바이럴 가속
VIRAL_RAMP = {
    1: 0.5, 2: 0.6, 3: 0.7, 4: 0.8, 5: 0.9, 6: 1.0,
    7: 1.2, 8: 1.4, 9: 1.6, 10: 1.8, 11: 2.0, 12: 2.2,
    13: 2.3, 14: 2.4, 15: 2.5, 16: 2.6, 17: 2.7, 18: 2.8,
    19: 2.9, 20: 3.0, 21: 3.1, 22: 3.2, 23: 3.3, 24: 3.4,
}

# 유저 활성도 (글로벌 공통)
DAILY_ACTIVE_RATE = 0.18       # 잔존 유저 중 일간 활성 비율
RECORD_RATE = 0.10             # 활성일에 기록 확률


# ═══════════════════════════════════════════
#  시장별 시뮬레이션
# ═══════════════════════════════════════════

@dataclass
class MonthResult:
    month: int
    total_signups: int
    alive: int
    dau: int
    wau: int
    records_month: int
    records_cumulative: int
    bubbles: int
    # 수익 (USD)
    ad_revenue: float
    sub_revenue: float
    total_revenue: float


def interpolate_retention(day: int, mult: float) -> float:
    keys = sorted(BASE_RETENTION.keys())
    for i in range(len(keys) - 1):
        if keys[i] <= day <= keys[i + 1]:
            d0, d1 = keys[i], keys[i + 1]
            r0, r1 = BASE_RETENTION[d0], BASE_RETENTION[d1]
            t = (day - d0) / (d1 - d0)
            base = r0 + (r1 - r0) * t
            return min(base * mult, 1.0)
    return min(BASE_RETENTION[keys[-1]] * mult, 1.0)


def simulate_market(market: Market, months: int = 24) -> list[MonthResult]:
    results = []

    # 코호트 기반 단순화 시뮬레이션 (월 단위)
    # 각 월의 가입자 코호트를 추적
    cohorts: list[tuple[int, int]] = []  # (가입월, 가입수)
    total_signups = 0
    cumulative_records = 0
    bubbles = 0

    for month in range(1, months + 1):
        # 신규 유입
        if month == 1:
            new = market.seed
        else:
            # 바이럴 + 마케팅
            ramp = VIRAL_RAMP.get(month, 3.4)
            alive_prev = results[-1].alive if results else market.seed
            wau_prev = results[-1].wau if results else int(market.seed * 0.3)

            viral = wau_prev * market.viral_coeff * ramp / 30 * 30  # 월간
            marketing = market.marketing_base * (1 + market.marketing_growth) ** (month - 1)
            new = int(viral + marketing)

        cohorts.append((month, new))
        total_signups += new

        # 잔존 계산 (각 코호트별)
        alive = 0
        for cohort_month, cohort_size in cohorts:
            days_since = (month - cohort_month) * 30
            retention = interpolate_retention(days_since, market.retention_mult)
            alive += int(cohort_size * retention)

        # 활성 유저
        dau = int(alive * DAILY_ACTIVE_RATE)
        wau = int(alive * DAILY_ACTIVE_RATE * 3.5)  # WAU ≈ DAU × 3.5 (겹침 고려)
        wau = min(wau, alive)

        # 기록
        monthly_records = int(dau * RECORD_RATE * 30)
        cumulative_records += monthly_records

        # 버블 (DAU의 0.5% 월간 생성)
        bubbles += max(1, int(dau * 0.005 * 30))

        # 광고 수익
        ad_revenue = 0.0
        if month >= AD_START_MONTH:
            daily_impressions = dau * SESSIONS_PER_DAU * ADS_PER_SESSION * RECOMMEND_VIEW_RATE
            monthly_impressions = daily_impressions * 30

            # 혼합 모델 (CPC 50% + CPM 20% + CPA 30%)
            clicks = monthly_impressions * CTR
            visits = clicks * VISIT_RATE

            rev_cpm = monthly_impressions / 1000 * market.cpm_usd * 0.2
            rev_cpc = clicks * market.cpc_usd * 0.5
            rev_cpa = visits * market.cpa_usd * 0.3
            ad_revenue = rev_cpm + rev_cpc + rev_cpa

        # 구독 수익 (비활성화 — 광고만 운영)
        sub_revenue = 0.0

        total_revenue = ad_revenue + sub_revenue

        results.append(MonthResult(
            month=month,
            total_signups=total_signups,
            alive=alive,
            dau=dau,
            wau=wau,
            records_month=monthly_records,
            records_cumulative=cumulative_records,
            bubbles=bubbles,
            ad_revenue=ad_revenue,
            sub_revenue=sub_revenue,
            total_revenue=total_revenue,
        ))

    return results


def fmt_usd(amount: float) -> str:
    if amount >= 1_000_000:
        return f"${amount/1_000_000:.1f}M"
    if amount >= 1_000:
        return f"${amount/1_000:.1f}K"
    return f"${amount:.0f}"


def fmt_krw(amount: float) -> str:
    krw = amount * USD_TO_KRW
    if krw >= 100_000_000:
        return f"₩{krw/100_000_000:.1f}억"
    if krw >= 10_000:
        return f"₩{krw/10_000:.0f}만"
    return f"₩{krw:,.0f}"


def bar(value: float, max_val: float, width: int = 20) -> str:
    if max_val <= 0:
        return ""
    filled = int(min(value / max_val, 1.0) * width)
    return "█" * filled + "░" * (width - filled)


# ═══════════════════════════════════════════
#  운영비
# ═══════════════════════════════════════════

MONTHLY_COSTS_USD = {
    "서버 (글로벌 CDN + Supabase)": 500,
    "AI API (Gemini Vision)": 300,
    "앱스토어 수수료 (구독의 30%)": 0,    # 별도 계산
    "도메인/SSL/기타": 50,
    "인건비 제외 소계": 850,
    # 인건비는 시나리오별
}

TEAM_SCENARIOS = {
    "1인 (인건비 제외)": 0,
    "1인 (인건비 포함)": 2500,
    "소규모 팀 (3인)": 8000,
    "스타트업 팀 (5인)": 15000,
}


# ═══════════════════════════════════════════
#  실행
# ═══════════════════════════════════════════

def run():
    print("=" * 80)
    print("  Nyam 글로벌 런칭 시뮬레이션 — 24개월")
    print("=" * 80)

    # 시장 개요
    print(f"\n  📍 대상 시장:")
    print(f"  {'시장':<12} {'인구':>6} {'TAM':>10} {'시드':>5} {'바이럴':>6} {'CPC':>6} {'구독':>6} {'와인':>4}")
    print(f"  {'─'*62}")
    for m in MARKETS:
        print(
            f"  {m.name:<12} {m.population_m:>5.0f}M {m.tam:>10,} {m.seed:>5} "
            f"{m.viral_coeff:>6.1f} ${m.cpc_usd:>5.2f} ${m.sub_price_usd:>5.2f} {m.wine_culture:>4.1f}"
        )
    total_tam = sum(m.tam for m in MARKETS)
    print(f"  {'─'*62}")
    print(f"  {'합계':<12} {'':>6} {total_tam:>10,}")

    # 시뮬레이션 실행
    all_results: dict[str, list[MonthResult]] = {}
    for market in MARKETS:
        all_results[market.code] = simulate_market(market, 24)

    # ─── 시장별 상세 (6, 12, 18, 24개월 스냅샷) ───

    milestones = [6, 12, 18, 24]

    for market in MARKETS:
        results = all_results[market.code]
        print(f"\n\n{'─'*80}")
        print(f"  🌏 {market.name} ({market.code})")
        print(f"{'─'*80}")
        print(f"  {'월':>4} {'가입누적':>9} {'잔존':>7} {'DAU':>6} {'기록/월':>7} {'기록누적':>9} {'광고/월':>9} {'구독/월':>9} {'합계/월':>9}")
        print(f"  {'─'*72}")

        for r in results:
            if r.month in milestones or r.month <= 3:
                print(
                    f"  {r.month:>4} {r.total_signups:>9,} {r.alive:>7,} {r.dau:>6,} "
                    f"{r.records_month:>7,} {r.records_cumulative:>9,} "
                    f"{fmt_usd(r.ad_revenue):>9} {fmt_usd(r.sub_revenue):>9} {fmt_usd(r.total_revenue):>9}"
                )

        last = results[-1]
        yr1 = sum(r.total_revenue for r in results[:12])
        yr2 = sum(r.total_revenue for r in results[12:])
        print(f"\n  1년차 수익: {fmt_usd(yr1)} ({fmt_krw(yr1)})")
        print(f"  2년차 수익: {fmt_usd(yr2)} ({fmt_krw(yr2)})")
        print(f"  24개월 합계: {fmt_usd(yr1+yr2)} ({fmt_krw(yr1+yr2)})")

    # ─── 글로벌 합산 ───

    print(f"\n\n{'='*80}")
    print(f"  🌐 글로벌 합산")
    print(f"{'='*80}")

    print(f"\n  {'월':>4} {'총가입':>10} {'총잔존':>8} {'총DAU':>7} {'총기록누적':>10} {'광고합/월':>10} {'구독합/월':>10} {'합계/월':>10}")
    print(f"  {'─'*72}")

    for month_idx in range(24):
        month = month_idx + 1
        t_signups = sum(all_results[m.code][month_idx].total_signups for m in MARKETS)
        t_alive = sum(all_results[m.code][month_idx].alive for m in MARKETS)
        t_dau = sum(all_results[m.code][month_idx].dau for m in MARKETS)
        t_records = sum(all_results[m.code][month_idx].records_cumulative for m in MARKETS)
        t_ad = sum(all_results[m.code][month_idx].ad_revenue for m in MARKETS)
        t_sub = sum(all_results[m.code][month_idx].sub_revenue for m in MARKETS)
        t_total = t_ad + t_sub

        if month in [1, 3, 6, 9, 12, 15, 18, 21, 24]:
            print(
                f"  {month:>4} {t_signups:>10,} {t_alive:>8,} {t_dau:>7,} "
                f"{t_records:>10,} {fmt_usd(t_ad):>10} {fmt_usd(t_sub):>10} {fmt_usd(t_total):>10}"
            )

    # 연간 합산
    global_yr1_ad = sum(sum(all_results[m.code][i].ad_revenue for i in range(12)) for m in MARKETS)
    global_yr1_sub = sum(sum(all_results[m.code][i].sub_revenue for i in range(12)) for m in MARKETS)
    global_yr2_ad = sum(sum(all_results[m.code][i].ad_revenue for i in range(12, 24)) for m in MARKETS)
    global_yr2_sub = sum(sum(all_results[m.code][i].sub_revenue for i in range(12, 24)) for m in MARKETS)

    print(f"\n  📊 글로벌 수익 요약:")
    print(f"  {'':>20} {'광고':>12} {'구독':>12} {'합계':>12} {'(원화)':>14}")
    print(f"  {'─'*55}")
    print(f"  {'1년차':<20} {fmt_usd(global_yr1_ad):>12} {fmt_usd(global_yr1_sub):>12} {fmt_usd(global_yr1_ad+global_yr1_sub):>12} {fmt_krw(global_yr1_ad+global_yr1_sub):>14}")
    print(f"  {'2년차':<20} {fmt_usd(global_yr2_ad):>12} {fmt_usd(global_yr2_sub):>12} {fmt_usd(global_yr2_ad+global_yr2_sub):>12} {fmt_krw(global_yr2_ad+global_yr2_sub):>14}")
    total_2yr = global_yr1_ad + global_yr1_sub + global_yr2_ad + global_yr2_sub
    print(f"  {'2년 합계':<20} {'':>12} {'':>12} {fmt_usd(total_2yr):>12} {fmt_krw(total_2yr):>14}")

    # 수익 비중 by 시장
    print(f"\n  📊 시장별 수익 비중 (2년 합계):")
    market_revenues = []
    for market in MARKETS:
        rev = sum(r.total_revenue for r in all_results[market.code])
        market_revenues.append((market.name, rev))

    market_revenues.sort(key=lambda x: x[1], reverse=True)
    max_rev = market_revenues[0][1] if market_revenues else 1

    print(f"  {'시장':<12} {'2년 수익':>12} {'비중':>6} {'(원화)':>14}")
    print(f"  {'─'*50}")
    for name, rev in market_revenues:
        pct = rev / total_2yr * 100 if total_2yr else 0
        print(f"  {name:<12} {fmt_usd(rev):>12} {pct:>5.1f}% {fmt_krw(rev):>14}  {bar(rev, max_rev, 15)}")

    # 구독 vs 광고 비중
    print(f"\n  📊 수익원 비중:")
    total_ad = global_yr1_ad + global_yr2_ad
    total_sub = global_yr1_sub + global_yr2_sub
    print(f"    광고: {fmt_usd(total_ad)} ({total_ad/total_2yr*100:.1f}%)")
    print(f"    구독: {fmt_usd(total_sub)} ({total_sub/total_2yr*100:.1f}%)")

    # ─── 손익분기 ───

    print(f"\n\n{'='*80}")
    print(f"  📊 손익분기 분석")
    print(f"{'='*80}")

    # 앱스토어 수수료 (구독의 30%, 1년 후 15%)
    for team_name, team_cost in TEAM_SCENARIOS.items():
        monthly_base = 850 + team_cost  # 서버+AI+기타 + 인건비

        bep_month = None
        for month_idx in range(24):
            month_revenue = sum(all_results[m.code][month_idx].total_revenue for m in MARKETS)
            month_sub = sum(all_results[m.code][month_idx].sub_revenue for m in MARKETS)
            # 앱스토어 수수료
            store_fee_rate = 0.30 if month_idx < 12 else 0.15
            store_fee = month_sub * store_fee_rate
            net_revenue = month_revenue - store_fee
            monthly_cost = monthly_base

            if net_revenue >= monthly_cost:
                bep_month = month_idx + 1
                break

        last_month_rev = sum(all_results[m.code][-1].total_revenue for m in MARKETS)
        last_month_sub = sum(all_results[m.code][-1].sub_revenue for m in MARKETS)
        last_net = last_month_rev - last_month_sub * 0.15

        if bep_month:
            print(f"  {team_name:<25} 월비용 ${monthly_base:,} → BEP {bep_month}개월차")
        else:
            print(f"  {team_name:<25} 월비용 ${monthly_base:,} → 24개월 내 미달 (24월 순수익 {fmt_usd(last_net)}/월)")

    # ─── 핵심 지표 대시보드 ───

    print(f"\n\n{'='*80}")
    print(f"  📋 24개월차 핵심 지표 대시보드")
    print(f"{'='*80}")

    final_signups = sum(all_results[m.code][-1].total_signups for m in MARKETS)
    final_alive = sum(all_results[m.code][-1].alive for m in MARKETS)
    final_dau = sum(all_results[m.code][-1].dau for m in MARKETS)
    final_records = sum(all_results[m.code][-1].records_cumulative for m in MARKETS)
    final_bubbles = sum(all_results[m.code][-1].bubbles for m in MARKETS)
    final_monthly_rev = sum(all_results[m.code][-1].total_revenue for m in MARKETS)

    print(f"\n  유저:")
    print(f"    총 가입: {final_signups:,}")
    print(f"    잔존: {final_alive:,} ({final_alive/final_signups*100:.1f}%)")
    print(f"    DAU: {final_dau:,}")

    print(f"\n  콘텐츠:")
    print(f"    총 기록: {final_records:,}")
    print(f"    총 버블: {final_bubbles:,}")

    print(f"\n  수익:")
    print(f"    24개월차 월 수익: {fmt_usd(final_monthly_rev)} ({fmt_krw(final_monthly_rev)})")
    print(f"    24개월차 연 환산: {fmt_usd(final_monthly_rev * 12)} ({fmt_krw(final_monthly_rev * 12)})")
    print(f"    2년 누적: {fmt_usd(total_2yr)} ({fmt_krw(total_2yr)})")

    arpdau = final_monthly_rev / max(final_dau, 1) / 30
    print(f"    ARPDAU: {fmt_usd(arpdau)} ({fmt_krw(arpdau)})")


if __name__ == "__main__":
    run()
