import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const KAKAO_GEOCODE_URL = 'https://dapi.kakao.com/v2/local/geo/coord2regioncode.json'

const districtToRegion: Record<string, string> = {
  '강남구': '강남', '서초구': '강남', '송파구': '잠실',
  '마포구': '홍대', '용산구': '이태원', '종로구': '종로',
  '중구': '을지로', '성동구': '성수', '영등포구': '여의도',
  '서대문구': '신촌', '강서구': '마곡', '관악구': '관악',
  '강북구': '강북', '동대문구': '동대문', '광진구': '건대',
  '노원구': '노원', '은평구': '은평', '구로구': '구로',
  '금천구': '금천', '양천구': '양천', '동작구': '동작',
  '강동구': '강동',
}

/** Approximate region from lat/lng using bounding boxes for major Seoul areas */
function approximateRegion(lat: number, lng: number): string | null {
  const regions: { name: string; lat: [number, number]; lng: [number, number] }[] = [
    { name: '강남', lat: [37.49, 37.53], lng: [127.01, 127.07] },
    { name: '홍대', lat: [37.55, 37.57], lng: [126.91, 126.93] },
    { name: '종로', lat: [37.57, 37.60], lng: [126.97, 127.01] },
    { name: '이태원', lat: [37.53, 37.55], lng: [126.98, 127.01] },
    { name: '성수', lat: [37.54, 37.55], lng: [127.04, 127.07] },
    { name: '여의도', lat: [37.52, 37.53], lng: [126.91, 126.94] },
    { name: '잠실', lat: [37.50, 37.52], lng: [127.07, 127.11] },
    { name: '신촌', lat: [37.55, 37.57], lng: [126.93, 126.95] },
    { name: '을지로', lat: [37.56, 37.57], lng: [126.98, 127.00] },
    { name: '광화문', lat: [37.57, 37.58], lng: [126.97, 126.98] },
  ]

  for (const r of regions) {
    if (lat >= r.lat[0] && lat <= r.lat[1] && lng >= r.lng[0] && lng <= r.lng[1]) {
      return r.name
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ region: null })
  }

  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) {
    // Fallback: approximate region from coordinates (Seoul area)
    const region = approximateRegion(Number(lat), Number(lng))
    return NextResponse.json({ region })
  }

  try {
    const url = new URL(KAKAO_GEOCODE_URL)
    url.searchParams.set('x', lng)
    url.searchParams.set('y', lat)

    const response = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      const region = approximateRegion(Number(lat), Number(lng))
      return NextResponse.json({ region })
    }

    const data = await response.json() as {
      documents: readonly { region_2depth_name: string; region_3depth_name: string }[]
    }

    if (data.documents.length === 0) {
      const region = approximateRegion(Number(lat), Number(lng))
      return NextResponse.json({ region })
    }

    const district = data.documents[0].region_2depth_name
    const region = districtToRegion[district] ?? district

    return NextResponse.json({ region })
  } catch {
    const region = approximateRegion(Number(lat!), Number(lng!))
    return NextResponse.json({ region })
  }
}
