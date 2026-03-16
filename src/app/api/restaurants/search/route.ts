import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

interface KakaoPlace {
  id: string
  place_name: string
  address_name: string
  road_address_name: string
  phone: string
  x: string
  y: string
  place_url: string
  category_name: string
}

interface KakaoSearchResponse {
  documents: KakaoPlace[]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  const x = searchParams.get('x')
  const y = searchParams.get('y')
  const radius = searchParams.get('radius') ?? '1000'

  if (!query) {
    return NextResponse.json({ places: [] })
  }

  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'KAKAO_REST_API_KEY not configured' },
      { status: 500 },
    )
  }

  const params = new URLSearchParams({
    query,
    category_group_code: 'FD6',
    size: '10',
    radius,
  })

  if (x && y) {
    params.set('x', x)
    params.set('y', y)
    params.set('sort', 'distance')
  }

  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
    { headers: { Authorization: `KakaoAK ${apiKey}` } },
  )

  if (!res.ok) {
    console.error('[kakao-local] Search failed:', res.status)
    return NextResponse.json({ places: [] })
  }

  const data: KakaoSearchResponse = await res.json()
  const places = data.documents.map((doc) => ({
    externalId: doc.id,
    name: doc.place_name,
    address: doc.road_address_name || doc.address_name,
    phone: doc.phone || null,
    lat: parseFloat(doc.y),
    lng: parseFloat(doc.x),
    externalUrl: doc.place_url,
    categoryName: doc.category_name,
  }))

  return NextResponse.json({ places })
}
