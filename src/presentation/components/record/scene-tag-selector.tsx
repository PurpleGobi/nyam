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
  // AI 추천 자동 pre-select (aiSuggestion 변경 시)
  useEffect(() => {
    if (aiSuggestion && value === null) {
      onChange(aiSuggestion)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiSuggestion])

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
          className="scene-tag"
          style={{ alignSelf: 'flex-start', backgroundColor: 'var(--accent-food)' }}
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
              className="transition-all duration-200 ease-in-out"
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                border: `1.5px solid ${isSelected ? `var(${tag.colorVar})` : 'var(--border)'}`,
                backgroundColor: isSelected ? `var(${tag.colorVar})20` : 'var(--bg-card)',
                color: isSelected ? `var(${tag.colorVar})` : 'var(--text-sub)',
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
