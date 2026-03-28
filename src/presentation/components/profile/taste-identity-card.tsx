'use client'

import { Fragment } from 'react'
import { Share2, Sparkles } from 'lucide-react'

function highlightKeywords(text: string, keywords: string[]): React.ReactNode {
  if (!keywords || keywords.length === 0) return text
  const pattern = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const regex = new RegExp(`(${pattern})`, 'g')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    keywords.includes(part)
      ? <span key={i} style={{ fontWeight: 700, fontStyle: 'normal', color: 'var(--accent-food)' }}>{part}</span>
      : <Fragment key={i}>{part}</Fragment>,
  )
}

interface TasteIdentityCardProps {
  tasteSummary: string | null
  tasteTags: string[]
  recordCount: number
  onSharePress: () => void
}

export function TasteIdentityCard({ tasteSummary, tasteTags, recordCount, onSharePress }: TasteIdentityCardProps) {
  if (!tasteSummary && (!tasteTags || tasteTags.length === 0)) {
    return (
      <div className="card mx-4 rounded-xl p-4">
        <p style={{ fontSize: '14px', color: 'var(--text-hint)', textAlign: 'center' }}>
          기록이 쌓이면 맛 정체성이 나타나요
        </p>
      </div>
    )
  }

  return (
    <div className="card mx-4 rounded-xl p-4">
      {tasteSummary && (
        <p
          className="line-clamp-3"
          style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, fontStyle: 'italic' }}
        >
          {highlightKeywords(tasteSummary, tasteTags)}
        </p>
      )}
      {tasteTags && tasteTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tasteTags.map((tag) => (
            <span
              key={tag}
              className="tag rounded-full px-3 py-1"
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
        {onSharePress && (
          <button type="button" onClick={onSharePress} className="flex items-center gap-1" style={{ fontSize: '12px', color: 'var(--accent-food)' }}>
            <Share2 size={12} /> 공유
          </button>
        )}
      </div>
    </div>
  )
}
