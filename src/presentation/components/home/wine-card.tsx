'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Wine } from 'lucide-react'
import { SourceTag } from '@/presentation/components/home/source-tag'
import { MiniQuadrant } from '@/presentation/components/home/mini-quadrant'

export interface WineBubbleMember {
  nickname: string
  avatarColor: string
  satisfaction: number
}

export interface WineCardProps {
  id: string
  wine: {
    id: string
    name: string
    wineType: string
    vintage: number | null
    country: string | null
    variety: string | null
    region: string | null
    photoUrl: string | null
  }
  myRecord: {
    satisfaction: number | null
    axisX: number | null
    axisY: number | null
    visitDate: string | null
    purchasePrice: number | null
  } | null
  bubbleMembers?: WineBubbleMember[]
  visitCount?: number
  latestDate?: string | null
  /** 버블 추가 선택 모드 */
  isSelecting?: boolean
  /** 선택 여부 */
  isSelected?: boolean
  /** 선택 토글 */
  onSelectToggle?: () => void
}

export function WineCard({ wine, myRecord, bubbleMembers, visitCount, latestDate, isSelecting, isSelected, onSelectToggle }: WineCardProps) {
  const router = useRouter()
  const hasQuadrant =
    myRecord?.axisX != null && myRecord?.axisY != null && myRecord?.satisfaction != null

  const sortedMembers = [...(bubbleMembers ?? [])].sort((a, b) => b.satisfaction - a.satisfaction)
  const visibleMembers = sortedMembers.slice(0, 2)
  const extraCount = sortedMembers.length - 2

  const meta = [wine.vintage, wine.country, wine.variety].filter(Boolean).join(' · ')

  const handleClick = isSelecting && onSelectToggle
    ? () => onSelectToggle()
    : () => router.push(`/wines/${wine.id}`)

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full overflow-hidden rounded-2xl text-left transition-all active:scale-[0.985]"
      style={{
        backgroundColor: isSelecting && isSelected ? 'var(--accent-wine-light)' : 'var(--bg-card)',
        border: isSelecting && isSelected ? '2px solid var(--accent-wine)' : '1px solid var(--border)',
        height: '170px',
      }}
    >
      <div className="relative w-[46%] shrink-0">
        {wine.photoUrl ? (
          <Image src={wine.photoUrl} alt="" fill className="object-cover" sizes="46vw" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2a2030, #1a1520)' }}
          >
            <Wine size={32} color="rgba(255,255,255,0.4)" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5" style={{ minWidth: 0 }}>
        <p className="truncate text-[16px] font-bold" style={{ color: 'var(--text)' }}>
          {wine.name}
        </p>
        <p className="mb-2.5 truncate text-[12px]" style={{ color: 'var(--text-sub)' }}>{meta}</p>

        <div className="mb-2.5 flex items-center gap-2.5">
          {hasQuadrant && (
            <MiniQuadrant
              axisX={myRecord!.axisX!}
              axisY={myRecord!.axisY!}
              satisfaction={myRecord!.satisfaction!}
              accentColor="var(--accent-wine)"
            />
          )}
          {myRecord?.satisfaction != null && (
            <span
              className="text-[32px] font-extrabold leading-none"
              style={{ color: 'var(--accent-wine)' }}
            >
              {myRecord.satisfaction}
            </span>
          )}
        </div>

        {(latestDate || (visitCount != null && visitCount > 0)) && (
          <p className="text-[11px]" style={{ color: 'var(--text-hint)' }}>
            {[latestDate, visitCount != null && visitCount > 0 ? `${visitCount}회` : null].filter(Boolean).join(' · ')}
          </p>
        )}


        {visibleMembers.length > 0 && (
          <div className="mt-auto flex items-center gap-1.5 pt-1.5">
            {visibleMembers.map((member) => (
              <div key={member.nickname} className="flex items-center gap-1">
                <div
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
                  style={{ backgroundColor: member.avatarColor }}
                >
                  {member.nickname.charAt(0)}
                </div>
                <span className="text-[11px]" style={{ color: 'var(--text-sub)' }}>
                  {member.satisfaction}
                </span>
              </div>
            ))}
            {extraCount > 0 && (
              <span className="text-[11px] font-bold" style={{ color: 'var(--text-hint)' }}>
                +{extraCount}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
