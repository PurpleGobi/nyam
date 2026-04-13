'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UtensilsCrossed, Wine } from 'lucide-react'
import type { ScoreSource } from '@/domain/entities/score'
import { ScoreSourceBadge } from '@/presentation/components/home/score-source-badge'
import { PhotoViewer } from '@/presentation/components/ui/photo-viewer'

interface CalendarDayDetailProps {
  date: string
  records: {
    mealTime: string
    name: string
    score: number | null
    id: string
    targetType: 'restaurant' | 'wine'
    targetId: string
    scoreSource?: ScoreSource
    privateNote?: string | null
    photos: string[]
  }[]
  accentType: 'restaurant' | 'wine'
}

export function CalendarDayDetail({ date, records, accentType }: CalendarDayDetailProps) {
  const router = useRouter()
  const accentColor = accentType === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'
  const [viewingPhotos, setViewingPhotos] = useState<string[]>([])

  return (
    <>
      <div
        className="mx-4 mt-2 overflow-hidden rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      >
        <div
          className="px-4 py-3 text-[13px] font-bold"
          style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}
        >
          {date} · {records.length}곳 방문
        </div>

        {records.map((record) => (
          <div key={record.id} style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 px-4 py-2.5">
              {/* 썸네일 — 리스트뷰와 동일 (48x48, radius 12px) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (record.photos.length > 0) setViewingPhotos(record.photos)
                }}
                className="compact-thumb shrink-0 bg-cover bg-center"
                style={{
                  cursor: record.photos.length > 0 ? 'pointer' : 'default',
                  backgroundImage: record.photos[0] ? `url(${record.photos[0]})` : undefined,
                  backgroundColor: record.photos[0] ? undefined : 'var(--bg-elevated)',
                }}
              >
                {!record.photos[0] && (
                  <div className="flex h-full w-full items-center justify-center">
                    {record.targetType === 'wine' ? (
                      <Wine size={18} style={{ color: 'var(--text-hint)' }} />
                    ) : (
                      <UtensilsCrossed size={18} style={{ color: 'var(--text-hint)' }} />
                    )}
                  </div>
                )}
              </button>

              {/* 장소명 + 메모 */}
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/${record.targetType === 'restaurant' ? 'restaurants' : 'wines'}/${record.targetId}`,
                  )
                }
                className="min-w-0 flex-1 text-left transition-transform active:scale-[0.985]"
              >
                <span
                  className="block truncate text-[14px] font-semibold"
                  style={{ color: 'var(--text)' }}
                >
                  {record.name}
                </span>
                {record.privateNote && (
                  <span
                    className="block truncate text-[11px]"
                    style={{ color: 'var(--text-hint)', marginTop: '1px' }}
                  >
                    {record.privateNote}
                  </span>
                )}
              </button>

              {/* 점수 */}
              <div className="flex shrink-0 items-center gap-1.5">
                <span
                  className="text-[16px] font-bold tabular-nums"
                  style={{ color: record.score != null ? accentColor : 'var(--text-hint)' }}
                >
                  {record.score ?? '—'}
                </span>
                {record.score != null && record.scoreSource && record.scoreSource !== 'mine' && (
                  <ScoreSourceBadge source={record.scoreSource} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 사진 뷰어 — 상세페이지와 동일한 PopupWindow 기반 */}
      <PhotoViewer
        photos={viewingPhotos}
        isOpen={viewingPhotos.length > 0}
        onClose={() => setViewingPhotos([])}
      />
    </>
  )
}
