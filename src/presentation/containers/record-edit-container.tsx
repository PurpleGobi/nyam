'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Loader2,
  Tag,
  Eye,
  EyeOff,
  Users,
} from 'lucide-react'
import { useEditRecord } from '@/application/hooks/use-edit-record'
import { useAuthContext } from '@/presentation/providers/auth-provider'
import { RatingInput } from '@/presentation/components/record/rating-input'
import type {
  FoodRecord,
  RecordType,
  RecordVisibility,
  RecordRatings,
  RestaurantRatings,
  WineRatings,
  HomemadeRatings,
} from '@/domain/entities/record'

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
  { key: 'timeSpent', label: '시간' },
  { key: 'reproducibility', label: '재현성' },
]

const VISIBILITY_OPTIONS: Array<{
  value: RecordVisibility
  label: string
  icon: typeof Eye
}> = [
  { value: 'private', label: '나만 보기', icon: EyeOff },
  { value: 'group', label: '그룹 공개', icon: Users },
  { value: 'public', label: '전체 공개', icon: Eye },
]

function getRatingConfig(recordType: RecordType) {
  switch (recordType) {
    case 'wine':
      return WINE_RATING_CONFIG
    case 'homemade':
      return HOMEMADE_RATING_CONFIG
    default:
      return RESTAURANT_RATING_CONFIG
  }
}

function ratingsToRecord(ratings: RecordRatings): Record<string, number> {
  return { ...ratings } as unknown as Record<string, number>
}

function buildRatings(recordType: RecordType, values: Record<string, number>): RecordRatings {
  if (recordType === 'wine') {
    return {
      aroma: values.aroma ?? 0,
      body: values.body ?? 0,
      acidity: values.acidity ?? 0,
      finish: values.finish ?? 0,
      balance: values.balance ?? 0,
      value: values.value ?? 0,
    } satisfies WineRatings
  }
  if (recordType === 'homemade') {
    return {
      taste: values.taste ?? 0,
      difficulty: values.difficulty ?? 0,
      timeSpent: values.timeSpent ?? 0,
      reproducibility: values.reproducibility ?? 0,
    } satisfies HomemadeRatings
  }
  return {
    taste: values.taste ?? 0,
    value: values.value ?? 0,
    service: values.service ?? 0,
    atmosphere: values.atmosphere ?? 0,
    cleanliness: values.cleanliness ?? 0,
    portion: values.portion ?? 0,
  } satisfies RestaurantRatings
}

function computeOverall(ratings: RecordRatings): number {
  const values = Object.values(ratings).filter((v): v is number => typeof v === 'number' && v > 0)
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

interface FormState {
  menuName: string
  category: string
  comment: string
  ratingValues: Record<string, number>
  visibility: RecordVisibility
}

function TagChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-[var(--color-neutral-100)] px-2.5 py-1 text-xs text-[var(--color-neutral-600)]"
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

export function RecordEditContainer() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : undefined

  const { record, saveChanges, isLoading, isSaving, error } = useEditRecord(id)
  const { user: authUser } = useAuthContext()

  const [initRecordId, setInitRecordId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    menuName: '',
    category: '',
    comment: '',
    ratingValues: {},
    visibility: 'private',
  })

  // Initialize form once when record first loads (state-driven, no ref access during render)
  if (record && record.id !== initRecordId) {
    setInitRecordId(record.id)
    setForm({
      menuName: record.menuName,
      category: record.category,
      comment: record.comment ?? '',
      ratingValues: ratingsToRecord(record.ratings),
      visibility: record.visibility,
    })
  }

  const { menuName, category, comment, ratingValues, visibility } = form

  const setMenuName = useCallback((v: string) => setForm((p) => ({ ...p, menuName: v })), [])
  const setCategory = useCallback((v: string) => setForm((p) => ({ ...p, category: v })), [])
  const setComment = useCallback((v: string) => setForm((p) => ({ ...p, comment: v })), [])
  const setVisibility = useCallback((v: RecordVisibility) => setForm((p) => ({ ...p, visibility: v })), [])

  const handleRatingChange = useCallback((key: string, value: number) => {
    setForm((prev) => ({ ...prev, ratingValues: { ...prev.ratingValues, [key]: value } }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!record) return

    const updates: Partial<FoodRecord> = {}

    if (menuName !== record.menuName) {
      updates.menuName = menuName
    }
    if (category !== record.category) {
      updates.category = category
    }
    if ((comment || null) !== record.comment) {
      updates.comment = comment || null
    }
    if (visibility !== record.visibility) {
      updates.visibility = visibility
    }

    const newRatings = buildRatings(record.recordType, ratingValues)
    const currentRatingsStr = JSON.stringify(record.ratings)
    const newRatingsStr = JSON.stringify(newRatings)
    if (newRatingsStr !== currentRatingsStr) {
      updates.ratings = newRatings
      updates.ratingOverall = computeOverall(newRatings)
    }

    if (Object.keys(updates).length === 0) {
      router.push(`/records/${id}`)
      return
    }

    try {
      await saveChanges(updates)
      router.push(`/records/${id}`)
    } catch {
      // error is set inside the hook
    }
  }, [record, menuName, category, comment, visibility, ratingValues, id, router, saveChanges])

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-4">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-neutral-100)]" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
        <div className="h-24 w-full animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded bg-[var(--color-neutral-100)]" />
          ))}
        </div>
      </div>
    )
  }

  // Record not found
  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 pt-20">
        <p className="text-sm text-[var(--color-neutral-500)]">기록을 찾을 수 없습니다</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-[#FF6038]"
        >
          돌아가기
        </button>
      </div>
    )
  }

  // Authorization check
  if (authUser?.id != null && record.userId !== authUser.id) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 pt-20">
        <p className="text-sm text-[var(--color-neutral-500)]">수정 권한이 없습니다</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium text-[#FF6038]"
        >
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </button>
      </div>
    )
  }

  const ratingConfig = getRatingConfig(record.recordType)
  const allTags = [
    ...record.tags,
    ...record.flavorTags,
    ...record.textureTags,
    ...record.atmosphereTags,
  ]

  return (
    <div className="flex flex-col gap-5 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-neutral-50)]"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--color-neutral-700)]" />
        </button>
        <h1 className="flex-1 text-base font-semibold text-[var(--color-neutral-800)]">
          기록 수정
        </h1>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Menu Name */}
      <div className="flex flex-col gap-1.5 px-4">
        <label
          htmlFor="edit-menu-name"
          className="text-sm font-medium text-[var(--color-neutral-700)]"
        >
          메뉴 이름
        </label>
        <input
          id="edit-menu-name"
          type="text"
          value={menuName}
          onChange={(e) => setMenuName(e.target.value)}
          className="h-11 rounded-xl border border-[var(--color-neutral-200)] bg-white px-3.5 text-sm text-[var(--color-neutral-800)] outline-none transition-colors focus:border-[#FF6038]"
          placeholder="메뉴 이름"
        />
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1.5 px-4">
        <label
          htmlFor="edit-category"
          className="text-sm font-medium text-[var(--color-neutral-700)]"
        >
          카테고리
        </label>
        <input
          id="edit-category"
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 rounded-xl border border-[var(--color-neutral-200)] bg-white px-3.5 text-sm text-[var(--color-neutral-800)] outline-none transition-colors focus:border-[#FF6038]"
          placeholder="카테고리"
        />
      </div>

      {/* Comment */}
      <div className="flex flex-col gap-1.5 px-4">
        <label
          htmlFor="edit-comment"
          className="text-sm font-medium text-[var(--color-neutral-700)]"
        >
          코멘트
        </label>
        <textarea
          id="edit-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="rounded-xl border border-[var(--color-neutral-200)] bg-white px-3.5 py-3 text-sm leading-relaxed text-[var(--color-neutral-800)] outline-none transition-colors focus:border-[#FF6038] resize-none"
          placeholder="코멘트를 입력하세요"
        />
      </div>

      {/* Ratings */}
      <div className="flex flex-col gap-2 px-4">
        <span className="text-sm font-medium text-[var(--color-neutral-700)]">평가</span>
        <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white p-4">
          <RatingInput
            config={ratingConfig}
            values={ratingValues}
            onChange={handleRatingChange}
          />
        </div>
      </div>

      {/* Tags (read-only) */}
      {allTags.length > 0 && (
        <div className="flex flex-col gap-2 px-4">
          <div className="flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-[var(--color-neutral-500)]" />
            <span className="text-sm font-medium text-[var(--color-neutral-700)]">태그</span>
            <span className="text-xs text-[var(--color-neutral-400)]">(읽기 전용)</span>
          </div>
          <TagChips tags={allTags} />
        </div>
      )}

      {/* Visibility */}
      <div className="flex flex-col gap-2 px-4">
        <span className="text-sm font-medium text-[var(--color-neutral-700)]">공개 범위</span>
        <div className="flex gap-2">
          {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setVisibility(value)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm transition-colors ${
                visibility === value
                  ? 'border-[#FF6038] bg-[#FF6038]/5 text-[#FF6038]'
                  : 'border-[var(--color-neutral-200)] bg-white text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-50)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="px-4 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !menuName.trim()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6038] text-sm font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              저장
            </>
          )}
        </button>
      </div>
    </div>
  )
}
