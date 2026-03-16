'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/presentation/providers/auth-provider'
import { useNearbyRestaurants } from '@/application/hooks/use-nearby-restaurants'
import { useCreateRecord } from '@/application/hooks/use-create-record'
import { PhotoCaptureSheet } from '@/presentation/components/capture/photo-capture-sheet'
import { RatingScales } from '@/presentation/components/capture/rating-scales'
import { RecordComplete } from '@/presentation/components/record/record-complete'

export function QuickCaptureContainer() {
  const router = useRouter()
  const { user: authUser } = useAuthContext()
  const userId = authUser?.id

  const { location } = useNearbyRestaurants()

  const {
    step,
    draft,
    savedResult,
    error,
    addPhotos,
    removePhoto,
    setRating,
    save,
    reset,
  } = useCreateRecord(userId, location)

  if (step === 'complete' && savedResult) {
    return (
      <RecordComplete
        menuName=""
        category=""
        ratingOverall={savedResult.ratingOverall}
        onGoHome={() => router.push('/')}
        onAddAnother={reset}
      />
    )
  }

  if (step === 'saving') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6038]" />
        <p className="text-sm text-[var(--color-neutral-500)]">저장 중...</p>
      </div>
    )
  }

  const hasAnyRating = Object.values(draft.ratings).some(v => v > 0)

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-100)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-[var(--color-neutral-800)]">
          빠른 기록
        </h1>
        <div className="h-8 w-8" />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 1. Photos */}
      <PhotoCaptureSheet
        photos={draft.photos}
        onPhotosAdd={addPhotos}
        onPhotoRemove={removePhoto}
      />

      {/* 2. Rating Scales */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-[var(--color-neutral-700)]">평가</p>
        <RatingScales
          values={draft.ratings}
          onChange={setRating}
        />
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={save}
        disabled={!hasAnyRating}
        className="mt-2 w-full rounded-xl bg-[#FF6038] py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
      >
        저장하기
      </button>
    </div>
  )
}
