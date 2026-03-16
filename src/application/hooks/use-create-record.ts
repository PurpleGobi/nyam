'use client'

import { useState, useCallback } from 'react'
import { uploadRecordPhoto, resizeImage } from '@/infrastructure/storage/image-upload'
import { getRecordRepository } from '@/di/repositories'

export type QuickCaptureStep = 'input' | 'saving' | 'complete'

export interface QuickCaptureDraft {
  photos: File[]
  ratings: Record<string, number>
}

interface SavedResult {
  recordId: string
  ratingOverall: number
}

const INITIAL_DRAFT: QuickCaptureDraft = {
  photos: [],
  ratings: {},
}

export function useCreateRecord(
  userId: string | undefined,
  location: { lat: number; lng: number } | null,
) {
  const [step, setStep] = useState<QuickCaptureStep>('input')
  const [draft, setDraft] = useState<QuickCaptureDraft>({ ...INITIAL_DRAFT })
  const [savedResult, setSavedResult] = useState<SavedResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const addPhotos = useCallback((files: File[]) => {
    setDraft(prev => ({
      ...prev,
      photos: [...prev.photos, ...files].slice(0, 8),
    }))
  }, [])

  const removePhoto = useCallback((index: number) => {
    setDraft(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }))
  }, [])

  const setRating = useCallback((key: string, value: number) => {
    setDraft(prev => ({
      ...prev,
      ratings: { ...prev.ratings, [key]: value },
    }))
  }, [])

  const save = useCallback(async () => {
    if (!userId) {
      setError('로그인이 필요합니다')
      return
    }

    // At least one rating required
    const ratingValues = Object.values(draft.ratings).filter(v => v > 0)
    if (ratingValues.length === 0) {
      setError('최소 한 항목은 평가해주세요')
      return
    }

    setStep('saving')
    setError(null)

    try {
      // Upload resized photos
      const photoUrls: string[] = []
      for (const file of draft.photos) {
        const resized = await resizeImage(file, 1024)
        const result = await uploadRecordPhoto(resized, userId)
        photoUrls.push(result.url)
      }

      const r = draft.ratings
      // 0-100 scale → average for overall
      const ratingOverall = ratingValues.length > 0
        ? Math.round(ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length)
        : 0

      const repo = getRecordRepository()
      const record = await repo.create({
        userId,
        restaurantId: null,
        recordType: 'restaurant',
        menuName: '',
        category: '',
        subCategory: null,
        pricePerPerson: null,
        ratings: {
          taste: r.taste ?? 0,
          value: r.value ?? 0,
          service: r.service ?? 0,
          atmosphere: r.atmosphere ?? 0,
          cleanliness: r.cleanliness ?? 0,
          portion: r.portion ?? 0,
        },
        ratingOverall,
        comment: null,
        tags: [],
        flavorTags: [],
        textureTags: [],
        atmosphereTags: [],
        visibility: 'private',
        aiRecognized: false,
        completenessScore: 0,
        locationAtRecord: location,
        phaseStatus: 1,
        phase1CompletedAt: new Date().toISOString(),
        phase2CompletedAt: null,
        phase3CompletedAt: null,
        scaledRating: null,
        comparisonCount: 0,
        visitTime: null,
        companionCount: null,
        totalCost: null,
      })

      // Fire-and-forget: AI analysis + enrichment
      fetch('/api/records/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: record.id,
          photoUrls,
          location,
        }),
      }).catch(() => {})

      // Fire-and-forget: stats update
      fetch('/api/records/post-process', {
        method: 'POST',
      }).catch(() => {})

      setSavedResult({ recordId: record.id, ratingOverall })
      setStep('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다')
      setStep('input')
    }
  }, [userId, draft, location])

  const reset = useCallback(() => {
    setStep('input')
    setDraft({ ...INITIAL_DRAFT })
    setSavedResult(null)
    setError(null)
  }, [])

  return {
    step,
    draft,
    savedResult,
    error,
    addPhotos,
    removePhoto,
    setRating,
    save,
    reset,
  }
}
