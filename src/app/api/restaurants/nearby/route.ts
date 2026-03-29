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
    categoryPath: d.category_name || null,
    area: extractArea(d.road_address_name || d.address_name),
    address: d.road_address_name || d.address_name || null,
    lat: Number(d.y),
    lng: Number(d.x),
    distance: Number(d.distance),
    hasRecord: false,
  }))

  return NextResponse.json({ restaurants })
}

const KAKAO_TO_SSOT: Record<string, string> = {
  '한식': '한식', '일식': '일식', '중식': '중식', '분식': '한식',
  '양식': '이탈리안', '이탈리안': '이탈리안', '프랑스음식': '프렌치', '프렌치': '프렌치',
  '스페인음식': '스페인', '지중해음식': '지중해', '태국음식': '태국', '베트남음식': '베트남',
  '인도음식': '인도', '아시아음식': '베트남', '동남아음식': '태국',
  '멕시칸': '멕시칸', '남미음식': '멕시칸', '미국음식': '미국', '패스트푸드': '미국',
  '햄버거': '미국', '치킨': '한식', '피자': '이탈리안',
  '카페': '카페', '떡카페': '카페', '디저트': '베이커리', '베이커리': '베이커리',
  '제과': '베이커리', '아이스크림': '기타',
  '술집': '바/주점', '호프': '바/주점', '와인바': '바/주점', '칵테일바': '바/주점',
  '이자카야': '바/주점', '뷔페': '기타', '족발,보쌈': '한식', '국수': '한식',
  '고기,구이': '한식', '찜,탕,찌개': '한식', '해물,생선': '한식',
  '샌드위치': '미국', '스테이크,립': '미국', '브런치': '카페',
  '돈까스': '일식', '라멘': '일식', '우동': '일식', '초밥': '일식',
  '커리': '인도', '쌀국수': '베트남', '파스타': '이탈리안',
}

function extractGenre(categoryName: string | null): string | null {
  if (!categoryName) return null
  // "음식점 > 한식 > 냉면" → ["음식점", "한식", "냉면"]
  const parts = categoryName.split('>').map((s) => s.trim())
  const subParts = parts.slice(1)
  // 가장 구체적인 레벨부터 상위로 올라가며 SSOT 매칭
  for (let i = subParts.length - 1; i >= 0; i--) {
    const tokens = subParts[i].split(',').map((s) => s.trim())
    for (const token of tokens) {
      const mapped = KAKAO_TO_SSOT[token]
      if (mapped) return mapped
    }
  }
  return '기타'
}

function extractArea(address: string | null): string | null {
  if (!address) return null
  const parts = address.split(' ')
  return parts.length >= 3 ? parts.slice(1, 3).join(' ') : null
}
