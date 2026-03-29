import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { searchGooglePlaces } from '@/infrastructure/api/google-places'

export interface DiscoverSearchResult {
  id: string
  name: string
  address: string
  lat: number | null
  lng: number | null
  googleRating: number | null
  googleRatingCount: number | null
  googlePlaceId: string
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ restaurants: [], error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const area = searchParams.get('area')
  const genre = searchParams.get('genre')
  const lat = searchParams.get('lat') ? Number(searchParams.get('lat')) : undefined
  const lng = searchParams.get('lng') ? Number(searchParams.get('lng')) : undefined

  if (!area && !lat) {
    return NextResponse.json({ restaurants: [], error: 'MISSING_AREA' }, { status: 400 })
  }

  // 검색 쿼리: 지역 + 장르 + 맛집
  const queryParts = []
  if (area && area !== '맛집') queryParts.push(area)
  if (genre) queryParts.push(genre)
  queryParts.push('맛집')
  const searchQuery = queryParts.join(' ')

  const googleResults = await searchGooglePlaces(searchQuery, lat, lng, {
    radius: lat ? 1000 : 20000,
    maxResults: 30,
  })

  const restaurants: DiscoverSearchResult[] = googleResults.map((g) => ({
    id: `google_${g.googlePlaceId}`,
    name: g.name,
    address: g.address,
    lat: g.lat,
    lng: g.lng,
    googleRating: g.rating,
    googleRatingCount: g.userRatingCount,
    googlePlaceId: g.googlePlaceId,
  }))

  return NextResponse.json({ restaurants })
}
