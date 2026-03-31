'use client'

import { useState, useCallback } from 'react'
import { Search, Wine, MapPin, FileText, Wallet, Users } from 'lucide-react'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import { PopupWindow } from '@/presentation/components/ui/popup-window'

const EMPTY_ICONS = {
  search: Search,
  wine: Wine,
} as const

/** 상황 태그 색상 — 영문 키 (DB 저장값) + 한글 키 (레거시) 모두 지원 */
const SCENE_COLORS: Record<string, string> = {
  solo: 'var(--scene-solo, #7A9BAE)',
  romantic: 'var(--scene-romantic, #B8879B)',
  friends: 'var(--scene-friends, #7EAE8B)',
  family: 'var(--scene-family, #C9A96E)',
  business: 'var(--scene-business, #8B7396)',
  drinks: 'var(--scene-drinks, #B87272)',
  '혼밥/혼술': 'var(--scene-solo, #7A9BAE)',
  '데이트': 'var(--scene-romantic, #B8879B)',
  '친구/모임': 'var(--scene-friends, #7EAE8B)',
  '가족': 'var(--scene-family, #C9A96E)',
  '회식/접대': 'var(--scene-business, #8B7396)',
  '술자리': 'var(--scene-drinks, #B87272)',
}

/** 와인 상황 태그 칩 색상 — 영문 키 + 한글 키 */
const WINE_SCENE_COLORS: Record<string, string> = {
  solo: '#7A9BAE',
  romantic: '#B8879B',
  gathering: '#7EAE8B',
  pairing: '#C9A96E',
  gift: '#8B7396',
  tasting: '#B87272',
  decanting: '#A0896C',
  '혼술': '#7A9BAE',
  '데이트': '#B8879B',
  '모임': '#7EAE8B',
  '페어링': '#C9A96E',
  '선물': '#8B7396',
  '시음': '#B87272',
  '디캔팅': '#A0896C',
}

/** 영문 씬 값 → 한글 라벨 변환 */
const SCENE_LABELS: Record<string, string> = {
  solo: '혼밥',
  romantic: '데이트',
  friends: '친구',
  family: '가족',
  business: '회식',
  drinks: '술자리',
}

const WINE_SCENE_LABELS: Record<string, string> = {
  solo: '혼술',
  romantic: '데이트',
  gathering: '모임',
  pairing: '페어링',
  gift: '선물',
  tasting: '테이스팅',
  decanting: '디캔팅',
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
  onRecordTap?: (recordId: string) => void
  targetType?: 'restaurant' | 'wine'
  /** 와인 기록: linkedRestaurantId → 식당명 맵 */
  linkedRestaurantNames?: Map<string, string>
  /** 와인 기록: 연결 식당 탭 콜백 */
  onLinkedRestaurantTap?: (restaurantId: string) => void
  /** 식당 기록: linkedWineId → 와인명 맵 */
  linkedWineNames?: Map<string, string>
  /** 식당 기록: 연결 와인 탭 콜백 */
  onLinkedWineTap?: (wineId: string) => void
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
  linkedWineNames,
  onLinkedWineTap,
}: RecordTimelineProps) {
  const [popupPhotos, setPopupPhotos] = useState<string[]>([])
  const [popupIndex, setPopupIndex] = useState<number | null>(null)

  const openPhotoPopup = useCallback((photos: RecordPhoto[], startIndex: number) => {
    setPopupPhotos(photos.map((p) => p.url))
    setPopupIndex(startIndex)
  }, [])

  const handlePopupClick = useCallback(() => {
    setPopupIndex((prev) => prev !== null ? (prev + 1) % popupPhotos.length : null)
  }, [popupPhotos.length])

  const EmptyIcon = EMPTY_ICONS[emptyIcon] ?? Search
  const isWine = targetType === 'wine'
  const sceneColors = isWine ? { ...SCENE_COLORS, ...WINE_SCENE_COLORS } : SCENE_COLORS
  const sceneLabels = isWine ? { ...SCENE_LABELS, ...WINE_SCENE_LABELS } : SCENE_LABELS

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
              <div
                key={record.id}
                className="relative w-full text-left"
                style={{ marginBottom: i < records.length - 1 ? '18px' : 0 }}
                onClick={() => onRecordTap?.(record.id)}
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

                {/* 날짜 + 상황 칩 + 점수 */}
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
                    {displayDate}
                  </span>
                  {record.scene && (
                    <span
                      className="tag-chip"
                      style={{ backgroundColor: dotColor }}
                    >
                      {sceneLabels[record.scene] ?? record.scene}
                    </span>
                  )}
                  <span className="ml-auto" style={{ fontSize: '13px', fontWeight: 700, color: dotColor }}>
                    {record.satisfaction ?? '—'}점
                  </span>
                </div>

                {/* 한줄평 */}
                {record.comment && (
                  <p className="mt-1" style={{ fontSize: '12px', color: 'var(--text-sub)', fontStyle: 'italic' }}>
                    &ldquo;{record.comment}&rdquo;
                  </p>
                )}

                {/* 개인메모 (비공개) */}
                {record.privateNote && (
                  <div className="mt-1 flex items-start gap-1">
                    <FileText size={11} className="mt-0.5 shrink-0" style={{ color: 'var(--text-hint)' }} />
                    <p className="line-clamp-2" style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
                      {record.privateNote}
                    </p>
                  </div>
                )}

                {/* 지출내역 */}
                {record?.totalPrice != null && record.totalPrice > 0 && (
                  <div className="mt-1 flex items-center gap-1">
                    <Wallet size={11} className="shrink-0" style={{ color: 'var(--text-hint)' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
                      {record.totalPrice.toLocaleString()}원
                    </span>
                  </div>
                )}

                {/* 동행자 */}
                {record?.companions && record.companions.length > 0 && (
                  <div className="mt-1 flex items-center gap-1">
                    <Users size={11} className="shrink-0" style={{ color: 'var(--text-hint)' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
                      {record.companions.join(', ')}
                    </span>
                  </div>
                )}

                {/* 식당 기록: 연결 와인 표시 */}
                {!isWine && record.linkedWineId && (
                  <button
                    type="button"
                    className="mt-1 flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      onLinkedWineTap?.(record.linkedWineId!)
                    }}
                  >
                    <Wine size={11} style={{ color: 'var(--accent-wine)' }} />
                    <span style={{ fontSize: '11px', color: 'var(--accent-wine)' }}>
                      {linkedWineNames?.get(record.linkedWineId) ?? '와인 연결됨'}
                    </span>
                  </button>
                )}

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
                    {photos.slice(0, 4).map((p, pi) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.id}
                        src={p.url}
                        alt=""
                        className="shrink-0 rounded-md object-cover"
                        style={{ width: '44px', height: '44px', cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); openPhotoPopup(photos, pi) }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {/* 사진 팝업 */}
      <PopupWindow isOpen={popupIndex !== null} onClose={() => setPopupIndex(null)}>
        {popupIndex !== null && (
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 200, pointerEvents: 'none' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={popupPhotos[popupIndex]}
              alt=""
              onClick={handlePopupClick}
              className="rounded-2xl shadow-lg"
              style={{ maxWidth: 'min(90vw, 500px)', maxHeight: '70vh', objectFit: 'contain', cursor: 'pointer', pointerEvents: 'auto' }}
              draggable={false}
            />
          </div>
        )}
      </PopupWindow>
    </section>
  )
}
