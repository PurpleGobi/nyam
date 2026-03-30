import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'

/**
 * GET /api/location/resolve?lat=37.497&lng=127.053
 * 좌표 → { country, city, district, area } 변환
 * - district: 카카오 역지오코딩으로 구/군 추출
 * - area: area_zones 테이블에서 가장 가까운 생활권 매칭
 */
export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'))
  const lng = Number(request.nextUrl.searchParams.get('lng'))

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'INVALID_COORDS' }, { status: 400 })
  }

  // ── 1. 카카오 역지오코딩으로 district 추출 ──
  let country = '한국'
  let city = '서울'
  let district: string | null = null

  const apiKey = process.env.KAKAO_REST_API_KEY
  if (apiKey) {
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`,
        { headers: { Authorization: `KakaoAK ${apiKey}` } },
      )
      if (res.ok) {
        const data = await res.json()
        const doc = data.documents?.[0]
        if (doc) {
          country = doc.region_1depth_name === '서울특별시' ? '한국'
            : doc.region_1depth_name === '부산광역시' ? '한국'
            : doc.region_1depth_name === '제주특별자치도' ? '한국'
            : '한국'
          city = doc.region_1depth_name
            ?.replace('특별시', '')
            .replace('광역시', '')
            .replace('특별자치시', '')
            .replace('특별자치도', '') ?? '서울'
          district = doc.region_2depth_name ?? null
        }
      }
    } catch {
      // 역지오코딩 실패 시 district만 null
    }
  }

  // ── 2. area_zones에서 가장 가까운 생활권 매칭 ──
  let area: string | null = null
  const supabase = await createClient()
  const { data: zones } = await supabase.from('area_zones').select('name, lat, lng, radius_m')

  if (zones && zones.length > 0) {
    let closest: { name: string; dist: number } | null = null
    for (const zone of zones) {
      const dist = haversine(lat, lng, zone.lat, zone.lng)
      if (dist <= zone.radius_m) {
        if (!closest || dist < closest.dist) {
          closest = { name: zone.name, dist }
        }
      }
    }
    area = closest?.name ?? null
  }

  return NextResponse.json({ country, city, district, area })
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
