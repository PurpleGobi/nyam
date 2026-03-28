import { NextRequest, NextResponse } from 'next/server'

interface KakaoCategoryDocument {
  id: string
  place_name: string
  category_group_name: string
  category_name: string
  road_address_name: string
  address_name: string
  phone: string
  distance: string
  x: string
  y: string
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) {
    return NextResponse.json({ restaurants: [] }, { status: 500 })
  }

  const lat = Number(request.nextUrl.searchParams.get('lat'))
  const lng = Number(request.nextUrl.searchParams.get('lng'))
  const radius = Number(request.nextUrl.searchParams.get('radius') ?? 2000)
  const keyword = request.nextUrl.searchParams.get('keyword') ?? ''

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ restaurants: [] }, { status: 400 })
  }

  // 키워드가 있으면 keyword 검색, 없으면 카테고리 검색
  let documents: KakaoCategoryDocument[] = []

  if (keyword) {
    const params = new URLSearchParams({
      query: keyword,
      category_group_code: 'FD6',
      x: String(lng),
      y: String(lat),
      radius: String(radius),
      sort: 'distance',
      size: '15',
    })

    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
      { headers: { Authorization: `KakaoAK ${apiKey}` } },
    )

    if (response.ok) {
      const data = await response.json()
      documents = data.documents ?? []
    }
  } else {
    const params = new URLSearchParams({
      category_group_code: 'FD6',
      x: String(lng),
      y: String(lat),
      radius: String(radius),
      sort: 'distance',
      size: '15',
    })

    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/category.json?${params}`,
      { headers: { Authorization: `KakaoAK ${apiKey}` } },
    )

    if (response.ok) {
      const data = await response.json()
      documents = data.documents ?? []
    }
  }

  const restaurants = documents.map((d) => ({
    id: `kakao_${d.id}`,
    name: d.place_name,
    genre: extractGenre(d.category_name),
    area: extractArea(d.road_address_name || d.address_name),
    address: d.road_address_name || d.address_name || null,
    lat: Number(d.y),
    lng: Number(d.x),
    distance: Number(d.distance),
    hasRecord: false,
  }))

  return NextResponse.json({ restaurants })
}

function extractGenre(categoryName: string | null): string | null {
  if (!categoryName) return null
  // 카카오 카테고리: "음식점 > 한식 > 냉면" → "한식"
  const parts = categoryName.split('>')
  return parts.length >= 2 ? parts[1].trim() : null
}

function extractArea(address: string | null): string | null {
  if (!address) return null
  const parts = address.split(' ')
  return parts.length >= 3 ? parts.slice(1, 3).join(' ') : null
}
