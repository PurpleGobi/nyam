'use client'

import Image from 'next/image'
import { RefreshCw } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { TodaysPick } from '@/domain/entities/todays-pick'

export function TodaysPickCard({
  pick,
  totalCount,
  onTap,
  onDetailClick,
}: {
  pick: TodaysPick
  totalCount: number
  onTap: () => void
  onDetailClick: (e: React.MouseEvent) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-md)]">
      <button
        type="button"
        onClick={onTap}
        className="relative block h-40 w-full overflow-hidden"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pick.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <Image
              src={pick.photoUrl || '/placeholder-food.svg'}
              alt={pick.restaurantName}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover brightness-[0.85]"
              unoptimized={pick.photoUrl?.endsWith('.svg') ?? false}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Top-left: reason badge */}
            <span className="absolute left-3 top-3 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
              {pick.reason}
            </span>

            {/* Top-right: refresh icon */}
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-md">
              <RefreshCw className="h-3.5 w-3.5 text-white" />
            </span>

            {/* Bottom content */}
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
              <div className="flex flex-col gap-1">
                <h3
                  className="text-xl font-semibold text-white"
                  style={{ fontFamily: "'Cormorant Garamond', 'Noto Serif KR', serif" }}
                >
                  {pick.restaurantName}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/80">{pick.subtext}</span>
                  <span className="rounded-full bg-[var(--color-neutral-800)]/40 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                    {pick.area}
                  </span>
                </div>
              </div>
              <span className="rounded-lg bg-[var(--color-primary-500)] px-2 py-1 text-sm font-bold text-white">
                {pick.score}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </button>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="text-xs text-[var(--color-neutral-400)]">
          탭하면 다른 추천 · 총 {totalCount}곳
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDetailClick(e)
          }}
          className="rounded-full bg-[var(--color-primary-500)] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[var(--color-primary-600)]"
        >
          자세히 보기
        </button>
      </div>
    </div>
  )
}
