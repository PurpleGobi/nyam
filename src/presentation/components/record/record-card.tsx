import Image from "next/image"
import Link from "next/link"
import { ROUTES } from "@/shared/constants/routes"
import type { RecordWithPhotos } from "@/domain/entities/record"

interface RecordCardProps {
  record: RecordWithPhotos
}

export function RecordCard({ record }: RecordCardProps) {
  const firstPhoto = record.photos[0]

  return (
    <Link href={ROUTES.recordDetail(record.id)} className="block">
      <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-sm)]">
        {firstPhoto && (
          <div className="relative h-40 w-full">
            <Image
              src={firstPhoto.photoUrl}
              alt={record.menuName ?? "기록 사진"}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <p className="text-sm font-semibold text-neutral-800">
            {record.menuName ?? record.restaurant?.name ?? "기록"}
          </p>
          <p className="text-xs text-neutral-400 mt-0.5">
            {record.genre && <span>{record.genre}</span>}
            {record.genre && " · "}
            {new Date(record.createdAt).toLocaleDateString("ko-KR")}
          </p>
          {record.ratingOverall != null && (
            <p className="text-sm font-bold text-primary-500 mt-1">
              {Math.round(record.ratingOverall)}점
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
