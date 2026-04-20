"""Nyam Bubble System v2 — 핵심 모델 정의"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import uuid
import random


# ─── XP_SYSTEM §5 레벨 커브 ───
# §5 레벨 테이블 데이터 포인트 기반 보간. 공식의 int() 절사 버그로 인해
# 공식 대신 확정 테이블 값을 직접 사용.

_LEVEL_ANCHORS = [
    (1, 0), (2, 3), (6, 25), (8, 50), (12, 100), (18, 200),
    (30, 500), (62, 3_700), (72, 7_500), (78, 12_000), (81, 16_000),
    (85, 25_000), (92, 50_000), (99, 100_000),
]

def _build_level_thresholds() -> list[int]:
    """§5 레벨 테이블 앵커 포인트 간 선형 보간으로 Lv.1~99 XP 테이블 생성."""
    thresholds = [0] * 100  # index 0 unused, [1]~[99]
    for i in range(len(_LEVEL_ANCHORS) - 1):
        lv_start, xp_start = _LEVEL_ANCHORS[i]
        lv_end, xp_end = _LEVEL_ANCHORS[i + 1]
        for lv in range(lv_start, lv_end + 1):
            t = (lv - lv_start) / (lv_end - lv_start) if lv_end != lv_start else 0
            thresholds[lv] = int(xp_start + t * (xp_end - xp_start))
    return thresholds

LEVEL_THRESHOLDS = _build_level_thresholds()

def xp_to_level(xp: int) -> int:
    """XP → 레벨 변환. §5 레벨 테이블 기반."""
    for lv in range(99, 0, -1):
        if xp >= LEVEL_THRESHOLDS[lv]:
            return lv
    return 1


# ─── Enums ───

class Visibility(Enum):
    PRIVATE = "private"
    PUBLIC = "public"


class JoinPolicy(Enum):
    INVITE_ONLY = "invite_only"
    MANUAL_APPROVE = "manual_approve"
    AUTO_APPROVE = "auto_approve"
    OPEN = "open"
    CLOSED = "closed"


class BubbleRole(Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    FOLLOWER = "follower"


class RecordQuality(Enum):
    NAME_ONLY = "name_only"           # 이름만 등록
    WITH_SCORE = "with_score"         # + 사분면 점수
    WITH_PHOTO = "with_photo"         # + 사진 (EXIF)
    FULL = "full"                     # + 상세 (리뷰+상황+메뉴)


# ─── XP 테이블 ───

XP_TABLE = {
    RecordQuality.NAME_ONLY: 0,       # XP_SYSTEM §4-1: 이름만 등록 = 0
    RecordQuality.WITH_SCORE: 3,      # XP_SYSTEM §4-1: + 사분면 점수
    RecordQuality.WITH_PHOTO: 8,      # XP_SYSTEM §4-1: + 사진 (EXIF GPS 검증)
    RecordQuality.FULL: 18,           # XP_SYSTEM §4-1: + 풀 기록
}

SOCIAL_XP = {
    "bubble_share": 1,                # XP_SYSTEM §4-3: 버블에 공유
    "like_received": 1,               # XP_SYSTEM §4-3: 좋아요/찜 받음
    "follower_gained_bubble": 1,      # XP_SYSTEM §4-3: 팔로워 획득 (버블/개인) = +1
    "follower_gained_personal": 1,    # XP_SYSTEM §4-3: 팔로워 획득 (버블/개인) = +1
    "mutual_follow": 2,              # XP_SYSTEM §4-3: 맞팔 성사 = +2
}

DAILY_CAPS = {
    "like_received": 20,
    "follower_gained_bubble": 10,
    "follower_gained_personal": 10,
    "mutual_follow": 10,
}


# ─── 데이터 모델 ───

@dataclass
class Record:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    restaurant_name: str = ""
    score: Optional[int] = None          # 0~100 사분면 만족도
    has_exif_gps: bool = False
    exif_verified: bool = False           # GPS가 식당 반경 200m 이내
    has_review: bool = False
    has_scene: bool = False
    has_menu: bool = False
    quality: RecordQuality = RecordQuality.NAME_ONLY

    def __post_init__(self):
        self.quality = self._calc_quality()

    def _calc_quality(self) -> RecordQuality:
        if self.has_review and self.has_scene and self.has_exif_gps:
            return RecordQuality.FULL
        if self.has_exif_gps:
            return RecordQuality.WITH_PHOTO
        if self.score is not None:
            return RecordQuality.WITH_SCORE
        return RecordQuality.NAME_ONLY

    @property
    def xp(self) -> int:
        return XP_TABLE[self.quality]

    @property
    def is_verified(self) -> bool:
        return self.exif_verified


@dataclass
class UserProfile:
    """가입 신청 시 오너에게 보이는 프로필 요약"""
    total_records: int = 0
    verified_records: int = 0
    name_only_records: int = 0
    main_areas: list[str] = field(default_factory=list)
    total_xp: int = 0
    level: int = 1

    @property
    def trust_summary(self) -> str:
        ratio = self.verified_records / max(self.total_records, 1) * 100
        return (
            f"검증 {self.verified_records} / 전체 {self.total_records} "
            f"({ratio:.0f}%) | XP {self.total_xp} | Lv.{self.level}"
        )


@dataclass
class User:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    nickname: str = ""
    records: list[Record] = field(default_factory=list)
    xp: int = 0
    following: set[str] = field(default_factory=set)       # user_id set
    followers: set[str] = field(default_factory=set)       # user_id set
    bubble_memberships: dict[str, BubbleRole] = field(default_factory=dict)  # bubble_id → role

    @property
    def level(self) -> int:
        return xp_to_level(self.xp)

    @property
    def verified_count(self) -> int:
        return sum(1 for r in self.records if r.is_verified)

    @property
    def name_only_count(self) -> int:
        return sum(1 for r in self.records if r.quality == RecordQuality.NAME_ONLY)

    @property
    def profile(self) -> UserProfile:
        areas = list({r.restaurant_name.split("·")[0].strip() for r in self.records if r.score})
        return UserProfile(
            total_records=len(self.records),
            verified_records=self.verified_count,
            name_only_records=self.name_only_count,
            main_areas=areas[:5],
            total_xp=self.xp,
            level=self.level,
        )

    def is_mutual_follow(self, other_id: str) -> bool:
        return other_id in self.following and other_id in self.followers

    def add_record(self, record: Record) -> int:
        self.records.append(record)
        earned = record.xp
        self.xp += earned
        return earned

    def __repr__(self) -> str:
        return f"User({self.nickname}, Lv.{self.level}, XP={self.xp}, records={len(self.records)})"


@dataclass
class BubbleMember:
    user_id: str
    role: BubbleRole


@dataclass
class Bubble:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str = ""
    description: str = ""
    visibility: Visibility = Visibility.PRIVATE
    join_policy: JoinPolicy = JoinPolicy.INVITE_ONLY
    auto_approve_min_verified: int = 10
    owner_id: str = ""
    members: dict[str, BubbleRole] = field(default_factory=dict)  # user_id → role
    shared_records: list[dict] = field(default_factory=list)      # {user_id, record_id}
    follower_count: int = 0

    @property
    def member_count(self) -> int:
        return sum(1 for r in self.members.values() if r in (BubbleRole.OWNER, BubbleRole.ADMIN, BubbleRole.MEMBER))

    @property
    def follower_only_count(self) -> int:
        return sum(1 for r in self.members.values() if r == BubbleRole.FOLLOWER)

    def can_follow(self) -> bool:
        return self.visibility == Visibility.PUBLIC

    def can_join(self, user_profile: UserProfile) -> tuple[bool, str]:
        if self.join_policy == JoinPolicy.CLOSED:
            return False, "가입을 받지 않는 버블입니다 (팔로우만 가능)"
        if self.join_policy == JoinPolicy.OPEN:
            return True, "자유 가입"
        if self.join_policy == JoinPolicy.AUTO_APPROVE:
            if user_profile.verified_records >= self.auto_approve_min_verified:
                return True, f"자동 승인 (검증 기록 {user_profile.verified_records} >= {self.auto_approve_min_verified})"
            return False, f"검증 기록 부족 ({user_profile.verified_records} < {self.auto_approve_min_verified})"
        if self.join_policy == JoinPolicy.MANUAL_APPROVE:
            return True, "오너 승인 대기"
        if self.join_policy == JoinPolicy.INVITE_ONLY:
            return False, "초대만 가능"
        return False, "알 수 없는 정책"

    def __repr__(self) -> str:
        return (
            f"Bubble({self.name}, {self.visibility.value}/{self.join_policy.value}, "
            f"members={self.member_count}, followers={self.follower_only_count})"
        )


# ─── 데이터 접근 계층 ───

class DataAccess:
    """데이터 접근 레벨에 따라 보이는 정보를 결정"""

    @staticmethod
    def bubble_view(record: Record, role: BubbleRole) -> dict:
        """버블 내에서 기록을 볼 때 역할별 보이는 정보"""
        base = {"restaurant_name": record.restaurant_name}

        if role == BubbleRole.FOLLOWER:
            # 팔로워: 이름 + 평균 점수 + 지역만
            base["score"] = record.score
            base["access_level"] = "맛보기"
            return base

        # 멤버 이상: 풀 액세스
        base["score"] = record.score
        base["has_review"] = record.has_review
        base["has_photo"] = record.has_exif_gps
        base["verified"] = record.exif_verified
        base["access_level"] = "풀 액세스"
        return base

    @staticmethod
    def personal_view(record: Record, is_mutual: bool, is_following: bool) -> dict:
        """개인 팔로우 관계에 따라 보이는 정보"""
        base = {"restaurant_name": record.restaurant_name}

        if not is_following:
            base["access_level"] = "비공개"
            return base

        if not is_mutual:
            # 일방 팔로우: 이름 + 점수 + 지역
            base["score"] = record.score
            base["access_level"] = "맛보기 (일방 팔로우)"
            return base

        # 맞팔: 풀 액세스
        base["score"] = record.score
        base["has_review"] = record.has_review
        base["has_photo"] = record.has_exif_gps
        base["verified"] = record.exif_verified
        base["access_level"] = "풀 액세스 (맞팔)"
        return base


# ─── 헬퍼: 기록 생성 ───

SAMPLE_RESTAURANTS = [
    "스시코우지·광화문", "미진·광화문", "토속촌·광화문",
    "을지면옥·을지로", "을지다락·을지로", "을지OB맥주·을지로",
    "레스토랑에오·강남", "다운타우너·성수", "카페어니언·성수",
    "리스토란테에오·강남", "오스테리아오르조·이태원", "스시사이토·청담",
]


def make_record(
    name: str = "",
    quality: RecordQuality = RecordQuality.FULL,
    score: Optional[int] = None,
) -> Record:
    """간편 기록 생성"""
    if not name:
        name = random.choice(SAMPLE_RESTAURANTS)
    if score is None:
        score = random.randint(70, 98) if quality != RecordQuality.NAME_ONLY else None

    return Record(
        restaurant_name=name,
        score=score if quality != RecordQuality.NAME_ONLY else None,
        has_exif_gps=quality in (RecordQuality.WITH_PHOTO, RecordQuality.FULL),
        exif_verified=quality in (RecordQuality.WITH_PHOTO, RecordQuality.FULL),
        has_review=quality == RecordQuality.FULL,
        has_scene=quality == RecordQuality.FULL,
        has_menu=quality == RecordQuality.FULL,
    )
