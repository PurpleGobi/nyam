'use client'

import Image from 'next/image'
import { Users, Flame, Lock, Globe } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

interface BubbleCardProps {
  bubble: Bubble
  /** owner=내가 만든 버블, member=가입한 버블, null=외부 버블 */
  role: 'owner' | 'member' | null
  isRecentlyActive?: boolean
  expertise?: Array<{ axisValue: string; avgLevel: number }>
  onClick: () => void
  /** 외부 버블에 가입하기 콜백 */
  onJoin?: () => void
}

export function BubbleCard({
  bubble,
  role,
  isRecentlyActive = false,
  expertise,
  onClick,
  onJoin,
}: BubbleCardProps) {
  const isHot = bubble.weeklyRecordCount > 0 &&
    bubble.prevWeeklyRecordCount > 0 &&
    bubble.weeklyRecordCount > bubble.prevWeeklyRecordCount * 1.5

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full overflow-hidden rounded-2xl text-left transition-all active:scale-[0.985]"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: isHot ? '2px solid var(--accent-social)' : '1px solid var(--border)',
        minHeight: '170px',
      }}
    >
      {/* 좌측 46%: RecordCard의 이미지 영역과 동일 구조 */}
      <div className="relative w-[46%] shrink-0">
        {bubble.icon && (bubble.icon.startsWith('http://') || bubble.icon.startsWith('https://')) ? (
          <Image src={bubble.icon} alt="" fill className="object-cover" sizes="46vw" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)' }}
          >
            <BubbleIcon icon={bubble.icon} size={40} />
          </div>
        )}
        {/* 공개/비공개 뱃지 */}
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full px-1.5 py-0.5"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        >
          {bubble.visibility === 'private' ? (
            <Lock size={10} color="#FFFFFF" />
          ) : (
            <Globe size={10} color="#FFFFFF" />
          )}
          <span className="text-[9px] font-semibold text-white">
            {bubble.visibility === 'private' ? '비공개' : '공개'}
          </span>
        </div>
        {/* 최근 활동 표시 */}
        {isRecentlyActive && (
          <div className="absolute right-2 top-2 h-[8px] w-[8px] rounded-full" style={{ backgroundColor: 'var(--positive)' }} />
        )}
      </div>

      {/* 우측 54%: 콘텐츠 */}
      <div className="flex flex-1 flex-col p-3.5" style={{ minWidth: 0 }}>
        {/* 이름 + 역할 뱃지 */}
        <p className="flex items-center gap-1 truncate text-[16px] font-bold" style={{ color: 'var(--text)' }}>
          <span className="truncate">{bubble.name}</span>
          {role && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={
                role === 'owner'
                  ? { backgroundColor: 'var(--accent-food-light)', color: 'var(--accent-food)' }
                  : { backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }
              }
            >
              {role === 'owner' ? '운영' : '멤버'}
            </span>
          )}
          {isHot && (
            <span
              className="flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
              style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}
            >
              <Flame size={9} />
              HOT
            </span>
          )}
        </p>

        {/* 메타: 설명 또는 멤버수 · 기록수 */}
        <p className="mb-2.5 truncate text-[12px]" style={{ color: 'var(--text-sub)' }}>
          {bubble.description ?? `멤버 ${bubble.memberCount}명 · 기록 ${bubble.recordCount}개`}
        </p>

        {/* 핵심 수치: 멤버 수 (대형 폰트) — 식당의 만족도 자리 */}
        <div className="mb-2.5 flex items-center gap-2.5">
          <Users size={24} style={{ color: 'var(--accent-social)' }} />
          <span
            className="text-[32px] font-extrabold leading-none"
            style={{ color: 'var(--accent-social)' }}
          >
            {bubble.memberCount}
          </span>
        </div>

        {/* 기록 · 주간 활동 */}
        <p className="text-[11px]" style={{ color: 'var(--text-hint)' }}>
          {[
            `기록 ${bubble.recordCount}개`,
            bubble.weeklyRecordCount > 0 ? `이번 주 +${bubble.weeklyRecordCount}` : null,
          ].filter(Boolean).join(' · ')}
        </p>

        {/* 전문 분야 태그 또는 가입 버튼 (상위 레벨 2개만) */}
        <div className="mt-auto pt-1.5">
          {expertise && expertise.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {[...expertise]
                .sort((a, b) => b.avgLevel - a.avgLevel)
                .slice(0, 2)
                .map((e) => (
                  <span
                    key={e.axisValue}
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}
                  >
                    {e.axisValue} Lv.{Math.round(e.avgLevel)}
                  </span>
                ))}
            </div>
          )}
          {onJoin && !role && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onJoin() }}
              className="mt-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-opacity active:opacity-80"
              style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
            >
              가입하기
            </button>
          )}
        </div>
      </div>
    </button>
  )
}
