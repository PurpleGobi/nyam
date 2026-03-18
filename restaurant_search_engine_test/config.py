"""Shared configuration and test cases."""

import os
from dotenv import load_dotenv

load_dotenv()

KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY", "")
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ── Test Cases ──────────────────────────────────────────
# Each test case defines a search scenario to evaluate pipelines against.

TEST_CASES = [
    {
        "name": "강남 혼밥",
        "area": "강남역",
        "scene": "혼밥",
        "genre": None,
        "query": None,
        "lat": 37.4979,
        "lng": 127.0276,
    },
    {
        "name": "성수 데이트",
        "area": "성수동",
        "scene": "데이트",
        "genre": None,
        "query": None,
        "lat": 37.5445,
        "lng": 127.0567,
    },
    {
        "name": "종로 라멘 혼밥",
        "area": "종로",
        "scene": "혼밥",
        "genre": "일식",
        "query": "라멘",
        "lat": 37.5704,
        "lng": 126.9922,
    },
    {
        "name": "홍대 친구모임",
        "area": "홍대",
        "scene": "친구모임",
        "genre": None,
        "query": None,
        "lat": 37.5563,
        "lng": 126.9236,
    },
    {
        "name": "여의도 비즈니스",
        "area": "여의도",
        "scene": "비즈니스",
        "genre": None,
        "query": None,
        "lat": 37.5219,
        "lng": 126.9245,
    },
]

# ── Scene Weights ───────────────────────────────────────
# 씬별 평가 가중치 (총 100)

SCENE_WEIGHTS = {
    "혼밥": {
        "context_fit": 35,    # 1인석, 바석, 회전율
        "reputation": 25,     # 별점, 리뷰 수
        "accessibility": 20,  # 웨이팅, 예약
        "authority": 5,       # 미슐랭, 블루리본
        "trend": 10,          # 최근성
        "review_trust": 5,    # 광고 아닌 리뷰
    },
    "데이트": {
        "context_fit": 35,
        "reputation": 20,
        "accessibility": 10,
        "authority": 20,
        "trend": 10,
        "review_trust": 5,
    },
    "비즈니스": {
        "context_fit": 35,
        "reputation": 20,
        "accessibility": 25,
        "authority": 10,
        "trend": 5,
        "review_trust": 5,
    },
    "친구모임": {
        "context_fit": 30,
        "reputation": 25,
        "accessibility": 15,
        "authority": 10,
        "trend": 15,
        "review_trust": 5,
    },
    "가족": {
        "context_fit": 35,
        "reputation": 25,
        "accessibility": 15,
        "authority": 15,
        "trend": 5,
        "review_trust": 5,
    },
    "술자리": {
        "context_fit": 30,
        "reputation": 20,
        "accessibility": 20,
        "authority": 10,
        "trend": 15,
        "review_trust": 5,
    },
}

DEFAULT_WEIGHTS = {
    "context_fit": 30,
    "reputation": 20,
    "accessibility": 15,
    "authority": 15,
    "trend": 10,
    "review_trust": 10,
}
