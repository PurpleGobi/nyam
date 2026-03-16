'use client'

import {
  Flame, MapPin, UtensilsCrossed, Search, TrendingUp,
  Compass, Shield, Zap, Share2,
} from 'lucide-react'
import type { TasteStyleProfile } from '@/domain/entities/taste-style'
import { cn } from '@/shared/utils/cn'

interface TasteStyleCardProps {
  readonly profile: TasteStyleProfile
  readonly nickname?: string | null
  readonly onShare?: () => void
}

const STAT_CONFIG = [
  { key: 'diversity' as const, label: '다양성', icon: UtensilsCrossed, color: 'var(--color-primary-500)' },
  { key: 'exploration' as const, label: '탐험력', icon: Compass, color: 'var(--color-success-500)' },
  { key: 'consistency' as const, label: '충성도', icon: Shield, color: 'var(--color-warning-500)' },
  { key: 'engagement' as const, label: '활동량', icon: Zap, color: 'var(--color-error-500)' },
]

function StatBar({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: typeof Flame
  color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} style={{ color }} className="shrink-0" />
      <span className="w-14 text-xs text-[var(--color-neutral-500)]">{label}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-neutral-100)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-8 text-right text-xs font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  )
}

function XpBar({ currentXp, nextLevelXp }: { currentXp: number; nextLevelXp: number }) {
  const pct = Math.min(100, Math.round((currentXp / nextLevelXp) * 100))
  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-2.5 overflow-hidden rounded-full bg-[var(--color-neutral-100)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--color-primary-400)] to-[var(--color-primary-600)] transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--color-neutral-400)]">
        <span>{currentXp} XP</span>
        <span>{nextLevelXp} XP</span>
      </div>
    </div>
  )
}

function TagChip({ label, icon: Icon }: { label: string; icon: typeof Flame }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-[var(--color-neutral-100)] px-2.5 py-1 text-xs font-medium text-[var(--color-neutral-600)]">
      <Icon size={11} />
      {label}
    </span>
  )
}

export function TasteStyleCard({ profile, nickname, onShare }: TasteStyleCardProps) {
  const { persona, level, stats, topCuisines, topRegions, topSituations } = profile

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-neutral-200)] bg-white">
      {/* Header gradient */}
      <div className="bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-700)] px-5 pb-6 pt-5 text-white">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-2xl">{persona.emoji}</span>
            <h3 className="text-lg font-bold">{persona.title}</h3>
            <p className="text-xs text-white/80">{persona.subtitle}</p>
          </div>
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="rounded-full bg-white/20 p-2 transition-colors hover:bg-white/30"
              aria-label="공유하기"
            >
              <Share2 size={16} />
            </button>
          )}
        </div>

        {/* Level badge */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
            Lv.{level.level}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{level.title}</span>
              {nickname && (
                <span className="text-xs text-white/70">{nickname}</span>
              )}
            </div>
            <XpBar currentXp={level.currentXp} nextLevelXp={level.nextLevelXp} />
          </div>
        </div>
      </div>

      {/* Stats section */}
      <div className="flex flex-col gap-4 px-5 py-4">
        {/* Stat bars */}
        <div className="flex flex-col gap-2.5">
          {STAT_CONFIG.map(({ key, label, icon, color }) => (
            <StatBar
              key={key}
              label={label}
              value={stats[key]}
              icon={icon}
              color={color}
            />
          ))}
        </div>

        {/* Tags */}
        {(topCuisines.length > 0 || topRegions.length > 0 || topSituations.length > 0) && (
          <div className="flex flex-col gap-2">
            {topCuisines.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {topCuisines.slice(0, 3).map(c => (
                  <TagChip key={c} label={c} icon={UtensilsCrossed} />
                ))}
              </div>
            )}
            {topRegions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {topRegions.slice(0, 3).map(r => (
                  <TagChip key={r} label={r} icon={MapPin} />
                ))}
              </div>
            )}
            {topSituations.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {topSituations.map(s => (
                  <TagChip key={s} label={s} icon={TrendingUp} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Total activity */}
        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-neutral-50)] py-2 text-xs text-[var(--color-neutral-500)]">
          <Search size={12} />
          <span>총 {profile.totalInteractions}번의 미식 활동</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton loader for TasteStyleCard while data is loading.
 */
export function TasteStyleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-neutral-200)] bg-white">
      <div className="h-40 animate-pulse bg-[var(--color-neutral-200)]" />
      <div className="flex flex-col gap-3 p-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-3 animate-pulse rounded bg-[var(--color-neutral-100)]" />
        ))}
      </div>
    </div>
  )
}
