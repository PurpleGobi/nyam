"use client"

import { MapPin, Star } from "lucide-react"
import { useAuthContext } from "@/presentation/providers/auth-provider"
import { useRecords } from "@/application/hooks/use-records"
import { useProfile } from "@/application/hooks/use-profile"

export function HomeContainer() {
  const { user: authUser } = useAuthContext()
  const userId = authUser?.id
  const { user: profile } = useProfile(userId)
  const { data: records, isLoading } = useRecords(userId, 10)

  const nickname = profile?.nickname ?? authUser?.user_metadata?.full_name ?? '게스트'

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#FF6038]">냠</h1>
          <p className="mt-0.5 text-sm text-[var(--color-neutral-500)]">
            안녕하세요, {nickname}님
          </p>
        </div>
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
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
            ))}
          </div>
        ) : records && records.data.length > 0 ? (
          <div className="flex flex-col gap-2">
            {records.data.map((record) => (
              <div key={record.id} className="flex items-center justify-between rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--color-neutral-800)]">{record.menuName}</span>
                  <span className="text-xs text-[var(--color-neutral-400)]">
                    {record.category} · {new Date(record.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-[#FF6038]" />
                  <span className="text-sm font-medium text-[var(--color-neutral-700)]">{record.ratingOverall.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-12">
            <p className="text-center text-sm text-[var(--color-neutral-500)]">
              아직 기록이 없습니다
            </p>
            <p className="mt-1 text-center text-xs text-[var(--color-neutral-400)]">
              + 버튼을 눌러 첫 기록을 남겨보세요
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
