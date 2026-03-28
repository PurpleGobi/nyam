'use client'

import { Award } from 'lucide-react'
import type { WrappedData, WrappedCategory } from '@/domain/entities/profile'
import type { VisibilityConfig } from '@/domain/entities/settings'

interface WrappedCardProps {
  category: WrappedCategory
  data: WrappedData
  gaugePrivacy: 0 | 1 | 2
  gaugeDetail: 0 | 1 | 2
  visibilityPublic: VisibilityConfig
}

const CATEGORY_GRADIENTS: Record<WrappedCategory, string> = {
  all: 'linear-gradient(135deg, #3D3833 0%, #5A4E44 50%, #C17B5E 100%)',
  restaurant: 'linear-gradient(135deg, #3D3833 0%, #5A4E44 50%, #FF6038 100%)',
  wine: 'linear-gradient(135deg, #2A2438 0%, #4A3D5E 50%, #8B7396 100%)',
}

export function WrappedCard({ category, data, gaugePrivacy, gaugeDetail, visibilityPublic }: WrappedCardProps) {
  // 게이지 매트릭스 노출 조건
  const showAvatar = gaugePrivacy >= 1       // ≥1(보통): 실제
  const showNickname = gaugePrivacy >= 1     // ≥1: 실제 / 0: "미식 탐험가"
  const showStats = gaugePrivacy >= 1        // ≥1
  const showLevel = gaugeDetail >= 1 && visibilityPublic.level
  const showTopItems = gaugeDetail === 2     // =2(상세)
  const showBubbles = gaugePrivacy === 2 && visibilityPublic.bubbles // =2(공개) + bubbles ON

  return (
    <div
      className="mx-4 flex flex-col gap-4 rounded-2xl px-4 py-5"
      style={{ background: CATEGORY_GRADIENTS[category] }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
          {showNickname ? '나의 기록 요약' : '미식 탐험가의 기록'}
        </span>
      </div>

      {/* Level */}
      {showLevel && (
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <Award size={18} style={{ color: '#FFFFFF' }} />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
              Lv.{data.level.level} {data.level.title}
            </p>
            {data.level.axisLabel && (
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{data.level.axisLabel}</p>
            )}
          </div>
        </div>
      )}

      {/* Stats — gaugePrivacy ≥ 1 */}
      {showStats && data.stats.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.stats.map((stat) => (
            <div key={stat.label} className="flex items-center justify-between">
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{stat.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tags — 항상 표시 */}
      {data.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full px-3 py-1"
              style={{ fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFFFFF' }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Top Items — gaugeDetail === 2 */}
      {showTopItems && data.topItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>Top Picks</p>
          {data.topItems.map((item) => (
            <div key={item.rank} className="flex items-center gap-2">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}
              >
                {item.rank}
              </span>
              <div className="min-w-0 flex-1">
                <span className="truncate" style={{ fontSize: '13px', color: '#FFFFFF' }}>{item.name}</span>
                <span className="ml-1" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{item.meta}</span>
              </div>
              {item.score > 0 && (
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>{item.score}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bubbles — gaugePrivacy === 2 + visibility_public.bubbles */}
      {showBubbles && data.bubbles.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>활동 버블</p>
          <div className="flex flex-wrap gap-1.5">
            {data.bubbles.map((bubble) => (
              <span
                key={bubble.name}
                className="rounded-full px-2.5 py-0.5"
                style={{ fontSize: '11px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
              >
                {bubble.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
