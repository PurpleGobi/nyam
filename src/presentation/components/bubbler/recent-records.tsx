'use client'

import Image from 'next/image'
import { Clock } from 'lucide-react'

interface RecentRecordItem {
  id: string
  targetId: string
  targetType: 'restaurant' | 'wine'
  targetName: string
  meta: string
  satisfaction: number | null
  comment: string | null
  thumbnailUrl: string | null
  visitDate: string | null
}

interface RecentRecordsProps {
  records: RecentRecordItem[]
  accentType: 'food' | 'wine'
  onRecordPress: (id: string) => void
  onViewAll?: () => void
}

export function RecentRecords({ records, accentType, onRecordPress, onViewAll }: RecentRecordsProps) {
  if (records.length === 0) return null

  const scoreColor = accentType === 'food' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* 헤더: clock 아이콘 + "최근 기록" + "전체보기" (목업 .section-title + .recent-more) */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: 'var(--text)' }}>
          <Clock size={14} style={{ color: 'var(--text-sub)' }} />
          최근 기록
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[12px] font-semibold"
            style={{ color: 'var(--accent-social)' }}
          >
            전체보기
          </button>
        )}
      </div>

      {/* 기록 행 — 3개 제한 (목업 .record-row) */}
      <div className="flex flex-col">
        {records.slice(0, 3).map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onRecordPress(r.id)}
            className="flex items-center gap-2.5 text-left active:bg-[var(--bg-card)]"
            style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}
          >
            {/* 썸네일 44×44 (목업 .record-thumb) */}
            <div
              className="flex-shrink-0 overflow-hidden rounded-lg"
              style={{
                width: '44px',
                height: '44px',
                backgroundColor: 'var(--bg-section)',
              }}
            >
              {r.thumbnailUrl ? (
                <Image
                  src={r.thumbnailUrl}
                  alt=""
                  width={44}
                  height={44}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[16px]" style={{ color: 'var(--text-hint)' }}>
                  {accentType === 'food' ? '🍽' : '🍷'}
                </div>
              )}
            </div>

            {/* 정보 (목업 .record-info) */}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>{r.targetName}</p>
              {r.meta && (
                <p className="mt-px text-[11px]" style={{ color: 'var(--text-sub)' }}>{r.meta}</p>
              )}
              {r.comment && (
                <p
                  className="mt-px overflow-hidden text-ellipsis whitespace-nowrap text-[11px]"
                  style={{ color: 'var(--text-hint)' }}
                >
                  {r.comment}
                </p>
              )}
            </div>

            {/* 점수 (목업 .record-score) */}
            {r.satisfaction !== null && (
              <span
                className="flex-shrink-0 text-[15px] font-[800]"
                style={{ color: scoreColor }}
              >
                {r.satisfaction}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
