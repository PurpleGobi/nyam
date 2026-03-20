"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Store, Star, Brain, BookOpen,
  Camera, Trash2, Plus, Info, ChevronDown, ChevronUp,
  MapPin, Crop, Check, Loader2,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import { useRecordDetail } from "@/application/hooks/use-record-detail"
import { useEditRecord } from "@/application/hooks/use-edit-record"
import { RatingScales } from "@/presentation/components/capture/rating-scales"
import { PhotoCropEditor } from "@/presentation/components/record/photo-crop-editor"
import { Button } from "@/presentation/components/ui/button"
import { Input } from "@/presentation/components/ui/input"
import { ROUTES } from "@/shared/constants/routes"
import { FOOD_CATEGORIES, COOKING_GENRES, WINE_TYPES } from "@/shared/constants/categories"
import { RESTAURANT_SCENES, WINE_SCENES, COOKING_SCENES } from "@/shared/constants/scenes"
import { FLAVOR_TAGS, TEXTURE_TAGS, ATMOSPHERE_TAGS } from "@/shared/constants/tags"
import type { RecordType, Visibility } from "@/infrastructure/supabase/types"
import type { RecordAiAnalysis, PhotoCropData } from "@/domain/entities/record"

interface RecordEditContainerProps {
  recordId: string
}

const VISIBILITY_OPTIONS: Array<{ value: Visibility; label: string }> = [
  { value: "private", label: "나만 보기" },
  { value: "group", label: "버블 공개" },
  { value: "public", label: "전체 공개" },
]

const VISIT_TIME_OPTIONS = [
  { value: "morning", label: "아침 (6-11시)" },
  { value: "lunch", label: "점심 (11-14시)" },
  { value: "afternoon", label: "오후 (14-17시)" },
  { value: "dinner", label: "저녁 (17-21시)" },
  { value: "night", label: "야간 (21시-)" },
]

function getGenreOptions(recordType: RecordType) {
  switch (recordType) {
    case "restaurant": return FOOD_CATEGORIES
    case "cooking": return COOKING_GENRES
    case "wine": return WINE_TYPES
  }
}

function getSceneOptions(recordType: RecordType) {
  switch (recordType) {
    case "restaurant": return RESTAURANT_SCENES
    case "cooking": return COOKING_SCENES
    case "wine": return WINE_SCENES
  }
}

function getPhaseLabel(phase: number): string {
  switch (phase) {
    case 1: return "Phase 1"
    case 2: return "Phase 2"
    case 3: return "Phase 3"
    default: return `Phase ${phase}`
  }
}

function formatCurrency(value: number | null): string {
  if (value === null || value === 0) return "-"
  return `${value.toLocaleString("ko-KR")}원`
}

function computeOverallRating(recordType: RecordType, ratings: Record<string, number>): number | null {
  switch (recordType) {
    case "restaurant": {
      const keys = ["taste", "value", "service", "atmosphere", "cleanliness", "portion"]
      const vals = keys.map((k) => ratings[k] ?? 0).filter((v) => v > 0)
      return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
    }
    case "wine": {
      const vals = [ratings.taste, ratings.value].filter((v) => v && v > 0) as number[]
      return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
    }
    case "cooking": {
      const vals = [ratings.balance, ratings.taste].filter((v) => v && v > 0) as number[]
      return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
    }
  }
}

export function RecordEditContainer({ recordId }: RecordEditContainerProps) {
  const router = useRouter()
  const { record, tasteProfile, aiAnalysis, journal, isLoading, mutate } = useRecordDetail(recordId)
  const { updateRecord, updateAiAnalysis, updateTasteProfile, updateJournal, updatePhotoCrop, isUpdating } = useEditRecord()

  // Form state
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [comment, setComment] = useState("")
  const [menuName, setMenuName] = useState("")
  const [genre, setGenre] = useState("")
  const [subGenre, setSubGenre] = useState("")
  const [scene, setScene] = useState("")
  const [visibility, setVisibility] = useState<Visibility>("private")
  const [companionCount, setCompanionCount] = useState<number | null>(null)
  const [totalCost, setTotalCost] = useState<number | null>(null)
  const [visitTime, setVisitTime] = useState("")
  const [flavorTags, setFlavorTags] = useState<string[]>([])
  const [textureTags, setTextureTags] = useState<string[]>([])
  const [atmosphereTags, setAtmosphereTags] = useState<string[]>([])

  // Wine-specific
  const [pairingFood, setPairingFood] = useState("")
  const [purchasePrice, setPurchasePrice] = useState<number | null>(null)

  // AI analysis edits
  const [aiRestaurantName, setAiRestaurantName] = useState("")
  const [aiOrderedItems, setAiOrderedItems] = useState<Array<{ name: string; estimatedPrice: number }>>([])
  const [aiMenuItems, setAiMenuItems] = useState<Array<{ name: string; price: number }>>([])
  const [wineInfo, setWineInfo] = useState<NonNullable<RecordAiAnalysis["wineInfo"]> | null>(null)

  // Taste profile edits
  const [tasteValues, setTasteValues] = useState<Record<string, number>>({})

  // Wine AI tasting
  const [wineTastingValues, setWineTastingValues] = useState<Record<string, number>>({})

  // Wine user tasting
  const [wineUserTastingValues, setWineUserTastingValues] = useState<Record<string, number>>({})

  // Journal edits
  const [blogTitle, setBlogTitle] = useState("")
  const [blogContent, setBlogContent] = useState("")

  // UI state
  const [initialized, setInitialized] = useState(false)
  const [systemInfoOpen, setSystemInfoOpen] = useState(false)
  const [wineUserTastingTab, setWineUserTastingTab] = useState<"ai" | "user">("ai")

  // Photo crop state
  const [cropEditorOpen, setCropEditorOpen] = useState(false)
  const [cropEditingPhotoId, setCropEditingPhotoId] = useState<string | null>(null)
  const [cropEditingPhotoUrl, setCropEditingPhotoUrl] = useState("")
  const [cropEditingInitial, setCropEditingInitial] = useState<PhotoCropData | null>(null)

  // Auto-save
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formChangeCountRef = useRef(0)

  // Toast debounce
  const lastToastRef = useRef<{ msg: string; time: number }>({ msg: "", time: 0 })

  // Initialize form from record data (once)
  if (record && !initialized) {
    setRatings({
      taste: record.ratingTaste ?? 0,
      value: record.ratingValue ?? 0,
      service: record.ratingService ?? 0,
      atmosphere: record.ratingAtmosphere ?? 0,
      cleanliness: record.ratingCleanliness ?? 0,
      portion: record.ratingPortion ?? 0,
      balance: record.ratingBalance ?? 0,
      difficulty: record.ratingDifficulty ?? 0,
      timeSpent: record.ratingTimeSpent ?? 0,
      reproducibility: record.ratingReproducibility ?? 0,
      plating: record.ratingPlating ?? 0,
      materialCost: record.ratingMaterialCost ?? 0,
    })
    setComment(record.comment ?? "")
    setMenuName(record.menuName ?? "")
    setGenre(record.genre ?? "")
    setSubGenre(record.subGenre ?? "")
    setScene(record.scene ?? "")
    setVisibility(record.visibility)
    setCompanionCount(record.companionCount)
    setTotalCost(record.totalCost)
    setVisitTime(record.visitTime ?? "")
    setFlavorTags(record.flavorTags)
    setTextureTags(record.textureTags)
    setAtmosphereTags(record.atmosphereTags)
    setPairingFood(record.pairingFood ?? "")
    setPurchasePrice(record.purchasePrice)

    // AI analysis
    if (aiAnalysis) {
      setAiRestaurantName(aiAnalysis.identifiedRestaurant?.name ?? "")
      setAiOrderedItems(aiAnalysis.orderedItems ?? [])
      setAiMenuItems(aiAnalysis.extractedMenuItems ?? [])
      setWineInfo(aiAnalysis.wineInfo ?? null)
      if (aiAnalysis.wineTastingAi) {
        setWineTastingValues({
          acidity: aiAnalysis.wineTastingAi.acidity,
          body: aiAnalysis.wineTastingAi.body,
          tannin: aiAnalysis.wineTastingAi.tannin,
          sweetness: aiAnalysis.wineTastingAi.sweetness,
          balance: aiAnalysis.wineTastingAi.balance,
          finish: aiAnalysis.wineTastingAi.finish,
          aroma: aiAnalysis.wineTastingAi.aroma,
        })
      }
    }

    // Taste profile
    if (tasteProfile) {
      setTasteValues({
        spicy: tasteProfile.spicy ?? 0,
        sweet: tasteProfile.sweet ?? 0,
        salty: tasteProfile.salty ?? 0,
        sour: tasteProfile.sour ?? 0,
        umami: tasteProfile.umami ?? 0,
        rich: tasteProfile.rich ?? 0,
      })
      // Wine user WSET values
      setWineUserTastingValues({
        acidity: tasteProfile.wineAcidityUser ?? 0,
        body: tasteProfile.wineBodyUser ?? 0,
        tannin: tasteProfile.wineTanninUser ?? 0,
        sweetness: tasteProfile.wineSweetnessUser ?? 0,
        balance: tasteProfile.wineBalanceUser ?? 0,
        finish: tasteProfile.wineFinishUser ?? 0,
        aroma: tasteProfile.wineAromaUser ?? 0,
      })
    }

    // Journal
    if (journal) {
      setBlogTitle(journal.blogTitle ?? "")
      setBlogContent(journal.blogContent ?? "")
    }

    setInitialized(true)
  }

  const handleRatingChange = useCallback((key: string, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleTasteValueChange = useCallback((key: string, value: number) => {
    setTasteValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleWineTastingChange = useCallback((key: string, value: number) => {
    setWineTastingValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleWineUserTastingChange = useCallback((key: string, value: number) => {
    setWineUserTastingValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const toggleTag = useCallback((tag: string, current: string[], setter: (v: string[]) => void) => {
    setter(current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag])
  }, [])

  const showReadOnlyToast = useCallback((message: string) => {
    const now = Date.now()
    if (lastToastRef.current.msg === message && now - lastToastRef.current.time < 3000) return
    lastToastRef.current = { msg: message, time: now }
    toast(message, { duration: 2000 })
  }, [])

  // Auto-save function
  const performSave = useCallback(async () => {
    if (!record) return
    setSaveStatus("saving")
    try {
      await updateRecord(recordId, {
        recordType: record.recordType,
        menuName: menuName || undefined,
        genre: genre || undefined,
        subGenre: subGenre || undefined,
        scene: scene || undefined,
        visibility,
        companionCount: companionCount ?? undefined,
        totalCost: totalCost ?? undefined,
        visitTime: visitTime || undefined,
        comment: comment || undefined,
        flavorTags,
        textureTags,
        atmosphereTags,
        pairingFood: pairingFood || undefined,
        purchasePrice: purchasePrice ?? undefined,
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
      })

      if (aiAnalysis) {
        await updateAiAnalysis(recordId, {
          identifiedRestaurant: aiRestaurantName
            ? { name: aiRestaurantName, matchedPlaceId: aiAnalysis.identifiedRestaurant?.matchedPlaceId ?? null, confidence: aiAnalysis.identifiedRestaurant?.confidence ?? 0 }
            : null,
          orderedItems: aiOrderedItems.length > 0 ? aiOrderedItems : null,
          extractedMenuItems: aiMenuItems.length > 0 ? aiMenuItems : null,
          wineInfo,
          wineTastingAi: Object.keys(wineTastingValues).length > 0
            ? { acidity: wineTastingValues.acidity ?? 0, body: wineTastingValues.body ?? 0, tannin: wineTastingValues.tannin ?? 0, sweetness: wineTastingValues.sweetness ?? 0, balance: wineTastingValues.balance ?? 0, finish: wineTastingValues.finish ?? 0, aroma: wineTastingValues.aroma ?? 0 }
            : null,
        })
      }

      const tasteData: Record<string, number | null> = {}
      if (Object.values(tasteValues).some((v) => v > 0)) {
        Object.assign(tasteData, tasteValues)
      }
      if (record.recordType === "wine" && Object.values(wineUserTastingValues).some((v) => v > 0)) {
        tasteData.wineAcidityUser = wineUserTastingValues.acidity ?? null
        tasteData.wineBodyUser = wineUserTastingValues.body ?? null
        tasteData.wineTanninUser = wineUserTastingValues.tannin ?? null
        tasteData.wineSweetnessUser = wineUserTastingValues.sweetness ?? null
        tasteData.wineBalanceUser = wineUserTastingValues.balance ?? null
        tasteData.wineFinishUser = wineUserTastingValues.finish ?? null
        tasteData.wineAromaUser = wineUserTastingValues.aroma ?? null
      }
      if (Object.keys(tasteData).length > 0) {
        await updateTasteProfile(recordId, tasteData as Record<string, number>)
      }

      if (journal && (blogTitle || blogContent)) {
        await updateJournal(recordId, { blogTitle: blogTitle || null, blogContent: blogContent || null })
      }

      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch {
      setSaveStatus("idle")
      toast.error("저장에 실패했습니다")
    }
  }, [
    record, recordId, updateRecord, menuName, genre, subGenre, scene, visibility,
    companionCount, totalCost, visitTime, comment, flavorTags, textureTags, atmosphereTags,
    pairingFood, purchasePrice, ratings, aiAnalysis, updateAiAnalysis,
    aiRestaurantName, aiOrderedItems, aiMenuItems, wineInfo, wineTastingValues,
    wineUserTastingValues, tasteValues, updateTasteProfile,
    journal, blogTitle, blogContent, updateJournal,
  ])

  // Debounced auto-save: trigger after 1.5s of inactivity
  const scheduleAutoSave = useCallback(() => {
    if (!initialized) return
    formChangeCountRef.current += 1
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      performSave()
    }, 1500)
  }, [initialized, performSave])

  // Track form changes for auto-save
  useEffect(() => {
    if (!initialized) return
    scheduleAutoSave()
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    menuName, genre, subGenre, scene, visibility, companionCount, totalCost, visitTime,
    comment, flavorTags, textureTags, atmosphereTags, pairingFood, purchasePrice, ratings,
    aiRestaurantName, aiOrderedItems, aiMenuItems, wineInfo, wineTastingValues,
    wineUserTastingValues, tasteValues, blogTitle, blogContent,
  ])

  const handleOpenCropEditor = useCallback((photoId: string, photoUrl: string, cropData: PhotoCropData | null) => {
    setCropEditingPhotoId(photoId)
    setCropEditingPhotoUrl(photoUrl)
    setCropEditingInitial(cropData)
    setCropEditorOpen(true)
  }, [])

  const handleCropApply = useCallback(async (cropData: PhotoCropData) => {
    if (!cropEditingPhotoId) return
    await updatePhotoCrop(cropEditingPhotoId, cropData)
    await mutate()
  }, [cropEditingPhotoId, updatePhotoCrop, mutate])

  if (isLoading || !record) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  const genreOptions = getGenreOptions(record.recordType)
  const sceneOptions = getSceneOptions(record.recordType)
  const overallRating = computeOverallRating(record.recordType, ratings)
  const pricePerPerson = totalCost && companionCount ? Math.round(totalCost / companionCount) : null

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={ROUTES.recordDetail(recordId)} className="text-neutral-500">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-neutral-800">기록 수정</h1>
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-[10px] text-neutral-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              저장 중
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500">
              <Check className="h-3 w-3" />
              저장됨
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SourceBadge type="system" label={getPhaseLabel(record.phaseStatus)} />
          <span className="text-[10px] text-neutral-400">{record.completenessScore}%</span>
        </div>
      </div>

      {/* Photo preview - tap to edit crop */}
      <div className="space-y-2">
        {record.photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {record.photos.map((photo) => {
              const classification = aiAnalysis?.photoClassifications?.find((c) => c.photoIndex === photo.orderIndex)
              return (
                <button
                  key={photo.id}
                  type="button"
                  className="relative shrink-0 group"
                  onClick={() => handleOpenCropEditor(photo.id, photo.photoUrl, photo.cropData)}
                >
                  <Image
                    src={photo.thumbnailUrl ?? photo.photoUrl}
                    alt=""
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-xl object-cover"
                    style={photo.cropData ? {
                      objectPosition: `${photo.cropData.x}% ${photo.cropData.y}%`,
                      transform: `scale(${photo.cropData.scale})`,
                    } : undefined}
                  />
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 group-active:bg-black/10 transition-colors">
                    <Crop className="h-3.5 w-3.5 text-white/80 drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
                  </div>
                  {classification && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1 py-0.5 text-[9px] text-white">
                      {PHOTO_TYPE_LABELS[classification.type] ?? classification.type}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
        <div className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3.5 py-2.5">
          <Camera className="h-4 w-4 shrink-0 text-neutral-400" />
          <p className="text-xs text-neutral-500">사진을 탭하여 크롭을 조정할 수 있습니다</p>
        </div>
      </div>

      {/* Section: Basic Info */}
      <EditSection icon={<Store className="h-4 w-4" />} title="기본 정보">
        {/* Restaurant name (AI recognized) */}
        {record.recordType === "restaurant" && (
          <FieldRow label="상호명" badge={record.aiRecognized ? <SourceBadge type="ai" label="AI 인식" /> : undefined}>
            <Input
              value={aiRestaurantName}
              onChange={(e) => setAiRestaurantName(e.target.value)}
              placeholder="AI 인식 또는 직접 입력"
              className="h-9"
            />
          </FieldRow>
        )}

        <FieldRow label="메뉴명">
          <Input
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            placeholder="메뉴 이름"
            className="h-9"
          />
        </FieldRow>

        <FieldRow label="장르">
          <div className="flex flex-wrap gap-1.5">
            {genreOptions.map((opt) => (
              <ChipButton
                key={opt.value}
                label={opt.label}
                selected={genre === opt.value}
                onClick={() => setGenre(genre === opt.value ? "" : opt.value)}
              />
            ))}
          </div>
        </FieldRow>

        <FieldRow label="보조 장르 (선택)">
          <div className="flex flex-wrap gap-1.5">
            {genreOptions.filter((opt) => opt.value !== genre).map((opt) => (
              <ChipButton
                key={opt.value}
                label={opt.label}
                selected={subGenre === opt.value}
                onClick={() => setSubGenre(subGenre === opt.value ? "" : opt.value)}
              />
            ))}
          </div>
        </FieldRow>

        <FieldRow label="상황">
          <div className="flex flex-wrap gap-1.5">
            {sceneOptions.map((opt) => (
              <ChipButton
                key={opt.value}
                label={opt.label}
                selected={scene === opt.value}
                onClick={() => setScene(scene === opt.value ? "" : opt.value)}
              />
            ))}
          </div>
        </FieldRow>

        <FieldRow label="공개 범위">
          <div className="flex gap-1.5">
            {VISIBILITY_OPTIONS.map((opt) => (
              <ChipButton
                key={opt.value}
                label={opt.label}
                selected={visibility === opt.value}
                onClick={() => setVisibility(opt.value)}
              />
            ))}
          </div>
        </FieldRow>

        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="동행 인원">
            <Input
              type="number"
              min={1}
              value={companionCount ?? ""}
              onChange={(e) => setCompanionCount(e.target.value ? Number(e.target.value) : null)}
              placeholder="1"
              className="h-9"
            />
          </FieldRow>
          <FieldRow label="총 비용 (원)">
            <Input
              type="number"
              min={0}
              step={1000}
              value={totalCost ?? ""}
              onChange={(e) => setTotalCost(e.target.value ? Number(e.target.value) : null)}
              placeholder="0"
              className="h-9"
            />
          </FieldRow>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ReadOnlyField
            label="1인당 비용"
            value={formatCurrency(pricePerPerson)}
            badge={<SourceBadge type="auto" label="자동 계산" />}
            onTap={() => showReadOnlyToast("1인당 비용은 총 비용과 동행 인원에서 자동 계산됩니다")}
          />
          <FieldRow label="방문 시간">
            <div className="flex flex-wrap gap-1.5">
              {VISIT_TIME_OPTIONS.map((opt) => (
                <ChipButton
                  key={opt.value}
                  label={opt.label}
                  selected={visitTime === opt.value}
                  onClick={() => setVisitTime(visitTime === opt.value ? "" : opt.value)}
                />
              ))}
            </div>
          </FieldRow>
        </div>

        {/* Wine specific */}
        {record.recordType === "wine" && (
          <>
            <FieldRow label="페어링 음식">
              <Input
                value={pairingFood}
                onChange={(e) => setPairingFood(e.target.value)}
                placeholder="함께 먹은 음식"
                className="h-9"
              />
            </FieldRow>
            <FieldRow label="구입가 (원)">
              <Input
                type="number"
                min={0}
                step={1000}
                value={purchasePrice ?? ""}
                onChange={(e) => setPurchasePrice(e.target.value ? Number(e.target.value) : null)}
                placeholder="0"
                className="h-9"
              />
            </FieldRow>
          </>
        )}

        {/* Tags */}
        <FieldRow label="맛 태그">
          <div className="flex flex-wrap gap-1.5">
            {FLAVOR_TAGS.map((tag) => (
              <ChipButton
                key={tag}
                label={tag}
                selected={flavorTags.includes(tag)}
                onClick={() => toggleTag(tag, flavorTags, setFlavorTags)}
              />
            ))}
          </div>
        </FieldRow>

        <FieldRow label="식감 태그">
          <div className="flex flex-wrap gap-1.5">
            {TEXTURE_TAGS.map((tag) => (
              <ChipButton
                key={tag}
                label={tag}
                selected={textureTags.includes(tag)}
                onClick={() => toggleTag(tag, textureTags, setTextureTags)}
              />
            ))}
          </div>
        </FieldRow>

        <FieldRow label="분위기 태그">
          <div className="flex flex-wrap gap-1.5">
            {ATMOSPHERE_TAGS.map((tag) => (
              <ChipButton
                key={tag}
                label={tag}
                selected={atmosphereTags.includes(tag)}
                onClick={() => toggleTag(tag, atmosphereTags, setAtmosphereTags)}
              />
            ))}
          </div>
        </FieldRow>

        {/* Location (read-only) */}
        {(record.locationLat !== null && record.locationLng !== null) && (
          <ReadOnlyField
            label="위치"
            value={`${record.locationLat.toFixed(4)}, ${record.locationLng.toFixed(4)}`}
            icon={<MapPin className="h-3 w-3" />}
            onTap={() => showReadOnlyToast("위치는 기록 시 자동 저장되며 수정할 수 없습니다")}
          />
        )}

        <FieldRow label="코멘트">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="한줄 메모 (선택)"
            className="h-20 w-full resize-none rounded-xl border border-neutral-200 bg-card dark:bg-neutral-100 px-3.5 py-3 text-sm outline-none transition-colors focus:border-primary-500"
          />
        </FieldRow>
      </EditSection>

      {/* Section: Ratings */}
      <EditSection icon={<Star className="h-4 w-4" />} title="평가">
        <RatingScales
          recordType={record.recordType}
          values={ratings}
          onChange={handleRatingChange}
        />
        <ReadOnlyField
          label="종합 점수"
          value={overallRating !== null ? `${overallRating}점` : "-"}
          badge={<SourceBadge type="auto" label="자동 계산" />}
          onTap={() => showReadOnlyToast("종합 점수는 개별 평가 항목에서 자동 계산됩니다")}
        />
      </EditSection>

      {/* Section: AI Analysis Results */}
      <EditSection icon={<Brain className="h-4 w-4" />} title="AI 분석 결과">
        {!aiAnalysis ? (
          <EmptyAiField message="AI 분석 결과가 없습니다" />
        ) : (
          <>
            {/* AI confidence & visit time */}
            <div className="flex items-center gap-3">
              <ReadOnlyInline
                label="AI 신뢰도"
                value={`${Math.round(aiAnalysis.confidenceScore * 100)}%`}
                onTap={() => showReadOnlyToast("신뢰도는 AI가 자동으로 산출합니다")}
              />
              {aiAnalysis.estimatedVisitTime && (
                <ReadOnlyInline
                  label="추정 방문시간"
                  value={aiAnalysis.estimatedVisitTime}
                  onTap={() => showReadOnlyToast("방문 시간 추정은 AI 분석 결과입니다")}
                />
              )}
            </div>

            {/* Restaurant-specific AI data */}
            {record.recordType === "restaurant" && (
              <>
                {/* Receipt data (read-only) */}
                <FieldRow label="영수증 분석" badge={<SourceBadge type="ai" label="AI 분석" />}>
                  {aiAnalysis.receiptData ? (
                    <div
                      className="grid grid-cols-3 gap-2"
                      onClick={() => showReadOnlyToast("영수증 데이터는 AI 분석 결과입니다. 재분석으로 업데이트할 수 있습니다")}
                    >
                      <ReadOnlyBox label="합계" value={formatCurrency(aiAnalysis.receiptData.totalCost)} />
                      <ReadOnlyBox label="1인당" value={formatCurrency(aiAnalysis.receiptData.perPersonCost)} />
                      <ReadOnlyBox label="항목 수" value={`${aiAnalysis.receiptData.itemCount}개`} />
                    </div>
                  ) : (
                    <EmptyAiField message="영수증을 인식하지 못했습니다" />
                  )}
                </FieldRow>

                {/* Companion data (read-only) */}
                <FieldRow label="동행 추정" badge={<SourceBadge type="ai" label="AI 분석" />}>
                  {aiAnalysis.companionData ? (
                    <div
                      className="grid grid-cols-2 gap-2"
                      onClick={() => showReadOnlyToast("동행 추정은 AI 분석 결과입니다")}
                    >
                      <ReadOnlyBox label="추정 인원" value={`${aiAnalysis.companionData.count}명`} />
                      <ReadOnlyBox label="상황" value={aiAnalysis.companionData.occasion} />
                    </div>
                  ) : (
                    <EmptyAiField message="동행 정보를 추정하지 못했습니다" />
                  )}
                </FieldRow>

                {/* AI ordered items (editable) */}
                <FieldRow label="AI 추정 메뉴" badge={<SourceBadge type="ai" label="AI 분석" />}>
                  <EditableList
                    items={aiOrderedItems}
                    renderItem={(item, idx) => (
                      <div className="flex items-center gap-2">
                        <Input
                          value={item.name}
                          onChange={(e) => {
                            const next = [...aiOrderedItems]
                            next[idx] = { ...item, name: e.target.value }
                            setAiOrderedItems(next)
                          }}
                          className="h-8 flex-1"
                          placeholder="메뉴명"
                        />
                        <Input
                          type="number"
                          value={item.estimatedPrice || ""}
                          onChange={(e) => {
                            const next = [...aiOrderedItems]
                            next[idx] = { ...item, estimatedPrice: Number(e.target.value) || 0 }
                            setAiOrderedItems(next)
                          }}
                          className="h-8 w-24"
                          placeholder="가격"
                        />
                        <button type="button" onClick={() => setAiOrderedItems(aiOrderedItems.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    onAdd={() => setAiOrderedItems([...aiOrderedItems, { name: "", estimatedPrice: 0 }])}
                  />
                </FieldRow>

                {/* Menu OCR (editable) */}
                <FieldRow label="메뉴판 OCR" badge={<SourceBadge type="ai" label="AI 분석" />}>
                  <EditableList
                    items={aiMenuItems}
                    renderItem={(item, idx) => (
                      <div className="flex items-center gap-2">
                        <Input
                          value={item.name}
                          onChange={(e) => {
                            const next = [...aiMenuItems]
                            next[idx] = { ...item, name: e.target.value }
                            setAiMenuItems(next)
                          }}
                          className="h-8 flex-1"
                          placeholder="메뉴명"
                        />
                        <Input
                          type="number"
                          value={item.price || ""}
                          onChange={(e) => {
                            const next = [...aiMenuItems]
                            next[idx] = { ...item, price: Number(e.target.value) || 0 }
                            setAiMenuItems(next)
                          }}
                          className="h-8 w-24"
                          placeholder="가격"
                        />
                        <button type="button" onClick={() => setAiMenuItems(aiMenuItems.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    onAdd={() => setAiMenuItems([...aiMenuItems, { name: "", price: 0 }])}
                  />
                </FieldRow>
              </>
            )}

            {/* Taste profile 6-axis (restaurant/cooking) */}
            {(record.recordType === "restaurant" || record.recordType === "cooking") && (
              <FieldRow
                label="맛 프로필 (6축)"
                badge={
                  tasteProfile ? (
                    <SourceBadge type={tasteProfile.source === "ai" ? "ai" : "user"} label={tasteProfile.source === "ai" ? "AI 분석" : "직접 입력"} />
                  ) : undefined
                }
              >
                {Object.values(tasteValues).every((v) => v === 0) && !tasteProfile ? (
                  <EmptyAiField message="맛 프로필이 아직 분석되지 않았습니다" />
                ) : (
                  <div className="space-y-3">
                    {TASTE_6_AXIS.map((axis) => (
                      <MiniSlider
                        key={axis.key}
                        label={axis.label}
                        value={tasteValues[axis.key] ?? 0}
                        onChange={(v) => handleTasteValueChange(axis.key, v)}
                      />
                    ))}
                    {tasteProfile?.confidence !== undefined && tasteProfile.confidence > 0 && (
                      <p className="text-[10px] text-neutral-400">
                        신뢰도: {Math.round(tasteProfile.confidence * 100)}%
                      </p>
                    )}
                  </div>
                )}
              </FieldRow>
            )}

            {/* Wine: wine info */}
            {record.recordType === "wine" && (
              <>
                <FieldRow label="와인 정보" badge={<SourceBadge type="ai" label="AI 분석" />}>
                  {!wineInfo && !aiAnalysis.wineInfo ? (
                    <EmptyAiField message="와인 정보를 인식하지 못했습니다" />
                  ) : (
                    <div className="space-y-2">
                      <Input
                        value={wineInfo?.name ?? ""}
                        onChange={(e) => setWineInfo((prev) => ({ ...DEFAULT_WINE_INFO, ...prev, name: e.target.value }))}
                        placeholder="와인명"
                        className="h-9"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          value={wineInfo?.vintage ?? ""}
                          onChange={(e) => setWineInfo((prev) => ({ ...DEFAULT_WINE_INFO, ...prev, vintage: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="빈티지"
                          className="h-9"
                        />
                        <Input
                          value={wineInfo?.winery ?? ""}
                          onChange={(e) => setWineInfo((prev) => ({ ...DEFAULT_WINE_INFO, ...prev, winery: e.target.value || null }))}
                          placeholder="와이너리"
                          className="h-9"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={wineInfo?.origin ?? ""}
                          onChange={(e) => setWineInfo((prev) => ({ ...DEFAULT_WINE_INFO, ...prev, origin: e.target.value || null }))}
                          placeholder="원산지"
                          className="h-9"
                        />
                        <Input
                          value={wineInfo?.variety ?? ""}
                          onChange={(e) => setWineInfo((prev) => ({ ...DEFAULT_WINE_INFO, ...prev, variety: e.target.value || null }))}
                          placeholder="품종"
                          className="h-9"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <FieldRow label="AI 추정가">
                          <Input
                            type="number"
                            min={0}
                            step={1000}
                            value={wineInfo?.estimatedPriceKrw ?? ""}
                            onChange={(e) => setWineInfo((prev) => ({ ...DEFAULT_WINE_INFO, ...prev, estimatedPriceKrw: e.target.value ? Number(e.target.value) : null }))}
                            placeholder="추정가"
                            className="h-9"
                          />
                        </FieldRow>
                        <ReadOnlyField
                          label="평론가 점수"
                          value={wineInfo?.criticScore !== null && wineInfo?.criticScore !== undefined ? `${wineInfo.criticScore}점` : "-"}
                          badge={<SourceBadge type="external" label="외부 DB" />}
                          onTap={() => showReadOnlyToast("평론가 점수는 외부 데이터베이스에서 가져옵니다")}
                        />
                      </div>
                    </div>
                  )}
                </FieldRow>

                {/* Wine tasting: AI vs User tabs */}
                <FieldRow label="테이스팅 노트 (WSET 7축)">
                  <div className="space-y-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setWineUserTastingTab("ai")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${wineUserTastingTab === "ai" ? "bg-blue-50 text-blue-600" : "bg-neutral-100 text-neutral-500"}`}
                      >
                        AI 분석
                      </button>
                      <button
                        type="button"
                        onClick={() => setWineUserTastingTab("user")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${wineUserTastingTab === "user" ? "bg-green-50 text-green-600" : "bg-neutral-100 text-neutral-500"}`}
                      >
                        내 테이스팅
                      </button>
                    </div>
                    {wineUserTastingTab === "ai" ? (
                      Object.values(wineTastingValues).every((v) => !v) ? (
                        <EmptyAiField message="AI 테이스팅 분석이 아직 없습니다" />
                      ) : (
                        WINE_TASTING_AXIS.map((axis) => (
                          <MiniSlider
                            key={axis.key}
                            label={axis.label}
                            value={wineTastingValues[axis.key] ?? 0}
                            onChange={(v) => handleWineTastingChange(axis.key, v)}
                          />
                        ))
                      )
                    ) : (
                      WINE_TASTING_AXIS.map((axis) => (
                        <MiniSlider
                          key={axis.key}
                          label={axis.label}
                          value={wineUserTastingValues[axis.key] ?? 0}
                          onChange={(v) => handleWineUserTastingChange(axis.key, v)}
                        />
                      ))
                    )}
                  </div>
                </FieldRow>
              </>
            )}

            {/* Photo classifications (read-only) */}
            <FieldRow label="사진 분류" badge={<SourceBadge type="ai" label="AI 분석" />}>
              {aiAnalysis.photoClassifications && aiAnalysis.photoClassifications.length > 0 ? (
                <div
                  className="space-y-1.5"
                  onClick={() => showReadOnlyToast("사진 분류는 AI가 자동으로 수행합니다")}
                >
                  {aiAnalysis.photoClassifications.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-2.5 py-1.5 cursor-not-allowed">
                      <span className="text-[10px] font-medium text-neutral-500">
                        #{c.photoIndex + 1}
                      </span>
                      <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-600">
                        {PHOTO_TYPE_LABELS[c.type] ?? c.type}
                      </span>
                      <span className="flex-1 truncate text-[10px] text-neutral-400">{c.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyAiField message="사진 분류 결과가 없습니다" />
              )}
            </FieldRow>

            {/* Taste summary (read-only) */}
            {tasteProfile?.summary && (
              <ReadOnlyField
                label="맛 요약"
                value={tasteProfile.summary}
                badge={<SourceBadge type="ai" label="AI 생성" />}
                onTap={() => showReadOnlyToast("맛 요약은 AI가 자동 생성합니다")}
              />
            )}
          </>
        )}
      </EditSection>

      {/* Section: Blog */}
      {record.phaseStatus >= 3 && journal && (
        <EditSection icon={<BookOpen className="h-4 w-4" />} title="블로그">
          <FieldRow label="제목">
            <Input
              value={blogTitle}
              onChange={(e) => setBlogTitle(e.target.value)}
              placeholder="블로그 제목"
              className="h-9"
            />
          </FieldRow>
          <FieldRow label="본문">
            <textarea
              value={blogContent}
              onChange={(e) => setBlogContent(e.target.value)}
              placeholder="블로그 본문"
              className="h-40 w-full resize-y rounded-xl border border-neutral-200 bg-card dark:bg-neutral-100 px-3.5 py-3 text-sm outline-none transition-colors focus:border-primary-500"
            />
          </FieldRow>
        </EditSection>
      )}

      {/* Section: System Info (collapsible) */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setSystemInfoOpen(!systemInfoOpen)}
          className="flex w-full items-center gap-2"
        >
          <span className="text-neutral-500"><Info className="h-4 w-4" /></span>
          <h3 className="text-sm font-semibold text-neutral-700">시스템 정보</h3>
          <span className="ml-auto text-neutral-400">
            {systemInfoOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>
        {systemInfoOpen && (
          <div className="space-y-2 rounded-xl border border-neutral-100 bg-neutral-50 p-3.5">
            <ReadOnlyRow label="Phase 상태" value={getPhaseLabel(record.phaseStatus)} />
            {record.phase1CompletedAt && <ReadOnlyRow label="Phase 1 완료" value={new Date(record.phase1CompletedAt).toLocaleDateString("ko-KR")} />}
            {record.phase2CompletedAt && <ReadOnlyRow label="Phase 2 완료" value={new Date(record.phase2CompletedAt).toLocaleDateString("ko-KR")} />}
            {record.phase3CompletedAt && <ReadOnlyRow label="Phase 3 완료" value={new Date(record.phase3CompletedAt).toLocaleDateString("ko-KR")} />}
            <ReadOnlyRow label="완성도" value={`${record.completenessScore}%`} />
            {record.phaseStatus >= 3 && record.scaledRating !== null && (
              <ReadOnlyRow label="Elo 보정 점수" value={`${record.scaledRating.toFixed(1)}`} />
            )}
            {record.phaseStatus >= 3 && record.comparisonCount > 0 && (
              <ReadOnlyRow label="비교 횟수" value={`${record.comparisonCount}회`} />
            )}
            <ReadOnlyRow label="생성일" value={new Date(record.createdAt).toLocaleDateString("ko-KR")} />
          </div>
        )}
      </div>

      {/* Photo Crop Editor */}
      <PhotoCropEditor
        open={cropEditorOpen}
        onOpenChange={setCropEditorOpen}
        photoUrl={cropEditingPhotoUrl}
        initialCrop={cropEditingInitial}
        onApply={handleCropApply}
      />
    </div>
  )
}

// --- Sub-components ---

function EditSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-neutral-500">{icon}</span>
        <h3 className="text-sm font-semibold text-neutral-700">{title}</h3>
      </div>
      <div className="space-y-3 rounded-xl border border-neutral-100 bg-card p-3.5">
        {children}
      </div>
    </div>
  )
}

function FieldRow({ label, badge, children }: { label: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-neutral-500">{label}</label>
        {badge}
      </div>
      {children}
    </div>
  )
}

function ChipButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
        selected
          ? "bg-primary-500 text-white"
          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
      }`}
    >
      {label}
    </button>
  )
}

function MiniSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-xs text-neutral-500">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-100 accent-primary-500 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500"
      />
      <span className="w-7 text-right text-xs tabular-nums text-neutral-600">{value}</span>
    </div>
  )
}

function EditableList<T>({
  items,
  renderItem,
  onAdd,
}: {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  onAdd: () => void
}) {
  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-xs text-neutral-400">항목이 없습니다.</p>
      )}
      {items.map((item, idx) => (
        <div key={idx}>{renderItem(item, idx)}</div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600"
      >
        <Plus className="h-3 w-3" /> 추가
      </button>
    </div>
  )
}

function SourceBadge({ type, label }: { type: "ai" | "user" | "auto" | "external" | "system"; label: string }) {
  const styles: Record<string, string> = {
    ai: "bg-blue-50 text-blue-600",
    user: "bg-green-50 text-green-600",
    auto: "bg-neutral-100 text-neutral-500",
    external: "bg-purple-50 text-purple-600",
    system: "bg-neutral-100 text-neutral-500",
  }
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${styles[type]}`}>
      {label}
    </span>
  )
}

function ReadOnlyField({
  label,
  value,
  badge,
  icon,
  onTap,
}: {
  label: string
  value: string
  badge?: React.ReactNode
  icon?: React.ReactNode
  onTap: () => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-neutral-500">{label}</label>
        {badge}
      </div>
      <div
        onClick={onTap}
        className="flex h-9 cursor-not-allowed items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 px-3.5 text-sm text-neutral-400"
      >
        {icon}
        <span>{value}</span>
      </div>
    </div>
  )
}

function ReadOnlyInline({ label, value, onTap }: { label: string; value: string; onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex items-center gap-1.5 rounded-lg bg-neutral-50 px-2.5 py-1.5 cursor-not-allowed"
    >
      <span className="text-[10px] text-neutral-400">{label}</span>
      <span className="text-xs font-medium text-neutral-600">{value}</span>
    </button>
  )
}

function ReadOnlyBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-neutral-50 px-2 py-2 cursor-not-allowed">
      <span className="text-[10px] text-neutral-400">{label}</span>
      <span className="text-xs font-medium text-neutral-600">{value}</span>
    </div>
  )
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-neutral-400">{label}</span>
      <span className="text-xs font-medium text-neutral-600">{value}</span>
    </div>
  )
}

function EmptyAiField({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2.5">
      <Brain className="h-3.5 w-3.5 text-neutral-300" />
      <p className="text-xs text-neutral-400">{message}</p>
    </div>
  )
}

// Constants
const TASTE_6_AXIS = [
  { key: "spicy", label: "매운맛" },
  { key: "sweet", label: "단맛" },
  { key: "salty", label: "짠맛" },
  { key: "sour", label: "신맛" },
  { key: "umami", label: "감칠맛" },
  { key: "rich", label: "기름진맛" },
]

const WINE_TASTING_AXIS = [
  { key: "acidity", label: "산미" },
  { key: "body", label: "바디감" },
  { key: "tannin", label: "타닌" },
  { key: "sweetness", label: "당도" },
  { key: "balance", label: "균형" },
  { key: "finish", label: "여운" },
  { key: "aroma", label: "향 복합성" },
]

const DEFAULT_WINE_INFO: NonNullable<RecordAiAnalysis["wineInfo"]> = {
  name: null,
  vintage: null,
  winery: null,
  origin: null,
  variety: null,
  estimatedPriceKrw: null,
  criticScore: null,
}

const PHOTO_TYPE_LABELS: Record<string, string> = {
  food: "음식",
  menu: "메뉴판",
  receipt: "영수증",
  signage: "간판",
}
