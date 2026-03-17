"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, Edit, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useRecordDetail } from "@/application/hooks/use-record-detail"
import { PhotoPicker } from "@/presentation/components/record/photo-picker"
import { RatingBars } from "@/presentation/components/record/rating-bars"
import { CategoryTag } from "@/presentation/components/record/category-tag"
import { ROUTES } from "@/shared/constants/routes"

interface RecordDetailContainerProps {
  recordId: string
}

export function RecordDetailContainer({ recordId }: RecordDetailContainerProps) {
  const { record, tasteProfile, isLoading, isRetrying, isAnalysisTimedOut, retryAnalysis } = useRecordDetail(recordId)
  const prevPhaseRef = useRef<number | null>(null)

  // Show toast when AI analysis completes (phase 1 → 2)
  useEffect(() => {
    if (!record) return
    const prev = prevPhaseRef.current
    prevPhaseRef.current = record.phaseStatus

    if (prev === 1 && record.phaseStatus >= 2) {
      toast.success("AI 분석이 완료되었어요!", {
        description: "2단계 리뷰를 작성할 수 있어요",
      })
    }
  }, [record])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (!record) {
    return (
      <div className="px-4 pt-6 text-center">
        <p className="text-sm text-neutral-500">기록을 찾을 수 없어요</p>
      </div>
    )
  }

  const ratingItems = record.recordType === "restaurant"
    ? [
        { label: "맛", value: record.ratingTaste },
        { label: "가성비", value: record.ratingValue },
        { label: "서비스", value: record.ratingService },
        { label: "분위기", value: record.ratingAtmosphere },
        { label: "청결", value: record.ratingCleanliness },
        { label: "양", value: record.ratingPortion },
      ]
    : record.recordType === "wine"
    ? [
        { label: "맛", value: record.ratingTaste },
        { label: "가성비", value: record.ratingValue },
      ]
    : [
        { label: "맛 균형", value: record.ratingBalance },
        { label: "맛", value: record.ratingTaste },
        { label: "난이도", value: record.ratingDifficulty },
        { label: "재현성", value: record.ratingReproducibility },
      ]

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href={ROUTES.HOME} className="text-neutral-500 hover:text-neutral-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Link href={ROUTES.recordEdit(record.id)} className="text-neutral-500 hover:text-neutral-700">
          <Edit className="h-5 w-5" />
        </Link>
      </div>

      {record.photos.length > 0 && (
        <div className="px-4">
          <PhotoPicker photos={record.photos} />
        </div>
      )}

      <div className="space-y-4 px-4 pt-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800">
            {record.menuName ?? record.restaurant?.name ?? "기록"}
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {record.restaurant?.address}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            {new Date(record.createdAt).toLocaleDateString("ko-KR", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>

        {record.ratingOverall != null && (
          <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-bold text-primary-500">
                {Math.round(record.ratingOverall)}
              </span>
              <span className="text-xs text-neutral-400">/ 100</span>
            </div>
            <RatingBars items={ratingItems} />
          </div>
        )}

        {(record.flavorTags.length > 0 || record.textureTags.length > 0 || record.atmosphereTags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {record.flavorTags.map((tag) => <CategoryTag key={tag} label={tag} variant="flavor" />)}
            {record.textureTags.map((tag) => <CategoryTag key={tag} label={tag} variant="texture" />)}
            {record.atmosphereTags.map((tag) => <CategoryTag key={tag} label={tag} variant="atmosphere" />)}
            {record.scene && <CategoryTag label={record.scene} variant="scene" />}
          </div>
        )}

        {tasteProfile && (record.recordType === "restaurant" || record.recordType === "cooking") && (
          <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">맛 프로필</h3>
            <RatingBars items={[
              { label: "매운맛", value: tasteProfile.spicy },
              { label: "단맛", value: tasteProfile.sweet },
              { label: "짠맛", value: tasteProfile.salty },
              { label: "신맛", value: tasteProfile.sour },
              { label: "감칠맛", value: tasteProfile.umami },
              { label: "풍미", value: tasteProfile.rich },
            ]} />
          </div>
        )}

        {record.comment && (
          <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
            <p className="text-sm text-neutral-600">{record.comment}</p>
          </div>
        )}

        {record.phaseStatus < 2 && !isAnalysisTimedOut && (
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <span className="text-sm text-amber-700">
              {isRetrying ? "AI 분석 재시도 중..." : "AI 분석 진행 중..."}
            </span>
          </div>
        )}

        {record.phaseStatus < 2 && isAnalysisTimedOut && !isRetrying && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700 mb-2">AI 분석이 시간 초과되었어요</p>
            <button
              onClick={retryAnalysis}
              className="flex items-center gap-1.5 rounded-xl bg-red-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-600 active:scale-[0.98] transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              다시 분석하기
            </button>
          </div>
        )}

        {record.phaseStatus >= 2 && !record.phase2CompletedAt && (
          <Link
            href={ROUTES.recordEdit(record.id)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-4 py-3.5 text-sm font-semibold text-white hover:bg-primary-600 active:scale-[0.98] transition-all"
          >
            <Sparkles className="h-4 w-4" />
            2단계 리뷰 작성하기
          </Link>
        )}
      </div>
    </div>
  )
}
