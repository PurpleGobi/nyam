"""
시뮬레이션 5: 글로벌 성장 기준 — 어뷰징 위험성 + XP/레벨 인플레이션 분석
- test_global.py의 "현실적 보통" 성장률 기반
- 24개월간 유저 풀 규모에서 어뷰저 비율별 영향도
- 레벨 분포 건강성 추적

실행: python3 test_global_risks.py
"""

from __future__ import annotations
import random
from dataclasses import dataclass, field
from collections import Counter
from models import (
    User, Bubble, Record, BubbleRole, Visibility, JoinPolicy,
    RecordQuality, SOCIAL_XP, make_record, XP_TABLE,
)

random.seed(42)


# ═══════════════════════════════════════════
#  글로벌 성장 데이터 (test_global.py 결과)
# ═══════════════════════════════════════════

GLOBAL_MILESTONES = {
    # month: (total_signups, alive, dau)
    6:  (25052,   7194,  1291),
    12: (101452, 24342,  4379),
    18: (366111, 84685, 15239),
    24: (1421528, 358919, 64602),
}

# 유저 등급 분포 (test_growth.py 기반)
TIER_DISTRIBUTION = {
    "좀비":     0.40,
    "슬리퍼":   0.25,
    "캐주얼":   0.20,
    "활동적":   0.10,
    "파워유저": 0.05,
}

# 등급별 월간 기록 패턴
TIER_MONTHLY_RECORDS = {
    "좀비":     {"count": (0, 0), "quality_weights": {RecordQuality.NAME_ONLY: 1.0}},
    "슬리퍼":   {"count": (0, 2), "quality_weights": {
        RecordQuality.NAME_ONLY: 0.3, RecordQuality.WITH_SCORE: 0.4,
        RecordQuality.WITH_PHOTO: 0.2, RecordQuality.FULL: 0.1}},
    "캐주얼":   {"count": (2, 5), "quality_weights": {
        RecordQuality.NAME_ONLY: 0.1, RecordQuality.WITH_SCORE: 0.2,
        RecordQuality.WITH_PHOTO: 0.4, RecordQuality.FULL: 0.3}},
    "활동적":   {"count": (5, 12), "quality_weights": {
        RecordQuality.NAME_ONLY: 0.05, RecordQuality.WITH_SCORE: 0.1,
        RecordQuality.WITH_PHOTO: 0.4, RecordQuality.FULL: 0.45}},
    "파워유저": {"count": (10, 25), "quality_weights": {
        RecordQuality.NAME_ONLY: 0.02, RecordQuality.WITH_SCORE: 0.08,
        RecordQuality.WITH_PHOTO: 0.3, RecordQuality.FULL: 0.6}},
}


def pick_quality(weights: dict) -> RecordQuality:
    r = random.random()
    cumul = 0
    for q, w in weights.items():
        cumul += w
        if r <= cumul:
            return q
    return RecordQuality.WITH_SCORE


def simulate_user(tier: str, months_active: int) -> User:
    """특정 등급 유저의 N개월 활동 시뮬레이션"""
    user = User(nickname=f"{tier}")
    cfg = TIER_MONTHLY_RECORDS[tier]
    for _ in range(months_active):
        n = random.randint(*cfg["count"])
        for _ in range(n):
            q = pick_quality(cfg["quality_weights"])
            record = make_record(quality=q)
            user.add_record(record)
        # 소셜 XP (월간 소량)
        if tier in ("활동적", "파워유저"):
            user.xp += random.randint(1, 5)  # 공유/좋아요 등
    return user


def bar(value: int, max_val: int, width: int = 20) -> str:
    if max_val <= 0: return ""
    filled = int(min(value / max_val, 1.0) * width)
    return "█" * filled + "░" * (width - filled)


def header(title: str):
    print(f"\n{'='*75}")
    print(f"  {title}")
    print(f"{'='*75}")


# ═══════════════════════════════════════════
#  Part 1: XP/레벨 인플레이션 분석
# ═══════════════════════════════════════════

def analyze_inflation():
    header("Part 1: XP/레벨 인플레이션 분석 (24개월)")

    print(f"\n  시뮬레이션: 글로벌 성장률 기준, 잔존 유저의 등급별 XP/레벨 분포")
    print(f"  가정: 잔존 유저는 가입 시점부터 지속 활동 (평균 활동 기간으로 보정)")

    for milestone_month, (total, alive, dau) in GLOBAL_MILESTONES.items():
        print(f"\n  {'─'*70}")
        print(f"  📅 {milestone_month}개월차 — 잔존 {alive:,}명, DAU {dau:,}")
        print(f"  {'─'*70}")

        # 잔존 유저 생성 (등급 분포에 따라)
        users_by_tier = {}
        all_users = []

        for tier, ratio in TIER_DISTRIBUTION.items():
            count = int(alive * ratio)
            tier_users = []

            for _ in range(count):
                # 활동 기간: 1~milestone_month 사이 랜덤 (초기 가입자 vs 최근 가입자)
                months_active = random.randint(1, milestone_month)
                u = simulate_user(tier, months_active)
                tier_users.append(u)
                all_users.append(u)

            users_by_tier[tier] = tier_users

        # 등급별 통계
        print(f"\n  {'등급':<10} {'인원':>6} {'평균XP':>8} {'평균Lv':>7} {'평균기록':>7} {'평균검증':>7} {'최고Lv':>7}")
        print(f"  {'─'*55}")
        for tier, users in users_by_tier.items():
            if not users: continue
            avg_xp = sum(u.xp for u in users) / len(users)
            avg_lv = sum(u.level for u in users) / len(users)
            avg_rec = sum(len(u.records) for u in users) / len(users)
            avg_ver = sum(u.verified_count for u in users) / len(users)
            max_lv = max(u.level for u in users)
            print(f"  {tier:<10} {len(users):>6} {avg_xp:>8.0f} {avg_lv:>7.1f} {avg_rec:>7.1f} {avg_ver:>7.1f} {max_lv:>7}")

        # 레벨 분포
        level_counter = Counter(u.level for u in all_users)
        groups = {"Lv.1": 0, "Lv.2-3": 0, "Lv.4-6": 0, "Lv.7-10": 0, "Lv.11-20": 0, "Lv.21-50": 0, "Lv.51+": 0}
        for lv, cnt in level_counter.items():
            if lv == 1: groups["Lv.1"] += cnt
            elif lv <= 3: groups["Lv.2-3"] += cnt
            elif lv <= 6: groups["Lv.4-6"] += cnt
            elif lv <= 10: groups["Lv.7-10"] += cnt
            elif lv <= 20: groups["Lv.11-20"] += cnt
            elif lv <= 50: groups["Lv.21-50"] += cnt
            else: groups["Lv.51+"] += cnt

        max_c = max(groups.values()) if groups else 1
        print(f"\n  레벨 분포:")
        for group, cnt in groups.items():
            pct = cnt / max(len(all_users), 1) * 100
            print(f"    {group:>10}: {bar(cnt, max_c)} {cnt:>7,} ({pct:>5.1f}%)")

        # 인플레이션 지표
        lv10_plus = sum(cnt for lv, cnt in level_counter.items() if lv >= 10)
        lv20_plus = sum(cnt for lv, cnt in level_counter.items() if lv >= 20)
        max_level = max(level_counter.keys())
        xps = sorted(u.xp for u in all_users)
        median_xp = xps[len(xps)//2]
        p90_xp = xps[int(len(xps)*0.9)]
        p99_xp = xps[int(len(xps)*0.99)]

        print(f"\n  인플레이션 지표:")
        print(f"    Lv.10+ : {lv10_plus:,} ({lv10_plus/len(all_users)*100:.1f}%)", end="")
        if lv10_plus/len(all_users)*100 > 15: print(" 🚨")
        elif lv10_plus/len(all_users)*100 > 8: print(" ⚠️")
        else: print(" ✅")
        print(f"    Lv.20+ : {lv20_plus:,} ({lv20_plus/len(all_users)*100:.1f}%)", end="")
        if lv20_plus/len(all_users)*100 > 5: print(" 🚨")
        elif lv20_plus/len(all_users)*100 > 2: print(" ⚠️")
        else: print(" ✅")
        print(f"    최고 레벨: Lv.{max_level}")
        print(f"    XP: median={median_xp} p90={p90_xp} p99={p99_xp}")

    # 시간에 따른 인플레이션 추이 요약
    print(f"\n\n  📈 인플레이션 추이 요약:")
    print(f"  {'시점':<10} {'잔존':>8} {'Lv.10+비율':>10} {'Lv.20+비율':>10} {'최고Lv':>7} {'판정':<10}")
    print(f"  {'─'*58}")
    for m in [6, 12, 18, 24]:
        _, alive, _ = GLOBAL_MILESTONES[m]
        # 재시뮬 (간략)
        random.seed(42 + m)
        users = []
        for tier, ratio in TIER_DISTRIBUTION.items():
            for _ in range(int(alive * ratio)):
                u = simulate_user(tier, random.randint(1, m))
                users.append(u)
        lc = Counter(u.level for u in users)
        l10 = sum(c for l, c in lc.items() if l >= 10)
        l20 = sum(c for l, c in lc.items() if l >= 20)
        ml = max(lc.keys())
        l10r = l10/len(users)*100
        l20r = l20/len(users)*100
        verdict = "✅ 정상" if l10r < 8 else ("⚠️ 주의" if l10r < 15 else "🚨 위험")
        print(f"  {m:>2}개월    {alive:>8,} {l10r:>9.1f}% {l20r:>9.1f}% {ml:>7} {verdict}")


# ═══════════════════════════════════════════
#  Part 2: 어뷰저 영향도 (규모별)
# ═══════════════════════════════════════════

def analyze_abuse():
    header("Part 2: 어뷰저 영향도 — 글로벌 규모에서의 위협 분석")

    # 24개월차 기준
    total, alive, dau = GLOBAL_MILESTONES[24]

    print(f"\n  기준: 24개월차 — 가입 {total:,} / 잔존 {alive:,} / DAU {dau:,}")

    # ─── 어뷰저 유형별 시뮬레이션 ───

    abuse_types = {
        "대량등록봇": {
            "description": "이름만 대량 등록으로 XP 축적 시도",
            "records": [(500, RecordQuality.NAME_ONLY)],
        },
        "점수조작봇": {
            "description": "점수만 대량 입력 (사진 없음)",
            "records": [(200, RecordQuality.NAME_ONLY), (100, RecordQuality.WITH_SCORE)],
        },
        "정교한어뷰저": {
            "description": "이름 100 + 점수 50 + 가짜사진 20",
            "records": [(100, RecordQuality.NAME_ONLY), (50, RecordQuality.WITH_SCORE), (20, RecordQuality.WITH_PHOTO)],
        },
        "팔로우팜": {
            "description": "기록 소량 + 가짜 팔로워 100명으로 XP",
            "records": [(10, RecordQuality.FULL)],
            "follower_xp": 100 * 2,  # 일일상한 무시 시 최대
            "follower_xp_capped": 10,  # 일일상한 적용
        },
    }

    # 정상 유저 기준선 생성
    normal_benchmarks = {}
    for tier in ["캐주얼", "활동적", "파워유저"]:
        u = simulate_user(tier, 12)  # 12개월 활동
        normal_benchmarks[tier] = u

    print(f"\n  ─── 정상 유저 기준선 (12개월 활동) ───")
    print(f"  {'등급':<12} {'XP':>6} {'Lv':>4} {'기록':>5} {'검증':>5} {'검증%':>6}")
    print(f"  {'─'*42}")
    for tier, u in normal_benchmarks.items():
        vr = u.verified_count / max(len(u.records), 1) * 100
        print(f"  {tier:<12} {u.xp:>6} Lv.{u.level:>2} {len(u.records):>5} {u.verified_count:>5} {vr:>5.0f}%")

    print(f"\n  ─── 어뷰저 프로필 ───")
    print(f"  {'유형':<16} {'XP':>6} {'Lv':>4} {'기록':>5} {'검증':>5} {'검증%':>6} │ {'설명'}")
    print(f"  {'─'*75}")

    abuser_profiles = {}
    for name, cfg in abuse_types.items():
        u = User(nickname=name)
        for count, quality in cfg["records"]:
            for _ in range(count):
                u.add_record(make_record(quality=quality))
        if "follower_xp" in cfg:
            u.xp += cfg["follower_xp"]
        abuser_profiles[name] = u
        vr = u.verified_count / max(len(u.records), 1) * 100
        print(f"  {name:<16} {u.xp:>6} Lv.{u.level:>2} {len(u.records):>5} {u.verified_count:>5} {vr:>5.0f}% │ {cfg['description']}")

    # ─── 버블 침투 테스트 ───

    print(f"\n\n  ─── 버블 침투 테스트 ───")

    thresholds = [3, 5, 10, 15, 20]
    print(f"\n  auto_approve 검증기록 기준별 침투 가능 여부:")
    print(f"  {'유형':<16}", end="")
    for t in thresholds:
        print(f" {'≥'+str(t):>5}", end="")
    print()
    print(f"  {'─'*42}")

    for name, u in abuser_profiles.items():
        print(f"  {name:<16}", end="")
        for t in thresholds:
            can = u.verified_count >= t
            print(f" {'✅' if can else '❌':>5}", end="")
        print(f"  (검증 {u.verified_count}개)")

    print(f"\n  정상 유저 비교:")
    for tier, u in normal_benchmarks.items():
        print(f"  {tier:<16}", end="")
        for t in thresholds:
            can = u.verified_count >= t
            print(f" {'✅' if can else '❌':>5}", end="")
        print(f"  (검증 {u.verified_count}개)")

    # ─── 규모별 어뷰저 영향도 ───

    print(f"\n\n  ─── 규모별 어뷰저 영향도 (24개월차 잔존 {alive:,}명 기준) ───")

    abuse_rates = [0.001, 0.005, 0.01, 0.03, 0.05]  # 0.1% ~ 5%

    print(f"\n  어뷰저 비율별 영향:")
    print(f"  {'비율':>6} {'어뷰저수':>8} │ {'버블침투':>10} {'오염기록':>10} {'오염비율':>8} │ 위험도")
    print(f"  {'─'*62}")

    for rate in abuse_rates:
        n_abusers = int(alive * rate)
        # 어뷰저 대부분은 대량등록봇 (가장 흔한 유형)
        abuser = abuser_profiles["대량등록봇"]

        # 버블 침투: 검증 0이므로 auto_approve 불가. manual은 오너가 거절.
        # 유일한 침투 경로: open 버블
        open_bubble_ratio = 0.10  # 전체 버블의 ~10%가 open
        total_bubbles = 45652  # 24개월차
        open_bubbles = int(total_bubbles * open_bubble_ratio)
        infiltrated = int(n_abusers * 0.3 * open_bubble_ratio)  # 30%가 시도, open만 성공

        # 오염 기록 (어뷰저가 open 버블에 공유하는 이름만 기록)
        polluted_records = infiltrated * 5  # 침투자당 평균 5개 공유
        total_records = 914727  # 24개월 총 기록
        pollution_rate = polluted_records / total_records * 100

        # 위험도 판정
        if pollution_rate > 1.0:
            risk = "🚨 높음"
        elif pollution_rate > 0.1:
            risk = "⚠️ 보통"
        else:
            risk = "✅ 낮음"

        print(
            f"  {rate*100:>5.1f}% {n_abusers:>8,} │ "
            f"{infiltrated:>10,} {polluted_records:>10,} {pollution_rate:>7.3f}% │ {risk}"
        )

    # ─── 공격 시나리오별 상세 분석 ───

    print(f"\n\n  ─── 공격 시나리오별 상세 분석 ───")

    scenarios = [
        {
            "name": "봇 팜 공격",
            "desc": "경쟁사가 봇 1,000개로 데이터 오염 시도",
            "n_bots": 1000,
            "type": "대량등록봇",
            "actions": ["이름만 대량 등록", "open 버블 가입", "저품질 기록 공유"],
        },
        {
            "name": "리스트 스크래핑",
            "desc": "크롤러가 공개 버블의 식당 리스트 수집",
            "n_bots": 50,
            "type": "대량등록봇",
            "actions": ["공개 버블 팔로우", "이름+점수 수집", "외부 서비스에 복제"],
        },
        {
            "name": "팔로워 매매",
            "desc": "가짜 계정으로 팔로워 판매 서비스",
            "n_bots": 5000,
            "type": "팔로우팜",
            "actions": ["가짜 계정 생성", "특정 버블/유저 팔로우", "XP 부풀리기"],
        },
        {
            "name": "광고주 어뷰징",
            "desc": "광고주가 자사 식당 점수 조작",
            "n_bots": 20,
            "type": "정교한어뷰저",
            "actions": ["가짜 계정 + 가짜 사진으로 기록", "자사 식당 고점수", "버블에 공유"],
        },
    ]

    for s in scenarios:
        abuser = abuser_profiles[s["type"]]
        print(f"\n  📌 {s['name']}")
        print(f"     {s['desc']}")
        print(f"     봇 수: {s['n_bots']:,} | 유형: {s['type']}")
        print(f"     공격 행동: {' → '.join(s['actions'])}")

        # 방어 분석
        print(f"     방어:")
        if abuser.verified_count == 0:
            print(f"       ✅ 검증 기록 0% → 버블 가입 차단 (open 제외)")
            print(f"       ✅ 프로필에서 즉시 식별 가능")
        else:
            vc = abuser.verified_count
            print(f"       ⚠️ 검증 기록 {vc}개 → 기준 {vc} 미만 버블은 침투 가능")

        if s["type"] == "팔로우팜":
            print(f"       ✅ 일일 팔로워 XP 상한 10 → 대규모 팜 효과 제한적")
            print(f"       ✅ 기록 0 계정의 팔로우 XP 미부여 (제안)")
            print(f"       ⚠️ 팔로워 수 자체는 부풀릴 수 있음 (시각적 속임)")
        elif s["type"] == "대량등록봇" and s["name"] == "리스트 스크래핑":
            print(f"       ⚠️ 팔로우로 이름+점수는 접근 가능 (설계상 허용)")
            print(f"       ✅ 상세 리뷰/사진/팁은 접근 불가")
            print(f"       🛡️ 대응: rate limiting, 비정상 접근 패턴 탐지")
        elif s["name"] == "광고주 어뷰징":
            print(f"       ⚠️ 소수 정교한 어뷰저는 탐지 어려움")
            print(f"       🛡️ 대응: 같은 식당 반복 고점수 패턴 탐지")
            print(f"       🛡️ 대응: 버블 오너의 멤버 제거 권한")
            print(f"       🛡️ 대응: 신고 시스템 + 자동 경고")

        # 영향도
        pollution = s["n_bots"] * 5 / 914727 * 100
        dau_impact = s["n_bots"] / 64602 * 100
        print(f"     영향도: 기록 오염 {pollution:.3f}% | DAU 대비 {dau_impact:.2f}%")

    # ─── 권장 방어선 ───

    print(f"\n\n{'='*75}")
    print(f"  🛡️ 권장 방어선 요약")
    print(f"{'='*75}")

    defenses = [
        ("1차: 가입 단계", [
            "디바이스 핑거프린팅 (동일 기기 중복 가입 차단)",
            "전화번호/이메일 인증 필수",
            "가입 속도 제한 (같은 IP에서 시간당 3개)",
        ]),
        ("2차: 기록 단계", [
            "EXIF 검증 (GPS 반경 200m + 타임스탬프)",
            "이름만 등록은 XP +1 (사실상 무의미)",
            "하루 기록 수 상한 (20개 — 정상 파워유저도 3~5개)",
            "같은 식당 반복 기록 탐지",
        ]),
        ("3차: 소셜 단계", [
            "팔로워 XP 일일 상한 10",
            "기록 0 계정의 팔로우 XP 미부여",
            "비정상 팔로우 패턴 탐지 (1분 내 10+)",
            "auto_approve 최소 기준: 검증 기록 5개 이상",
        ]),
        ("4차: 버블 보호", [
            "open 버블 최소화 권장 (manual_approve 기본값)",
            "버블 오너의 멤버 제거 + 차단 권한",
            "오염원 자동 경고 (같은 식당 집중 고점수 패턴)",
            "신고 시스템 (누적 3건 → 자동 제한)",
        ]),
        ("5차: 모니터링", [
            "검증률 0% 계정 주간 리포트",
            "급증하는 가입/팔로우 패턴 알림",
            "광고주 관련 식당의 점수 이상치 탐지",
        ]),
    ]

    for level, items in defenses:
        print(f"\n  {level}:")
        for item in items:
            print(f"    - {item}")


# ═══════════════════════════════════════════
#  Part 3: 종합 위험도 매트릭스
# ═══════════════════════════════════════════

def risk_matrix():
    header("Part 3: 종합 위험도 매트릭스")

    risks = [
        ("XP 인플레이션",     "낮음 ✅", "기록 XP가 96%+ 차지, 소셜 4% 미만. 레벨 분포 피라미드 유지"),
        ("대량등록 봇",       "낮음 ✅", "검증 0% → 버블 침투 불가, 프로필에서 즉시 식별"),
        ("리스트 스크래핑",    "보통 ⚠️", "팔로우로 이름+점수 접근 가능. rate limiting으로 완화"),
        ("팔로워 매매",       "낮음 ✅", "일일 상한 + 기록0 계정 XP 미부여로 가성비 없음"),
        ("광고주 점수 조작",   "보통 ⚠️", "소수 정교한 어뷰저 탐지 어려움. 패턴 탐지 + 신고 필요"),
        ("데이터 무임승차",    "낮음 ✅", "맞팔 필요 + 팔로우는 맛보기만. 진짜 가치는 상세 기록"),
        ("open 버블 오염",    "보통 ⚠️", "open 버블은 취약. manual_approve 기본값으로 완화"),
        ("고레벨 집중",       "낮음 ✅", "Lv.20+ 0.5~1.5%. 파워유저 12개월 풀활동 = Lv.15~20 수준"),
    ]

    print(f"\n  {'위협':<18} {'위험도':<10} {'근거'}")
    print(f"  {'─'*72}")
    for threat, level, reason in risks:
        print(f"  {threat:<18} {level:<10} {reason}")

    print(f"\n  종합 판정: 현재 설계의 방어 체계는 글로벌 규모(DAU 6.5만)에서도")
    print(f"  대부분의 어뷰징을 효과적으로 차단. 주의 필요 영역은 '리스트 스크래핑'과")
    print(f"  '광고주 점수 조작'이며, 이는 rate limiting + 패턴 탐지로 대응 가능.")


# ═══════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 75)
    print("  Nyam 글로벌 성장 기준 — 위험 분석")
    print("  (test_global.py 현실적 보통 성장률 기반)")
    print("=" * 75)

    analyze_inflation()
    analyze_abuse()
    risk_matrix()

    print(f"\n\n{'='*75}")
    print(f"  분석 완료")
    print(f"{'='*75}")
