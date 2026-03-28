'use client'

import { DISCOVER_AREAS } from '@/domain/entities/discover'
import type { DiscoverArea } from '@/domain/entities/discover'

interface AreaChipsProps {
  activeArea: DiscoverArea
  onAreaChange: (area: DiscoverArea) => void
}

export function AreaChips({ activeArea, onAreaChange }: AreaChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: 'none' }}>
      {DISCOVER_AREAS.map((area) => (
        <button
          key={area}
          type="button"
          onClick={() => onAreaChange(area)}
          className="shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors"
          style={{
            backgroundColor: activeArea === area ? 'var(--accent-food)' : 'var(--bg-card)',
            color: activeArea === area ? '#FFFFFF' : 'var(--text-sub)',
            border: `1px solid ${activeArea === area ? 'var(--accent-food)' : 'var(--border)'}`,
          }}
        >
          {area}
        </button>
      ))}
    </div>
  )
}
