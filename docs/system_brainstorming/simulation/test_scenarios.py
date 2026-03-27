"""
Nyam Bubble System v2 — 시나리오 시뮬레이션 테스트

실행: python3 test_scenarios.py
"""

from models import (
    RecordQuality, Visibility, JoinPolicy, BubbleRole, make_record,
)
from engine import SimulationEngine


def scenario_1_xp_gaming():
    """
    시나리오 1: XP 게이밍 비교
    - 공격자 A: 이름만 100개 등록
    - 공격자 B: 온보딩에서 점수만 50개 등록
    - 정상 유저 C: 풀 기록 10개
    - 정상 유저 D: 사진+점수 20개
    """
    print("\n" + "=" * 60)
    print("  시나리오 1: XP 게이밍 비교")
    print("=" * 60)

    sim = SimulationEngine()

    attacker_a = sim.create_user("공격자A (이름만)")
    attacker_b = sim.create_user("공격자B (점수만)")
    normal_c = sim.create_user("정상유저C (풀기록)")
    normal_d = sim.create_user("정상유저D (사진)")

    print("\n--- 기록 등록 ---")
    sim.bulk_add_records(attacker_a, 100, RecordQuality.NAME_ONLY)
    sim.bulk_add_records(attacker_b, 50, RecordQuality.WITH_SCORE)
    sim.bulk_add_records(normal_c, 10, RecordQuality.FULL)
    sim.bulk_add_records(normal_d, 20, RecordQuality.WITH_PHOTO)

    print("\n--- 결과 비교 ---")
    for user in [attacker_a, attacker_b, normal_c, normal_d]:
        sim.print_user_status(user)

    # 버블 가입 시도
    print("\n--- 버블 가입 테스트 ---")
    owner = sim.create_user("버블오너")
    sim.bulk_add_records(owner, 30, RecordQuality.FULL)

    bubble = sim.create_bubble(
        owner, "맛집 커뮤니티",
        visibility=Visibility.PUBLIC,
        join_policy=JoinPolicy.AUTO_APPROVE,
        auto_approve_min_verified=10,
    )

    for user in [attacker_a, attacker_b, normal_c, normal_d]:
        sim.request_join_bubble(user, bubble)


def scenario_2_cold_start():
    """
    시나리오 2: 콜드스타트 유저 여정
    기록 0 → 팔로우 → 맛보기 → 기록 시작 → 멤버 가입 → 맞팔
    """
    print("\n" + "=" * 60)
    print("  시나리오 2: 콜드스타트 유저 여정")
    print("=" * 60)

    sim = SimulationEngine()

    # 기존 유저 & 버블 세팅
    veteran = sim.create_user("미식가김영수")
    sim.bulk_add_records(veteran, 50, RecordQuality.FULL)

    bubble = sim.create_bubble(
        veteran, "을지로 맛집 가이드",
        visibility=Visibility.PUBLIC,
        join_policy=JoinPolicy.MANUAL_APPROVE,
    )

    # 콜드스타트 유저
    newbie = sim.create_user("신규유저")
    sim.print_user_status(newbie)

    # Step 1: 팔로우 (무료)
    print("\n--- Step 1: 버블 팔로우 ---")
    sim.follow_bubble(newbie, bubble)

    # Step 2: 팔로워로서 데이터 접근
    print("\n--- Step 2: 팔로워 데이터 접근 ---")
    sample_record = veteran.records[0]
    view = sim.view_bubble_record(newbie, bubble, sample_record)
    print(f"  팔로워 뷰: {view}")

    view_member = sim.view_bubble_record(veteran, bubble, sample_record)
    print(f"  멤버 뷰:   {view_member}")

    # Step 3: 기록 시작
    print("\n--- Step 3: 기록 시작 (방문 후 풀 기록) ---")
    for i in range(5):
        record = make_record(quality=RecordQuality.FULL)
        sim.add_record(newbie, record)

    sim.print_user_status(newbie)

    # Step 4: 멤버 가입 신청
    print("\n--- Step 4: 멤버 가입 신청 ---")
    success, reason = sim.request_join_bubble(newbie, bubble)

    # Step 5: 오너 승인
    print("\n--- Step 5: 오너 승인 ---")
    sim.approve_join(newbie, bubble)

    # Step 6: 멤버로서 데이터 접근
    print("\n--- Step 6: 멤버 데이터 접근 ---")
    view_after = sim.view_bubble_record(newbie, bubble, sample_record)
    print(f"  멤버 뷰: {view_after}")

    # Step 7: 개인 팔로우 → 맞팔
    print("\n--- Step 7: 개인 팔로우 → 맞팔 ---")
    sim.follow_user(newbie, veteran)  # 일방
    print()
    personal_view = sim.view_personal_record(newbie, veteran, sample_record)
    print(f"  일방 팔로우 뷰: {personal_view}")

    sim.follow_user(veteran, newbie)  # 맞팔 성사
    print()
    mutual_view = sim.view_personal_record(newbie, veteran, sample_record)
    print(f"  맞팔 뷰: {mutual_view}")

    sim.print_user_status(newbie)


def scenario_3_bubble_types():
    """
    시나리오 3: 버블 유형별 동작 비교
    A: 큐레이션 채널 (public + closed)
    B: 지인 모임 (private + invite_only)
    C: 오픈 커뮤니티 (public + manual_approve)
    D: 자동 승인 (public + auto_approve)
    """
    print("\n" + "=" * 60)
    print("  시나리오 3: 버블 유형별 동작 비교")
    print("=" * 60)

    sim = SimulationEngine()

    owner = sim.create_user("오너")
    sim.bulk_add_records(owner, 30, RecordQuality.FULL)

    applicant_low = sim.create_user("낮은검증")
    sim.bulk_add_records(applicant_low, 3, RecordQuality.FULL)
    sim.bulk_add_records(applicant_low, 50, RecordQuality.NAME_ONLY)

    applicant_high = sim.create_user("높은검증")
    sim.bulk_add_records(applicant_high, 15, RecordQuality.FULL)

    # 버블 생성
    print("\n--- 버블 생성 ---")
    curation = sim.create_bubble(owner, "큐레이션 채널", Visibility.PUBLIC, JoinPolicy.CLOSED)
    private_group = sim.create_bubble(owner, "지인 모임", Visibility.PRIVATE, JoinPolicy.INVITE_ONLY)
    community = sim.create_bubble(owner, "오픈 커뮤니티", Visibility.PUBLIC, JoinPolicy.MANUAL_APPROVE)
    auto_bubble = sim.create_bubble(owner, "자동승인 모임", Visibility.PUBLIC, JoinPolicy.AUTO_APPROVE, auto_approve_min_verified=10)

    # 팔로우 시도
    print("\n--- 팔로우 시도 ---")
    for bubble in [curation, private_group, community, auto_bubble]:
        sim.follow_bubble(applicant_low, bubble)

    # 가입 시도
    print("\n--- 가입 시도: 낮은검증 유저 ---")
    sim.print_user_status(applicant_low)
    for bubble in [curation, private_group, community, auto_bubble]:
        sim.request_join_bubble(applicant_low, bubble)

    print("\n--- 가입 시도: 높은검증 유저 ---")
    sim.print_user_status(applicant_high)
    for bubble in [curation, private_group, community, auto_bubble]:
        sim.request_join_bubble(applicant_high, bubble)


def scenario_4_data_access_matrix():
    """
    시나리오 4: 데이터 접근 매트릭스 검증
    동일 기록을 다양한 관계에서 조회했을 때 보이는 정보 비교
    """
    print("\n" + "=" * 60)
    print("  시나리오 4: 데이터 접근 매트릭스")
    print("=" * 60)

    sim = SimulationEngine()

    # 기록 주인
    alice = sim.create_user("Alice")
    record = make_record("스시코우지·광화문", RecordQuality.FULL, score=95)
    sim.add_record(alice, record)

    # 버블 생성
    bubble = sim.create_bubble(alice, "Alice 맛집", Visibility.PUBLIC, JoinPolicy.MANUAL_APPROVE)

    # 다양한 관계의 유저들
    stranger = sim.create_user("Stranger")          # 아무 관계 없음
    follower_b = sim.create_user("BubbleFollower")   # 버블 팔로워
    member = sim.create_user("Member")               # 버블 멤버
    one_way = sim.create_user("OneWayFollow")        # 일방 팔로우
    mutual = sim.create_user("MutualFollow")         # 맞팔

    sim.follow_bubble(follower_b, bubble)
    sim.approve_join(member, bubble)
    sim.follow_user(one_way, alice)
    sim.follow_user(mutual, alice)
    sim.follow_user(alice, mutual)  # 맞팔 성사

    # 데이터 접근 비교
    print("\n--- 버블 기록 접근 ---")
    print(f"  {'관계':<20} {'접근 레벨':<25} {'점수':>5} {'리뷰':>5}")
    print(f"  {'─'*55}")

    for user, label in [
        (stranger, "비팔로워"),
        (follower_b, "버블 팔로워"),
        (member, "버블 멤버"),
    ]:
        view = sim.view_bubble_record(user, bubble, record)
        score = view.get("score", "—")
        review = "O" if view.get("has_review") else "X"
        print(f"  {label:<20} {view['access_level']:<25} {str(score):>5} {review:>5}")

    print(f"\n--- 개인 기록 접근 ---")
    print(f"  {'관계':<20} {'접근 레벨':<25} {'점수':>5} {'리뷰':>5}")
    print(f"  {'─'*55}")

    for user, label in [
        (stranger, "비팔로우"),
        (one_way, "일방 팔로우"),
        (mutual, "맞팔로우"),
    ]:
        view = sim.view_personal_record(user, alice, record)
        score = view.get("score", "—")
        review = "O" if view.get("has_review") else "X"
        print(f"  {label:<20} {view['access_level']:<25} {str(score):>5} {review:>5}")


def scenario_5_flywheel():
    """
    시나리오 5: 플라이휠 전체 순환
    기록 → 버블 공개 → 팔로워 유입 → XP → 더 넓은 네트워크
    """
    print("\n" + "=" * 60)
    print("  시나리오 5: 플라이휠 전체 순환")
    print("=" * 60)

    sim = SimulationEngine()

    # 1단계: 이기적 동기 — 기록
    print("\n--- 1단계: 이기적 동기 (기록) ---")
    creator = sim.create_user("큐레이터")
    sim.bulk_add_records(creator, 20, RecordQuality.FULL)
    sim.print_user_status(creator)

    # 2단계: 버블 공개
    print("\n--- 2단계: 버블 공개 ---")
    channel = sim.create_bubble(creator, "성수 맛집 채널", Visibility.PUBLIC, JoinPolicy.CLOSED)

    # 3단계: 팔로워 유입
    print("\n--- 3단계: 팔로워 유입 ---")
    followers = []
    for i in range(5):
        f = sim.create_user(f"팔로워{i+1}")
        sim.follow_bubble(f, channel)
        followers.append(f)

    print(f"\n  큐레이터 XP 변화: {creator.xp} (팔로워 XP 포함)")

    # 4단계: 팔로워 → 기록 시작
    print("\n--- 4단계: 팔로워가 기록 시작 ---")
    active_follower = followers[0]
    sim.bulk_add_records(active_follower, 12, RecordQuality.FULL)

    # 5단계: 팔로워가 다른 버블에 가입 시도
    print("\n--- 5단계: 팔로워 → 다른 버블 가입 시도 ---")
    elite_owner = sim.create_user("엘리트오너")
    sim.bulk_add_records(elite_owner, 50, RecordQuality.FULL)
    elite_bubble = sim.create_bubble(
        elite_owner, "엘리트 와인 모임",
        Visibility.PUBLIC, JoinPolicy.AUTO_APPROVE,
        auto_approve_min_verified=10,
    )
    sim.request_join_bubble(active_follower, elite_bubble)

    # 6단계: 개인 맞팔
    print("\n--- 6단계: 개인 맞팔 네트워크 ---")
    sim.follow_user(active_follower, creator)
    sim.follow_user(creator, active_follower)

    # 최종 상태
    print("\n--- 최종 상태 ---")
    sim.print_user_status(creator)
    sim.print_user_status(active_follower)
    sim.print_bubble_status(channel)
    sim.print_bubble_status(elite_bubble)


# ─── 실행 ───

if __name__ == "__main__":
    print("=" * 60)
    print("  Nyam Bubble System v2 — 시뮬레이션")
    print("=" * 60)

    scenario_1_xp_gaming()
    scenario_2_cold_start()
    scenario_3_bubble_types()
    scenario_4_data_access_matrix()
    scenario_5_flywheel()

    print("\n\n" + "=" * 60)
    print("  전체 시뮬레이션 완료")
    print("=" * 60)
