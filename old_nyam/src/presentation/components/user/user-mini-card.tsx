'use client'

import Image from 'next/image'
import { cn } from '@/shared/utils/cn'

const AXIS_EMOJI: Record<string, string> = {
  region: '\uD83D\uDCCD',
  genre: '\uD83C\uDF7D\uFE0F',
  scene: '\uD83C\uDFAD',
}

function getLevelColor(level: number): string {
  if (level <= 2) return 'bg-neutral-100 text-neutral-600'
  if (level <= 4) return 'bg-blue-50 text-blue-600'
  if (level <= 6) return 'bg-green-50 text-green-600'
  if (level <= 8) return 'bg-purple-50 text-purple-600'
  return 'bg-amber-50 text-amber-600'
}

interface DomainPill {
  axis: 'region' | 'genre' | 'scene'
  name: string
  level: number
}

interface UserMiniCardProps {
  name: string
  level: number
  avatarUrl?: string | null
  domains?: DomainPill[]
  onTap?: () => void
  className?: string
}

export function UserMiniCard({
  name,
  level,
  avatarUrl,
  domains,
  onTap,
  className,
}: UserMiniCardProps) {
  const displayDomains = domains?.slice(0, 3)

  return (
    <div
      className={cn(
        'flex items-center gap-3',
        onTap && 'cursor-pointer',
        className,
      )}
      onClick={onTap}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name}
          width={40}
          height={40}
          className="rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-neutral-500">
            {name.charAt(0)}
          </span>
        </div>
      )}

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-[#334E68] truncate">
            {name}
          </span>
          <span className="text-xs text-neutral-500 flex-shrink-0">
            nyam Lv.{level}
          </span>
        </div>

        {displayDomains && displayDomains.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {displayDomains.map((d) => (
              <span
                key={`${d.axis}-${d.name}`}
                className={cn(
                  'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs',
                  getLevelColor(d.level),
                )}
              >
                {AXIS_EMOJI[d.axis]} {d.name} Lv.{d.level}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
