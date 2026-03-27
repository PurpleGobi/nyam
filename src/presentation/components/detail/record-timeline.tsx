'use client'

import { getGaugeColor } from '@/shared/utils/gauge-color'
import type { DiningRecord } from '@/domain/entities/record'

interface RecordTimelineProps {
  records: DiningRecord[]
  onRecordClick: (recordId: string) => void
}

export function RecordTimeline({ records, onRecordClick }: RecordTimelineProps) {
  if (records.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p style={{ fontSize: '14px', color: 'var(--text-hint)' }}>아직 기록이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col px-4">
      {records.map((record, i) => (
        <button
          key={record.id}
          type="button"
          onClick={() => onRecordClick(record.id)}
          className="flex items-center gap-3 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--border)_20%,transparent)]"
          style={{
            borderBottom: i < records.length - 1 ? '1px solid var(--border)' : undefined,
          }}
        >
          {/* 만족도 점 */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: getGaugeColor(record.satisfaction ?? 50) }}
          >
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
              {record.satisfaction ?? '—'}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                {record.visitDate ?? record.createdAt.split('T')[0]}
              </span>
              {record.scene && (
                <span
                  className="rounded-full px-2 py-0.5"
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--text-sub)',
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {record.scene}
                </span>
              )}
            </div>
            {record.comment && (
              <p className="mt-0.5 truncate" style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
                {record.comment}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
