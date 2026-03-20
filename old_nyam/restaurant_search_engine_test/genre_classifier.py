"""Genre classification from Kakao/Naver category strings."""

from __future__ import annotations
from search_clients import Restaurant

# Order matters: specific subcategories before broad ones
# e.g. "음식점 > 한식 > 육류,고기요리" should match "bbq" not "korean"
GENRE_RULES: list[tuple[list[str], str, str]] = [
    # (keywords, genre_code, genre_label)
    (["고기", "구이", "삼겹", "갈비", "bbq", "소고기", "육류", "곱창", "대창", "양갈비"], "bbq", "고기/구이"),
    (["족발", "보쌈"], "jokbal", "족발/보쌈"),
    (["찌개", "탕", "전골", "국밥", "설렁탕", "감자탕", "순대국"], "stew", "찌개/탕"),
    (["돈까스", "카츠", "katsu", "톤카츠"], "katsu", "돈까스"),
    (["해물", "해산물", "회", "생선", "조개", "수산", "횟집", "초밥"], "seafood", "해산물"),
    (["분식", "떡볶이", "김밥"], "snack", "분식"),
    (["치킨", "chicken", "통닭"], "chicken", "치킨"),
    (["피자", "pizza"], "pizza", "피자"),
    (["버거", "햄버거", "burger"], "burger", "버거"),
    (["라멘", "스시", "오마카세", "우동", "소바", "일식", "japanese", "이자카야", "야키"], "japanese", "일식"),
    (["중식", "중국", "짜장", "짬뽕", "마라", "양꼬치"], "chinese", "중식"),
    (["이탈리안", "프랑스", "파스타", "스테이크", "양식", "브런치", "비스트로"], "western", "양식"),
    (["베트남", "태국", "인도", "아시안", "쌀국수", "커리", "카레"], "asian", "아시안"),
    (["카페", "디저트", "베이커리", "빵", "케이크"], "cafe", "카페/디저트"),
    (["샐러드", "salad", "건강식", "포케"], "salad", "샐러드"),
    (["한식", "korean"], "korean", "한식"),
]


def classify_genre(restaurant: Restaurant) -> tuple[str, str]:
    """
    Classify restaurant genre from category string.
    Returns (genre_code, genre_label).
    """
    text = f"{restaurant.category} {restaurant.name}".lower()

    for keywords, code, label in GENRE_RULES:
        if any(kw in text for kw in keywords):
            return code, label

    return "other", "기타"


def classify_all(restaurants: list[Restaurant]) -> list[tuple[Restaurant, str, str]]:
    """Classify genre for all restaurants."""
    return [(r, *classify_genre(r)) for r in restaurants]
