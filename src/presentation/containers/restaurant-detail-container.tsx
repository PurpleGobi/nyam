'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Phone, Clock, UtensilsCrossed, Star, FileText } from 'lucide-react'
import { useRestaurantDetail } from '@/application/hooks/use-restaurant-detail'
import Link from 'next/link'

export function RestaurantDetailContainer() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { restaurant, records, isLoading } = useRestaurantDetail(params.id)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6">
        <div className="h-6 w-24 animate-pulse rounded bg-[var(--color-neutral-100)]" />
        <div className="h-40 animate-pulse rounded-2xl bg-[var(--color-neutral-100)]" />
        <div className="h-32 animate-pulse rounded-2xl bg-[var(--color-neutral-100)]" />
        <div className="h-48 animate-pulse rounded-2xl bg-[var(--color-neutral-100)]" />
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20">
        <p className="text-sm text-[var(--color-neutral-500)]">식당을 찾을 수 없습니다</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 text-sm font-medium text-[#FF6038]"
        >
          돌아가기
        </button>
      </div>
    )
  }

  const hasHours = Object.keys(restaurant.hours).length > 0
  const hasMenuItems = restaurant.menuItems.length > 0

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-24">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.back()}
        className="flex w-fit items-center gap-1 text-sm text-[var(--color-neutral-500)] transition-colors hover:text-[var(--color-neutral-700)]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>뒤로</span>
      </button>

      {/* Restaurant Info */}
      <section className="flex flex-col gap-3 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--color-neutral-800)]">{restaurant.name}</h1>
          <span className="rounded-full border border-[var(--color-neutral-200)] px-2.5 py-1 text-xs text-[var(--color-neutral-500)]">
            {restaurant.category}
          </span>
        </div>

        {restaurant.region && (
          <p className="text-sm text-[var(--color-neutral-400)]">{restaurant.region}</p>
        )}

        <div className="flex items-center gap-1.5 text-sm text-[var(--color-neutral-500)]">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>{restaurant.address}</span>
        </div>

        {restaurant.phone && (
          <div className="flex items-center gap-1.5 text-sm text-[var(--color-neutral-500)]">
            <Phone className="h-4 w-4 shrink-0" />
            <span>{restaurant.phone}</span>
          </div>
        )}
      </section>

      {/* Hours */}
      {hasHours && (
        <section className="flex flex-col gap-3 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-[var(--color-neutral-500)]" />
            <h2 className="text-base font-semibold text-[var(--color-neutral-700)]">영업시간</h2>
          </div>
          <div className="flex flex-col gap-1.5">
            {Object.entries(restaurant.hours).map(([day, time]) => (
              <div key={day} className="flex justify-between text-sm">
                <span className="text-[var(--color-neutral-500)]">{day}</span>
                <span className="text-[var(--color-neutral-700)]">{time}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Menu Items */}
      {hasMenuItems && (
        <section className="flex flex-col gap-3 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5">
          <div className="flex items-center gap-1.5">
            <UtensilsCrossed className="h-4 w-4 text-[var(--color-neutral-500)]" />
            <h2 className="text-base font-semibold text-[var(--color-neutral-700)]">메뉴</h2>
          </div>
          <div className="flex flex-col gap-2">
            {restaurant.menuItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-neutral-700)]">{item.name}</span>
                {item.price !== null && (
                  <span className="text-[var(--color-neutral-500)]">
                    {item.price.toLocaleString()}원
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Community Records */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-[var(--color-neutral-500)]" />
          <h2 className="text-base font-semibold text-[var(--color-neutral-700)]">
            커뮤니티 기록 ({records.length})
          </h2>
        </div>

        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-neutral-200)] bg-white py-12">
            <p className="text-sm text-[var(--color-neutral-400)]">
              아직 이 식당에 대한 기록이 없습니다
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {records.map((record) => (
              <Link
                key={record.id}
                href={`/records/${record.id}`}
                className="flex flex-col gap-2 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-4 transition-colors hover:border-[var(--color-neutral-300)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-neutral-700)]">
                    {record.menuName}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-[#FF6038]" />
                    <span className="text-sm font-medium text-[#FF6038]">
                      {record.ratingOverall}
                    </span>
                  </div>
                </div>
                {record.comment && (
                  <p className="line-clamp-2 text-sm text-[var(--color-neutral-500)]">
                    {record.comment}
                  </p>
                )}
                <span className="text-xs text-[var(--color-neutral-400)]">
                  {new Date(record.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
