"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { RecordType } from "@/infrastructure/supabase/types"
import type { NearbyPlace } from "@/infrastructure/api/kakao-local"
import { useCreateRecord } from "@/application/hooks/use-create-record"
import { useGeolocation } from "@/application/hooks/use-geolocation"
import { useNearbyRestaurants } from "@/application/hooks/use-nearby-restaurants"
import { RecordTypeSelector } from "@/presentation/components/capture/record-type-selector"
import { PhotoCaptureSheet } from "@/presentation/components/capture/photo-capture-sheet"
import { RatingScales } from "@/presentation/components/capture/rating-scales"
import { AiResultCard } from "@/presentation/components/capture/ai-result-card"
import { NearbyRestaurantPicker } from "@/presentation/components/capture/nearby-restaurant-picker"
import { ROUTES } from "@/shared/constants/routes"

export function QuickCaptureContainer() {
  const router = useRouter()
  const { createRecord, isCreating, progress } = useCreateRecord()
  const { location, requestLocation } = useGeolocation()
  const { places, isLoading: placesLoading } = useNearbyRestaurants(
    location?.lat ?? null,
    location?.lng ?? null,
  )

  const [recordType, setRecordType] = useState<RecordType>("restaurant")
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null)
  const [comment, setComment] = useState("")
  const [aiResult, setAiResult] = useState<Record<string, unknown> | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  const handleAddPhotos = useCallback((files: File[]) => {
    const newPhotos = [...photos, ...files]
    setPhotos(newPhotos)
    const newPreviews = files.map((f) => URL.createObjectURL(f))
    setPreviews((prev) => [...prev, ...newPreviews])
  }, [photos])

  const handleRemovePhoto = useCallback((index: number) => {
    URL.revokeObjectURL(previews[index])
    setPhotos((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) {
        setAiResult(null)
        setIsAnalyzing(false)
      }
      return next
    })
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }, [previews])

  // Analyze photos with AI when photos change
  const photosRef = useRef(photos)
  const analyzeAbortRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    if (analyzeAbortRef.current) clearTimeout(analyzeAbortRef.current)

    if (photos.length === 0) return

    analyzeAbortRef.current = setTimeout(async () => {
      setIsAnalyzing(true)
      const currentPhotos = photosRef.current
      const base64Photos: string[] = []
      for (const photo of currentPhotos.slice(0, 8)) {
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(photo)
        })
        base64Photos.push(base64)
      }

      const response = await fetch("/api/analyze-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: base64Photos,
          recordType,
          nearbyPlaces: places.slice(0, 10).map((p) => ({
            externalId: p.externalId,
            name: p.name,
            address: p.address,
            categoryName: p.categoryName,
          })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAiResult(data.analysis ?? null)
      }
      setIsAnalyzing(false)
    }, 500)

    return () => {
      if (analyzeAbortRef.current) clearTimeout(analyzeAbortRef.current)
    }
  }, [photos, recordType, places])

  const handleRatingChange = useCallback((key: string, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSelectPlace = useCallback((place: NearbyPlace) => {
    setSelectedPlace(place)
  }, [])

  const canSave = photos.length > 0

  const handleSave = useCallback(async () => {
    if (!canSave) return

    const recordId = await createRecord({
      recordType,
      photos,
      restaurantId: undefined, // Will be resolved from selected place
      menuName: (aiResult?.restaurant as Record<string, unknown>)?.name as string ?? undefined,
      genre: (aiResult?.restaurant as Record<string, unknown>)?.genre as string ?? undefined,
      scene: aiResult?.scene as string ?? undefined,
      ratingTaste: ratings.taste,
      ratingValue: ratings.value,
      ratingService: ratings.service,
      ratingAtmosphere: ratings.atmosphere,
      ratingCleanliness: ratings.cleanliness,
      ratingPortion: ratings.portion,
      ratingBalance: ratings.balance,
      ratingDifficulty: ratings.difficulty,
      ratingTimeSpent: ratings.timeSpent,
      ratingReproducibility: ratings.reproducibility,
      ratingPlating: ratings.plating,
      ratingMaterialCost: ratings.materialCost,
      // Wine WSET tasting notes (optional)
      wineAcidity: ratings.wineAcidity,
      wineBody: ratings.wineBody,
      wineTannin: ratings.wineTannin,
      wineSweetness: ratings.wineSweetness,
      wineBalance: ratings.wineBalance,
      wineFinish: ratings.wineFinish,
      wineAroma: ratings.wineAroma,
      // Cooking manual flavor input
      flavorSpicy: ratings.flavorSpicy,
      flavorSweet: ratings.flavorSweet,
      flavorSalty: ratings.flavorSalty,
      flavorSour: ratings.flavorSour,
      flavorUmami: ratings.flavorUmami,
      flavorRich: ratings.flavorRich,
      comment: comment || undefined,
      locationLat: location?.lat,
      locationLng: location?.lng,
    })

    router.push(ROUTES.recordDetail(recordId))
  }, [canSave, createRecord, recordType, photos, aiResult, ratings, comment, location, router])

  const restaurantAnalysis = aiResult?.restaurant as Record<string, unknown> | undefined
  const wineAnalysis = aiResult?.wine as Record<string, unknown> | undefined
  const cookingAnalysis = aiResult?.cooking as Record<string, unknown> | undefined

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-4">
      <RecordTypeSelector value={recordType} onChange={setRecordType} />

      <PhotoCaptureSheet
        photos={photos}
        previews={previews}
        onAdd={handleAddPhotos}
        onRemove={handleRemovePhoto}
      />

      {isAnalyzing && (
        <div className="flex items-center justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <span className="ml-2 text-sm text-neutral-500">분석 중...</span>
        </div>
      )}

      {aiResult && (
        <AiResultCard
          restaurantName={restaurantAnalysis?.name as string}
          genre={restaurantAnalysis?.genre as string}
          orderedItems={restaurantAnalysis?.orderedItems as string[]}
          wineName={wineAnalysis?.name as string}
          wineVariety={wineAnalysis?.variety as string}
          cookingDish={cookingAnalysis?.dishName as string}
          confidence={
            (restaurantAnalysis?.confidence ?? wineAnalysis?.confidence ?? 0) as number
          }
        />
      )}

      {recordType === "restaurant" && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">주변 식당</h3>
          <NearbyRestaurantPicker
            places={places}
            selectedId={selectedPlace?.externalId ?? null}
            onSelect={handleSelectPlace}
            isLoading={placesLoading}
          />
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-neutral-700">평가</h3>
        <RatingScales
          recordType={recordType}
          values={ratings}
          onChange={handleRatingChange}
        />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="한줄 메모 (선택)"
        className="h-20 resize-none rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm outline-none transition-colors focus:border-primary-500"
      />

      <button
        type="button"
        disabled={!canSave || isCreating}
        onClick={handleSave}
        className="h-12 rounded-xl bg-primary-500 text-sm font-semibold text-white hover:bg-primary-600 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
      >
        {isCreating ? progress || "저장 중..." : "저장하기"}
      </button>
    </div>
  )
}
