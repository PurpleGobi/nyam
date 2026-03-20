"use client"

import Link from "next/link"
import { ArrowLeft, MapPin, Phone, Clock, Store } from "lucide-react"
import { useRestaurantDetail } from "@/application/hooks/use-restaurant-detail"
import { RecordCard } from "@/presentation/components/record/record-card"
import { EmptyState } from "@/presentation/components/ui/empty-state"
import { ROUTES } from "@/shared/constants/routes"

interface RestaurantDetailContainerProps {
  restaurantId: string
}

export function RestaurantDetailContainer({ restaurantId }: RestaurantDetailContainerProps) {
  const { restaurant, stats, records, isLoading } = useRestaurantDetail(restaurantId)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
        <div className="h-20 animate-pulse rounded-2xl bg-neutral-100" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="px-4 pt-6 pb-4">
        <EmptyState
          icon={Store}
          title="식당을 찾을 수 없어요"
          description="삭제되었거나 존재하지 않는 식당이에요"
          actionLabel="홈으로"
          actionHref={ROUTES.HOME}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6">
        <Link href={ROUTES.HOME} className="text-neutral-500 hover:text-neutral-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-neutral-800">{restaurant.name}</h1>
      </div>

      {/* Info card */}
      <div className="mx-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-sm)]">
        {restaurant.genre && (
          <span className="inline-block rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-600 mb-2">
            {restaurant.genre}
          </span>
        )}
        <div className="space-y-1.5 text-sm text-neutral-600">
          {restaurant.address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
              <span>{restaurant.address}</span>
            </div>
          )}
          {restaurant.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
              <span>{restaurant.phone}</span>
            </div>
          )}
          {restaurant.hours && (
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
              <span>영업시간 정보 있음</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mx-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-sm)]">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">통계</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-primary-500">
                {stats.avgOverall != null ? Math.round(stats.avgOverall) : "-"}
              </p>
              <p className="text-[10px] text-neutral-400">평균 점수</p>
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-800">{stats.recordCount}</p>
              <p className="text-[10px] text-neutral-400">기록 수</p>
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-800">{stats.uniqueUsers}</p>
              <p className="text-[10px] text-neutral-400">방문자</p>
            </div>
          </div>
        </div>
      )}

      {/* Records */}
      <div className="px-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">기록</h2>
        {records.length === 0 ? (
          <EmptyState
            icon={Store}
            title="아직 기록이 없어요"
            description="첫 방문 기록을 남겨보세요"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {records.map((record) => (
              <RecordCard key={record.id} record={record} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
