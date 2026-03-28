'use client'

import { X, Users, Utensils, Calendar, Activity, Star, Heart, Lock, Unlock } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

interface AxisLevel {
  label: string
  level: number
  maxLevel: number
}

interface TasteMatch {
  pct: number
  commonRestaurants: number
  commonWines: number
}

interface BubblePreviewPopupProps {
  isOpen: boolean
  onClose: () => void
  bubble: Bubble
  axisLevels?: AxisLevel[]
  tasteMatch?: TasteMatch | null
  onJoin: () => void
  onFollow: () => void
  isLoading: boolean
}

const POLICY_LABEL: Record<string, string> = {
  invite_only: '초대만 가능',
  closed: '팔로우만',
  manual_approve: '관리자 승인 필요',
  auto_approve: '조건 충족 시 자동 가입',
  open: '누구나 즉시 가입',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function BubblePreviewPopup({
  isOpen,
  onClose,
  bubble,
  axisLevels,
  tasteMatch,
  onJoin,
  onFollow,
  isLoading,
}: BubblePreviewPopupProps) {
  if (!isOpen) return null

  const isClosed = bubble.joinPolicy === 'closed'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="flex w-full max-w-[430px] flex-col rounded-t-2xl"
        style={{ backgroundColor: 'var(--bg-elevated)', maxHeight: '75vh' }}
      >
        {/* 핸들 + 닫기 */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="h-1 w-8 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
          <button type="button" onClick={onClose}>
            <X size={18} style={{ color: 'var(--text-hint)' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {/* 헤더: 아이콘(50×50) + 이름 + 설명 + 뱃지 */}
          <div className="flex flex-col items-center gap-2 py-3">
            <div
              className="flex h-[50px] w-[50px] items-center justify-center rounded-2xl"
              style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
            >
              <BubbleIcon icon={bubble.icon} size={26} />
            </div>
            <span className="text-[17px] font-bold text-[var(--text)]">{bubble.name}</span>
            {bubble.description && (
              <p className="text-center text-[13px] leading-snug text-[var(--text-sub)]">{bubble.description}</p>
            )}
            <div className="flex gap-1.5">
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}>
                {bubble.visibility === 'public' ? '공개' : '비공개'}
              </span>
            </div>
          </div>

          {/* 통계 그리드 (2×2) */}
          <div className="grid grid-cols-2 gap-2 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center gap-2">
              <Calendar size={14} style={{ color: 'var(--text-hint)' }} />
              <div>
                <p className="text-[13px] font-bold text-[var(--text)]">{formatDate(bubble.createdAt)}</p>
                <p className="text-[10px] text-[var(--text-hint)]">시작일</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} style={{ color: 'var(--accent-social)' }} />
              <div>
                <p className="text-[13px] font-bold text-[var(--text)]">{bubble.memberCount}명</p>
                <p className="text-[10px] text-[var(--text-hint)]">가입자</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={14} style={{ color: 'var(--positive)' }} />
              <div>
                <p className="text-[13px] font-bold text-[var(--text)]">{bubble.weeklyRecordCount}건/주</p>
                <p className="text-[10px] text-[var(--text-hint)]">활성도</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Star size={14} style={{ color: 'var(--accent-food)' }} />
              <div>
                <p className="text-[13px] font-bold text-[var(--text)]">{bubble.avgSatisfaction?.toFixed(1) ?? '-'}</p>
                <p className="text-[10px] text-[var(--text-hint)]">만족도</p>
              </div>
            </div>
          </div>

          {/* 세부 축 레벨 */}
          {axisLevels && axisLevels.length > 0 && (
            <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)' }}>
              <p className="mb-2 text-[11px] font-semibold text-[var(--text-sub)]">멤버 세부 축 레벨</p>
              <div className="flex flex-col gap-2">
                {axisLevels.map((axis) => (
                  <div key={axis.label} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-[11px] text-[var(--text-hint)]">{axis.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (axis.level / axis.maxLevel) * 100)}%`,
                          backgroundColor: 'var(--accent-social)',
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-[10px] font-semibold text-[var(--text)]">Lv.{axis.level}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 취향 일치 */}
          {tasteMatch && (
            <div className="mt-3 flex items-center gap-2 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)' }}>
              <Heart size={16} style={{ color: 'var(--accent-social)' }} />
              <div>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--accent-social)' }}>
                  취향 {tasteMatch.pct}% 일치
                </p>
                <p className="text-[11px] text-[var(--text-hint)]">
                  겹치는 맛집 {tasteMatch.commonRestaurants}곳 · 와인 {tasteMatch.commonWines}종
                </p>
              </div>
            </div>
          )}

          {/* 가입 조건 */}
          <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)' }}>
            <p className="mb-2 text-[11px] font-semibold text-[var(--text-sub)]">가입 조건</p>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] text-[var(--text-hint)]">✓ {POLICY_LABEL[bubble.joinPolicy]}</p>
              {bubble.minRecords > 0 && (
                <p className="text-[11px] text-[var(--text-hint)]">✓ 최소 기록 {bubble.minRecords}개</p>
              )}
              {bubble.minLevel > 0 && (
                <p className="text-[11px] text-[var(--text-hint)]">✓ 최소 Lv.{bubble.minLevel}</p>
              )}
              {bubble.maxMembers !== null && (
                <p className="text-[11px] text-[var(--text-hint)]">
                  ✓ 현재 {bubble.memberCount}/{bubble.maxMembers}명 (여유 {Math.max(0, bubble.maxMembers - bubble.memberCount)}자리)
                </p>
              )}
            </div>
          </div>

          {/* 가입 시 공개 범위 */}
          <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)' }}>
            <p className="mb-2 text-[11px] font-semibold text-[var(--text-sub)]">가입 시 공개 범위</p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-hint)]">
                <Unlock size={12} /> 프로필·레벨·뱃지 → 항상 공개
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-hint)]">
                <Lock size={12} /> 내 기록 → 선택한 기록만
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-hint)]">
                <Lock size={12} /> 사분면 위치 → 비공개
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-hint)]">
                <Lock size={12} /> 점수 상세 → 비공개
              </div>
            </div>
          </div>
        </div>

        {/* 액션: 팔로우 + 가입 신청 */}
        <div className="flex gap-2 px-5 pb-8 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={onFollow}
            disabled={isLoading}
            className="flex-1 rounded-xl py-3 text-center text-[14px] font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
          >
            팔로우
          </button>
          {!isClosed && (
            <button
              type="button"
              onClick={onJoin}
              disabled={isLoading}
              className="flex-1 rounded-xl py-3 text-center text-[14px] font-bold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
            >
              {isLoading ? '처리 중...' : bubble.joinPolicy === 'manual_approve' ? '가입 신청' : '가입하기'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
