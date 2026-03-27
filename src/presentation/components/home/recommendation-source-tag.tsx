'use client'

import { Sparkles, Users, Globe } from 'lucide-react'

type RecommendationSource = 'ai' | 'bubble' | 'web'

interface RecommendationSourceTagProps {
  source: RecommendationSource
}

const SOURCE_CONFIG: Record<RecommendationSource, { label: string; icon: typeof Sparkles }> = {
  ai: { label: 'AI', icon: Sparkles },
  bubble: { label: '버블', icon: Users },
  web: { label: '외부', icon: Globe },
}

export function RecommendationSourceTag({ source }: RecommendationSourceTagProps) {
  const config = SOURCE_CONFIG[source]
  const Icon = config.icon

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
      style={{
        fontSize: '10px',
        fontWeight: 600,
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--text-sub)',
        border: '1px solid var(--border)',
      }}
    >
      <Icon size={10} />
      {config.label}
    </span>
  )
}
