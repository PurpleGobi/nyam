"""
씬/장르별 검색 키워드 템플릿.
LLM 호출 없이 즉시 검색 키워드를 생성한다 (비용 0, 지연 0).
"""

# 씬별 키워드: 핵심(core) + 보조(extra)로 분리
# core: 씬 의도에 직결되는 쿼리 (항상 사용)
# extra: 장르 확장 쿼리 (genre 미지정 시에만 추가)
SCENE_KEYWORDS: dict[str, dict[str, list[str]]] = {
    "혼밥": {
        "core": [
            "{area} 혼밥 맛집",
            "{area} 1인 식당",
            "{area} 혼밥",
        ],
        "extra": [
            "{area} 돈까스",
            "{area} 라멘",
            "{area} 덮밥",
            "{area} 국수",
        ],
    },
    "데이트": {
        "core": [
            "{area} 데이트 맛집",
            "{area} 분위기 좋은 식당",
            "{area} 인기 맛집",
        ],
        "extra": [
            "{area} 레스토랑",
            "{area} 파스타",
            "{area} 브런치",
        ],
    },
    "비즈니스": {
        "core": [
            "{area} 접대 맛집",
            "{area} 비즈니스 식당",
            "{area} 코스요리",
        ],
        "extra": [
            "{area} 한정식",
            "{area} 오마카세",
            "{area} 룸 식당",
        ],
    },
    "친구모임": {
        "core": [
            "{area} 친구 모임 맛집",
            "{area} 단체 식당",
            "{area} 맛집",
        ],
        "extra": [
            "{area} 고기 맛집",
            "{area} 삼겹살",
            "{area} 회식",
        ],
    },
    "가족": {
        "core": [
            "{area} 가족 식사",
            "{area} 한식 맛집",
            "{area} 맛집",
        ],
        "extra": [
            "{area} 갈비",
            "{area} 한정식",
            "{area} 뷔페",
        ],
    },
    "술자리": {
        "core": [
            "{area} 술집",
            "{area} 이자카야",
            "{area} 안주 맛집",
        ],
        "extra": [
            "{area} 호프",
            "{area} 포차",
            "{area} 와인바",
        ],
    },
}

# 장르별 추가 키워드
GENRE_KEYWORDS: dict[str, list[str]] = {
    "일식": ["{area} 라멘", "{area} 스시", "{area} 우동", "{area} 소바", "{area} 일식"],
    "한식": ["{area} 한식", "{area} 백반", "{area} 찌개", "{area} 국밥"],
    "중식": ["{area} 중식", "{area} 짜장면", "{area} 마라탕", "{area} 딤섬"],
    "양식": ["{area} 파스타", "{area} 스테이크", "{area} 피자", "{area} 양식"],
    "고기": ["{area} 고기 맛집", "{area} 삼겹살", "{area} 갈비", "{area} 소고기"],
    "라멘": ["{area} 라멘", "{area} 라멘 맛집", "{area} 츠케멘", "{area} 일본 라멘"],
}


def generate_queries(area: str, scene: str, genre: str | None = None, query: str | None = None) -> list[str]:
    """씬/장르/쿼리에 맞는 검색 키워드 목록 생성.

    전략: 적은 수의 정합성 높은 쿼리 > 많은 수의 넓은 쿼리.
    core 쿼리(씬 의도 직결)를 우선, genre 미지정 시에만 extra 추가.
    """
    queries = []

    # 사용자 직접 검색어 (최우선)
    if query:
        queries.append(f"{area} {query}")
        queries.append(f"{area} {query} 맛집")

    # 씬 키워드 (core 우선)
    scene_config = SCENE_KEYWORDS.get(scene, {"core": ["{area} 맛집"], "extra": []})
    for tmpl in scene_config["core"]:
        queries.append(tmpl.format(area=area))

    # 장르가 지정되면 장르 키워드, 아니면 씬 extra 키워드
    if genre:
        genre_lower = genre.lower()
        genre_templates = GENRE_KEYWORDS.get(genre_lower, [f"{{area}} {genre}"])
        for tmpl in genre_templates:
            queries.append(tmpl.format(area=area))
    else:
        for tmpl in scene_config["extra"]:
            queries.append(tmpl.format(area=area))

    # 기본 키워드 (항상 포함)
    queries.append(f"{area} 맛집")

    # 중복 제거 (순서 유지)
    seen = set()
    unique = []
    for q in queries:
        if q not in seen:
            seen.add(q)
            unique.append(q)

    return unique
