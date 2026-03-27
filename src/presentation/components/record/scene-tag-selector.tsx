'use client'

import { useCallback } from 'react'
import type { SceneTag } from '@/domain/entities/scene'
import { SCENE_TAGS } from '@/domain/entities/scene'

interface SceneTagSelectorProps {
  value: SceneTag | null
  onChange: (value: SceneTag | null) => void
  aiSuggestion?: SceneTag
}

export function SceneTagSelector({ value, onChange, aiSuggestion }: SceneTagSelectorProps) {
  const handleSelect = useCallback(
    (tag: SceneTag) => {
      onChange(value === tag ? null : tag)
    },
    [value, onChange],
  )

  return (
    <div className="flex flex-wrap gap-2">
      {SCENE_TAGS.map((tag) => {
        const isSelected = value === tag.value
        const isAi = aiSuggestion === tag.value

        return (
          <button
            key={tag.value}
            type="button"
            className="relative transition-all"
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              border: `1.5px solid ${isSelected ? tag.hex : 'var(--border)'}`,
              backgroundColor: isSelected ? `${tag.hex}20` : 'var(--bg-card)',
              color: isSelected ? tag.hex : 'var(--text-sub)',
              fontSize: '13px',
              fontWeight: 600,
              transform: isSelected ? 'scale(1.05)' : 'scale(1)',
            }}
            onClick={() => handleSelect(tag.value)}
          >
            {isAi && !isSelected && (
              <span
                className="absolute -right-1 -top-1"
                style={{
                  fontSize: '8px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  backgroundColor: 'var(--accent-food)',
                  padding: '1px 4px',
                  borderRadius: '4px',
                }}
              >
                AI
              </span>
            )}
            {tag.label}
          </button>
        )
      })}
    </div>
  )
}
