import type { NearbyPlace } from "./kakao-local"

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText"

interface GooglePlace {
  id: string
  displayName?: { text: string }
  formattedAddress?: string
  location?: { latitude: number; longitude: number }
  rating?: number
  userRatingCount?: number
  priceLevel?: string
  types?: string[]
  googleMapsUri?: string
  nationalPhoneNumber?: string
}

interface GoogleSearchResponse {
  places?: GooglePlace[]
}

export async function searchGooglePlaces(
  query: string,
  lat?: number,
  lng?: number,
  radius = 2000,
  maxResults = 20,
): Promise<NearbyPlace[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.warn("[Google Places] GOOGLE_PLACES_API_KEY 미설정 — 구글 검색 건너뜀")
    return []
  }

  const body: Record<string, unknown> = {
    textQuery: query,
    languageCode: "ko",
    maxResultCount: maxResults,
    includedType: "restaurant",
  }

  if (lat != null && lng != null) {
    body.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius,
      },
    }
  }

  const response = await fetch(GOOGLE_PLACES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.types",
        "places.googleMapsUri",
        "places.nationalPhoneNumber",
      ].join(","),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "(읽기 실패)")
    console.error(`[Google Places] Error ${response.status}: ${errorBody}`)
    return []
  }

  const data: GoogleSearchResponse = await response.json()

  return (data.places ?? []).map((place) => ({
    externalId: place.id,
    name: place.displayName?.text ?? "",
    address: place.formattedAddress ?? "",
    addressName: place.formattedAddress ?? "",
    categoryName: (place.types ?? []).join(", "),
    phone: place.nationalPhoneNumber ?? "",
    latitude: place.location?.latitude ?? 0,
    longitude: place.location?.longitude ?? 0,
    placeUrl: place.googleMapsUri ?? "",
    distance: 0,
    googleRating: place.rating ?? null,
    googleReviewCount: place.userRatingCount ?? null,
    sources: ["google"],
  }))
}
