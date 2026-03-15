'use client';

import Image from 'next/image';
import { Heart, MapPin, Sparkles, Star } from 'lucide-react';
import type { RestaurantWithSummary } from '@/domain/entities/restaurant';
import { cn } from '@/shared/utils/cn';
import { CategoryTag } from './category-tag';
import { VerificationBadge } from './verification-badge';

export interface RestaurantCardProps {
  /** Restaurant with verification summary data */
  restaurant: RestaurantWithSummary;
  /** Callback when "AI 검증하기" button is clicked */
  onVerifyClick?: (restaurantId: string) => void;
  /** Callback when favorite button is clicked */
  onFavoriteClick?: (restaurantId: string) => void;
  /** Whether this restaurant is favorited */
  isFavorite?: boolean;
}

/**
 * Formats time difference for "last verified" display.
 */
function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(months / 12)}년 전`;
}

/**
 * Inline mini trust meter for card display (compact horizontal bars).
 */
function MiniTrustMeter({ taste, value, service, ambiance }: {
  taste: number | null;
  value: number | null;
  service: number | null;
  ambiance: number | null;
}) {
  const bars = [
    { label: '맛', score: taste ?? 0 },
    { label: '가성비', score: value ?? 0 },
    { label: '서비스', score: service ?? 0 },
    { label: '분위기', score: ambiance ?? 0 },
  ];

  return (
    <div className="flex gap-2">
      {bars.map((bar) => (
        <div key={bar.label} className="flex flex-1 flex-col gap-0.5">
          <span className="text-center text-[10px] text-[var(--color-neutral-500)]">
            {bar.label}
          </span>
          <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--color-neutral-200)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary-500)]"
              style={{ width: `${bar.score}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Main restaurant card component.
 * Displays photo, name, verification badge, trust meter, and CTA button.
 */
export function RestaurantCard({
  restaurant,
  onVerifyClick,
  onFavoriteClick,
  isFavorite = false,
}: RestaurantCardProps) {
  const lastVerifiedAt = 'lastVerifiedAt' in restaurant
    ? (restaurant as RestaurantWithSummary & { lastVerifiedAt?: string }).lastVerifiedAt ?? null
    : null;

  return (
    <div
      className={cn(
        'group relative w-full min-w-[280px] max-w-[400px] overflow-hidden rounded-[var(--radius-lg)]',
        'bg-[var(--color-neutral-0)]',
        'shadow-[var(--shadow-sm)]',
        'transition-[transform,box-shadow] duration-200 ease-[var(--ease-default)]',
        'hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]',
        'active:scale-[0.98] active:shadow-[var(--shadow-xs)]',
      )}
    >
      {/* Photo */}
      <div className="relative h-[180px] w-full overflow-hidden">
        {restaurant.imageUrl ? (
          <Image
            src={restaurant.imageUrl}
            alt={restaurant.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 400px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--color-neutral-100)]">
            <span className="text-sm text-[var(--color-neutral-400)]">No Image</span>
          </div>
        )}

        {/* Category tag overlay */}
        <div className="absolute bottom-2 left-2">
          <CategoryTag category={restaurant.cuisineCategory} size="sm" />
        </div>

        {/* Favorite button */}
        {onFavoriteClick && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteClick(restaurant.id);
            }}
            className={cn(
              'absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full',
              'bg-white/80 backdrop-blur-sm transition-colors duration-150',
            )}
            aria-label={isFavorite ? '찜 해제' : '찜하기'}
          >
            <Heart
              size={18}
              fill={isFavorite ? 'var(--color-primary-500)' : 'none'}
              stroke={isFavorite ? 'var(--color-primary-500)' : 'var(--color-neutral-600)'}
              strokeWidth={1.5}
            />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-4">
        {/* Name + Verification Badge */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-[20px] font-semibold leading-[1.35] tracking-[-0.005em] text-[var(--color-neutral-800)]">
            {restaurant.name}
          </h3>
          <VerificationBadge
            level={restaurant.verificationLevel}
            count={restaurant.verificationCount}
            size="sm"
          />
        </div>

        {/* Location + Cuisine */}
        <div className="flex items-center gap-1 text-sm text-[var(--color-neutral-500)]">
          <MapPin size={14} strokeWidth={1.5} />
          <span className="truncate">
            {restaurant.shortAddress ?? restaurant.address}
          </span>
          <span className="mx-1">·</span>
          <span className="shrink-0">{restaurant.cuisine}</span>
        </div>

        {/* Ratings from external sources */}
        {restaurant.ratings.length > 0 && (
          <div className="flex items-center gap-3 text-sm">
            {restaurant.ratings.map((r) => (
              r.rating !== null && (
                <span key={r.id} className="flex items-center gap-0.5 text-[var(--color-neutral-600)]">
                  <Star size={13} fill="var(--color-primary-500)" stroke="var(--color-primary-500)" strokeWidth={1.5} />
                  <span className="font-semibold">{r.rating.toFixed(1)}</span>
                  <span className="text-xs text-[var(--color-neutral-400)]">{r.source}</span>
                </span>
              )
            ))}
          </div>
        )}

        {/* Mini Trust Meter */}
        {restaurant.verificationCount > 0 && (
          <MiniTrustMeter
            taste={restaurant.avgTaste}
            value={restaurant.avgValue}
            service={restaurant.avgService}
            ambiance={restaurant.avgAmbiance}
          />
        )}

        {/* Verification meta */}
        <div className="flex items-center gap-1 text-xs text-[var(--color-neutral-500)]">
          <span className="font-semibold">{restaurant.verificationCount}명</span>
          <span>검증</span>
          {lastVerifiedAt && (
            <>
              <span className="mx-0.5">·</span>
              <span>최근 {formatTimeAgo(lastVerifiedAt)}</span>
            </>
          )}
        </div>

        {/* CTA Button */}
        {onVerifyClick && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVerifyClick(restaurant.id);
            }}
            className={cn(
              'mt-1 flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)]',
              'bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-600)]',
              'px-6 py-3 text-base font-semibold text-white',
              'shadow-[0_4px_14px_rgba(255,96,56,0.35)]',
              'transition-all duration-200 ease-[var(--ease-default)]',
              'hover:brightness-105 hover:shadow-[0_6px_20px_rgba(255,96,56,0.4)]',
              'active:scale-[0.98]',
            )}
          >
            <Sparkles size={20} strokeWidth={1.5} />
            AI 검증하기
          </button>
        )}
      </div>
    </div>
  );
}
