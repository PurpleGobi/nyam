'use client'

import { Sparkles, Users, Globe } from 'lucide-react'
import type { RecommendationSource } from '@/domain/entities/recommendation'

interface RecommendationSourceTagProps {
  source: RecommendationSource
}

const SOURCE_CONFIG: Record<RecommendationSource, {
  label: string
  icon: typeof Sparkles
  bg: string
  color: string
}> = {
  ai: {
    label: 'AI',
    icon: Sparkles,
    bg: 'rgba(126,174,139,0.15)',
    color: 'var(--positive)',
  },
  bubble: {
    label: '버블',
    icon: Users,
    bg: 'rgba(122,155,174,0.15)',
    color: 'var(--accent-social)',
  },
  web: {
    label: '외부',
    icon: Globe,
    bg: 'var(--bg-page)',
    color: 'var(--text-hint)',
  },
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
        backgroundColor: config.bg,
        color: config.color,
      }}
    >
      <Icon size={10} />
      {config.label}
    </span>
  )
}
