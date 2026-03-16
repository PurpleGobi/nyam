"use client"

import { MapPin } from "lucide-react"

export function HomeContainer() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#FF6038]">냠</h1>
        <div className="flex items-center gap-1 text-sm text-[var(--color-neutral-500)]">
          <MapPin className="h-4 w-4" />
          <span>현재 위치</span>
        </div>
      </div>

      {/* Nearby Favorites */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-[var(--color-neutral-800)]">
          이 근처에서 좋아한 곳
        </h2>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-12">
          <p className="text-center text-sm text-[var(--color-neutral-500)]">
            기록을 시작하면 맞춤 추천이 시작됩니다
          </p>
        </div>
      </section>

      {/* Recent Records */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-[var(--color-neutral-800)]">
          최근 기록
        </h2>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-12">
          <p className="text-center text-sm text-[var(--color-neutral-500)]">
            아직 기록이 없습니다
          </p>
          <p className="mt-1 text-center text-xs text-[var(--color-neutral-400)]">
            + 버튼을 눌러 첫 기록을 남겨보세요
          </p>
        </div>
      </section>
    </div>
  )
}
