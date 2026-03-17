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
  }))
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
  }))
}
