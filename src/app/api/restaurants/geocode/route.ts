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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ region: null })
  }

  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) {
    return NextResponse.json({ region: null })
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
      return NextResponse.json({ region: null })
    }

    const data = await response.json() as {
      documents: readonly { region_2depth_name: string; region_3depth_name: string }[]
    }

    if (data.documents.length === 0) {
      return NextResponse.json({ region: null })
    }

    const district = data.documents[0].region_2depth_name
    const region = districtToRegion[district] ?? district

    return NextResponse.json({ region })
  } catch {
    return NextResponse.json({ region: null })
  }
}
