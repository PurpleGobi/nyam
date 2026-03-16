'use client'

import { useState, useCallback } from 'react'
import type { RecordType, RecordVisibility, RecordRatings } from '@/domain/entities/record'
import type { KakaoPlaceResult } from '@/infrastructure/api/kakao-local'
import type { FoodRecognitionResult } from '@/infrastructure/api/food-recognition'
import { recognizeFood } from '@/infrastructure/api/food-recognition'
import { uploadRecordPhoto } from '@/infrastructure/storage/image-upload'
import { fileToBase64 } from '@/infrastructure/storage/image-upload'
import { getRecordRepository } from '@/di/repositories'

export type RecordStep =
  | 'photos'
  | 'type'
  | 'restaurant'
  | 'details'
  | 'tags'
  | 'saving'
  | 'complete'

interface RecordDraft {
  photos: File[]
  recordType: RecordType
  restaurant: KakaoPlaceResult | null
  menuName: string
  category: string
  subCategory: string
  pricePerPerson: string
  ratings: Record<string, number>
  tags: string[]
  flavorTags: string[]
  textureTags: string[]
  atmosphereTags: string[]
  comment: string
  visibility: RecordVisibility
}

interface SavedResult {
  menuName: string
  category: string
  ratingOverall: number
}

const INITIAL_DRAFT: RecordDraft = {
  photos: [],
  recordType: 'restaurant',
  restaurant: null,
  menuName: '',
  category: '',
  subCategory: '',
  pricePerPerson: '',
  ratings: {},
  tags: [],
  flavorTags: [],
  textureTags: [],
  atmosphereTags: [],
  comment: '',
  visibility: 'private',
}

export function useCreateRecord(userId: string | undefined) {
  const [step, setStep] = useState<RecordStep>('photos')
  const [draft, setDraft] = useState<RecordDraft>({ ...INITIAL_DRAFT })
  const [aiResult, setAiResult] = useState<FoodRecognitionResult | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedResult, setSavedResult] = useState<SavedResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateDraft = useCallback(<K extends keyof RecordDraft>(
    key: K,
    value: RecordDraft[K],
  ) => {
    setDraft(prev => ({ ...prev, [key]: value }))
  }, [])

  const toggleArrayItem = useCallback((
    key: 'tags' | 'flavorTags' | 'textureTags' | 'atmosphereTags',
    item: string,
  ) => {
    setDraft(prev => {
      const arr = prev[key]
      return {
        ...prev,
        [key]: arr.includes(item)
          ? arr.filter(t => t !== item)
          : [...arr, item],
      }
    })
  }, [])

  const runAiRecognition = useCallback(async (photos: File[]) => {
    if (photos.length === 0) return
    setIsRecognizing(true)
    try {
      const base64 = await fileToBase64(photos[0])
      const result = await recognizeFood(base64)
      setAiResult(result)
      if (result.available && result.menuName) {
        setDraft(prev => ({
          ...prev,
          menuName: result.menuName ?? prev.menuName,
          category: result.category ?? prev.category,
          recordType: result.recordType ?? prev.recordType,
          flavorTags: result.flavorTags ?? prev.flavorTags,
          textureTags: result.textureTags ?? prev.textureTags,
        }))
      }
    } catch {
      setAiResult({ available: false })
    } finally {
      setIsRecognizing(false)
    }
  }, [])

  const goNext = useCallback(() => {
    setStep(prev => {
      switch (prev) {
        case 'photos': return 'type'
        case 'type': return draft.recordType === 'restaurant' ? 'restaurant' : 'details'
        case 'restaurant': return 'details'
        case 'details': return 'tags'
        case 'tags': return 'saving'
        default: return prev
      }
    })
  }, [draft.recordType])

  const goBack = useCallback(() => {
    setStep(prev => {
      switch (prev) {
        case 'type': return 'photos'
        case 'restaurant': return 'type'
        case 'details': return draft.recordType === 'restaurant' ? 'restaurant' : 'type'
        case 'tags': return 'details'
        default: return prev
      }
    })
  }, [draft.recordType])

  const buildRatings = useCallback((): RecordRatings => {
    const r = draft.ratings
    if (draft.recordType === 'wine') {
      return {
        aroma: r.aroma ?? 0,
        body: r.body ?? 0,
        acidity: r.acidity ?? 0,
        finish: r.finish ?? 0,
        balance: r.balance ?? 0,
        value: r.value ?? 0,
      }
    }
    if (draft.recordType === 'homemade') {
      return {
        taste: r.taste ?? 0,
        difficulty: r.difficulty ?? 0,
        timeSpent: r.timeSpent ?? 0,
        reproducibility: r.reproducibility ?? 0,
      }
    }
    return {
      taste: r.taste ?? 0,
      value: r.value ?? 0,
      service: r.service ?? 0,
      atmosphere: r.atmosphere ?? 0,
      cleanliness: r.cleanliness ?? 0,
      portion: r.portion ?? 0,
    }
  }, [draft.ratings, draft.recordType])

  const save = useCallback(async () => {
    if (!userId) return
    setIsSaving(true)
    setError(null)

    try {
      // Upload photos
      const photoUrls: string[] = []
      for (const file of draft.photos) {
        const result = await uploadRecordPhoto(file, userId)
        photoUrls.push(result.url)
      }

      const ratings = buildRatings()
      const ratingValues = Object.values(ratings).filter(v => v > 0)
      const ratingOverall = ratingValues.length > 0
        ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
        : 0

      const repo = getRecordRepository()
      await repo.create({
        userId,
        restaurantId: null,
        recordType: draft.recordType,
        menuName: draft.menuName,
        category: draft.category,
        subCategory: draft.subCategory || null,
        pricePerPerson: draft.pricePerPerson ? Number(draft.pricePerPerson) : null,
        ratings,
        ratingOverall,
        comment: draft.comment || null,
        tags: draft.tags,
        flavorTags: draft.flavorTags,
        textureTags: draft.textureTags,
        atmosphereTags: draft.atmosphereTags,
        visibility: draft.visibility,
        aiRecognized: aiResult?.available ?? false,
        completenessScore: 0,
        locationAtRecord: null,
      })

      // Post-process: Taste DNA, Experience Atlas, User Stats (fire-and-forget)
      fetch('/api/records/post-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }).catch(() => { /* non-blocking */ })

      setSavedResult({
        menuName: draft.menuName,
        category: draft.category,
        ratingOverall,
      })
      setStep('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save record')
      setStep('tags')
    } finally {
      setIsSaving(false)
    }
  }, [userId, draft, aiResult, buildRatings])

  const reset = useCallback(() => {
    setStep('photos')
    setDraft({ ...INITIAL_DRAFT })
    setAiResult(null)
    setSavedResult(null)
    setError(null)
  }, [])

  return {
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
  }
}
