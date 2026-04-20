"""Nyam CF 점수 체계 — 데이터 모델 정의

PRD §3 기반. 2D 사분면 좌표, 식당/와인 분리, 오염 유저 포함.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import uuid


# ─── Enums ───

class Category(Enum):
    RESTAURANT = "restaurant"
    WINE = "wine"


class RestaurantCluster(Enum):
    """식당 취향 클러스터 (X=음식 퀄리티, Y=경험 만족도)"""
    FOODIE = "미식파"         # X 후, Y 박
    AMBIANCE = "분위기파"     # X 박, Y 후
    BALANCED = "균형파"       # X, Y 비슷
    STRICT = "까다로운파"     # X, Y 모두 낮은 편향
    GENEROUS = "후한파"       # X, Y 모두 높은 편향


class WineCluster(Enum):
    """와인 취향 클러스터 (X=구조·완성도, Y=경험 만족도)"""
    STRUCTURE = "구조파"      # X 후, Y 박
    EMOTION = "감성파"        # X 박, Y 후
    BALANCED = "균형파"       # X, Y 비슷
    STRICT = "까다로운파"     # X, Y 모두 낮은 편향
    GENEROUS = "후한파"       # X, Y 모두 높은 편향


class PollutionType(Enum):
    """오염 유형"""
    NONE = "정상"
    RANDOM = "랜덤 노이즈"
    AD_BOOST = "광고성 조작"
    MALICIOUS = "악의적 폄하"
    COORDINATED = "집단 조작"
    SUBTLE = "은밀한 조작"


class Relation(Enum):
    """유저 간 관계"""
    MUTUAL = "맞팔"
    FOLLOWING = "팔로우"
    NONE = "없음"


# ─── 클러스터 오프셋 정의 ───
# (offset_x, offset_y) — 클러스터별 축 편향

RESTAURANT_CLUSTER_OFFSETS: dict[RestaurantCluster, tuple[float, float]] = {
    RestaurantCluster.FOODIE:    (+3.0, -2.0),   # V2: 2x 증가
    RestaurantCluster.AMBIANCE:  (-2.0, +3.0),
    RestaurantCluster.BALANCED:  (+0.5, +0.5),
    RestaurantCluster.STRICT:    (-2.5, -2.5),
    RestaurantCluster.GENEROUS:  (+2.5, +2.5),
}

WINE_CLUSTER_OFFSETS: dict[WineCluster, tuple[float, float]] = {
    WineCluster.STRUCTURE: (+3.0, -2.0),   # V2: 2x 증가
    WineCluster.EMOTION:   (-2.0, +3.0),
    WineCluster.BALANCED:  (+0.5, +0.5),
    WineCluster.STRICT:    (-2.5, -2.5),
    WineCluster.GENEROUS:  (+2.5, +2.5),
}

# 클러스터 분포 비율
RESTAURANT_CLUSTER_DIST: dict[RestaurantCluster, float] = {
    RestaurantCluster.FOODIE: 0.20,
    RestaurantCluster.AMBIANCE: 0.20,
    RestaurantCluster.BALANCED: 0.30,
    RestaurantCluster.STRICT: 0.15,
    RestaurantCluster.GENEROUS: 0.15,
}

WINE_CLUSTER_DIST: dict[WineCluster, float] = {
    WineCluster.STRUCTURE: 0.20,
    WineCluster.EMOTION: 0.20,
    WineCluster.BALANCED: 0.35,
    WineCluster.STRICT: 0.10,
    WineCluster.GENEROUS: 0.15,
}


# ─── 데이터 모델 ───

@dataclass
class QuadrantScore:
    """2D 사분면 점수"""
    x: float  # 0~10
    y: float  # 0~10

    @property
    def satisfaction(self) -> float:
        return (self.x + self.y) / 2.0

    def __repr__(self) -> str:
        return f"({self.x:.1f}, {self.y:.1f}) sat={self.satisfaction:.1f}"


@dataclass
class Restaurant:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    true_food_quality: float = 5.0   # X축 객관적 기준선
    true_experience: float = 5.0     # Y축 객관적 기준선
    genre: str = "한식"
    area: str = "강남"


@dataclass
class Wine:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    true_structure: float = 5.0      # X축 객관적 기준선
    true_pleasure: float = 5.0       # Y축 객관적 기준선
    wine_type: str = "red"
    region: str = "보르도"


@dataclass
class Record:
    """유저가 식당/와인에 남긴 기록"""
    user_id: str
    item_id: str               # restaurant.id 또는 wine.id
    category: Category
    score: QuadrantScore
    is_holdout: bool = False   # T4 hold-out 테스트용


@dataclass
class User:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str = ""
    restaurant_cluster: RestaurantCluster = RestaurantCluster.BALANCED
    wine_cluster: WineCluster = WineCluster.BALANCED
    bias_x: float = 0.0       # 개인 X축 편향 (-2 ~ +2)
    bias_y: float = 0.0       # 개인 Y축 편향 (-2 ~ +2)
    noise: float = 1.0        # 평가 노이즈 (0.5~1.5)
    pollution_type: PollutionType = PollutionType.NONE
    # 오염 유저용 파라미터
    pollution_target_ids: list[str] = field(default_factory=list)  # 광고/폄하 대상
    pollution_bias: float = 0.0  # 은밀한 조작 편향

    @property
    def is_polluted(self) -> bool:
        return self.pollution_type != PollutionType.NONE


@dataclass
class Bubble:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str = ""
    member_ids: list[str] = field(default_factory=list)
    context: str = ""  # 장르/지역/인간관계/가치관


# ─── 관계 부스트 기본값 ───

DEFAULT_BOOST = {
    Relation.MUTUAL: 2.0,
    Relation.FOLLOWING: 1.5,
    Relation.NONE: 1.0,
}
