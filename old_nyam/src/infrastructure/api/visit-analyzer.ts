'use client'

import { fileToBase64 } from '@/infrastructure/storage/image-upload'
import { resizeImage } from '@/infrastructure/storage/image-upload'

export interface VisitAnalysisRequest {
  photos: File[]
  location: { lat: number; lng: number } | null
  nearbyPlaces: NearbyPlace[]
}

export interface NearbyPlace {
  externalId: string
  name: string
  address: string
  categoryName: string
}

export interface VisitAnalysisResponse {
  photos: { index: number; type: string; description: string }[]
  restaurant: {
    name: string
    matchedPlaceId: string | null
    confidence: number
  } | null
  menuBoard: { name: string; price: number | null }[]
  orderedItems: string[]
  receipt: {
    totalCost: number
    perPersonCost: number | null
    itemCount: number | null
  } | null
  companions: { count: number; occasion: string | null } | null
  category: string | null
  flavorTags: string[]
  textureTags: string[]
  estimatedVisitHour: number | null
}

const EMPTY_RESPONSE: VisitAnalysisResponse = {
  photos: [],
  restaurant: null,
  menuBoard: [],
  orderedItems: [],
  receipt: null,
  companions: null,
  category: null,
  flavorTags: [],
  textureTags: [],
  estimatedVisitHour: null,
}

export async function analyzeVisit(
  request: VisitAnalysisRequest,
): Promise<VisitAnalysisResponse> {
  try {
    const resizedPhotos = await Promise.all(
      request.photos.map((photo) => resizeImage(photo, 1024)),
    )

    const base64Photos = await Promise.all(
      resizedPhotos.map((photo) => fileToBase64(photo)),
    )

    const res = await fetch('/api/analyze-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photos: base64Photos,
        location: request.location,
        nearbyPlaces: request.nearbyPlaces,
      }),
    })

    if (!res.ok) return { ...EMPTY_RESPONSE }

    const json = await res.json()
    if (!json.success || !json.analysis) return { ...EMPTY_RESPONSE }
    return json.analysis as VisitAnalysisResponse
  } catch {
    return { ...EMPTY_RESPONSE }
  }
}
