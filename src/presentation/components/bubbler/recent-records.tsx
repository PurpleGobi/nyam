'use client'

import { getGaugeColor } from '@/shared/utils/gauge-color'

interface RecentRecordItem {
  id: string
  targetName: string
  targetType: 'restaurant' | 'wine'
  satisfaction: number | null
  comment: string | null
  visitDate: string | null
}

interface RecentRecordsProps {
  records: RecentRecordItem[]
  onRecordPress: (id: string) => void
}

export function RecentRecords({ records, onRecordPress }: RecentRecordsProps) {
  if (records.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>최근 기록</h3>
      <div className="relative flex flex-col">
        <div
          className="absolute bottom-0 left-[15px] top-0 w-px"
          style={{ backgroundColor: 'var(--border)' }}
        />
        {records.slice(0, 10).map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onRecordPress(r.id)}
            className="relative flex items-start gap-3 py-2.5 pl-8 text-left"
          >
            <div
              className="absolute left-[11px] top-[14px] h-[9px] w-[9px] rounded-full"
              style={{
                backgroundColor: r.targetType === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)',
                border: '2px solid var(--bg)',
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{r.targetName}</span>
                {r.satisfaction !== null && (
                  <div
                    className="flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: getGaugeColor(r.satisfaction) }}
                  >
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#FFFFFF' }}>{r.satisfaction}</span>
                  </div>
                )}
              </div>
              {r.comment && (
                <p className="mt-0.5 line-clamp-1 text-[11px]" style={{ color: 'var(--text-sub)' }}>{r.comment}</p>
              )}
              {r.visitDate && (
                <span className="mt-0.5 text-[10px]" style={{ color: 'var(--text-hint)' }}>{r.visitDate}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
