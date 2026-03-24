"""
시뮬레이션 2: 어뷰징 시나리오
- 다양한 어뷰징 패턴이 시스템에 미치는 영향 측정
- 정상 유저 대비 어뷰저의 프로필 차이
- 방어 메커니즘 효과 검증

실행: python3 test_abuse.py
"""

from __future__ import annotations
import random
from models import (
    User, Bubble, Record, BubbleRole, Visibility, JoinPolicy,
    RecordQuality, SOCIAL_XP, make_record,
)
from engine import SimulationEngine

random.seed(42)


def header(title: str):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")


def compare_profiles(users: list[tuple[str, User]]):
    """유저 프로필 비교 테이블"""
    print(f"\n  {'이름':<18} {'XP':>6} {'Lv':>4} {'전체':>5} {'검증':>5} {'검증%':>6} {'이름만':>6}")
    print(f"  {'─'*56}")
    for label, user in users:
        p = user.profile
        ratio = p.verified_records / max(p.total_records, 1) * 100
        print(
            f"  {label:<18} {p.total_xp:>6} {f'Lv.{user.level}':>4} "
            f"{p.total_records:>5} {p.verified_records:>5} {ratio:>5.0f}% {p.name_only_records:>6}"
        )


def abuse_1_mass_registration():
    """
    어뷰징 1: 이름만 대량 등록
    공격자가 이름만으로 수백 개 식당을 등록해 XP를 올리려는 시도
    """
    header("어뷰징 1: 이름만 대량 등록")

    sim = SimulationEngine()

    # 정상 유저들 (기준선)
    normal_casual = sim.create_user("정상_캐주얼")
    normal_active = sim.create_user("정상_활동적")
    normal_power = sim.create_user("정상_파워")

    # 3개월 시뮬레이션
    for month in range(3):
        for _ in range(random.randint(2, 4)):
            normal_casual.add_record(make_record(quality=random.choice([
                RecordQuality.WITH_SCORE, RecordQuality.WITH_PHOTO
            ])))
        for _ in range(random.randint(5, 10)):
            normal_active.add_record(make_record(quality=random.choice([
                RecordQuality.WITH_PHOTO, RecordQuality.FULL
            ])))
        for _ in range(random.randint(12, 20)):
            normal_power.add_record(make_record(quality=RecordQuality.FULL))

    # 공격자들
    attacker_100 = sim.create_user("공격자_100개")
    attacker_500 = sim.create_user("공격자_500개")
    attacker_mixed = sim.create_user("공격자_혼합")

    # 이름만 대량 등록
    sim.bulk_add_records(attacker_100, 100, RecordQuality.NAME_ONLY)
    sim.bulk_add_records(attacker_500, 500, RecordQuality.NAME_ONLY)
    # 혼합: 이름 200 + 점수만 50
    sim.bulk_add_records(attacker_mixed, 200, RecordQuality.NAME_ONLY)
    sim.bulk_add_records(attacker_mixed, 50, RecordQuality.WITH_SCORE)

    print("\n  📊 프로필 비교:")
    compare_profiles([
        ("정상_캐주얼(3개월)", normal_casual),
        ("정상_활동적(3개월)", normal_active),
        ("정상_파워(3개월)", normal_power),
        ("공격자_100개", attacker_100),
        ("공격자_500개", attacker_500),
        ("공격자_혼합(250)", attacker_mixed),
    ])

    # 버블 가입 시도
    print("\n  🔒 버블 가입 테스트 (auto_approve, 검증 10개 이상):")
    owner = sim.create_user("버블오너")
    sim.bulk_add_records(owner, 30, RecordQuality.FULL)
    bubble = sim.create_bubble(
        owner, "맛집모임",
        Visibility.PUBLIC, JoinPolicy.AUTO_APPROVE, 10
    )

    for label, user in [
        ("정상_캐주얼", normal_casual),
        ("정상_활동적", normal_active),
        ("정상_파워", normal_power),
        ("공격자_100개", attacker_100),
        ("공격자_500개", attacker_500),
        ("공격자_혼합", attacker_mixed),
    ]:
        can, reason = bubble.can_join(user.profile)
        status = "✅ 가입 가능" if can else "❌ 거절"
        print(f"    {label:<18} → {status}: {reason}")

    print("\n  💡 분석:")
    print(f"    - 공격자_500개: XP {attacker_500.xp}이지만 검증 0% → 가입 거절")
    print(f"    - 정상_활동적: XP {normal_active.xp}이지만 검증 {normal_active.verified_count}개 → 가입 가능")
    print(f"    → 검증 기록 기반 허들이 대량 등록 어뷰징을 효과적으로 차단")


def abuse_2_data_leaching():
    """
    어뷰징 2: 데이터 무임승차
    고레벨 지인이 여러 버블 가입 후 데이터를 중계하는 시나리오
    """
    header("어뷰징 2: 데이터 무임승차 (중계자)")

    sim = SimulationEngine()

    # 버블 3개 생성 (각각 다른 오너)
    owners = []
    bubbles = []
    for i in range(3):
        owner = sim.create_user(f"오너{i+1}")
        sim.bulk_add_records(owner, 30, RecordQuality.FULL)
        bubble = sim.create_bubble(
            owner, f"맛집버블{i+1}",
            Visibility.PUBLIC, JoinPolicy.AUTO_APPROVE, 10
        )
        # 각 버블에 멤버 추가 + 기록 공유
        for j in range(5):
            member = sim.create_user(f"멤버{i+1}_{j+1}")
            sim.bulk_add_records(member, 15, RecordQuality.FULL)
            sim.approve_join(member, bubble)
        owners.append(owner)
        bubbles.append(bubble)

    # 중계자: 고레벨 유저가 3개 버블 모두 가입
    relay = sim.create_user("중계자")
    sim.bulk_add_records(relay, 20, RecordQuality.FULL)

    print("\n  📋 중계자가 버블 3개 가입 시도:")
    for bubble in bubbles:
        can, reason = bubble.can_join(relay.profile)
        if can:
            sim.approve_join(relay, bubble)
        print(f"    '{bubble.name}' → {'✅' if can else '❌'} {reason}")

    # 수혜자: 경험치 없는 신규 유저
    freeloader = sim.create_user("무임승차자")

    print(f"\n  📋 무임승차자가 중계자를 통해 접근하려는 시도:")

    # 팔로우
    sim.follow_user(freeloader, relay)

    print(f"\n  일방 팔로우 시 보이는 것:")
    for record in relay.records[:3]:
        view = sim.view_personal_record(freeloader, relay, record)
        print(f"    {record.restaurant_name}: {view['access_level']} | 점수: {view.get('score', '—')} | 리뷰: {'O' if view.get('has_review') else 'X'}")

    print(f"\n  💡 분석:")
    print(f"    - 무임승차자는 일방 팔로우로 이름+점수만 볼 수 있음")
    print(f"    - 상세 리뷰/사진/팁은 접근 불가")
    print(f"    - 맞팔하려면 중계자가 무임승차자를 팔로우해야 함")
    print(f"    - 무임승차자 프로필: {freeloader.profile.trust_summary}")
    print(f"    → 검증 기록 0인 유저를 맞팔할 동기 없음")

    # 맞팔 시도 (중계자가 거절하는 게 합리적)
    print(f"\n  만약 중계자가 맞팔을 해준다면?")
    sim.follow_user(relay, freeloader)
    for record in relay.records[:3]:
        view = sim.view_personal_record(freeloader, relay, record)
        print(f"    {record.restaurant_name}: {view['access_level']} | 리뷰: {'O' if view.get('has_review') else 'X'}")
    print(f"    → 풀 액세스 가능. 하지만 이건 중계자의 '선택'")
    print(f"    → 시스템이 막을 수 없지만, 중계자의 기록만 볼 수 있음 (버블 전체 X)")


def abuse_3_fake_records_onboarding():
    """
    어뷰징 3: 온보딩 가봤음 대량 체크
    온보딩에서 가본 적 없는 식당을 대량으로 "가봤음" 체크
    """
    header("어뷰징 3: 온보딩 가봤음 대량 체크")

    sim = SimulationEngine()

    # 정직한 온보딩
    honest = sim.create_user("정직한유저")
    print("\n  정직한 온보딩: 실제 가본 5곳 등록 + 3곳 풀 기록")
    sim.bulk_add_records(honest, 5, RecordQuality.NAME_ONLY)  # 온보딩에서 체크
    sim.bulk_add_records(honest, 3, RecordQuality.FULL)       # 이후 풀 기록

    # 부정직한 온보딩
    dishonest = sim.create_user("부정직유저")
    print("  부정직 온보딩: 안 가본 50곳 등록 + 이후 기록 없음")
    sim.bulk_add_records(dishonest, 50, RecordQuality.NAME_ONLY)

    # 극단적 어뷰저
    extreme = sim.create_user("극단적어뷰저")
    print("  극단적 어뷰저: 200곳 이름 등록 + 점수만 100곳")
    sim.bulk_add_records(extreme, 200, RecordQuality.NAME_ONLY)
    sim.bulk_add_records(extreme, 100, RecordQuality.WITH_SCORE)

    print("\n  📊 프로필 비교:")
    compare_profiles([
        ("정직한유저", honest),
        ("부정직유저(50)", dishonest),
        ("극단적어뷰저(300)", extreme),
    ])

    print(f"\n  💡 분석:")
    print(f"    정직한유저: XP {honest.xp}, 검증 {honest.verified_count}개 ({honest.verified_count/max(len(honest.records),1)*100:.0f}%)")
    print(f"    부정직유저: XP {dishonest.xp}, 검증 {dishonest.verified_count}개 ({dishonest.verified_count/max(len(dishonest.records),1)*100:.0f}%)")
    print(f"    극단적어뷰저: XP {extreme.xp}, 검증 {extreme.verified_count}개 ({extreme.verified_count/max(len(extreme.records),1)*100:.0f}%)")
    print(f"\n    → 부정직유저: 50개 등록해도 XP {dishonest.xp}뿐 (정직한유저보다 낮음)")
    print(f"    → 극단적어뷰저: 300개 등록해도 검증 0% → 프로필에서 즉시 식별")
    print(f"    → XP는 높을 수 있으나, '검증률'이 핵심 신뢰 지표")


def abuse_4_follow_farming():
    """
    어뷰징 4: 팔로우 팜
    가짜 계정으로 팔로워를 늘려 XP를 올리는 시도
    """
    header("어뷰징 4: 팔로우 팜 (가짜 팔로워)")

    sim = SimulationEngine()

    # 공격자: 버블 만들고 가짜 계정으로 팔로우
    attacker = sim.create_user("팜오너")
    sim.bulk_add_records(attacker, 5, RecordQuality.FULL)
    bubble = sim.create_bubble(attacker, "팔로우팜버블", Visibility.PUBLIC, JoinPolicy.CLOSED)

    print(f"\n  공격 전 오너: XP={attacker.xp}, Lv.{attacker.level}")

    # 가짜 계정 50개로 팔로우
    fake_count = 50
    for i in range(fake_count):
        fake = sim.create_user(f"fake{i}")
        sim.follow_bubble(fake, bubble)

    print(f"  가짜 팔로워 {fake_count}개 추가 후:")
    print(f"  오너: XP={attacker.xp}, Lv.{attacker.level}")
    follower_xp = fake_count * SOCIAL_XP["follower_gained_bubble"]
    print(f"  팔로워로 얻은 XP: {follower_xp}")

    # 일일 상한 적용 시
    daily_cap = 10  # DAILY_CAPS["follower_gained_bubble"]
    capped_xp = min(follower_xp, daily_cap)
    print(f"\n  ⚠️  일일 상한 적용 시:")
    print(f"    하루 최대 팔로워 XP: {daily_cap}")
    print(f"    50개 팔로워를 하루에 추가해도: +{daily_cap} XP (나머지 {follower_xp - daily_cap} 무효)")

    # 정상 유저와 비교
    normal = sim.create_user("정상큐레이터")
    sim.bulk_add_records(normal, 5, RecordQuality.FULL)

    print(f"\n  📊 비교 (일일 상한 미적용 — 현재 시뮬레이션):")
    print(f"    팜오너:     XP {attacker.xp} (기록 75 + 팔로워 {follower_xp})")
    print(f"    정상유저:   XP {normal.xp} (기록 75)")
    print(f"    → 일일 상한 없으면 팔로워 팜이 유효한 공격")

    print(f"\n  📊 비교 (일일 상한 적용 시):")
    real_attacker_xp = 75 + daily_cap  # 기록 XP + 하루 팔로워 상한
    print(f"    팜오너:     ~{real_attacker_xp} XP (기록 75 + 팔로워 상한 {daily_cap}/일)")
    print(f"    → 50일간 매일 팔로워 팜 해도: +{daily_cap * 50} XP")
    print(f"    → 같은 기간 풀 기록 2개/일: +{15 * 2 * 50} XP")
    print(f"    → 기록이 압도적으로 효율적. 팔로우 팜 가성비 낮음")

    print(f"\n  💡 추가 방어:")
    print(f"    - 같은 IP/디바이스 중복 팔로우 무효")
    print(f"    - 기록 0인 계정의 팔로우는 XP 미부여 (구현 제안)")
    print(f"    - 비정상 팔로우 패턴 감지 (1분 내 10+ 팔로우)")


def abuse_5_wishlist_to_record():
    """
    어뷰징 5: 찜→등록 전환 (타인 리스트 자기것화)
    팔로우로 얻은 리스트의 식당을 전부 "가봤음"으로 등록
    """
    header("어뷰징 5: 찜→등록 전환 (타인 리스트 복제)")

    sim = SimulationEngine()

    # 원본 유저
    original = sim.create_user("원본유저")
    sim.bulk_add_records(original, 30, RecordQuality.FULL)

    # 복제 시도자
    copier = sim.create_user("복제시도자")

    # 팔로우 → 이름+점수만 보임
    sim.follow_user(copier, original)

    print(f"\n  원본유저: {len(original.records)}개 풀 기록, XP={original.xp}")
    print(f"  복제시도자: 팔로우 후 이름+점수 30개 확인")

    # 전부 이름만 등록
    print(f"\n  복제 시도: 30개 식당을 이름만 등록")
    sim.bulk_add_records(copier, 30, RecordQuality.NAME_ONLY)

    print(f"\n  📊 결과:")
    compare_profiles([
        ("원본유저", original),
        ("복제시도자", copier),
    ])

    print(f"\n  💡 분석:")
    print(f"    원본유저: 검증 {original.verified_count}개 (100%), XP {original.xp}")
    print(f"    복제시도자: 검증 0개 (0%), XP {copier.xp}")
    print(f"    → 이름만 복제해도 XP는 {copier.xp}뿐 (원본의 {copier.xp/original.xp*100:.0f}%)")
    print(f"    → 프로필 검증률 0% → 버블 가입 불가, 맞팔 동기 없음")
    print(f"    → 복제한 '이름만' 기록은 본인에게도 유용하지 않음 (상세 정보 없음)")

    # 만약 사진까지 위조하려면?
    print(f"\n  만약 사진(EXIF)까지 위조하려면?")
    print(f"    30곳 x EXIF 위조 = 30번 GPS 메타데이터 수동 조작 필요")
    print(f"    + 각 식당 반경 200m 이내 GPS 좌표 필요")
    print(f"    → 기술적으로 가능하나 비용 대비 가치 없음")


def abuse_6_impact_on_ecosystem():
    """
    어뷰징 6: 생태계 영향 종합 분석
    정상 유저 풀에 어뷰저가 섞였을 때 전체 시스템에 미치는 영향
    """
    header("어뷰징 6: 생태계 영향 종합 분석")

    sim = SimulationEngine()

    # 정상 유저 20명
    normals = []
    for i in range(20):
        u = sim.create_user(f"정상{i+1}")
        n_records = random.randint(5, 25)
        quality = random.choice([RecordQuality.WITH_PHOTO, RecordQuality.FULL])
        sim.bulk_add_records(u, n_records, quality)
        normals.append(u)

    # 정상 버블
    owner = normals[0]
    bubble = sim.create_bubble(owner, "건강한버블", Visibility.PUBLIC, JoinPolicy.AUTO_APPROVE, 5)
    for u in normals[1:10]:
        can, _ = bubble.can_join(u.profile)
        if can:
            sim.approve_join(u, bubble)

    # 어뷰저 5명 투입
    abusers = []
    for i in range(5):
        a = sim.create_user(f"어뷰저{i+1}")
        sim.bulk_add_records(a, random.randint(50, 200), RecordQuality.NAME_ONLY)
        abusers.append(a)

    print(f"\n  생태계 구성:")
    print(f"    정상 유저: {len(normals)}명")
    print(f"    어뷰저: {len(abusers)}명")
    print(f"    버블: '{bubble.name}' (auto_approve, 검증 5개 이상)")

    # 어뷰저 가입 시도
    print(f"\n  어뷰저 버블 가입 시도:")
    for a in abusers:
        can, reason = bubble.can_join(a.profile)
        print(f"    {a.nickname}: 기록 {len(a.records)}개, 검증 {a.verified_count}개 → {'✅' if can else '❌'} {reason}")

    # 레벨 분포 비교
    print(f"\n  레벨 분포:")
    all_users = normals + abusers
    print(f"  {'유저':<15} {'XP':>6} {'Lv':>4} {'전체':>5} {'검증':>5} {'검증%':>6} {'타입':<8}")
    print(f"  {'─'*55}")
    for u in sorted(all_users, key=lambda x: x.xp, reverse=True)[:10]:
        p = u.profile
        ratio = p.verified_records / max(p.total_records, 1) * 100
        utype = "어뷰저" if u in abusers else "정상"
        print(
            f"  {u.nickname:<15} {p.total_xp:>6} {f'Lv.{u.level}':>4} "
            f"{p.total_records:>5} {p.verified_records:>5} {ratio:>5.0f}% {utype:<8}"
        )

    # 어뷰저 영향도
    normal_avg_xp = sum(u.xp for u in normals) / len(normals)
    abuser_avg_xp = sum(u.xp for u in abusers) / len(abusers)
    print(f"\n  📊 영향도 분석:")
    print(f"    정상 유저 평균 XP: {normal_avg_xp:.0f}")
    print(f"    어뷰저 평균 XP: {abuser_avg_xp:.0f}")
    print(f"    어뷰저가 정상유저보다 XP {'높음 ⚠️' if abuser_avg_xp > normal_avg_xp else '낮음 ✅'}")
    print(f"    어뷰저 버블 침투: {'성공 ⚠️' if any(bubble.can_join(a.profile)[0] for a in abusers) else '전원 차단 ✅'}")
    print(f"    → 검증 기록 기반 허들이 어뷰저의 생태계 침투를 차단")


# ─── 실행 ───

if __name__ == "__main__":
    print("=" * 70)
    print("  Nyam Bubble System v2 — 어뷰징 시뮬레이션")
    print("=" * 70)

    abuse_1_mass_registration()
    abuse_2_data_leaching()
    abuse_3_fake_records_onboarding()
    abuse_4_follow_farming()
    abuse_5_wishlist_to_record()
    abuse_6_impact_on_ecosystem()

    print("\n\n" + "=" * 70)
    print("  전체 어뷰징 시뮬레이션 완료")
    print("=" * 70)
    print("\n  요약:")
    print("  1. 대량 등록 → 검증률 0%로 즉시 식별, 버블 가입 차단")
    print("  2. 데이터 중계 → 맛보기만 가능, 풀 액세스는 맞팔 필요")
    print("  3. 온보딩 어뷰징 → XP 미미, 검증률로 구분")
    print("  4. 팔로우 팜 → 일일 상한으로 가성비 낮음, 기록이 훨씬 효율적")
    print("  5. 리스트 복제 → 이름만 복사 가능, 가치 제한적")
    print("  6. 생태계 침투 → 검증 기록 허들이 어뷰저 진입 차단")
