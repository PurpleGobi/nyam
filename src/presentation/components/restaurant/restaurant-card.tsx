'use client';

import Image from 'next/image';
import { Heart, MapPin, Star, UtensilsCrossed } from 'lucide-react';
import type { RestaurantWithSummary } from '@/domain/entities/restaurant';
import { cn } from '@/shared/utils/cn';
import { CategoryTag } from './category-tag';
import { VerificationBadge } from './verification-badge';

export interface RestaurantCardProps {
  restaurant: RestaurantWithSummary;
  onVerifyClick?: (restaurantId: string) => void;
  onFavoriteClick?: (restaurantId: string) => void;
  isFavorite?: boolean;
}

/**
 * Compact restaurant card — horizontal layout for mobile.
 */
export function RestaurantCard({
  restaurant,
  onFavoriteClick,
  isFavorite = false,
}: RestaurantCardProps) {
  return (
    <div
      className={cn(
        'group relative flex gap-3 overflow-hidden rounded-2xl',
        'bg-white p-4',
        'shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
        'transition-all duration-200',
        'hover:shadow-md active:scale-[0.99]',
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-[96px] w-[96px] shrink-0 overflow-hidden rounded-xl">
        {restaurant.imageUrl ? (
          <Image
            src={restaurant.imageUrl}
            alt={restaurant.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
            <UtensilsCrossed size={28} className="text-orange-300" strokeWidth={1.5} />
          </div>
        )}
        {/* Category overlay */}
        <div className="absolute bottom-1 left-1">
          <CategoryTag category={restaurant.cuisineCategory} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        {/* Top: name + badge */}
        <div className="flex items-start justify-between gap-1.5">
          <h3 className="truncate text-[17px] font-bold text-neutral-800">
            {restaurant.name}
          </h3>
          {restaurant.verificationLevel !== 'unverified' && (
            <VerificationBadge
              level={restaurant.verificationLevel}
              count={restaurant.verificationCount}
              size="sm"
            />
          )}
        </div>

        {/* Location + cuisine */}
        <div className="flex items-center gap-1 text-xs text-neutral-500">
          <MapPin size={12} strokeWidth={1.5} />
          <span className="truncate">
            {restaurant.shortAddress ?? restaurant.address}
          </span>
          <span className="mx-0.5 text-neutral-300">|</span>
          <span className="shrink-0">{restaurant.cuisine}</span>
        </div>

        {/* Ratings + price */}
        <div className="flex items-center gap-2">
          {restaurant.ratings.length > 0 ? (
            restaurant.ratings.slice(0, 2).map((r) =>
              r.rating !== null ? (
                <span key={r.id} className="flex items-center gap-0.5 text-xs">
                  <Star size={11} fill="#f97316" stroke="#f97316" />
                  <span className="font-semibold text-neutral-700">{Number(r.rating).toFixed(1)}</span>
                  <span className="text-neutral-400">{r.source}</span>
                </span>
              ) : null,
            )
          ) : (
            <span className="text-xs text-neutral-400">평점 없음</span>
          )}
          {restaurant.priceRange && (
            <span className="text-xs font-medium text-neutral-400">{restaurant.priceRange}</span>
          )}
        </div>
      </div>

      {/* Favorite button */}
      {onFavoriteClick && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavoriteClick(restaurant.id);
          }}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm"
          aria-label={isFavorite ? '찜 해제' : '찜하기'}
        >
          <Heart
            size={15}
            fill={isFavorite ? '#f97316' : 'none'}
            stroke={isFavorite ? '#f97316' : '#9ca3af'}
            strokeWidth={1.5}
          />
        </button>
      )}
    </div>
  );
}
