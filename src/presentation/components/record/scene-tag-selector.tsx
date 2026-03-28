'use client'

import { useCallback, useEffect } from 'react'
import type { RestaurantScene } from '@/domain/entities/scene'
import { SCENE_TAGS } from '@/domain/entities/scene'

interface SceneTagSelectorProps {
  value: RestaurantScene | null
  onChange: (value: RestaurantScene | null) => void
  aiSuggestion?: RestaurantScene
}

export function SceneTagSelector({ value, onChange, aiSuggestion }: SceneTagSelectorProps) {
  // AI 추천 자동 pre-select (마운트 시 1회)
  useEffect(() => {
    if (aiSuggestion && value === null) {
      onChange(aiSuggestion)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelect = useCallback(
    (tag: RestaurantScene) => {
      onChange(value === tag ? null : tag)
    },
    [value, onChange],
  )

  return (
    <div className="flex flex-col gap-2">
      {aiSuggestion && (
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#FFFFFF',
            backgroundColor: 'var(--accent-food)',
            padding: '2px 6px',
            borderRadius: '4px',
            alignSelf: 'flex-start',
          }}
        >
          AI 추천
        </span>
      )}
      <div className="flex flex-wrap gap-2">
        {SCENE_TAGS.map((tag) => {
          const isSelected = value === tag.value

          return (
            <button
              key={tag.value}
              type="button"
              className="transition-all"
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
              {tag.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
