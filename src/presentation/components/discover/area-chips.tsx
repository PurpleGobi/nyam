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
          className="shrink-0 rounded-full text-[13px] font-semibold transition-all active:scale-95"
          style={{
            padding: '7px 14px',
            minHeight: '34px',
            backgroundColor: activeArea === area ? 'var(--accent-food)' : 'var(--bg)',
            color: activeArea === area ? '#FFFFFF' : 'var(--text-sub)',
            border: `1.5px solid ${activeArea === area ? 'var(--accent-food)' : 'var(--border)'}`,
          }}
        >
          {area}
        </button>
      ))}
    </div>
  )
}
