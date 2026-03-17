import Image from "next/image"
import Link from "next/link"
import { ROUTES } from "@/shared/constants/routes"
import type { RecordWithPhotos } from "@/domain/entities/record"

interface TodaysPickCardProps {
  record: RecordWithPhotos | null
}

export function TodaysPickCard({ record }: TodaysPickCardProps) {
  if (!record) {
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

  const firstPhoto = record.photos[0]

  return (
    <Link href={ROUTES.recordDetail(record.id)} className="block">
      <div className="relative overflow-hidden rounded-2xl shadow-[var(--shadow-md)]">
        {firstPhoto ? (
          <div className="relative h-40">
            <Image
              src={firstPhoto.photoUrl}
              alt={record.menuName ?? "Today's Pick"}
              fill
              className="object-cover brightness-[0.85]"
            />
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <p className="text-[10px] font-medium text-white/80 uppercase tracking-wider">
                Today&apos;s Pick
              </p>
              <p className="text-lg font-semibold text-white">
                {record.menuName ?? record.restaurant?.name ?? "기록"}
              </p>
              {record.ratingOverall != null && (
                <p className="text-sm font-bold text-white">
                  {Math.round(record.ratingOverall)}점
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="h-40 bg-primary-50 flex items-center justify-center">
            <p className="text-sm text-neutral-500">
              {record.menuName ?? record.restaurant?.name ?? "기록"}
            </p>
          </div>
        )}
      </div>
    </Link>
  )
}
