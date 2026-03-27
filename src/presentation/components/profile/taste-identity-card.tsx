'use client'

import { Share2, Sparkles } from 'lucide-react'

interface TasteIdentityCardProps {
  tasteSummary: string | null
  tasteTags: string[] | null
  recordCount?: number
  onShare?: () => void
}

export function TasteIdentityCard({ tasteSummary, tasteTags, recordCount, onShare }: TasteIdentityCardProps) {
  if (!tasteSummary && (!tasteTags || tasteTags.length === 0)) {
    return (
      <div className="mx-4 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-hint)', textAlign: 'center' }}>
          기록이 쌓이면 맛 정체성이 나타나요
        </p>
      </div>
    )
  }

  return (
    <div className="mx-4 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {tasteSummary && (
        <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6 }}>{tasteSummary}</p>
      )}
      {tasteTags && tasteTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tasteTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full px-3 py-1"
              style={{ fontSize: '12px', fontWeight: 500, backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-sub)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 기록 수 + 공유 */}
      <div className="mt-3 flex items-center justify-between">
        {recordCount !== undefined && recordCount > 0 && (
          <span className="flex items-center gap-1" style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
            <Sparkles size={10} /> {recordCount}개 기록 기반
          </span>
        )}
        {onShare && (
          <button type="button" onClick={onShare} className="flex items-center gap-1" style={{ fontSize: '12px', color: 'var(--accent-food)' }}>
            <Share2 size={12} /> 공유
          </button>
        )}
      </div>
    </div>
  )
}
