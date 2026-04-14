'use client'

import { Users, MapPin, Heart, Check } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'
import type { JoinApplicantProfile } from '@/domain/services/bubble-join-service'
import { BottomSheet } from '@/presentation/components/ui/bottom-sheet'

interface TasteMatch {
  pct: number
  commonCount: number
}

interface JoinFlowProps {
  isOpen: boolean
  onClose: () => void
  bubble: Bubble
  applicantProfile: JoinApplicantProfile | null
  tasteMatch: TasteMatch | null
  onJoin: () => void
  onFollow: () => void
  onCancel: () => void
  isLoading: boolean
  eligibilityError: string | null
}

const POLICY_LABEL: Record<string, string> = {
  invite_only: '초대만 가능',
  closed: '팔로우만',
  manual_approve: '관리자 승인 필요',
  auto_approve: '자동 승인',
  open: '자유 가입',
}

export function JoinFlow({
  isOpen,
  onClose,
  bubble,
  applicantProfile,
  tasteMatch,
  onJoin,
  onFollow,
  onCancel,
  isLoading,
  eligibilityError,
}: JoinFlowProps) {
  const isClosed = bubble.joinPolicy === 'closed'
  const isManualApprove = bubble.joinPolicy === 'manual_approve'

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isClosed ? '버블 팔로우' : `${bubble.name}에 가입하시겠어요?`}
    >
      {/* 버블 설명 */}
      {bubble.description && (
        <p className="pb-2 text-center text-[13px] text-[var(--text-sub)]">{bubble.description}</p>
      )}

      {/* 양방향 프리뷰: 버블 통계 */}
      <div className="card rounded-xl p-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[var(--text-hint)]"><Users size={13} className="mr-1 inline" />멤버 수</span>
            <span className="font-semibold text-[var(--text)]">{bubble.memberCount}명</span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[var(--text-hint)]">총 기록</span>
            <span className="font-semibold text-[var(--text)]">{bubble.recordCount}개</span>
          </div>
          {bubble.area && (
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--text-hint)]"><MapPin size={13} className="mr-1 inline" />주요 지역</span>
              <span className="font-semibold text-[var(--text)]">{bubble.area}</span>
            </div>
          )}
          {bubble.avgSatisfaction !== null && (
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--text-hint)]">평균 점수</span>
              <span className="font-semibold text-[var(--text)]">{bubble.avgSatisfaction}</span>
            </div>
          )}
          {tasteMatch && (
            <>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--text-hint)]">나와 겹치는 곳</span>
                <span className="font-semibold text-[var(--text)]">{tasteMatch.commonCount}개</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--text-hint)]"><Heart size={13} className="mr-1 inline" />취향 유사도</span>
                <span className="font-semibold" style={{ color: 'var(--accent-social)' }}>{tasteMatch.pct}%</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 가입 조건 */}
      <div className="card mt-3 rounded-xl p-3">
        <p className="mb-2 text-[12px] font-semibold text-[var(--text-sub)]">가입 조건</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-hint)]">
            <Check size={13} style={{ color: 'var(--positive)' }} />
            <span>{POLICY_LABEL[bubble.joinPolicy] ?? bubble.joinPolicy}</span>
          </div>
          {bubble.minRecords > 0 && (
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-hint)]">
              <Check size={13} style={{ color: applicantProfile && applicantProfile.recordCount >= bubble.minRecords ? 'var(--positive)' : 'var(--negative)' }} />
              <span>최소 기록 {bubble.minRecords}개 이상</span>
            </div>
          )}
          {bubble.minLevel > 0 && (
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-hint)]">
              <Check size={13} style={{ color: applicantProfile && applicantProfile.level >= bubble.minLevel ? 'var(--positive)' : 'var(--negative)' }} />
              <span>최소 Lv.{bubble.minLevel} 이상</span>
            </div>
          )}
          {bubble.maxMembers !== null && (
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-hint)]">
              <Check size={13} style={{ color: bubble.memberCount < bubble.maxMembers ? 'var(--positive)' : 'var(--negative)' }} />
              <span>현재 {bubble.memberCount}/{bubble.maxMembers}명 (여유 {Math.max(0, bubble.maxMembers - bubble.memberCount)}자리)</span>
            </div>
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {eligibilityError && (
        <p className="mt-3 text-center text-[13px]" style={{ color: 'var(--negative)' }}>
          {eligibilityError}
        </p>
      )}

      {/* CTA 버튼 */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl py-3 text-center text-[14px] font-semibold"
          style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
        >
          취소
        </button>
        {isClosed ? (
          <button
            type="button"
            onClick={onFollow}
            disabled={isLoading}
            className="flex-1 rounded-xl py-3 text-center text-[14px] font-bold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
          >
            {isLoading ? '처리 중...' : '팔로우'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            disabled={isLoading || !!eligibilityError}
            className="flex-1 rounded-xl py-3 text-center text-[14px] font-bold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
          >
            {isLoading ? '처리 중...' : isManualApprove ? '가입 신청' : '가입하기'}
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
