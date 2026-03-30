// src/infrastructure/api/google-places.ts
// 서버 전용 — GOOGLE_PLACES_API_KEY 클라이언트 노출 금지

import type { BusinessHours, MenuItem } from '@/domain/entities/restaurant'

export interface GooglePlacesResult {
  name: string
  address: string
  lat: number | null
  lng: number | null
  rating: number | null
  userRatingCount: number | null
  googlePlaceId: string
}

export interface GooglePlaceDetail {
  phone: string | null
  hours: BusinessHours | null
  menus: MenuItem[]
  googleRating: number | null
}

export async function searchGooglePlaces(
  query: string,
  lat?: number,
  lng?: number,
  options?: { radius?: number; maxResults?: number },
): Promise<GooglePlacesResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return []

  const radius = options?.radius ?? 20000
  const maxResults = options?.maxResults ?? 5

  const body: Record<string, unknown> = { textQuery: query, maxResultCount: maxResults, languageCode: 'ko' }
  if (lat && lng) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius } }
  }

  const response = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) return []

  const data = await response.json()
  return (data.places ?? []).map((p: Record<string, unknown>) => {
    const loc = p.location as { latitude: number; longitude: number } | undefined
    const name = p.displayName as { text: string } | undefined
    return {
      name: name?.text ?? '',
      address: (p.formattedAddress as string) ?? '',
      lat: loc?.latitude ?? null,
      lng: loc?.longitude ?? null,
      rating: (p.rating as number) ?? null,
      userRatingCount: (p.userRatingCount as number) ?? null,
      googlePlaceId: (p.id as string) ?? '',
    }
  })
}

/**
 * Google Places API (New) — Place Detail
 * 영업시간, 전화번호, 메뉴 정보를 가져온다.
 * https://developers.google.com/maps/documentation/places/web-service/place-details
 */
export async function getGooglePlaceDetail(placeId: string): Promise<GooglePlaceDetail | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey || !placeId) return null

  const fieldMask = [
    'nationalPhoneNumber',
    'regularOpeningHours',
    'rating',
  ].join(',')

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}?languageCode=ko`,
    {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
    },
  )

  if (!response.ok) return null

  const p = await response.json()

  // 영업시간 파싱
  let hours: BusinessHours | null = null
  const openingHours = p.regularOpeningHours as {
    weekdayDescriptions?: string[]
    periods?: Array<{
      open: { day: number; hour: number; minute: number }
      close?: { day: number; hour: number; minute: number }
    }>
  } | undefined

  if (openingHours?.periods && openingHours.periods.length > 0) {
    const dayMap: (keyof BusinessHours)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    const parsed: BusinessHours = {}

    for (const period of openingHours.periods) {
      const dayKey = dayMap[period.open.day]
      if (!dayKey) continue
      const openTime = `${String(period.open.hour).padStart(2, '0')}:${String(period.open.minute).padStart(2, '0')}`
      const closeTime = period.close
        ? `${String(period.close.hour).padStart(2, '0')}:${String(period.close.minute).padStart(2, '0')}`
        : '24:00'
      const existing = parsed[dayKey]
      parsed[dayKey] = existing ? `${existing}, ${openTime}~${closeTime}` : `${openTime}~${closeTime}`
    }

    if (Object.keys(parsed).length > 0) hours = parsed
  } else if (openingHours?.weekdayDescriptions && openingHours.weekdayDescriptions.length > 0) {
    // periods가 없으면 weekdayDescriptions 텍스트 사용 (예: "월요일: 09:00~21:00")
    const dayNameMap: Record<string, keyof BusinessHours> = {
      '월요일': 'mon', '화요일': 'tue', '수요일': 'wed', '목요일': 'thu',
      '금요일': 'fri', '토요일': 'sat', '일요일': 'sun',
    }
    const parsed: BusinessHours = {}
    for (const desc of openingHours.weekdayDescriptions) {
      const [dayName, ...rest] = desc.split(':')
      const trimmedDay = dayName?.trim()
      const timeStr = rest.join(':').trim()
      if (trimmedDay && dayNameMap[trimmedDay] && timeStr && timeStr !== '휴무일') {
        parsed[dayNameMap[trimmedDay]] = timeStr
      }
    }
    if (Object.keys(parsed).length > 0) hours = parsed
  }

  return {
    phone: (p.nationalPhoneNumber as string) ?? null,
    hours,
    menus: [],
    googleRating: (p.rating as number) ?? null,
  }
}
