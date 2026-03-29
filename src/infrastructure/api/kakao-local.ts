// src/infrastructure/api/kakao-local.ts
// 서버 전용 — KAKAO_REST_API_KEY 클라이언트 노출 금지

export interface KakaoLocalResult {
  name: string
  address: string
  lat: number
  lng: number
  phone: string | null
  category: string | null
  categoryDetail: string | null
  kakaoId: string
  kakaoMapUrl: string | null
  distance: number | null
}

export async function searchKakaoLocal(
  query: string,
  lat?: number,
  lng?: number,
  options?: { radius?: number; size?: number },
): Promise<KakaoLocalResult[]> {
  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) return []

  const size = options?.size ?? 5
  const radius = options?.radius ?? 20000
  const params = new URLSearchParams({ query, size: String(size) })
  if (lat && lng) {
    params.set('x', String(lng))
    params.set('y', String(lat))
    params.set('radius', String(radius))
    params.set('sort', 'distance')
  }

  const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  })

  if (!response.ok) return []

  const data = await response.json()
  return (data.documents ?? []).map((d: Record<string, string>) => ({
    name: d.place_name,
    address: d.road_address_name || d.address_name,
    lat: Number(d.y),
    lng: Number(d.x),
    phone: d.phone || null,
    category: d.category_group_name || null,
    categoryDetail: d.category_name || null,
    kakaoId: d.id,
    kakaoMapUrl: d.place_url || null,
    distance: d.distance ? Number(d.distance) : null,
  }))
}
