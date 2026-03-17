export interface KakaoPlaceResult {
  externalId: string
  name: string
  address: string
  phone: string | null
  lat: number
  lng: number
  externalUrl: string
  categoryName: string
}

interface SearchResponse {
  places: KakaoPlaceResult[]
}

export async function searchRestaurants(
  query: string,
  location?: { lat: number; lng: number },
  radius = 1000,
): Promise<KakaoPlaceResult[]> {
  const params = new URLSearchParams({ query, radius: String(radius) })
  if (location) {
    params.set('x', String(location.lng))
    params.set('y', String(location.lat))
  }

  const res = await fetch(`/api/restaurants/search?${params}`)
  if (!res.ok) return []

  const data: SearchResponse = await res.json()
  return data.places ?? []
}
