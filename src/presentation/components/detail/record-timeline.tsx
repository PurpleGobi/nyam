'use client'

import { Search, Wine, MapPin } from 'lucide-react'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'

const EMPTY_ICONS = {
  search: Search,
  wine: Wine,
} as const

/** 상황 태그 색상 (DESIGN_SYSTEM.md / RATING_ENGINE.md §7) */
const SCENE_COLORS: Record<string, string> = {
  '혼밥/혼술': 'var(--scene-solo, #7A9BAE)',
  '데이트': 'var(--scene-romantic, #B8879B)',
  '친구/모임': 'var(--scene-friends, #7EAE8B)',
  '가족': 'var(--scene-family, #C9A96E)',
  '회식/접대': 'var(--scene-business, #8B7396)',
  '술자리': 'var(--scene-drinks, #B87272)',
}

/** 와인 상황 태그 칩 색상 (설계 스펙) */
const WINE_SCENE_COLORS: Record<string, string> = {
  '혼술': '#7A9BAE',
  '데이트': '#B8879B',
  '페어링': '#C9A96E',
  '모임': '#7EAE8B',
  '선물': '#8B7396',
  '시음': '#B87272',
  '디캔팅': '#A0896C',
}

interface RecordTimelineProps {
  records: DiningRecord[]
  recordPhotos: Map<string, RecordPhoto[]>
  accentColor: string         // '--accent-food' | '--accent-wine'
  sectionTitle: string
  sectionMeta: string
  emptyIcon: keyof typeof EMPTY_ICONS
  emptyTitle: string
  emptyDescription: string
  onRecordTap: (recordId: string) => void
  targetType?: 'restaurant' | 'wine'
  /** 와인 기록: linkedRestaurantId → 식당명 맵 */
  linkedRestaurantNames?: Map<string, string>
  /** 와인 기록: 연결 식당 탭 콜백 */
  onLinkedRestaurantTap?: (restaurantId: string) => void
}

/** 세로선 그라디언트 중간색 */
function getGradientMidColor(accentColor: string): string {
  return accentColor === '--accent-wine' ? '#C0B3CA' : '#D4A089'
}

export function RecordTimeline({
  records,
  recordPhotos,
  accentColor,
  sectionTitle,
  sectionMeta,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  onRecordTap,
  targetType = 'restaurant',
  linkedRestaurantNames,
  onLinkedRestaurantTap,
}: RecordTimelineProps) {
  const EmptyIcon = EMPTY_ICONS[emptyIcon] ?? Search
  const isWine = targetType === 'wine'
  const sceneColors = isWine ? { ...SCENE_COLORS, ...WINE_SCENE_COLORS } : SCENE_COLORS

  return (
    <section style={{ padding: '16px 20px' }}>
      {/* 섹션 헤더 */}
      <div className="mb-3.5 flex items-center justify-between">
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          {sectionTitle}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
          {sectionMeta}
        </span>
      </div>

      {records.length === 0 ? (
        <div className="text-center" style={{ padding: '40px 20px' }}>
          <EmptyIcon size={28} style={{ color: 'var(--text-hint)', margin: '0 auto 8px' }} />
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)' }}>
            {emptyTitle}
          </p>
          <p className="mt-1" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
            {emptyDescription}
          </p>
        </div>
      ) : (
        <div className="relative" style={{ paddingLeft: '20px' }}>
          {/* 세로선 */}
          <div
            className="absolute top-0 bottom-0"
            style={{
              left: '6px',
              width: '2px',
              background: `linear-gradient(to bottom, var(${accentColor}), ${getGradientMidColor(accentColor)}, transparent)`,
            }}
          />

          {records.map((record, i) => {
            const dotColor = record.scene
              ? (sceneColors[record.scene] ?? `var(${accentColor})`)
              : `var(${accentColor})`
            const photos = recordPhotos.get(record.id) ?? []
            const displayDate = record.visitDate ?? record.createdAt.split('T')[0]

            return (
              <button
                key={record.id}
                type="button"
                onClick={() => onRecordTap(record.id)}
                className="relative w-full text-left"
                style={{ marginBottom: i < records.length - 1 ? '18px' : 0 }}
              >
                {/* 타임라인 dot */}
                <div
                  className="absolute rounded-full"
                  style={{
                    left: '-20px',
                    top: '2px',
                    width: '12px',
                    height: '12px',
                    backgroundColor: dotColor,
                    border: '2px solid var(--bg)',
                    boxShadow: `0 0 0 2px ${dotColor}`,
                  }}
                />

                {/* 날짜 + 상황 칩 */}
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
                    {displayDate}
                  </span>
                  {record.scene && (
                    <span
                      className="tag-chip"
                      style={{ backgroundColor: dotColor }}
                    >
                      {record.scene}
                    </span>
                  )}
                </div>

                {/* 점수 + 한줄평 */}
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span style={{ fontSize: '13px', fontWeight: 700, color: dotColor }}>
                    {record.satisfaction ?? '—'}점
                  </span>
                  {record.comment && (
                    <span
                      className="truncate"
                      style={{ fontSize: '12px', color: 'var(--text-sub)' }}
                    >
                      &ldquo;{record.comment}&rdquo;
                    </span>
                  )}
                </div>

                {/* 와인 기록: 연결 식당 표시 */}
                {isWine && record.linkedRestaurantId && (
                  <button
                    type="button"
                    className="mt-0.5 flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      onLinkedRestaurantTap?.(record.linkedRestaurantId!)
                    }}
                  >
                    <MapPin size={12} style={{ color: 'var(--text-sub)' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
                      {linkedRestaurantNames?.get(record.linkedRestaurantId) ?? '식당 연결됨'}
                    </span>
                  </button>
                )}

                {/* 사진 썸네일 */}
                {photos.length > 0 && (
                  <div className="mt-1.5 flex gap-1.5">
                    {photos.slice(0, 4).map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.id}
                        src={p.url}
                        alt=""
                        className="shrink-0 rounded-md object-cover"
                        style={{ width: '44px', height: '44px' }}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
