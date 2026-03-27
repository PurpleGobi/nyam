// src/infrastructure/api/naver-local.ts
// 서버 전용 — NAVER_CLIENT_ID/SECRET 클라이언트 노출 금지

export interface NaverLocalResult {
  name: string
  address: string
  lat: number
  lng: number
  category: string | null
  naverId: string | null
}

export async function searchNaverLocal(query: string): Promise<NaverLocalResult[]> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) return []

  const params = new URLSearchParams({ query, display: '5' })

  const response = await fetch(`https://openapi.naver.com/v1/search/local.json?${params}`, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  })

  if (!response.ok) return []

  const data = await response.json()
  return (data.items ?? []).map((item: Record<string, string | number>) => ({
    name: String(item.title).replace(/<[^>]*>/g, ''),
    address: item.roadAddress || item.address,
    lat: Number(item.mapy) / 1e7,
    lng: Number(item.mapx) / 1e7,
    category: (item.category as string) || null,
    naverId: null,
  }))
}
