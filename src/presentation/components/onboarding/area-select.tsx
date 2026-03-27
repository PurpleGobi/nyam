'use client'

import { ONBOARDING_AREAS } from '@/domain/entities/onboarding'
import type { OnboardingArea } from '@/domain/entities/onboarding'

interface AreaSelectProps {
  selected: OnboardingArea
  onSelect: (area: OnboardingArea) => void
}

export function AreaSelect({ selected, onSelect }: AreaSelectProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ONBOARDING_AREAS.map((area) => {
        const isActive = selected === area
        return (
          <button
            key={area}
            type="button"
            onClick={() => onSelect(area)}
            className="rounded-full px-4 py-2 text-[13px] font-semibold transition-colors"
            style={{
              backgroundColor: isActive ? 'var(--accent-food)' : 'var(--bg-card)',
              color: isActive ? '#FFFFFF' : 'var(--text-sub)',
              border: isActive ? 'none' : '1px solid var(--border)',
            }}
          >
            {area}
          </button>
        )
      })}
    </div>
  )
}
