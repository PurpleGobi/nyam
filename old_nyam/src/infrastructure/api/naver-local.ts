import type { NearbyPlace } from "./kakao-local"

const NAVER_SEARCH_URL = "https://openapi.naver.com/v1/search/local.json"
const NAVER_BLOG_SEARCH_URL = "https://openapi.naver.com/v1/search/blog.json"

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

interface NaverBlogItem {
  title: string
  link: string
  description: string
  bloggername: string
  postdate: string
}

interface NaverBlogResponse {
  items?: NaverBlogItem[]
}

/** 블로그 리뷰 스니펫 */
export interface BlogReviewSnippet {
  summary: string
  source: string
  url: string
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

/**
 * 네이버 블로그 검색으로 식당 리뷰 스니펫 수집.
 * 식당 이름으로 검색 → 첫 번째 블로그 글의 description을 요약으로 사용.
 */
export async function searchNaverBlogReview(
  restaurantName: string,
  area: string | null,
): Promise<BlogReviewSnippet | null> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const searchQuery = area ? `${area} ${restaurantName} 후기` : `${restaurantName} 맛집 후기`
  const params = new URLSearchParams({
    query: searchQuery,
    display: "1",
    sort: "sim",
  })

  try {
    const response = await fetch(`${NAVER_BLOG_SEARCH_URL}?${params}`, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      signal: AbortSignal.timeout(5_000),
    })

    if (!response.ok) return null

    const data: NaverBlogResponse = await response.json()
    const item = data.items?.[0]
    if (!item) return null

    // HTML 태그 제거 + 80자로 자르기
    const raw = item.description.replace(/<\/?b>/g, "").replace(/&[a-z]+;/g, " ").trim()
    const summary = raw.length > 80 ? raw.slice(0, 77) + "..." : raw

    return {
      summary,
      source: "네이버 블로그",
      url: item.link,
    }
  } catch {
    return null
  }
}
