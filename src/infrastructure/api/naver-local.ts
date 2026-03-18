import type { NearbyPlace } from "./kakao-local"

const NAVER_SEARCH_URL = "https://openapi.naver.com/v1/search/local.json"

interface NaverItem {
  title: string
  link: string
  category: string
  description: string
  telephone: string
  address: string
  roadAddress: string
  mapx: string
  mapy: string
}

interface NaverSearchResponse {
  items?: NaverItem[]
}

/**
 * 네이버 지역 검색 API.
 * 카카오/구글과 교차 검증용 — 크로스플랫폼 신뢰도 향상.
 */
export async function searchNaverLocal(
  query: string,
  display = 5,
): Promise<NearbyPlace[]> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return []
  }

  const params = new URLSearchParams({
    query,
    display: String(display),
    sort: "comment",
  })

  const response = await fetch(`${NAVER_SEARCH_URL}?${params}`, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "(읽기 실패)")
    console.error(`[Naver Local] Error ${response.status}: ${errorBody}`)
    return []
  }

  const data: NaverSearchResponse = await response.json()

  return (data.items ?? []).map((item) => {
    // Naver returns HTML tags in titles
    const name = item.title.replace(/<\/?b>/g, "")
    return {
      externalId: `naver-${name.replace(/\s+/g, "")}`,
      name,
      address: item.address,
      addressName: item.address,
      categoryName: item.category,
      phone: item.telephone,
      latitude: item.mapy ? Number(item.mapy) / 1e7 : 0,
      longitude: item.mapx ? Number(item.mapx) / 1e7 : 0,
      placeUrl: item.link,
      distance: 0,
      googleRating: null,
      googleReviewCount: null,
      sources: ["naver"],
    }
  })
}
