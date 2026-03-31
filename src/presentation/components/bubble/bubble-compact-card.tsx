'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { UtensilsCrossed, Wine } from 'lucide-react'
import { BubbleQuadrant } from '@/presentation/components/bubble/bubble-quadrant'
import type { MemberDot } from '@/presentation/components/bubble/bubble-quadrant'

export interface BubbleCompactCardProps {
  targetId: string
  targetType: 'restaurant' | 'wine'
  name: string
  meta: string
  photoUrl: string | null
  avgSatisfaction: number
  memberCount: number
  dots: MemberDot[]
}

/**
 * 버블 상세용 컴팩트 카드.
 * 좌: 사진(72px) / 우: 이름·메타 / 사분면(멀티dot) + 평균점수(멤버수)
 */
export function BubbleCompactCard({
  targetId,
  targetType,
  name,
  meta,
  photoUrl,
  avgSatisfaction,
  memberCount,
  dots,
}: BubbleCompactCardProps) {
  const router = useRouter()
  const isFood = targetType === 'restaurant'
  const accentColor = isFood ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <button
      type="button"
      onClick={() => router.push(`/${isFood ? 'restaurants' : 'wines'}/${targetId}`)}
      className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-transform active:scale-[0.985]"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      {/* 사진 72×72 */}
      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg">
        {photoUrl ? (
          <Image src={photoUrl} alt="" fill className="object-cover" sizes="72px" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: isFood ? 'var(--bg-elevated)' : '#2a2030' }}
          >
            {isFood
              ? <UtensilsCrossed size={24} style={{ color: 'var(--text-hint)' }} />
              : <Wine size={24} color="rgba(255,255,255,0.4)" />
            }
          </div>
        )}
      </div>

      {/* 정보 영역 */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[14px] font-bold" style={{ color: 'var(--text)' }}>{name}</p>
        <p className="line-clamp-2 text-[11px] leading-tight" style={{ color: 'var(--text-sub)' }}>{meta}</p>
      </div>

      {/* 사분면 + 점수 */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        {dots.length > 0 && <BubbleQuadrant dots={dots} size={48} />}
        <div className="flex items-baseline gap-0.5">
          <span
            className="text-[20px] font-extrabold leading-none"
            style={{ color: accentColor }}
          >
            {avgSatisfaction}
          </span>
          <span className="text-[10px] font-semibold" style={{ color: 'var(--text-hint)' }}>
            ({memberCount})
          </span>
        </div>
      </div>
    </button>
  )
}
