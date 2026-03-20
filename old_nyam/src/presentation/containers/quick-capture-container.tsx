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

  // Editable fields (prefilled by AI)
  const [menuName, setMenuName] = useState("")
  const [genre, setGenre] = useState("")
  const [flavorTags, setFlavorTags] = useState<string[]>([])
  const [textureTags, setTextureTags] = useState<string[]>([])
  const [scene, setScene] = useState("")

  // Track which fields user has manually edited
  const userEditedRef = useRef<Set<string>>(new Set())

  const markEdited = useCallback((field: string) => {
    userEditedRef.current.add(field)
  }, [])

  const handleMenuNameChange = useCallback((v: string) => { markEdited("menuName"); setMenuName(v) }, [markEdited])
  const handleGenreChange = useCallback((v: string) => { markEdited("genre"); setGenre(v) }, [markEdited])
  const handleFlavorTagsChange = useCallback((v: string[]) => { markEdited("flavorTags"); setFlavorTags(v) }, [markEdited])
  const handleTextureTagsChange = useCallback((v: string[]) => { markEdited("textureTags"); setTextureTags(v) }, [markEdited])
  const handleSceneChange = useCallback((v: string) => { markEdited("scene"); setScene(v) }, [markEdited])

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  // Prefill editable fields from AI result (only fill empty / unedited fields)
  useEffect(() => {
    if (!aiResult) return
    const edited = userEditedRef.current

    if (recordType === "restaurant") {
      const r = aiResult.restaurant as Record<string, unknown> | undefined
      if (r) {
        if (!edited.has("menuName") && !menuName && typeof r.name === "string") setMenuName(r.name)
        if (!edited.has("genre") && !genre && typeof r.genre === "string") setGenre(r.genre)
        if (!edited.has("flavorTags") && flavorTags.length === 0 && Array.isArray(r.flavorTags)) setFlavorTags(r.flavorTags as string[])
        if (!edited.has("textureTags") && textureTags.length === 0 && Array.isArray(r.textureTags)) setTextureTags(r.textureTags as string[])
        if (!edited.has("scene") && !scene && typeof r.scene === "string") setScene(r.scene)
      }
    } else if (recordType === "wine") {
      const w = aiResult.wine as Record<string, unknown> | undefined
      if (w) {
        if (!edited.has("menuName") && !menuName && typeof w.name === "string") setMenuName(w.name)
        if (!edited.has("genre") && !genre && typeof w.variety === "string") setGenre(w.variety)
      }
    } else if (recordType === "cooking") {
      const c = aiResult.cooking as Record<string, unknown> | undefined
      if (c) {
        if (!edited.has("menuName") && !menuName && typeof c.dishName === "string") setMenuName(c.dishName)
        if (!edited.has("genre") && !genre && typeof c.genre === "string") setGenre(c.genre)
        if (!edited.has("flavorTags") && flavorTags.length === 0 && Array.isArray(c.flavorTags)) setFlavorTags(c.flavorTags as string[])
        if (!edited.has("textureTags") && textureTags.length === 0 && Array.isArray(c.textureTags)) setTextureTags(c.textureTags as string[])
      }
    }

    // Scene from top-level
    if (!edited.has("scene") && !scene && typeof aiResult.scene === "string") {
      setScene(aiResult.scene)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiResult, recordType])

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
    if (!userEditedRef.current.has("menuName") && !menuName) {
      setMenuName(place.name)
    }
  }, [menuName])

  const canSave = photos.length > 0

  const [saveComplete, setSaveComplete] = useState(false)

  const handleSave = useCallback(async () => {
    if (!canSave) return

    try {
      const recordId = await createRecord({
        recordType,
        photos,
        selectedPlace: selectedPlace ?? undefined,
        menuName: menuName || undefined,
        genre: genre || undefined,
        scene: scene || undefined,
        flavorTags: flavorTags.length > 0 ? flavorTags : undefined,
        textureTags: textureTags.length > 0 ? textureTags : undefined,
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
        wineAcidity: ratings.wineAcidity,
        wineBody: ratings.wineBody,
        wineTannin: ratings.wineTannin,
        wineSweetness: ratings.wineSweetness,
        wineBalance: ratings.wineBalance,
        wineFinish: ratings.wineFinish,
        wineAroma: ratings.wineAroma,
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

      setSaveComplete(true)
      setTimeout(() => {
        router.push(ROUTES.recordDetail(recordId))
      }, 1500)
    } catch (err) {
      console.error("Failed to save record:", err)
    }
  }, [canSave, createRecord, recordType, photos, selectedPlace, menuName, genre, scene, flavorTags, textureTags, ratings, comment, location, router])

  const restaurantAnalysis = aiResult?.restaurant as Record<string, unknown> | undefined
  const wineAnalysis = aiResult?.wine as Record<string, unknown> | undefined
  const aiMatchedPlaceId = restaurantAnalysis?.matchedPlaceId as string | undefined

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
        <div className="flex flex-col items-center gap-1.5 py-4">
          <div className="flex items-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            <span className="ml-2 text-sm font-medium text-neutral-600">AI 분석중...</span>
          </div>
          <span className="text-xs text-neutral-400">저장 후에도 분석 결과가 자동으로 업데이트됩니다</span>
        </div>
      )}

      <AiResultCard
        recordType={recordType}
        menuName={menuName}
        genre={genre}
        flavorTags={flavorTags}
        textureTags={textureTags}
        scene={scene}
        orderedItems={restaurantAnalysis?.orderedItems as string[] | undefined}
        confidence={
          (restaurantAnalysis?.confidence ?? wineAnalysis?.confidence ?? 0) as number
        }
        onMenuNameChange={handleMenuNameChange}
        onGenreChange={handleGenreChange}
        onFlavorTagsChange={handleFlavorTagsChange}
        onTextureTagsChange={handleTextureTagsChange}
        onSceneChange={handleSceneChange}
      />

      {recordType === "restaurant" && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">주변 식당</h3>
          <NearbyRestaurantPicker
            places={places}
            selectedId={selectedPlace?.externalId ?? null}
            onSelect={handleSelectPlace}
            isLoading={placesLoading}
            aiMatchedPlaceId={aiMatchedPlaceId}
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
        className="h-20 resize-none rounded-xl border border-neutral-200 bg-card dark:bg-neutral-100 px-3.5 py-3 text-sm outline-none transition-colors focus:border-primary-500"
      />

      {saveComplete && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-center">
          <p className="text-sm font-medium text-green-700">저장 완료!</p>
          <p className="mt-0.5 text-xs text-green-600">AI 분석 결과는 잠시 후 자동으로 업데이트됩니다</p>
        </div>
      )}

      <button
        type="button"
        disabled={!canSave || isCreating || saveComplete}
        onClick={handleSave}
        className="h-12 rounded-xl bg-primary-500 text-sm font-semibold text-white hover:bg-primary-600 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
      >
        {saveComplete ? "이동 중..." : isCreating ? progress || "저장 중..." : "저장하기"}
      </button>
    </div>
  )
}
