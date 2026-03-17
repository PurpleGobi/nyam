"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRecordDetail } from "@/application/hooks/use-record-detail"
import { useEditRecord } from "@/application/hooks/use-edit-record"
import { RatingScales } from "@/presentation/components/capture/rating-scales"
import { ROUTES } from "@/shared/constants/routes"

interface RecordEditContainerProps {
  recordId: string
}

export function RecordEditContainer({ recordId }: RecordEditContainerProps) {
  const router = useRouter()
  const { record, isLoading } = useRecordDetail(recordId)
  const { updateRecord, isUpdating } = useEditRecord()
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [comment, setComment] = useState("")
  const [initialized, setInitialized] = useState(false)

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
    setInitialized(true)
  }

  const handleRatingChange = useCallback((key: string, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!record) return
    await updateRecord(recordId, {
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
      comment: comment || undefined,
    })
    router.push(ROUTES.recordDetail(recordId))
  }, [record, updateRecord, recordId, ratings, comment, router])

  if (isLoading || !record) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-4">
      <div className="flex items-center gap-3">
        <Link href={ROUTES.recordDetail(recordId)} className="text-neutral-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-neutral-800">기록 수정</h1>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-neutral-700">평가</h3>
        <RatingScales
          recordType={record.recordType}
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
        disabled={isUpdating}
        onClick={handleSave}
        className="h-12 rounded-xl bg-primary-500 text-sm font-semibold text-white hover:bg-primary-600 active:scale-[0.98] disabled:opacity-50 transition-all"
      >
        {isUpdating ? "저장 중..." : "수정하기"}
      </button>
    </div>
  )
}
