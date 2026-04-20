"""Nyam Bubble System v2 — 시뮬레이션 엔진"""

from __future__ import annotations
from dataclasses import dataclass, field
from models import (
    User, Bubble, Record, BubbleRole, Visibility, JoinPolicy,
    RecordQuality, DataAccess, SOCIAL_XP, DAILY_CAPS, make_record,
)


@dataclass
class SimulationEngine:
    """전체 시뮬레이션 상태를 관리하는 엔진"""
    users: dict[str, User] = field(default_factory=dict)
    bubbles: dict[str, Bubble] = field(default_factory=dict)
    log: list[str] = field(default_factory=list)

    def _log(self, msg: str):
        self.log.append(msg)
        print(f"  → {msg}")

    # ─── 유저 ───

    def create_user(self, nickname: str) -> User:
        user = User(nickname=nickname)
        self.users[user.id] = user
        self._log(f"유저 생성: {nickname} (id={user.id})")
        return user

    # ─── 기록 ───

    def add_record(self, user: User, record: Record) -> int:
        earned = user.add_record(record)
        self._log(
            f"{user.nickname}: '{record.restaurant_name}' 기록 "
            f"[{record.quality.value}] → +{earned} XP (총 {user.xp} XP, Lv.{user.level})"
        )
        return earned

    def bulk_add_records(self, user: User, count: int, quality: RecordQuality) -> int:
        total = 0
        for _ in range(count):
            record = make_record(quality=quality)
            total += user.add_record(record)
        self._log(
            f"{user.nickname}: {quality.value} x{count} → +{total} XP "
            f"(총 {user.xp} XP, Lv.{user.level})"
        )
        return total

    # ─── 버블 ───

    def create_bubble(
        self,
        owner: User,
        name: str,
        visibility: Visibility = Visibility.PUBLIC,
        join_policy: JoinPolicy = JoinPolicy.MANUAL_APPROVE,
        auto_approve_min_verified: int = 10,
    ) -> Bubble:
        bubble = Bubble(
            name=name,
            visibility=visibility,
            join_policy=join_policy,
            auto_approve_min_verified=auto_approve_min_verified,
            owner_id=owner.id,
        )
        bubble.members[owner.id] = BubbleRole.OWNER
        owner.bubble_memberships[bubble.id] = BubbleRole.OWNER
        self.bubbles[bubble.id] = bubble
        self._log(f"버블 생성: '{name}' by {owner.nickname} ({visibility.value}/{join_policy.value})")
        return bubble

    def follow_bubble(self, user: User, bubble: Bubble) -> bool:
        if not bubble.can_follow():
            self._log(f"{user.nickname} → '{bubble.name}' 팔로우 실패 (private 버블)")
            return False
        if user.id in bubble.members:
            self._log(f"{user.nickname} → '{bubble.name}' 이미 멤버/팔로워")
            return False

        bubble.members[user.id] = BubbleRole.FOLLOWER
        bubble.follower_count += 1
        user.bubble_memberships[bubble.id] = BubbleRole.FOLLOWER

        # 오너에게 팔로워 XP
        owner = self.users.get(bubble.owner_id)
        if owner:
            owner.xp += SOCIAL_XP["follower_gained_bubble"]

        self._log(
            f"{user.nickname} → '{bubble.name}' 팔로우 완료 "
            f"(팔로워 {bubble.follower_only_count}명)"
        )
        return True

    def request_join_bubble(self, user: User, bubble: Bubble) -> tuple[bool, str]:
        can_join, reason = bubble.can_join(user.profile)

        if not can_join:
            self._log(f"{user.nickname} → '{bubble.name}' 가입 실패: {reason}")
            return False, reason

        if bubble.join_policy == JoinPolicy.MANUAL_APPROVE:
            self._log(
                f"{user.nickname} → '{bubble.name}' 가입 신청 (오너 승인 대기)\n"
                f"    프로필: {user.profile.trust_summary}"
            )
            return True, reason

        # auto_approve 또는 open
        self._approve_join(user, bubble)
        return True, reason

    def approve_join(self, user: User, bubble: Bubble):
        """오너가 수동 승인"""
        self._approve_join(user, bubble)

    def _approve_join(self, user: User, bubble: Bubble):
        # 팔로워였다면 역할 업그레이드
        bubble.members[user.id] = BubbleRole.MEMBER
        user.bubble_memberships[bubble.id] = BubbleRole.MEMBER
        if bubble.follower_count > 0 and user.id in bubble.members:
            bubble.follower_count = max(0, bubble.follower_count - 1)
        self._log(
            f"{user.nickname} → '{bubble.name}' 멤버 승인 완료 "
            f"(멤버 {bubble.member_count}명)"
        )

    # ─── 개인 팔로우 ───

    def follow_user(self, follower: User, target: User) -> bool:
        if target.id in follower.following:
            self._log(f"{follower.nickname} → {target.nickname} 이미 팔로우 중")
            return False

        follower.following.add(target.id)
        target.followers.add(follower.id)

        is_mutual = follower.is_mutual_follow(target.id)

        if is_mutual:
            follower.xp += SOCIAL_XP["mutual_follow"]
            target.xp += SOCIAL_XP["mutual_follow"]
            self._log(
                f"{follower.nickname} ↔ {target.nickname} 맞팔 성사! "
                f"(양쪽 +{SOCIAL_XP['mutual_follow']} XP)"
            )
        else:
            target.xp += SOCIAL_XP["follower_gained_personal"]
            self._log(
                f"{follower.nickname} → {target.nickname} 일방 팔로우 "
                f"({target.nickname} +{SOCIAL_XP['follower_gained_personal']} XP)"
            )
        return True

    # ─── 데이터 접근 조회 ───

    def view_bubble_record(self, viewer: User, bubble: Bubble, record: Record) -> dict:
        role = bubble.members.get(viewer.id)
        if role is None:
            return {"restaurant_name": record.restaurant_name, "access_level": "접근 불가 (비팔로워)"}
        return DataAccess.bubble_view(record, role)

    def view_personal_record(self, viewer: User, owner: User, record: Record) -> dict:
        is_following = owner.id in viewer.following
        is_mutual = viewer.is_mutual_follow(owner.id)
        return DataAccess.personal_view(record, is_mutual, is_following)

    # ─── 리포트 ───

    def print_user_status(self, user: User):
        p = user.profile
        print(f"\n{'='*50}")
        print(f"  {user.nickname} (id={user.id})")
        print(f"  Lv.{user.level} | XP {user.xp}")
        print(f"  기록: 전체 {p.total_records} | 검증 {p.verified_records} | 이름만 {p.name_only_records}")
        print(f"  팔로잉 {len(user.following)} | 팔로워 {len(user.followers)}")
        bubbles_str = ", ".join(
            f"{self.bubbles[bid].name}({role.value})"
            for bid, role in user.bubble_memberships.items()
            if bid in self.bubbles
        )
        print(f"  버블: {bubbles_str or '없음'}")
        print(f"  프로필 요약: {p.trust_summary}")
        print(f"{'='*50}")

    def print_bubble_status(self, bubble: Bubble):
        print(f"\n{'─'*50}")
        print(f"  버블: {bubble.name}")
        print(f"  공개: {bubble.visibility.value} | 가입: {bubble.join_policy.value}")
        print(f"  멤버: {bubble.member_count}명 | 팔로워: {bubble.follower_only_count}명")
        print(f"  공유 기록: {len(bubble.shared_records)}개")
        for uid, role in bubble.members.items():
            u = self.users.get(uid)
            if u:
                print(f"    - {u.nickname}: {role.value} (Lv.{u.level}, 검증 {u.verified_count})")
        print(f"{'─'*50}")
