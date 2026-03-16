'use client'

import Image from 'next/image'
import { Star, MapPin, Heart } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import type { FoodRecord, RecordPhoto } from '@/domain/entities/record'
import { FOOD_CATEGORIES } from '@/shared/constants/categories'
import { RatingBars } from './rating-bars'

interface RecordCardProps {
  record: Partial<FoodRecord> & { id: string; menuName: string }
  photo?: RecordPhoto | null
  restaurantName?: string
  region?: string
  authorName?: string
  authorLevel?: number
  likeCount?: number
  onTap?: () => void
  className?: string
}

export function RecordCard({
  record,
  photo,
  restaurantName,
  region,
  authorName,
  authorLevel,
  likeCount,
  onTap,
  className,
}: RecordCardProps) {
  const categoryInfo = FOOD_CATEGORIES.find(
    (c) => c.value === record.category,
  )

  const dateStr = record.createdAt
    ? new Date(record.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : null

  const topRatings = record.ratings
    ? Object.fromEntries(
        Object.entries(record.ratings)
          .filter((entry): entry is [string, number] => entry[1] != null)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3),
      )
    : null

  return (
    <article
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
      onClick={onTap}
      onKeyDown={(e) => {
        if (onTap && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onTap()
        }
      }}
      className={cn(
        'bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden',
        onTap && 'cursor-pointer active:scale-[0.98] transition-transform duration-150',
        className,
      )}
    >
      {/* Photo area */}
      <div className="relative aspect-[16/10] bg-neutral-100 overflow-hidden">
        {photo?.photoUrl ? (
          <Image
            src={photo.photoUrl}
            alt={record.menuName}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300 text-3xl">
            🍽️
          </div>
        )}

        {/* Category overlay */}
        {categoryInfo && (
          <span className="absolute top-2.5 left-2.5 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            {categoryInfo.emoji} {categoryInfo.label}
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="p-3.5 flex flex-col gap-2">
        {/* Menu + restaurant + rating */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-base text-neutral-800 truncate">
            {record.menuName}
            {restaurantName && (
              <span className="text-neutral-400 font-normal"> · {restaurantName}</span>
            )}
          </p>
          {record.ratingOverall != null && (
            <span className="flex items-center gap-0.5 shrink-0 text-sm">
              <Star className="size-3.5 fill-[#E9B949] text-[#E9B949]" />
              <span className="text-neutral-700 font-medium">
                {record.ratingOverall.toFixed(1)}
              </span>
            </span>
          )}
        </div>

        {/* Region + date */}
        {(region || dateStr) && (
          <div className="flex items-center gap-1 text-sm text-neutral-500">
            {region && (
              <>
                <MapPin className="size-3.5" />
                <span>{region}</span>
              </>
            )}
            {region && dateStr && <span>·</span>}
            {dateStr && <span>{dateStr}</span>}
          </div>
        )}

        {/* Rating bars (top 3) */}
        {topRatings && Object.keys(topRatings).length > 0 && (
          <RatingBars ratings={topRatings} className="mt-0.5" />
        )}

        {/* Comment */}
        {record.comment && (
          <p className="text-sm text-neutral-600 line-clamp-2">
            &ldquo;{record.comment}&rdquo;
          </p>
        )}

        {/* Author row */}
        {authorName && (
          <div className="flex items-center justify-between mt-0.5">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-neutral-200 shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-neutral-700 font-medium">
                  {authorName}
                </span>
                {authorLevel != null && (
                  <span className="text-xs text-[#FF6038] font-medium bg-[#FF6038]/10 px-1.5 py-0.5 rounded-full">
                    Lv.{authorLevel}
                  </span>
                )}
              </div>
            </div>
            {likeCount != null && (
              <span className="flex items-center gap-1 text-sm text-neutral-400">
                <Heart className="size-3.5" />
                {likeCount}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
