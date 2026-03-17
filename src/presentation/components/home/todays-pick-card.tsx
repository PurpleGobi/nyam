import Image from "next/image"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { ROUTES } from "@/shared/constants/routes"
import type { RecordWithPhotos } from "@/domain/entities/record"
import type { PickReason } from "@/application/hooks/use-todays-pick"

interface TodaysPickCardProps {
  pick: RecordWithPhotos | null
  reason: PickReason | null
  onRefresh: () => void
}

export function TodaysPickCard({ pick, reason, onRefresh }: TodaysPickCardProps) {
  if (!pick) {
    return (
      <div className="rounded-2xl bg-primary-50 p-6 text-center">
        <p className="text-lg font-semibold text-neutral-700">오늘의 Pick</p>
        <p className="mt-1 text-sm text-neutral-500">
          기록을 남기면 추천이 시작돼요
        </p>
        <Link
          href={ROUTES.RECORD}
          className="mt-3 inline-block rounded-xl bg-primary-500 px-5 py-2 text-sm font-semibold text-white"
        >
          첫 기록 남기기
        </Link>
      </div>
    )
  }

  const firstPhoto = pick.photos[0]
  const displayName = pick.restaurant?.name ?? pick.menuName ?? "기록"

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-[var(--shadow-md)]">
      {firstPhoto ? (
        <button type="button" onClick={onRefresh} className="relative block h-40 w-full text-left">
          <Image
            src={firstPhoto.photoUrl}
            alt={displayName}
            fill
            className="object-cover brightness-[0.85]"
          />
          {reason && (
            <span className="absolute left-3 top-3 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-md">
              {reason.text}
            </span>
          )}
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <h3 className="text-lg font-semibold text-white">{displayName}</h3>
            {pick.ratingOverall != null && (
              <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                {Math.round(pick.ratingOverall)}점
              </span>
            )}
          </div>
        </button>
      ) : (
        <button type="button" onClick={onRefresh} className="flex h-40 w-full items-center justify-center bg-primary-50 text-left">
          {reason && (
            <span className="absolute left-3 top-3 rounded-full bg-neutral-200/60 px-2.5 py-1 text-[10px] font-medium text-neutral-600 backdrop-blur-md">
              {reason.text}
            </span>
          )}
          <p className="text-sm text-neutral-500">{displayName}</p>
        </button>
      )}

      <Link
        href={ROUTES.recordDetail(pick.id)}
        className="flex items-center justify-between bg-white px-4 py-2.5"
      >
        <span className="text-xs font-medium text-neutral-500">더보기</span>
        <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
      </Link>
    </div>
  )
}
