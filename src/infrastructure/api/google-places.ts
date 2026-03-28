// src/infrastructure/api/google-places.ts
// 서버 전용 — GOOGLE_PLACES_API_KEY 클라이언트 노출 금지

export interface GooglePlacesResult {
  name: string
  address: string
  lat: number | null
  lng: number | null
  rating: number | null
  googlePlaceId: string
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
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
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
      googlePlaceId: (p.id as string) ?? '',
    }
  })
}
