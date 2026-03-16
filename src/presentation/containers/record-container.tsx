"use client"

import { useEffect } from "react"
import { ChevronLeft, Loader2, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuthContext } from "@/presentation/providers/auth-provider"
import { useCreateRecord } from "@/application/hooks/use-create-record"
import { useRestaurantSearch } from "@/application/hooks/use-restaurant-search"

import { PhotoPicker } from "@/presentation/components/record/photo-picker"
import { RecordTypeSelector } from "@/presentation/components/record/record-type-selector"
import { RestaurantMatcher } from "@/presentation/components/record/restaurant-matcher"
import { RatingInput } from "@/presentation/components/record/rating-input"
import { TagSelector } from "@/presentation/components/record/tag-selector"
import { VisibilitySelector } from "@/presentation/components/record/visibility-selector"
import { RecordComplete } from "@/presentation/components/record/record-complete"

import { FOOD_CATEGORIES, SITUATIONS, FLAVOR_TAGS, TEXTURE_TAGS, ATMOSPHERE_TAGS } from "@/shared/constants/categories"
import type { RecordType } from "@/domain/entities/record"

const RESTAURANT_RATING_CONFIG = [
  { key: 'taste', label: '맛' },
  { key: 'value', label: '가성비' },
  { key: 'service', label: '서비스' },
  { key: 'atmosphere', label: '분위기' },
  { key: 'cleanliness', label: '청결' },
  { key: 'portion', label: '양' },
]

const WINE_RATING_CONFIG = [
  { key: 'aroma', label: '향' },
  { key: 'body', label: '바디감' },
  { key: 'acidity', label: '산미' },
  { key: 'finish', label: '여운' },
  { key: 'balance', label: '밸런스' },
  { key: 'value', label: '가성비' },
]

const HOMEMADE_RATING_CONFIG = [
  { key: 'taste', label: '맛' },
  { key: 'difficulty', label: '난이도' },
  { key: 'timeSpent', label: '소요시간' },
  { key: 'reproducibility', label: '재현성' },
]

function getRatingConfig(type: RecordType) {
  switch (type) {
    case 'wine': return WINE_RATING_CONFIG
    case 'homemade': return HOMEMADE_RATING_CONFIG
    default: return RESTAURANT_RATING_CONFIG
  }
}

const STEP_TITLES: Record<string, string> = {
  photos: '사진 선택',
  type: '기록 유형',
  restaurant: '식당 찾기',
  details: '평가하기',
  tags: '태그 & 코멘트',
}

export function RecordContainer() {
  const router = useRouter()
  const { user: authUser } = useAuthContext()
  const userId = authUser?.id

  const {
    step,
    draft,
    aiResult,
    isRecognizing,
    isSaving,
    savedResult,
    error,
    updateDraft,
    toggleArrayItem,
    runAiRecognition,
    goNext,
    goBack,
    save,
    reset,
  } = useCreateRecord(userId)

  const restaurantSearch = useRestaurantSearch()

  // Trigger AI recognition when photos change
  useEffect(() => {
    if (draft.photos.length > 0 && step === 'photos') {
      runAiRecognition(draft.photos)
    }
  }, [draft.photos, step, runAiRecognition])

  // Auto-save when entering 'saving' step
  useEffect(() => {
    if (step === 'saving') {
      save()
    }
  }, [step, save])

  // Complete screen
  if (step === 'complete' && savedResult) {
    return (
      <RecordComplete
        menuName={savedResult.menuName}
        category={FOOD_CATEGORIES.find(c => c.value === savedResult.category)?.label ?? savedResult.category}
        ratingOverall={savedResult.ratingOverall}
        onGoHome={() => router.push('/')}
        onAddAnother={reset}
      />
    )
  }

  // Saving screen
  if (step === 'saving') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6038]" />
        <p className="text-sm text-[var(--color-neutral-500)]">기록 저장 중...</p>
      </div>
    )
  }

  const canGoNext = (() => {
    switch (step) {
      case 'photos': return true // photos are optional
      case 'type': return true
      case 'restaurant': return true // restaurant selection is optional
      case 'details': return draft.menuName.trim().length > 0 && draft.category.length > 0
      case 'tags': return true
      default: return false
    }
  })()

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        {step !== 'photos' ? (
          <button
            type="button"
            onClick={goBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-100)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="h-8 w-8" />
        )}
        <h1 className="flex-1 text-center text-lg font-bold text-[var(--color-neutral-800)]">
          {STEP_TITLES[step] ?? '새 기록'}
        </h1>
        <div className="h-8 w-8" />
      </div>

      {/* AI Recognition Badge */}
      {isRecognizing && (
        <div className="flex items-center gap-2 rounded-lg bg-[#FF6038]/5 px-3 py-2">
          <Sparkles className="h-4 w-4 animate-pulse text-[#FF6038]" />
          <span className="text-xs text-[#FF6038]">AI가 음식을 분석하고 있습니다...</span>
        </div>
      )}
      {aiResult?.available && !isRecognizing && step !== 'photos' && (
        <div className="flex items-center gap-2 rounded-lg bg-[#FF6038]/5 px-3 py-2">
          <Sparkles className="h-4 w-4 text-[#FF6038]" />
          <span className="text-xs text-[#FF6038]">
            AI 인식: {aiResult.menuName} ({Math.round((aiResult.confidence ?? 0) * 100)}%)
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Step Content */}
      {step === 'photos' && (
        <div className="flex flex-col gap-6">
          <PhotoPicker
            photos={draft.photos}
            onPhotosChange={(files) => updateDraft('photos', files)}
          />
          <p className="text-center text-xs text-[var(--color-neutral-400)]">
            사진을 추가하면 AI가 자동으로 메뉴를 인식합니다
          </p>
        </div>
      )}

      {step === 'type' && (
        <div className="flex flex-col gap-4">
          <RecordTypeSelector
            value={draft.recordType}
            onChange={(type) => updateDraft('recordType', type)}
          />
        </div>
      )}

      {step === 'restaurant' && (
        <div className="flex flex-col gap-4">
          <RestaurantMatcher
            query={restaurantSearch.query}
            onQueryChange={restaurantSearch.setQuery}
            results={restaurantSearch.results}
            isSearching={restaurantSearch.isSearching}
            selected={restaurantSearch.selected}
            onSelect={(place) => {
              restaurantSearch.handleSelect(place)
              updateDraft('restaurant', place)
            }}
            onClear={() => {
              restaurantSearch.handleClear()
              updateDraft('restaurant', null)
            }}
          />
        </div>
      )}

      {step === 'details' && (
        <div className="flex flex-col gap-5">
          {/* Menu Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-neutral-700)]">
              메뉴명 *
            </label>
            <input
              type="text"
              value={draft.menuName}
              onChange={(e) => updateDraft('menuName', e.target.value)}
              placeholder="어떤 메뉴를 드셨나요?"
              className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-white px-3 py-2.5 text-sm placeholder:text-[var(--color-neutral-400)] focus:border-[#FF6038] focus:outline-none"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-neutral-700)]">
              카테고리 *
            </label>
            <div className="flex flex-wrap gap-2">
              {FOOD_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => updateDraft('category', cat.value)}
                  className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                    draft.category === cat.value
                      ? 'bg-[#FF6038] text-white'
                      : 'border border-[var(--color-neutral-200)] bg-white text-[var(--color-neutral-600)]'
                  }`}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-neutral-700)]">
              1인당 가격
            </label>
            <input
              type="number"
              value={draft.pricePerPerson}
              onChange={(e) => updateDraft('pricePerPerson', e.target.value)}
              placeholder="10000"
              className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-white px-3 py-2.5 text-sm placeholder:text-[var(--color-neutral-400)] focus:border-[#FF6038] focus:outline-none"
            />
          </div>

          {/* Ratings */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-neutral-700)]">
              평가
            </label>
            <RatingInput
              config={getRatingConfig(draft.recordType)}
              values={draft.ratings}
              onChange={(key, value) => {
                updateDraft('ratings', { ...draft.ratings, [key]: value })
              }}
            />
          </div>
        </div>
      )}

      {step === 'tags' && (
        <div className="flex flex-col gap-5">
          {/* Situation Tags */}
          <TagSelector
            label="상황"
            tags={SITUATIONS}
            selected={draft.tags}
            onToggle={(tag) => toggleArrayItem('tags', tag)}
          />

          {/* Flavor Tags */}
          <TagSelector
            label="맛"
            tags={FLAVOR_TAGS}
            selected={draft.flavorTags}
            onToggle={(tag) => toggleArrayItem('flavorTags', tag)}
            suggestedTags={aiResult?.flavorTags}
          />

          {/* Texture Tags */}
          <TagSelector
            label="식감"
            tags={TEXTURE_TAGS}
            selected={draft.textureTags}
            onToggle={(tag) => toggleArrayItem('textureTags', tag)}
            suggestedTags={aiResult?.textureTags}
          />

          {/* Atmosphere Tags (restaurant only) */}
          {draft.recordType === 'restaurant' && (
            <TagSelector
              label="분위기"
              tags={ATMOSPHERE_TAGS}
              selected={draft.atmosphereTags}
              onToggle={(tag) => toggleArrayItem('atmosphereTags', tag)}
            />
          )}

          {/* Comment */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-neutral-700)]">
              한 줄 코멘트
            </label>
            <textarea
              value={draft.comment}
              onChange={(e) => updateDraft('comment', e.target.value)}
              placeholder="이 메뉴에 대한 한마디"
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--color-neutral-200)] bg-white px-3 py-2.5 text-sm placeholder:text-[var(--color-neutral-400)] focus:border-[#FF6038] focus:outline-none"
            />
          </div>

          {/* Visibility */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-neutral-700)]">
              공개 범위
            </label>
            <VisibilitySelector
              value={draft.visibility}
              onChange={(v) => updateDraft('visibility', v)}
            />
          </div>
        </div>
      )}

      {/* Bottom Button */}
      <button
        type="button"
        onClick={goNext}
        disabled={!canGoNext || isSaving}
        className="mt-2 w-full rounded-xl bg-[#FF6038] py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
      >
        {step === 'tags' ? '저장하기' : '다음'}
      </button>
    </div>
  )
}
