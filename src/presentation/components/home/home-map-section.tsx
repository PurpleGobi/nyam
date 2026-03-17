"use client"

import Image from "next/image"
import { MapPin, Navigation } from "lucide-react"
import { KakaoMap } from "./kakao-map"

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

const HAS_KAKAO_KEY = !!process.env.NEXT_PUBLIC_KAKAO_JS_KEY

export function HomeMapSection({ records, onRecordClick }: HomeMapSectionProps) {
  const recordsWithLocation = records.filter(
    (r) => r.locationLat != null && r.locationLng != null,
  )

  if (recordsWithLocation.length === 0) {
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
              위치가 포함된 기록이 없어요
            </p>
          </div>
        </div>
      </div>
    )
  }

  const pins = recordsWithLocation.slice(0, 20).map((r) => ({
    id: r.id,
    lat: r.locationLat!,
    lng: r.locationLng!,
    title: r.title,
    thumbnailUrl: r.thumbnailUrl,
  }))

  return (
    <div className="rounded-2xl bg-white shadow-[var(--shadow-sm)] overflow-hidden">
      {HAS_KAKAO_KEY ? (
        <KakaoMap
          pins={pins}
          onPinClick={onRecordClick}
          className="h-48"
        />
      ) : (
        <PlaceholderMap
          records={recordsWithLocation}
          onRecordClick={onRecordClick}
        />
      )}

      {/* Scrollable record tags */}
      <div className="border-t border-neutral-100 p-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {recordsWithLocation.slice(0, 8).map((record) => (
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
    </div>
  )
}

function PlaceholderMap({
  records,
  onRecordClick,
}: {
  records: MapRecord[]
  onRecordClick: (id: string) => void
}) {
  return (
    <div className="relative h-48 bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
      {records.slice(0, 8).map((record, i) => {
        const offsetX = 12 + ((i * 37 + 13) % 76)
        const offsetY = 12 + ((i * 53 + 7) % 76)
        return (
          <button
            key={record.id}
            type="button"
            onClick={() => onRecordClick(record.id)}
            className="absolute group"
            style={{ left: `${offsetX}%`, top: `${offsetY}%` }}
          >
            <div className="relative flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white shadow-md transition-transform group-hover:scale-110 overflow-hidden">
                {record.thumbnailUrl ? (
                  <Image
                    src={record.thumbnailUrl}
                    alt={record.title}
                    width={32}
                    height={32}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </div>
              <div className="absolute -bottom-1 h-2 w-2 rotate-45 bg-primary-500" />
            </div>
          </button>
        )
      })}

      <div className="absolute inset-0 flex items-end justify-center pb-2">
        <div className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-600 shadow-sm backdrop-blur-sm">
          <Navigation className="h-3 w-3 text-primary-500" />
          {records.length}개의 위치 기록
        </div>
      </div>
    </div>
  )
}
