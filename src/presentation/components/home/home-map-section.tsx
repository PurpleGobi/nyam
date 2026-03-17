"use client"

import { MapPin } from "lucide-react"

interface MapRecord {
  id: string
  locationLat: number | null
  locationLng: number | null
  title: string
  thumbnailUrl: string | null
}

interface HomeMapSectionProps {
  records: MapRecord[]
  onRecordClick: (id: string) => void
}

export function HomeMapSection({ records, onRecordClick }: HomeMapSectionProps) {
  const recordsWithLocation = records.filter(
    (r) => r.locationLat != null && r.locationLng != null,
  )

  return (
    <div className="rounded-2xl bg-white shadow-[var(--shadow-sm)] overflow-hidden">
      <div className="flex h-48 flex-col items-center justify-center gap-3 bg-neutral-50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
          <MapPin className="h-6 w-6 text-primary-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-neutral-700">
            지도에서 내 기록 보기
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">
            {recordsWithLocation.length > 0
              ? `${recordsWithLocation.length}개의 위치 기록`
              : "위치가 포함된 기록이 없어요"}
          </p>
        </div>
      </div>

      {recordsWithLocation.length > 0 && (
        <div className="border-t border-neutral-100 p-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {recordsWithLocation.slice(0, 5).map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => onRecordClick(record.id)}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-100 active:scale-[0.98]"
              >
                <MapPin className="h-3 w-3 text-primary-500" />
                <span className="max-w-[100px] truncate">{record.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
