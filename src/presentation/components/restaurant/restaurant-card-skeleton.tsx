'use client';

import { cn } from '@/shared/utils/cn';

/**
 * Shimmer animation block for skeleton loading states.
 */
function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[var(--radius-md)] bg-[var(--color-neutral-100)]',
        className,
      )}
    />
  );
}

/**
 * Skeleton loading state matching the RestaurantCard layout.
 * Uses shimmer animation (left-to-right gradient sweep).
 */
export function RestaurantCardSkeleton() {
  return (
    <div
      className={cn(
        'w-full min-w-[280px] max-w-[400px] overflow-hidden rounded-[var(--radius-lg)]',
        'bg-[var(--color-neutral-0)]',
        'shadow-[var(--shadow-sm)]',
      )}
    >
      {/* Image placeholder */}
      <Shimmer className="h-[180px] w-full rounded-none" />

      {/* Content */}
      <div className="flex flex-col gap-2 p-4">
        {/* Name + badge */}
        <div className="flex items-center justify-between gap-2">
          <Shimmer className="h-6 w-3/5" />
          <Shimmer className="h-5 w-16 rounded-full" />
        </div>

        {/* Location */}
        <Shimmer className="h-4 w-2/3" />

        {/* Mini trust meter */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-1 flex-col gap-0.5">
              <Shimmer className="mx-auto h-3 w-6" />
              <Shimmer className="h-1 w-full rounded-full" />
            </div>
          ))}
        </div>

        {/* Verification meta */}
        <Shimmer className="h-4 w-2/5" />

        {/* CTA button */}
        <Shimmer className="mt-1 h-12 w-full rounded-[var(--radius-lg)]" />
      </div>
    </div>
  );
}
