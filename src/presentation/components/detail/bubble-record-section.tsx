'use client'

import { getGaugeColor } from '@/shared/utils/gauge-color'

interface BubbleRecordItem {
  authorNickname: string
  bubbleName: string
  satisfaction: number | null
  comment: string | null
}

interface BubbleRecordSectionProps {
  records: BubbleRecordItem[]
}

export function BubbleRecordSection({ records }: BubbleRecordSectionProps) {
  if (records.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>버블 멤버 기록</h3>
      {records.slice(0, 5).map((r, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {r.satisfaction !== null && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: getGaugeColor(r.satisfaction) }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF' }}>{r.satisfaction}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[var(--text)]">{r.authorNickname}</p>
            {r.comment && <p className="mt-0.5 truncate text-[12px] text-[var(--text-sub)]">{r.comment}</p>}
          </div>
          <span className="shrink-0 text-[10px] text-[var(--text-hint)]">{r.bubbleName}</span>
        </div>
      ))}
      {records.length > 5 && (
        <p className="text-center text-[12px] text-[var(--accent-social)]">+{records.length - 5}개 더보기</p>
      )}
    </div>
  )
}
