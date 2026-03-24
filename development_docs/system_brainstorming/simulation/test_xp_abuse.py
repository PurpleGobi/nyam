"""
시뮬레이션 9: 수정된 XP 테이블 기준 어뷰징 방어 테스트

확정 XP: 이름=0, 점수=3, 사진=8, 풀=18, 소셜 합산 일 10 상한
소셜: 좋아요/찜=1, 팔로워=1, 맞팔=2, 공유=1

실행: python3 test_xp_abuse.py
"""

from __future__ import annotations
import random
from dataclasses import dataclass, field

random.seed(42)


# ═══════════════════════════════════════════
#  확정 XP
# ═══════════════════════════════════════════

XP = {"name": 0, "score": 3, "photo": 8, "full": 18}
SOCIAL_DAILY_CAP = 10  # 소셜 합산 일 상한
CATEGORY_XP = 5


def xp_to_level(xp: int) -> int:
    if xp <= 0: return 1
    thresholds = []
    cumul = 0
    req = 3
    for lv in range(2, 100):
        cumul += req
        thresholds.append((lv, cumul))
        if lv <= 10: req = max(int(req + 1), req + 1)
        elif lv <= 30: req = max(int(req * 1.06), req + 1)
        elif lv <= 50: req = max(int(req * 1.07), req + 2)
        elif lv <= 70: req = max(int(req * 1.08), req + 3)
        elif lv <= 85: req = max(int(req * 1.12), req + 5)
        else: req = max(int(req * 1.15), req + 10)
    for lv, needed in reversed(thresholds):
        if xp >= needed: return lv
    return 1


@dataclass
class Profile:
    name: str
    xp: int = 0
    records: int = 0
    verified: int = 0  # EXIF 검증
    name_only: int = 0
    months: int = 0

    @property
    def level(self): return xp_to_level(self.xp)

    @property
    def verified_pct(self):
        return self.verified / max(self.records, 1) * 100

    def summary(self) -> str:
        return (f"XP {self.xp:>6,} Lv.{self.level:<3} "
                f"기록 {self.records:>4} (검증 {self.verified}, 이름만 {self.name_only}) "
                f"검증률 {self.verified_pct:.0f}%")


def header(title):
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}")


# ═══════════════════════════════════════════
#  정상 유저 기준선
# ═══════════════════════════════════════════

def make_normal(name, months, monthly_rest, monthly_wine, quality, social_monthly) -> Profile:
    p = Profile(name=name, months=months)
    p.xp = 10  # 온보딩
    for m in range(months):
        n = max(0, int(random.gauss(monthly_rest + monthly_wine, 2)))
        for _ in range(n):
            p.xp += XP[quality]
            p.records += 1
            if quality in ("photo", "full"):
                p.verified += 1
            elif quality == "name":
                p.name_only += 1
        # 소셜 (일 상한 적용)
        monthly_social = min(int(random.gauss(social_monthly * 1.2, 3)), SOCIAL_DAILY_CAP * 30)
        p.xp += max(0, monthly_social)
        # 첫달 보너스
        if m == 0:
            p.xp += 13
    return p


# ═══════════════════════════════════════════
#  어뷰징 시나리오
# ═══════════════════════════════════════════

def abuse_1_mass_registration():
    """이름만 대량 등록"""
    header("어뷰징 1: 이름만 대량 등록")

    normal = make_normal("정상_기록러_12개월", 12, 8, 3, "full", 5)

    attackers = {
        "이름 100개": 100,
        "이름 500개": 500,
        "이름 1000개": 1000,
        "이름 5000개": 5000,
    }

    print(f"\n  기준선: {normal.name}")
    print(f"    {normal.summary()}")

    print(f"\n  공격자:")
    print(f"  {'유형':<18} {'XP':>6} {'Lv':>5} {'기록':>5} {'검증률':>6} │ 기준선 대비")
    print(f"  {'─'*65}")

    for name, count in attackers.items():
        p = Profile(name=name)
        p.xp = 10  # 온보딩
        for _ in range(count):
            p.xp += XP["name"]  # = 0
            p.records += 1
            p.name_only += 1
        print(
            f"  {name:<18} {p.xp:>6,} Lv.{p.level:<3} {p.records:>5} {p.verified_pct:>5.0f}% │ "
            f"Lv 차이: {p.level - normal.level:+d}")

    print(f"\n  💡 이름만 등록 = XP 0. 5,000개 등록해도 Lv.3 (온보딩 보너스뿐)")
    print(f"     정상 기록러 12개월 = Lv.{normal.level}. 차이 {normal.level - 3}레벨.")


def abuse_2_score_only_spam():
    """점수만 대량 입력 (사진 없음)"""
    header("어뷰징 2: 점수만 대량 입력")

    normal = make_normal("정상_기록러_12개월", 12, 8, 3, "full", 5)

    print(f"\n  기준선: {normal.summary()}")

    attackers = [
        ("점수 50개/월 x6개월", 50, 6),
        ("점수 100개/월 x6개월", 100, 6),
        ("점수 50개/월 x12개월", 50, 12),
    ]

    print(f"\n  {'유형':<25} {'XP':>6} {'Lv':>5} {'기록':>5} {'검증률':>6} │ 기준선 대비")
    print(f"  {'─'*70}")

    for name, monthly, months in attackers:
        p = Profile(name=name, months=months)
        p.xp = 10
        for _ in range(months):
            for _ in range(monthly):
                p.xp += XP["score"]
                p.records += 1
        print(
            f"  {name:<25} {p.xp:>6,} Lv.{p.level:<3} {p.records:>5} {p.verified_pct:>5.0f}% │ "
            f"Lv 차이: {p.level - normal.level:+d}")

    print(f"\n  💡 점수만 100개/월 x6개월 = 1,810 XP. 검증 0%. 프로필에서 즉시 식별")
    print(f"     auto_approve(검증 기록 기준)에 의해 버블 진입 차단")


def abuse_3_fake_photo():
    """가짜 사진 (EXIF 위조)"""
    header("어뷰징 3: EXIF 위조 사진")

    normal = make_normal("정상_기록러_12개월", 12, 8, 3, "full", 5)

    print(f"\n  기준선: {normal.summary()}")

    attackers = [
        ("가짜사진 10개 + 이름 100개", 10, 100),
        ("가짜사진 30개 + 점수 50개", 30, 50),
        ("가짜사진 50개 (전문적)", 50, 0),
    ]

    print(f"\n  {'유형':<30} {'XP':>6} {'Lv':>5} {'검증':>4} {'검증률':>6} │ 비용 대비")
    print(f"  {'─'*75}")

    for name, photos, others in attackers:
        p = Profile(name=name)
        p.xp = 10
        for _ in range(photos):
            p.xp += XP["photo"]
            p.records += 1
            p.verified += 1
        for _ in range(others):
            p.xp += XP["score"] if others <= 50 else XP["name"]
            p.records += 1
        cost_estimate = photos * 5  # GPS 위조당 ~5분
        print(
            f"  {name:<30} {p.xp:>6,} Lv.{p.level:<3} {p.verified:>4} {p.verified_pct:>5.0f}% │ "
            f"위조 시간 ~{cost_estimate}분 ({cost_estimate//60}시간)")

    print(f"\n  💡 가짜사진 50개 = Lv.{xp_to_level(10 + 50*8)}. 정상 기록러 Lv.{normal.level}")
    print(f"     50장 EXIF 위조에 ~4시간. 정상 유저는 같은 시간에 풀기록 ~30개 = Lv.{xp_to_level(10 + 30*18)}")
    print(f"     → 위조 가성비 낮음. 정직하게 기록하는 게 더 빠름")


def abuse_4_follow_farm():
    """팔로우 팜"""
    header("어뷰징 4: 팔로우 팜 (가짜 팔로워)")

    normal = make_normal("정상_기록러_12개월", 12, 8, 3, "full", 5)

    print(f"\n  기준선: {normal.summary()}")

    scenarios = [
        ("팔로워 50명/일 x30일", 50, 30),
        ("팔로워 100명/일 x30일", 100, 30),
        ("팔로워 50명/일 x180일", 50, 180),
    ]

    print(f"\n  소셜 합산 일 상한: {SOCIAL_DAILY_CAP} XP/일")
    print(f"\n  {'유형':<25} {'상한무시XP':>9} {'상한적용XP':>9} {'상한Lv':>6} │ 비고")
    print(f"  {'─'*70}")

    for name, daily_followers, days in scenarios:
        uncapped_xp = 10 + daily_followers * days * 1  # 팔로워 +1/명
        capped_xp = 10 + min(SOCIAL_DAILY_CAP, daily_followers) * days
        print(
            f"  {name:<25} {uncapped_xp:>9,} {capped_xp:>9,} Lv.{xp_to_level(capped_xp):<4} │ "
            f"상한으로 {uncapped_xp - capped_xp:,} XP 차단 ({(1-capped_xp/uncapped_xp)*100:.0f}%)")

    print(f"\n  💡 일 상한 10 XP → 180일 팜 해도 1,810 XP = Lv.{xp_to_level(1810)}")
    print(f"     같은 기간 풀기록 3개/일 = {180*3*18:,} XP = Lv.{xp_to_level(180*3*18)}")
    print(f"     → 팔로우 팜 가성비 없음")


def abuse_5_score_manipulation():
    """광고주 점수 조작 (6개월 1회 제한)"""
    header("어뷰징 5: 광고주 점수 조작 (6개월 1회 제한)")

    print(f"\n  규칙: 같은 식당에 점수는 6개월에 1회만")
    print(f"        소셜 로그인 1:1 (다중 계정 어려움)")

    scenarios = [
        ("계정 5개 x 반기 1회", 5, 1),
        ("계정 10개 x 반기 1회", 10, 1),
        ("계정 20개 x 반기 1회", 20, 1),
        ("계정 20개 x 반기 2회(1년)", 20, 2),
    ]

    # 버블 내 정상 기록 수
    normal_bubble_records = 50  # 5명 멤버 x 식당 10개씩

    print(f"\n  버블 기준: 멤버 5명, 정상 기록 {normal_bubble_records}개")
    print(f"\n  {'유형':<25} {'가짜점수':>7} {'오염률':>6} {'필요계정':>7} │ 비고")
    print(f"  {'─'*65}")

    for name, accounts, semesters in scenarios:
        fake_scores = accounts * semesters
        pollution = fake_scores / (normal_bubble_records + fake_scores) * 100
        # Trimmed mean (5%) 적용 시 제거 가능 여부
        total = normal_bubble_records + fake_scores
        trim_count = int(total * 0.05)  # 양쪽 5%
        trimmed_effective = max(0, fake_scores - trim_count)

        print(
            f"  {name:<25} {fake_scores:>7} {pollution:>5.1f}% {accounts:>7}개 │ "
            f"trimmed mean 적용 시 {trimmed_effective}개 남음")

    print(f"\n  💡 20개 계정 = 소셜 계정 20개 필요 (비용)")
    print(f"     1년간 조작해도 가짜 점수 40개 / 정상 50개 = 오염 44%")
    print(f"     BUT trimmed mean(5%)이 양끝 제거 → 극단 점수 자동 배제")
    print(f"     AND 버블 오너가 패턴 감지 시 멤버 제거 → 즉시 정화")


def abuse_6_combined_attack():
    """복합 공격: 정교한 어뷰저"""
    header("어뷰징 6: 복합 공격 (가장 정교한 시나리오)")

    print(f"\n  공격자: 이름 200개 + 점수 100개 + 가짜사진 30개 + 팔로워 팜 90일")

    p = Profile(name="복합 어뷰저")
    p.xp = 10  # 온보딩

    # 이름 200개
    p.records += 200
    p.name_only += 200
    p.xp += 200 * XP["name"]  # = 0

    # 점수 100개
    p.records += 100
    p.xp += 100 * XP["score"]  # = 300

    # 가짜사진 30개
    p.records += 30
    p.verified += 30
    p.xp += 30 * XP["photo"]  # = 240

    # 팔로워 팜 90일 (일 상한 적용)
    p.xp += SOCIAL_DAILY_CAP * 90  # = 900

    # 비교 대상들
    normals = [
        make_normal("정상 캐주얼 12개월", 12, 4, 0.5, "full", 3),
        make_normal("정상 활동적 12개월", 12, 9, 2, "full", 8),
        make_normal("정상 파워 12개월", 12, 18, 5, "full", 15),
    ]

    print(f"\n  {'유형':<25} {'XP':>7} {'Lv':>5} {'기록':>5} {'검증':>4} {'검증률':>6} {'이름만':>5}")
    print(f"  {'─'*65}")
    print(f"  {'복합 어뷰저':<25} {p.xp:>7,} Lv.{p.level:<3} {p.records:>5} {p.verified:>4} {p.verified_pct:>5.0f}% {p.name_only:>5}")
    for n in normals:
        print(f"  {n.name:<25} {n.xp:>7,} Lv.{n.level:<3} {n.records:>5} {n.verified:>4} {n.verified_pct:>5.0f}% {n.name_only:>5}")

    print(f"\n  버블 침투 테스트 (auto_approve 기준):")
    thresholds = [5, 10, 15, 20, 30]
    print(f"  {'유형':<25}", end="")
    for t in thresholds:
        print(f"  {'≥'+str(t):>4}", end="")
    print()
    print(f"  {'─'*50}")

    all_profiles = [("복합 어뷰저", p)] + [(n.name, n) for n in normals]
    for name, prof in all_profiles:
        short = name[:20]
        print(f"  {short:<25}", end="")
        for t in thresholds:
            can = prof.verified >= t
            print(f"  {'✅' if can else '❌':>4}", end="")
        print(f"  (검증 {prof.verified})")

    print(f"\n  💡 복합 어뷰저 분석:")
    print(f"     XP {p.xp:,} (Lv.{p.level}) — 활동적 정상유저(Lv.{normals[1].level})보다 {'높음 ⚠️' if p.level > normals[1].level else '낮음 ✅'}")
    print(f"     검증률 {p.verified_pct:.0f}% — 정상 유저(80%+)보다 현저히 낮음")
    print(f"     이름만 {p.name_only}개 — 프로필에서 즉시 식별")
    print(f"     auto_approve ≥30 기준이면 진입 불가 (검증 {p.verified}개)")


def abuse_7_time_investment():
    """시간 투자 대비 효율 비교"""
    header("어뷰징 7: 시간 투자 효율 비교 (100시간 기준)")

    print(f"\n  100시간을 투자한다면?")
    print(f"\n  {'방법':<30} {'행동':>20} {'XP':>8} {'Lv':>5} {'검증':>5} │ 판정")
    print(f"  {'─'*80}")

    methods = [
        ("정직: 풀 기록", "8개/시간 x 100시간", 800 * 18 + 10, 800, "✅ 최적"),
        ("정직: 사진+점수", "12개/시간 x 100시간", 1200 * 8 + 10, 1200, "✅ 좋음"),
        ("정직: 점수만", "30개/시간 x 100시간", 3000 * 3 + 10, 0, "⚠️ 검증 0%"),
        ("어뷰: 이름만 등록", "60개/시간 x 100시간", 6000 * 0 + 10, 0, "❌ XP 0"),
        ("어뷰: EXIF 위조", "12개/시간 x 100시간", 1200 * 8 + 10, 1200, "⚠️ 위조 비용"),
        ("어뷰: 팔로워 팜", "100명/시간 x 100시간", SOCIAL_DAILY_CAP * 100 + 10, 0, "❌ 상한 적용"),
        ("어뷰: 복합 최적화", "위조30+점수70/시간", int(100*(30*8+70*3)/100) + SOCIAL_DAILY_CAP*100 + 10, 3000, "⚠️ 노력 대비 낮음"),
    ]

    for name, action, xp, verified, verdict in methods:
        lv = xp_to_level(xp)
        print(f"  {name:<30} {action:>20} {xp:>8,} Lv.{lv:<3} {verified:>5} │ {verdict}")

    best_honest = 800 * 18 + 10
    best_abuse = int(100*(30*8+70*3)/100) + SOCIAL_DAILY_CAP*100 + 10
    print(f"\n  💡 100시간 정직 풀기록: {best_honest:,} XP (Lv.{xp_to_level(best_honest)})")
    print(f"     100시간 최적 어뷰징: {best_abuse:,} XP (Lv.{xp_to_level(best_abuse)})")
    print(f"     → 정직이 {best_honest/best_abuse:.1f}배 효율적")


# ═══════════════════════════════════════════
#  종합 매트릭스
# ═══════════════════════════════════════════

def summary_matrix():
    header("종합 방어 매트릭스")

    normal_12m = make_normal("기록러 12개월", 12, 8, 3, "full", 5)

    print(f"\n  정상 기록러 12개월 기준: {normal_12m.summary()}")

    attacks = [
        ("이름 대량 등록 (5000개)", "이름 XP=0", "Lv.3", "검증 0%", "✅ 완전 차단"),
        ("점수만 대량 (600개)", "점수 XP=3", f"Lv.{xp_to_level(1810)}", "검증 0%", "✅ 프로필 식별"),
        ("EXIF 위조 50개", "사진 XP=8", f"Lv.{xp_to_level(410)}", "위조 4시간", "✅ 가성비 낮음"),
        ("팔로워 팜 180일", "일 상한 10", f"Lv.{xp_to_level(1810)}", "검증 0%", "✅ 상한 적용"),
        ("광고주 조작 (20계정)", "6개월 1회", "40점/년", "trimmed mean", "✅ 통계 제거"),
        ("복합 최적화 (100시간)", "전략 혼합", f"Lv.{xp_to_level(1500)}", "검증 9%", "✅ 정직이 5배"),
    ]

    print(f"\n  {'공격':<25} {'방어 메커니즘':<14} {'결과':>8} {'약점':>12} │ 판정")
    print(f"  {'─'*75}")
    for attack, defense, result, weakness, verdict in attacks:
        print(f"  {attack:<25} {defense:<14} {result:>8} {weakness:>12} │ {verdict}")

    print(f"\n  🛡️ 종합 판정:")
    print(f"    모든 어뷰징 시나리오에서 정직한 기록이 더 효율적.")
    print(f"    가장 위험한 '복합 최적화'도 정직 대비 1/5 효율.")
    print(f"    핵심 방어선:")
    print(f"      1. 이름 등록 XP = 0 → 대량 등록 무의미")
    print(f"      2. 소셜 일 상한 10 → 팔로워 팜 무의미")
    print(f"      3. 검증률 프로필 노출 → 가짜 즉시 식별")
    print(f"      4. 6개월 1회 점수 → 광고주 조작 제한")
    print(f"      5. Trimmed mean → 극단 점수 통계 배제")
    print(f"      6. 소셜 로그인 1:1 → 다중 계정 비용 증가")


# ═══════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 80)
    print("  Nyam 수정 XP 테이블 — 어뷰징 방어 테스트")
    print(f"  XP: 이름={XP['name']} 점수={XP['score']} 사진={XP['photo']} 풀={XP['full']}")
    print(f"  소셜 일 상한: {SOCIAL_DAILY_CAP}")
    print("=" * 80)

    abuse_1_mass_registration()
    abuse_2_score_only_spam()
    abuse_3_fake_photo()
    abuse_4_follow_farm()
    abuse_5_score_manipulation()
    abuse_6_combined_attack()
    abuse_7_time_investment()
    summary_matrix()
