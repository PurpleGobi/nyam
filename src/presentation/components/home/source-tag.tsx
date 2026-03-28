'use client'

/** 출처 태그 타입 — 설계 §2 SourceTag */
export type SourceType = 'me' | 'bubble' | 'web' | 'ai' | 'cellar'

interface SourceTagProps {
  type: SourceType
  children: React.ReactNode
}

const TAG_STYLES: Record<SourceType, { bg: string; color: string }> = {
  me: { bg: 'var(--accent-food-light)', color: 'var(--accent-food)' },
  bubble: { bg: 'rgba(122,155,174,0.15)', color: 'var(--accent-social)' },
  web: { bg: 'var(--bg-page)', color: 'var(--text-hint)' },
  ai: { bg: 'rgba(126,174,139,0.15)', color: 'var(--positive)' },
  cellar: { bg: 'var(--accent-wine-light)', color: 'var(--accent-wine)' },
}

export function SourceTag({ type, children }: SourceTagProps) {
  const style = TAG_STYLES[type]
  return (
    <span
      className="shrink-0 rounded text-[9px] font-extrabold uppercase"
      style={{
        padding: '1px 5px',
        backgroundColor: style.bg,
        color: style.color,
        letterSpacing: '0.3px',
      }}
    >
      {children}
    </span>
  )
}
