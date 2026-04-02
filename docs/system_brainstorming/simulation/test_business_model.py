"""
Nyam Business Model Simulation (KR first)

목표:
- 한국 단일 시장 기준으로 티어별 금액대를 탐색
- 개인 구독 + 버블 SaaS 조합의 24개월 손익을 추산
- API 비용, 스토리지 비용, 플랫폼 비용, 인건비를 반영하여 BEP 시점을 계산

실행:
    python3 test_business_model.py

가격/비용 기준:
- Gemini 2.5 Flash:
  https://ai.google.dev/gemini-api/docs/pricing
- Supabase Pro / usage:
  https://supabase.com/docs/guides/platform/billing-on-supabase
  https://supabase.com/docs/guides/platform/manage-your-usage/egress
  https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users
  https://supabase.com/docs/guides/functions/pricing
- Vercel Pro / usage:
  https://vercel.com/docs/plans/pro
  https://vercel.com/pricing
  https://vercel.com/docs/pricing/regional-pricing/

주의:
- 아래 AI 호출량, 사진 크기, 버블 유료 전환식은 공식 가격표가 아닌 Nyam 제품 가정이다.
- 목적은 "정밀 회계"가 아니라, 어떤 가격대가 구조적으로 말이 되는지 보는 것이다.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import math
import sys

sys.path.append(str(Path(__file__).resolve().parent))
from test_global import MARKETS, simulate_market, MonthResult  # noqa: E402


USD_TO_KRW = 1_400
REPORT_DIR = Path(__file__).resolve().parent / "REPORTS"


def fmt_krw(amount: float) -> str:
    if amount >= 100_000_000:
        return f"₩{amount / 100_000_000:.1f}억"
    if amount >= 10_000:
        return f"₩{amount / 10_000:.0f}만"
    return f"₩{amount:,.0f}"


def fmt_usd(amount: float) -> str:
    if amount >= 1_000_000:
        return f"${amount / 1_000_000:.2f}M"
    if amount >= 1_000:
        return f"${amount / 1_000:.1f}K"
    return f"${amount:,.0f}"


@dataclass(frozen=True)
class PriceCombo:
    personal_plus_krw: int
    bubble_plus_krw: int
    bubble_pro_krw: int

    @property
    def personal_plus_usd(self) -> float:
        return self.personal_plus_krw / USD_TO_KRW

    @property
    def bubble_plus_usd(self) -> float:
        return self.bubble_plus_krw / USD_TO_KRW

    @property
    def bubble_pro_usd(self) -> float:
        return self.bubble_pro_krw / USD_TO_KRW


@dataclass(frozen=True)
class CostConfig:
    # Fixed platform
    vercel_pro_base_usd: float = 20.0
    vercel_extra_seats: int = 1
    vercel_extra_seat_usd: float = 20.0
    supabase_pro_usd: float = 25.0
    misc_saas_usd: float = 45.0

    # Vercel overage
    vercel_fast_transfer_included_gb: float = 1024.0
    vercel_fast_transfer_overage_per_gb: float = 0.15
    vercel_edge_included_million: float = 10.0
    vercel_edge_overage_per_million: float = 2.0
    vercel_function_invocation_included_million: float = 1.0
    vercel_function_invocation_overage_per_million: float = 0.60

    # Supabase overage
    supabase_storage_included_gb: float = 100.0
    supabase_storage_overage_per_gb: float = 0.021
    supabase_cached_egress_included_gb: float = 250.0
    supabase_cached_egress_overage_per_gb: float = 0.03
    supabase_mau_included: int = 100_000
    supabase_mau_overage_per_user: float = 0.00325
    supabase_edge_included_million: float = 2.0
    supabase_edge_overage_per_million: float = 2.0

    # Gemini 2.5 Flash (paid tier)
    gemini_input_per_million: float = 0.30
    gemini_output_per_million: float = 2.50

    # Product usage assumptions (inferred)
    avg_photo_mb: float = 0.35
    photo_record_share: float = 0.58
    photos_per_photo_record: float = 1.4
    storage_cache_hit_ratio: float = 0.90
    monthly_photo_views_per_alive_user: float = 42.0
    images_per_photo_view: float = 1.15

    avg_vercel_transfer_mb_per_alive_user: float = 11.0
    monthly_edge_requests_per_alive_user: float = 210.0
    monthly_function_invocations_per_alive_user: float = 28.0
    payment_fee_rate: float = 0.045

    photo_identify_share_of_new_records: float = 0.42
    ai_text_assist_share_of_new_records: float = 0.18
    vision_input_tokens: int = 7_500
    vision_output_tokens: int = 900
    text_input_tokens: int = 1_400
    text_output_tokens: int = 450

    @property
    def fixed_platform_usd(self) -> float:
        return (
            self.vercel_pro_base_usd
            + self.vercel_extra_seats * self.vercel_extra_seat_usd
            + self.supabase_pro_usd
            + self.misc_saas_usd
        )


@dataclass(frozen=True)
class TeamScenario:
    name: str
    monthly_labor_krw: int

    @property
    def monthly_labor_usd(self) -> float:
        return self.monthly_labor_krw / USD_TO_KRW


TEAM_SCENARIOS = [
    TeamScenario("솔로 창업자", 7_000_000),
    TeamScenario("2인 코어팀", 16_000_000),
    TeamScenario("3인 제품팀", 27_000_000),
]


@dataclass
class MonthEconomics:
    month: int
    alive: int
    dau: int
    bubbles: int
    records_month: int
    personal_subscribers: int
    bubble_plus_bubbles: int
    bubble_pro_bubbles: int
    revenue_usd: float
    variable_cost_usd: float
    platform_cost_usd: float
    contribution_usd: float
    storage_gb: float


@dataclass
class SimulationSummary:
    prices: PriceCombo
    months: list[MonthEconomics]
    total_revenue_usd: float
    total_variable_cost_usd: float
    total_platform_cost_usd: float
    total_contribution_usd: float
    month24_mrr_usd: float
    month24_contribution_usd: float


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))


def maturity_factor(month: int) -> float:
    return clamp(0.35 + month * 0.035, 0.35, 1.0)


def personal_conversion(month: int, price_krw: int) -> float:
    maturity = maturity_factor(month)
    ratio = math.exp(-(price_krw - 5_900) / 4_800)
    return clamp(0.022 * maturity * ratio, 0.003, 0.045)


def bubble_plus_conversion(month: int, price_krw: int) -> float:
    maturity = maturity_factor(month) * 1.1
    ratio = math.exp(-(price_krw - 29_000) / 22_000)
    return clamp(0.055 * maturity * ratio, 0.008, 0.09)


def bubble_pro_conversion(month: int, price_krw: int) -> float:
    maturity = maturity_factor(month)
    ratio = math.exp(-(price_krw - 99_000) / 45_000)
    return clamp(0.010 * maturity * ratio, 0.001, 0.022)


def compute_variable_costs(
    month_result: MonthResult,
    cumulative_storage_gb: float,
    cost: CostConfig,
) -> tuple[float, float]:
    records = month_result.records_month
    alive = month_result.alive

    avg_photos_per_record = cost.photo_record_share * cost.photos_per_photo_record
    new_storage_gb = records * avg_photos_per_record * cost.avg_photo_mb / 1024
    cumulative_storage_gb += new_storage_gb

    # Gemini
    vision_calls = records * cost.photo_identify_share_of_new_records
    text_calls = records * cost.ai_text_assist_share_of_new_records

    gemini_input_tokens = (
        vision_calls * cost.vision_input_tokens
        + text_calls * cost.text_input_tokens
    )
    gemini_output_tokens = (
        vision_calls * cost.vision_output_tokens
        + text_calls * cost.text_output_tokens
    )
    gemini_cost = (
        gemini_input_tokens / 1_000_000 * cost.gemini_input_per_million
        + gemini_output_tokens / 1_000_000 * cost.gemini_output_per_million
    )

    # Supabase storage / egress / auth / edge
    cached_photo_egress_gb = (
        alive
        * cost.monthly_photo_views_per_alive_user
        * cost.images_per_photo_view
        * cost.avg_photo_mb
        / 1024
        * cost.storage_cache_hit_ratio
    )

    storage_overage = max(0.0, cumulative_storage_gb - cost.supabase_storage_included_gb)
    cached_egress_overage = max(
        0.0,
        cached_photo_egress_gb - cost.supabase_cached_egress_included_gb,
    )
    mau_overage = max(0, alive - cost.supabase_mau_included)
    supabase_edge_million = alive * 8 / 1_000_000
    supabase_edge_overage = max(0.0, supabase_edge_million - cost.supabase_edge_included_million)

    supabase_cost = (
        storage_overage * cost.supabase_storage_overage_per_gb
        + cached_egress_overage * cost.supabase_cached_egress_overage_per_gb
        + mau_overage * cost.supabase_mau_overage_per_user
        + supabase_edge_overage * cost.supabase_edge_overage_per_million
    )

    # Vercel transfer / edge / function invocation
    vercel_transfer_gb = alive * cost.avg_vercel_transfer_mb_per_alive_user / 1024
    vercel_transfer_overage = max(
        0.0,
        vercel_transfer_gb - cost.vercel_fast_transfer_included_gb,
    )

    vercel_edge_million = alive * cost.monthly_edge_requests_per_alive_user / 1_000_000
    vercel_edge_overage = max(0.0, vercel_edge_million - cost.vercel_edge_included_million)

    vercel_function_million = alive * cost.monthly_function_invocations_per_alive_user / 1_000_000
    vercel_function_overage = max(
        0.0,
        vercel_function_million - cost.vercel_function_invocation_included_million,
    )

    vercel_cost = (
        vercel_transfer_overage * cost.vercel_fast_transfer_overage_per_gb
        + vercel_edge_overage * cost.vercel_edge_overage_per_million
        + vercel_function_overage * cost.vercel_function_invocation_overage_per_million
    )

    total_variable = gemini_cost + supabase_cost + vercel_cost
    return total_variable, cumulative_storage_gb


def simulate_business_model(prices: PriceCombo, cost: CostConfig) -> SimulationSummary:
    kr_market = next(m for m in MARKETS if m.code == "KR")
    growth = simulate_market(kr_market, 24)

    cumulative_storage_gb = 0.0
    months: list[MonthEconomics] = []

    total_revenue_usd = 0.0
    total_variable_cost_usd = 0.0
    total_platform_cost_usd = 0.0

    for month_result in growth:
        month = month_result.month
        alive = month_result.alive
        bubbles = month_result.bubbles

        personal_subscribers = int(alive * personal_conversion(month, prices.personal_plus_krw))
        bubble_plus_bubbles = int(bubbles * bubble_plus_conversion(month, prices.bubble_plus_krw))
        bubble_pro_bubbles = int(
            bubbles
            * bubble_pro_conversion(month, prices.bubble_pro_krw)
            * (0.45 + 0.55 * maturity_factor(month))
        )
        bubble_plus_bubbles = max(bubble_plus_bubbles, bubble_pro_bubbles)

        revenue_usd = (
            personal_subscribers * prices.personal_plus_usd
            + bubble_plus_bubbles * prices.bubble_plus_usd
            + bubble_pro_bubbles * prices.bubble_pro_usd
        )

        variable_cost_usd, cumulative_storage_gb = compute_variable_costs(
            month_result,
            cumulative_storage_gb,
            cost,
        )
        platform_cost_usd = cost.fixed_platform_usd
        payment_fees_usd = revenue_usd * cost.payment_fee_rate
        contribution_usd = revenue_usd - variable_cost_usd - payment_fees_usd - platform_cost_usd

        months.append(MonthEconomics(
            month=month,
            alive=alive,
            dau=month_result.dau,
            bubbles=bubbles,
            records_month=month_result.records_month,
            personal_subscribers=personal_subscribers,
            bubble_plus_bubbles=bubble_plus_bubbles,
            bubble_pro_bubbles=bubble_pro_bubbles,
            revenue_usd=revenue_usd,
            variable_cost_usd=variable_cost_usd,
            platform_cost_usd=platform_cost_usd,
            contribution_usd=contribution_usd,
            storage_gb=cumulative_storage_gb,
        ))

        total_revenue_usd += revenue_usd
        total_variable_cost_usd += variable_cost_usd
        total_platform_cost_usd += platform_cost_usd

    total_contribution_usd = total_revenue_usd - total_variable_cost_usd - total_platform_cost_usd
    month24 = months[-1]
    return SimulationSummary(
        prices=prices,
        months=months,
        total_revenue_usd=total_revenue_usd,
        total_variable_cost_usd=total_variable_cost_usd,
        total_platform_cost_usd=total_platform_cost_usd,
        total_contribution_usd=total_contribution_usd,
        month24_mrr_usd=month24.revenue_usd,
        month24_contribution_usd=month24.contribution_usd,
    )


def bep_month(months: list[MonthEconomics], team: TeamScenario) -> tuple[int | None, int | None]:
    monthly_bep = None
    cumulative_bep = None
    cumulative_profit_usd = 0.0

    for month in months:
        operating_profit_usd = month.contribution_usd - team.monthly_labor_usd
        cumulative_profit_usd += operating_profit_usd

        if monthly_bep is None and operating_profit_usd >= 0:
            monthly_bep = month.month
        if cumulative_bep is None and cumulative_profit_usd >= 0:
            cumulative_bep = month.month

    return monthly_bep, cumulative_bep


def score_summary(summary: SimulationSummary) -> float:
    # 누적 공헌이익 중심 + 24개월차 MRR 보정
    return summary.total_contribution_usd + summary.month24_mrr_usd * 4


def generate_candidates() -> list[PriceCombo]:
    personal = [4_900, 5_900, 6_900, 7_900, 8_900, 9_900, 11_900]
    bubble_plus = [19_000, 24_000, 29_000, 39_000, 49_000, 59_000]
    bubble_pro = [79_000, 99_000, 129_000, 149_000, 199_000]

    combos: list[PriceCombo] = []
    for p in personal:
        for bp in bubble_plus:
            for bpro in bubble_pro:
                combos.append(PriceCombo(
                    personal_plus_krw=p,
                    bubble_plus_krw=bp,
                    bubble_pro_krw=bpro,
                ))
    return combos


def render_report(top: list[SimulationSummary], best: SimulationSummary, cost: CostConfig) -> str:
    lines: list[str] = []
    lines.append("=" * 88)
    lines.append("Nyam Business Model Simulation — KR First")
    lines.append("=" * 88)
    lines.append("")
    lines.append("가정")
    lines.append(f"- 분모: 기존 KR 성장 시뮬레이션 24개월 결과 사용")
    lines.append(f"- 고정 플랫폼비: {fmt_usd(cost.fixed_platform_usd)} / 월 ({fmt_krw(cost.fixed_platform_usd * USD_TO_KRW)})")
    lines.append(f"- 결제 수수료: 매출의 {cost.payment_fee_rate * 100:.1f}%")
    lines.append("- 비용 소스:")
    lines.append("  Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing")
    lines.append("  Supabase billing: https://supabase.com/docs/guides/platform/billing-on-supabase")
    lines.append("  Supabase egress: https://supabase.com/docs/guides/platform/manage-your-usage/egress")
    lines.append("  Supabase MAU: https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users")
    lines.append("  Supabase Edge Functions: https://supabase.com/docs/guides/functions/pricing")
    lines.append("  Vercel Pro: https://vercel.com/docs/plans/pro")
    lines.append("  Vercel pricing: https://vercel.com/pricing")
    lines.append("")
    lines.append("상위 가격 조합")
    for idx, summary in enumerate(top, start=1):
        p = summary.prices
        lines.append(
            f"{idx}. Personal {fmt_krw(p.personal_plus_krw)} | Bubble Plus {fmt_krw(p.bubble_plus_krw)} | "
            f"Bubble Pro {fmt_krw(p.bubble_pro_krw)}"
        )
        lines.append(
            f"   24개월 매출 {fmt_usd(summary.total_revenue_usd)} / "
            f"공헌이익 {fmt_usd(summary.total_contribution_usd)} / "
            f"24개월차 MRR {fmt_usd(summary.month24_mrr_usd)}"
        )

    lines.append("")
    lines.append("추천 가격")
    p = best.prices
    lines.append(f"- Personal Plus: {fmt_krw(p.personal_plus_krw)} / 월")
    lines.append(f"- Bubble Plus: {fmt_krw(p.bubble_plus_krw)} / 월")
    lines.append(f"- Bubble Pro: {fmt_krw(p.bubble_pro_krw)} / 월")
    lines.append("")
    lines.append("추천 가격 조합 결과")
    lines.append(f"- 24개월 누적 매출: {fmt_usd(best.total_revenue_usd)} ({fmt_krw(best.total_revenue_usd * USD_TO_KRW)})")
    lines.append(f"- 24개월 누적 변동비: {fmt_usd(best.total_variable_cost_usd)} ({fmt_krw(best.total_variable_cost_usd * USD_TO_KRW)})")
    lines.append(f"- 24개월 누적 플랫폼비: {fmt_usd(best.total_platform_cost_usd)} ({fmt_krw(best.total_platform_cost_usd * USD_TO_KRW)})")
    lines.append(f"- 24개월 누적 공헌이익: {fmt_usd(best.total_contribution_usd)} ({fmt_krw(best.total_contribution_usd * USD_TO_KRW)})")
    lines.append(f"- 24개월차 월매출: {fmt_usd(best.month24_mrr_usd)} ({fmt_krw(best.month24_mrr_usd * USD_TO_KRW)})")
    lines.append(f"- 24개월차 월공헌이익: {fmt_usd(best.month24_contribution_usd)} ({fmt_krw(best.month24_contribution_usd * USD_TO_KRW)})")
    lines.append("")
    lines.append("BEP")
    for team in TEAM_SCENARIOS:
        monthly_bep, cumulative_bep = bep_month(best.months, team)
        if monthly_bep is None:
            monthly_label = "24개월 내 미도달"
        else:
            monthly_label = f"{monthly_bep}개월차"
        if cumulative_bep is None:
            cumulative_label = "24개월 내 미도달"
        else:
            cumulative_label = f"{cumulative_bep}개월차"

        lines.append(
            f"- {team.name}: 인건비 {fmt_krw(team.monthly_labor_krw)}/월 | "
            f"월 BEP {monthly_label} | 누적 BEP {cumulative_label}"
        )

    lines.append("")
    lines.append("주요 스냅샷")
    lines.append(f"{'월':>3} {'Alive':>8} {'Bubbles':>8} {'P+':>6} {'B+':>6} {'BPro':>6} {'매출':>10} {'공헌':>10} {'Storage':>9}")
    for month in [1, 3, 6, 12, 18, 24]:
        m = best.months[month - 1]
        lines.append(
            f"{m.month:>3} {m.alive:>8,} {m.bubbles:>8,} {m.personal_subscribers:>6,} "
            f"{m.bubble_plus_bubbles:>6,} {m.bubble_pro_bubbles:>6,} "
            f"{fmt_usd(m.revenue_usd):>10} {fmt_usd(m.contribution_usd):>10} {m.storage_gb:>8.1f}G"
        )
    return "\n".join(lines)


def run() -> None:
    cost = CostConfig()
    candidates = generate_candidates()

    results = [simulate_business_model(combo, cost) for combo in candidates]
    results.sort(key=score_summary, reverse=True)

    top = results[:5]
    best = results[0]
    report = render_report(top, best, cost)
    print(report)

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = REPORT_DIR / f"test_business_model_{stamp}.txt"
    report_path.write_text(report + "\n", encoding="utf-8")
    print(f"\n리포트 저장: {report_path}")


if __name__ == "__main__":
    run()
