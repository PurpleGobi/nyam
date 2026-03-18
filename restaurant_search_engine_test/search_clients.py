"""Search clients for multiple map/restaurant APIs."""

from __future__ import annotations

import asyncio
import httpx
from dataclasses import dataclass, field
from config import KAKAO_REST_API_KEY, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET


@dataclass
class Restaurant:
    """Unified restaurant data from any source."""
    name: str
    address: str
    road_address: str
    category: str
    lat: float
    lng: float
    phone: str
    place_url: str
    source: str  # "kakao", "naver", "google"
    external_id: str
    distance: int | None = None  # meters
    rating: float | None = None
    review_count: int | None = None
    # Merged from multiple sources
    sources: list[str] = field(default_factory=list)


# ── Kakao Local API ─────────────────────────────────────

async def kakao_keyword_search(
    query: str,
    lat: float | None = None,
    lng: float | None = None,
    radius: int = 2000,
    page: int = 1,
    size: int = 15,
) -> list[Restaurant]:
    """카카오 키워드 검색. 음식점 카테고리(FD6) 필터."""
    url = "https://dapi.kakao.com/v2/local/search/keyword.json"
    params = {
        "query": query,
        "category_group_code": "FD6",
        "page": page,
        "size": size,
    }
    if lat and lng:
        params["y"] = str(lat)
        params["x"] = str(lng)
        params["radius"] = str(radius)
        params["sort"] = "distance"

    async with httpx.AsyncClient() as client:
        res = await client.get(
            url,
            params=params,
            headers={"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"},
            timeout=10,
        )
        res.raise_for_status()
        data = res.json()

    return [
        Restaurant(
            name=d["place_name"],
            address=d.get("address_name", ""),
            road_address=d.get("road_address_name", ""),
            category=d.get("category_name", ""),
            lat=float(d["y"]),
            lng=float(d["x"]),
            phone=d.get("phone", ""),
            place_url=d.get("place_url", ""),
            source="kakao",
            external_id=d["id"],
            distance=int(d["distance"]) if d.get("distance") else None,
        )
        for d in data.get("documents", [])
    ]


async def kakao_category_search(
    lat: float,
    lng: float,
    radius: int = 1000,
    page: int = 1,
    size: int = 15,
) -> list[Restaurant]:
    """카카오 카테고리 검색 (FD6: 음식점)."""
    url = "https://dapi.kakao.com/v2/local/search/category.json"
    params = {
        "category_group_code": "FD6",
        "x": str(lng),
        "y": str(lat),
        "radius": str(radius),
        "sort": "distance",
        "page": page,
        "size": size,
    }

    async with httpx.AsyncClient() as client:
        res = await client.get(
            url,
            params=params,
            headers={"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"},
            timeout=10,
        )
        res.raise_for_status()
        data = res.json()

    return [
        Restaurant(
            name=d["place_name"],
            address=d.get("address_name", ""),
            road_address=d.get("road_address_name", ""),
            category=d.get("category_name", ""),
            lat=float(d["y"]),
            lng=float(d["x"]),
            phone=d.get("phone", ""),
            place_url=d.get("place_url", ""),
            source="kakao",
            external_id=d["id"],
            distance=int(d["distance"]) if d.get("distance") else None,
        )
        for d in data.get("documents", [])
    ]


# ── Naver Local Search API ──────────────────────────────

async def naver_local_search(
    query: str,
    display: int = 5,
) -> list[Restaurant]:
    """네이버 지역 검색 API."""
    if not NAVER_CLIENT_ID:
        return []

    url = "https://openapi.naver.com/v1/search/local.json"
    params = {"query": query, "display": display, "sort": "comment"}

    async with httpx.AsyncClient() as client:
        res = await client.get(
            url,
            params=params,
            headers={
                "X-Naver-Client-Id": NAVER_CLIENT_ID,
                "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
            },
            timeout=10,
        )
        res.raise_for_status()
        data = res.json()

    results = []
    for item in data.get("items", []):
        # Naver returns HTML tags in names
        name = item["title"].replace("<b>", "").replace("</b>", "")
        results.append(Restaurant(
            name=name,
            address=item.get("address", ""),
            road_address=item.get("roadAddress", ""),
            category=item.get("category", ""),
            lat=float(item["mapy"]) / 1e7 if item.get("mapy") else 0,
            lng=float(item["mapx"]) / 1e7 if item.get("mapx") else 0,
            phone=item.get("telephone", ""),
            place_url=item.get("link", ""),
            source="naver",
            external_id=f"naver-{name}",
        ))
    return results


# ── Grid-based Category Search ─────────────────────────────

async def kakao_category_grid_search(
    center_lat: float,
    center_lng: float,
    radius: int = 500,
    grid_step: float = 0.004,  # ~400m 간격
    grid_size: int = 1,  # center ± grid_size = (2n+1)² 포인트
) -> list[Restaurant]:
    """고배율 지도 검색 시뮬레이션: 중심점 주변을 그리드로 나눠 카테고리 검색.

    사람이 지도를 이동하며 검색하는 것을 프로그래밍적으로 구현.
    - grid_size=1: 3x3 = 9개 포인트 (반경 ~500m x 9)
    - grid_size=2: 5x5 = 25개 포인트 (더 넓은 지역)
    """
    tasks = []
    for dy in range(-grid_size, grid_size + 1):
        for dx in range(-grid_size, grid_size + 1):
            lat = center_lat + dy * grid_step
            lng = center_lng + dx * grid_step
            # 각 포인트에서 page 1, 2 가져오기 (최대 30개)
            tasks.append(kakao_category_search(lat, lng, radius=radius, page=1, size=15))
            tasks.append(kakao_category_search(lat, lng, radius=radius, page=2, size=15))

    results_lists = await asyncio.gather(*tasks, return_exceptions=True)
    all_results = []
    for result in results_lists:
        if isinstance(result, Exception):
            continue
        all_results.extend(result)

    return all_results


# ── Deduplication ────────────────────────────────────────

def deduplicate(restaurants: list[Restaurant]) -> list[Restaurant]:
    """이름 유사도 기반 중복 제거. 여러 소스에서 찾은 식당은 sources에 병합."""
    seen: dict[str, Restaurant] = {}

    for r in restaurants:
        normalized = _normalize_name(r.name)
        matched_key = None

        for key in seen:
            if _is_similar(normalized, key):
                matched_key = key
                break

        if matched_key:
            existing = seen[matched_key]
            if r.source not in existing.sources:
                existing.sources.append(r.source)
            # Prefer kakao data (has external_id, distance)
            if r.source == "kakao" and existing.source != "kakao":
                r.sources = existing.sources
                seen[matched_key] = r
        else:
            r.sources = [r.source]
            seen[normalized] = r

    return list(seen.values())


def _normalize_name(name: str) -> str:
    import re
    name = re.sub(r"\s+", "", name)
    name = re.sub(r"[^가-힣a-zA-Z0-9]", "", name)
    return name.lower()


def _is_similar(a: str, b: str) -> bool:
    if a == b:
        return True
    if a in b or b in a:
        return True
    # 3-char substring match
    shorter = a if len(a) < len(b) else b
    longer = b if len(a) < len(b) else a
    if len(shorter) >= 3:
        for i in range(len(shorter) - 2):
            if shorter[i:i+3] in longer:
                return True
    return False
