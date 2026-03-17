"use client"

import Link from "next/link"
import { ArrowLeft, Edit } from "lucide-react"
import { useRecordDetail } from "@/application/hooks/use-record-detail"
import { PhotoPicker } from "@/presentation/components/record/photo-picker"
import { RatingBars } from "@/presentation/components/record/rating-bars"
import { CategoryTag } from "@/presentation/components/record/category-tag"
import { ROUTES } from "@/shared/constants/routes"

interface RecordDetailContainerProps {
  recordId: string
}

export function RecordDetailContainer({ recordId }: RecordDetailContainerProps) {
  const { record, tasteProfile, isLoading } = useRecordDetail(recordId)

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
      </div>
    </div>
  )
}
