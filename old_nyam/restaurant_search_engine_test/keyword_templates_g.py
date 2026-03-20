"""
Pipeline G 키워드 템플릿 v2.

핵심 원칙:
- 검색 = "맛집 발굴" (장르/메뉴 중심). 씬 키워드는 검색에 쓸모없음.
- 평가 = "씬 적합성 판단" (LLM에 맡김)
- "맛집" 키워드 최소화 (광고 콘텐츠 회피)
- 구체적 메뉴명으로 검색해야 진짜 맛집이 나옴

씬이 검색에 쓸모없는 이유:
- "강남역 혼밥" → 카카오에 "혼밥" 카테고리 없음, 의미 없는 검색
- "강남역 데이트" → 마찬가지
- 사람도 "강남역 돈까스"로 검색 → 리뷰에서 "혼밥 좋아요" 확인
"""

# ── 장르별 구체적 메뉴 키워드 (핵심) ──────────────────
# 사람이 실제로 카카오/구글에서 검색하는 키워드
MENU_KEYWORDS: dict[str, list[str]] = {
    "일식": [
        "{area} 라멘", "{area} 돈까스", "{area} 우동",
        "{area} 스시", "{area} 소바", "{area} 오마카세",
        "{area} 카츠", "{area} 규카츠",
    ],
    "한식": [
        "{area} 국밥", "{area} 백반", "{area} 찌개",
        "{area} 칼국수", "{area} 국수", "{area} 비빔밥",
        "{area} 한정식", "{area} 냉면",
    ],
    "중식": [
        "{area} 짜장면", "{area} 마라탕", "{area} 딤섬",
        "{area} 양꼬치", "{area} 중식당",
    ],
    "양식": [
        "{area} 파스타", "{area} 스테이크", "{area} 피자",
        "{area} 브런치", "{area} 레스토랑",
    ],
    "고기": [
        "{area} 삼겹살", "{area} 갈비", "{area} 소고기",
        "{area} 고기 구이", "{area} 양갈비",
    ],
    "아시안": [
        "{area} 쌀국수", "{area} 카레", "{area} 태국",
        "{area} 베트남",
    ],
    "술집": [
        "{area} 이자카야", "{area} 호프", "{area} 포차",
        "{area} 와인바",
    ],
}

# ── 발굴 키워드 (노포/현지인) ──────────────────────────
DISCOVERY_KEYWORDS: list[str] = [
    "{area} 노포",
    "{area} 오래된 맛집",
    "{area} 현지인 식당",
]

# ── 씬별 "추천 장르" 매핑 ──────────────────────────────
# 씬 자체는 검색 키워드로 안 씀.
# 대신 "이 씬에서 사람들이 주로 찾는 장르"를 검색함.
SCENE_TO_GENRES: dict[str, list[str]] = {
    "혼밥": ["일식", "한식", "아시안"],      # 라멘, 국밥, 카레 등
    "데이트": ["양식", "일식"],               # 파스타, 오마카세 등
    "비즈니스": ["한식", "일식", "양식"],     # 한정식, 오마카세, 스테이크
    "친구모임": ["고기", "한식"],             # 삼겹살, 갈비, 닭갈비
    "가족": ["한식", "중식"],                 # 한정식, 중식
    "술자리": ["술집", "일식"],               # 이자카야, 포차
}


def generate_queries_g(
    area: str,
    scene: str,
    genre: str | None = None,
    query: str | None = None,
) -> list[str]:
    """Pipeline G 키워드 생성 v2.

    원칙:
    - 씬 키워드 검색 안 함 (카카오에 "혼밥" 카테고리 없음)
    - 장르/메뉴 중심으로 맛집을 발굴
    - 씬 적합성은 LLM 평가에서 판단
    """
    queries: list[str] = []

    # 1. 사용자 직접 검색어 (최우선)
    if query:
        queries.append(f"{area} {query}")
        queries.append(f"{area} {query} 전문점")

    # 2. 장르가 지정된 경우: 해당 장르 메뉴 키워드
    if genre:
        genre_lower = genre.lower()
        templates = MENU_KEYWORDS.get(genre_lower, [f"{{area}} {genre}"])
        for tmpl in templates:
            queries.append(tmpl.format(area=area))
    else:
        # 3. 장르 미지정: 씬에 맞는 장르들의 메뉴 키워드를 가져옴
        related_genres = SCENE_TO_GENRES.get(scene, ["한식", "일식"])
        for g in related_genres:
            templates = MENU_KEYWORDS.get(g, [])
            # 각 장르에서 상위 4개 (커버리지 확보)
            for tmpl in templates[:4]:
                queries.append(tmpl.format(area=area))

    # 4. 발굴 키워드 (노포/현지인)
    for tmpl in DISCOVERY_KEYWORDS:
        queries.append(tmpl.format(area=area))

    # 5. 최후 폴백 1개
    queries.append(f"{area} 맛집")

    # 중복 제거 (순서 유지)
    seen: set[str] = set()
    unique: list[str] = []
    for q in queries:
        if q not in seen:
            seen.add(q)
            unique.append(q)

    return unique
