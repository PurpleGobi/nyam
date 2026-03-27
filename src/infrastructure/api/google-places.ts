// src/infrastructure/api/google-places.ts
// 서버 전용 — GOOGLE_PLACES_API_KEY 클라이언트 노출 금지

export interface GooglePlacesResult {
  name: string
  address: string
  lat: number
  lng: number
  rating: number | null
  googlePlaceId: string
}

export async function searchGooglePlaces(query: string, lat?: number, lng?: number): Promise<GooglePlacesResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return []

  const params = new URLSearchParams({ input: query, inputtype: 'textquery', key: apiKey, language: 'ko' })
  if (lat && lng) {
    params.set('locationbias', `circle:2000@${lat},${lng}`)
  }
  params.set('fields', 'places.displayName,places.formattedAddress,places.location,places.rating,places.id')

  const response = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
    body: JSON.stringify({ textQuery: query, maxResultCount: 5, languageCode: 'ko' }),
  })

  if (!response.ok) return []

  const data = await response.json()
  return (data.places ?? []).map((p: Record<string, unknown>) => {
    const loc = p.location as { latitude: number; longitude: number } | undefined
    const name = p.displayName as { text: string } | undefined
    return {
      name: name?.text ?? '',
      address: (p.formattedAddress as string) ?? '',
      lat: loc?.latitude ?? 0,
      lng: loc?.longitude ?? 0,
      rating: (p.rating as number) ?? null,
      googlePlaceId: (p.id as string) ?? '',
    }
  })
}
