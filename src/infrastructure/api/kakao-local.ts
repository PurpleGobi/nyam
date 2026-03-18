const KAKAO_API_URL = "https://dapi.kakao.com/v2/local"

interface KakaoPlace {
  id: string
  place_name: string
  category_name: string
  category_group_code: string
  phone: string
  address_name: string
  road_address_name: string
  x: string
  y: string
  place_url: string
  distance?: string
}

interface KakaoSearchResponse {
  documents: KakaoPlace[]
  meta: {
    total_count: number
    pageable_count: number
    is_end: boolean
  }
}

export interface NearbyPlace {
  externalId: string
  name: string
  address: string
  addressName: string
  categoryName: string
  phone: string
  latitude: number
  longitude: number
  placeUrl: string
  distance: number
  /** 구글 별점 (크로스플랫폼 병합 시 채워짐) */
  googleRating: number | null
  /** 구글 리뷰 수 */
  googleReviewCount: number | null
  /** 출현 플랫폼 목록 (dedup 시 병합) */
  sources: string[]
}

async function kakaoFetch(endpoint: string, params: Record<string, string>): Promise<KakaoSearchResponse> {
  const searchParams = new URLSearchParams(params)
  const response = await fetch(`${KAKAO_API_URL}${endpoint}?${searchParams}`, {
    headers: {
      Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Kakao API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function searchNearbyRestaurants(
  lat: number,
  lng: number,
  radius = 500,
): Promise<NearbyPlace[]> {
  const data = await kakaoFetch("/search/category.json", {
    category_group_code: "FD6",
    x: String(lng),
    y: String(lat),
    radius: String(radius),
    sort: "distance",
    size: "15",
  })

  return data.documents.map((doc) => ({
    externalId: doc.id,
    name: doc.place_name,
    address: doc.road_address_name || doc.address_name,
    addressName: doc.address_name,
    categoryName: doc.category_name,
    phone: doc.phone,
    latitude: Number(doc.y),
    longitude: Number(doc.x),
    placeUrl: doc.place_url,
    distance: Number(doc.distance ?? 0),
    googleRating: null,
    googleReviewCount: null,
    sources: ["kakao"],
  }))
}

/**
 * 그리드 기반 카테고리 검색: 고배율 지도 검색 시뮬레이션.
 * 중심점 주변을 3x3 그리드로 나눠 카테고리 검색 수행.
 * 키워드 검색보다 누락이 적음 (좌표 기반).
 */
export async function searchNearbyGrid(
  centerLat: number,
  centerLng: number,
  options?: { radius?: number; gridStep?: number; gridSize?: number },
): Promise<NearbyPlace[]> {
  const radius = options?.radius ?? 500
  const gridStep = options?.gridStep ?? 0.004  // ~400m
  const gridSize = options?.gridSize ?? 1      // 3x3

  const tasks: Promise<NearbyPlace[]>[] = []
  for (let dy = -gridSize; dy <= gridSize; dy++) {
    for (let dx = -gridSize; dx <= gridSize; dx++) {
      const lat = centerLat + dy * gridStep
      const lng = centerLng + dx * gridStep
      tasks.push(searchNearbyRestaurants(lat, lng, radius))
    }
  }

  const results = await Promise.allSettled(tasks)
  const allPlaces: NearbyPlace[] = []
  for (const result of results) {
    if (result.status === "fulfilled") {
      allPlaces.push(...result.value)
    }
  }
  return allPlaces
}

export async function searchRestaurantsByKeyword(
  query: string,
  lat?: number,
  lng?: number,
): Promise<NearbyPlace[]> {
  const params: Record<string, string> = {
    query,
    size: "15",
    category_group_code: "FD6",
  }

  if (lat && lng) {
    params.x = String(lng)
    params.y = String(lat)
    params.sort = "distance"
  }

  const data = await kakaoFetch("/search/keyword.json", params)

  return data.documents.map((doc) => ({
    externalId: doc.id,
    name: doc.place_name,
    address: doc.road_address_name || doc.address_name,
    addressName: doc.address_name,
    categoryName: doc.category_name,
    phone: doc.phone,
    latitude: Number(doc.y),
    longitude: Number(doc.x),
    placeUrl: doc.place_url,
    distance: Number(doc.distance ?? 0),
    googleRating: null,
    googleReviewCount: null,
    sources: ["kakao"],
  }))
}
