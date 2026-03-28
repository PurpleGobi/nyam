'use client'

import { Camera, Star, Utensils, X } from 'lucide-react'
import type { NudgeDisplay } from '@/domain/entities/nudge'

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  camera: Camera,
  star: Star,
  utensils: Utensils,
}

interface NudgeStripProps {
  nudge: NudgeDisplay
  isDismissing: boolean
  onAction: () => void
  onDismiss: () => void
}

/**
 * 넛지 스트립 컴포넌트
 * - 최대 1개만 표시
 * - 아이콘 매핑: photo→camera, unrated→star, time→utensils
 * - 5초 후 AI 인사와 함께 자동 소멸 + 수동 닫기
 */
export function NudgeStrip({ nudge, isDismissing, onAction, onDismiss }: NudgeStripProps) {
  const IconComponent = ICON_MAP[nudge.icon] ?? Camera

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: isDismissing ? '0 16px' : '10px 16px',
        background: 'var(--accent-food-light)',
        borderBottom: isDismissing ? 'none' : '1px solid rgba(193,123,94,0.15)',
        maxHeight: isDismissing ? '0px' : '60px',
        opacity: isDismissing ? 0 : 1,
        overflow: 'hidden',
        transition: 'max-height 0.6s cubic-bezier(0.4, 0, 0.2, 1), padding 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease, border-bottom 0.5s ease',
      }}
    >
      {/* 아이콘: 28x28, radius 8px, accent-food 배경, 흰색 SVG 14x14 */}
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          background: 'var(--accent-food)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <IconComponent size={14} color="#fff" />
      </div>

      {/* 텍스트: 13px 500 */}
      <p
        style={{
          flex: 1,
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text)',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <strong style={{ fontWeight: 700 }}>{nudge.title}</strong>
        <span style={{ color: 'var(--text-hint)' }}> · {nudge.subtitle}</span>
      </p>

      {/* 액션 버튼: 12px 700, accent-food, rgba 배경, 8px radius */}
      <button
        type="button"
        onClick={onAction}
        style={{
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--accent-food)',
          background: 'rgba(193,123,94,0.12)',
          border: 'none',
          cursor: 'pointer',
          padding: '6px 12px',
          borderRadius: '8px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {nudge.actionLabel}
      </button>

      {/* 닫기: 16px text-hint */}
      <button
        type="button"
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-hint)',
          padding: '4px',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        <X size={16} />
      </button>
    </div>
  )
}
