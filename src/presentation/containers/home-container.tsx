"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { MapPin, Star, Sparkles, ChevronRight } from "lucide-react"
import { useAuthContext } from "@/presentation/providers/auth-provider"
import { useRecords } from "@/application/hooks/use-records"
import { useProfile } from "@/application/hooks/use-profile"
import { useGeolocation } from "@/application/hooks/use-geolocation"
import { useNearbyRecords } from "@/application/hooks/use-nearby-records"

export function HomeContainer() {
  const router = useRouter()
  const { user: authUser } = useAuthContext()
  const userId = authUser?.id
  const { user: profile } = useProfile(userId)
  const { data: records, isLoading } = useRecords(userId, 10)
  const { location, isLoading: geoLoading, error: geoError } = useGeolocation()
  const { data: nearbyRecords, isLoading: nearbyLoading } = useNearbyRecords(location)

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

      {/* AI Recommendation Banner */}
      <Link
        href="/recommend"
        className="flex items-center justify-between rounded-2xl border border-[var(--color-neutral-200)] bg-white px-4 py-4 active:bg-[var(--color-neutral-50)]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF5F2]">
            <Sparkles className="h-4 w-4 text-[#FF6038]" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--color-neutral-800)]">
              AI 맛집 추천
            </span>
            <span className="text-xs text-[var(--color-neutral-500)]">
              당신의 취향에 맞는 맛집을 추천해드려요
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-[var(--color-neutral-400)]" />
      </Link>

      {/* Nearby Favorites */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-[var(--color-neutral-800)]">
          이 근처에서 좋아한 곳
        </h2>
        {geoLoading || nearbyLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
            ))}
          </div>
        ) : geoError || !location ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-12">
            <MapPin className="mb-2 h-5 w-5 text-[var(--color-neutral-400)]" />
            <p className="text-center text-sm text-[var(--color-neutral-500)]">
              위치 권한을 허용하면 근처 맛집을 보여드릴 수 있어요
            </p>
          </div>
        ) : nearbyRecords.length > 0 ? (
          <div className="flex flex-col gap-2">
            {nearbyRecords.map((record) => (
              <Link
                key={record.id}
                href={`/records/${record.id}`}
                className="flex items-center justify-between rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3"
              >
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
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-12">
            <p className="text-center text-sm text-[var(--color-neutral-500)]">
              이 근처에 기록된 맛집이 아직 없습니다
            </p>
          </div>
        )}
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
              <div key={record.id} onClick={() => router.push(`/records/${record.id}`)} className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3 active:bg-[var(--color-neutral-50)]">
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
