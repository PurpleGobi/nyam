'use client'

import Image from 'next/image'
import { Users, Flame, Lock, Globe, Sparkles } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'
import type { BubbleSimilarityResult } from '@/domain/repositories/similarity-repository'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

interface BubbleCardProps {
  bubble: Bubble
  /** owner=내가 만든 버블, member=가입한 버블, null=외부 버블 */
  role: 'owner' | 'member' | null
  expertise?: Array<{ axisValue: string; avgLevel: number }>
  /** 나와의 버블 적합도 (선택) */
  similarity?: BubbleSimilarityResult | null
  onClick: () => void
  /** 외부 버블에 가입하기 콜백 */
  onJoin?: () => void
  /** 가입 신청 pending 상태 */
  isPending?: boolean
  /** 가입 신청 취소 콜백 */
  onCancelJoin?: () => void
}

export function BubbleCard({
  bubble,
  role,
  expertise,
  similarity,
  onClick,
  onJoin,
  isPending,
  onCancelJoin,
}: BubbleCardProps) {
  const isHot = bubble.weeklyRecordCount > 0 &&
    bubble.prevWeeklyRecordCount > 0 &&
    bubble.weeklyRecordCount > bubble.prevWeeklyRecordCount * 1.5

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick() }}
      className="flex w-full cursor-pointer overflow-hidden rounded-2xl text-left transition-all active:scale-[0.985]"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: isHot ? '2px solid var(--accent-social)' : '1px solid var(--border)',
        height: '170px',
      }}
    >
      {/* 좌측 46%: RecordCard의 이미지 영역과 동일 구조 */}
      <div className="relative w-[46%] shrink-0">
        {bubble.coverPhotoUrl ? (
          <Image src={bubble.coverPhotoUrl} alt="" fill className="object-cover" sizes="46vw" />
        ) : bubble.icon && (bubble.icon.startsWith('http://') || bubble.icon.startsWith('https://')) ? (
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
        <p className="truncate text-[12px]" style={{ color: 'var(--text-sub)' }}>
          {bubble.description ?? `멤버 ${bubble.memberCount}명 · 기록 ${bubble.recordCount}개`}
        </p>

        {/* 오너 · 기록수 */}
        <p className="mb-2.5 mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-hint)' }}>
          {[
            bubble.ownerNickname ? `by ${bubble.ownerNickname}` : null,
            `기록 ${bubble.recordCount}개`,
            bubble.weeklyRecordCount > 0 ? `+${bubble.weeklyRecordCount}w` : null,
          ].filter(Boolean).join(' · ')}
        </p>

        {/* 멤버수(좌) + 레벨 뱃지(우) */}
        <div className="flex items-center gap-2">
          {/* 좌: 멤버수 */}
          <div className="flex items-center gap-1.5">
            <Users size={20} style={{ color: 'var(--accent-social)' }} />
            <span
              className="text-[28px] font-extrabold leading-none"
              style={{ color: 'var(--accent-social)' }}
            >
              {bubble.memberCount}
            </span>
          </div>
          {/* 우: 전문분야 레벨 뱃지 */}
          {expertise && expertise.length > 0 && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1 overflow-hidden" style={{ maxHeight: '40px' }}>
              {expertise.map((e) => (
                <span
                  key={e.axisValue}
                  className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-medium"
                  style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}
                >
                  {e.axisValue} Lv.{Math.round(e.avgLevel)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 적합도 (멤버수 아래줄) */}
        {similarity && (
          <div className="mt-1 flex items-center gap-1.5">
            <Sparkles size={10} style={{ color: 'var(--accent-food)' }} />
            <span className="text-[11px] font-bold" style={{ color: 'var(--accent-food)' }}>
              적합도 {Math.round(similarity.similarity * 100)}%
            </span>
            <span className="text-[9px]" style={{ color: 'var(--text-hint)' }}>
              신뢰 {Math.round(similarity.avgConfidence * 100)}% · {similarity.matchedMembers}명 기반
            </span>
          </div>
        )}

        {/* 가입/취소 버튼 */}
        {isPending && onCancelJoin ? (
          <div className="mt-auto pt-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCancelJoin() }}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-opacity active:opacity-80"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
            >
              가입 신청 취소
            </button>
          </div>
        ) : onJoin && !role && (
          <div className="mt-auto pt-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onJoin() }}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-opacity active:opacity-80"
              style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
            >
              가입 신청
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
