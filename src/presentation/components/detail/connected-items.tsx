'use client'

import { UtensilsCrossed, Wine } from 'lucide-react'

interface ConnectedItem {
  id: string
  name: string
  type: 'restaurant' | 'wine'
  subtitle: string
}

interface ConnectedItemsProps {
  items: ConnectedItem[]
  onItemClick: (id: string, type: 'restaurant' | 'wine') => void
}

export function ConnectedItems({ items, onItemClick }: ConnectedItemsProps) {
  if (items.length === 0) return null

  return (
    <div className="px-4">
      <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
        함께 즐긴
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {items.map((item) => {
          const isRestaurant = item.type === 'restaurant'
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onItemClick(item.id, item.type)}
              className="flex shrink-0 items-center gap-2.5 rounded-xl p-3"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-card)',
                minWidth: '180px',
              }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: isRestaurant
                    ? 'color-mix(in srgb, var(--accent-food) 10%, transparent)'
                    : 'color-mix(in srgb, var(--accent-wine) 10%, transparent)',
                }}
              >
                {isRestaurant ? (
                  <UtensilsCrossed size={18} style={{ color: 'var(--accent-food)' }} />
                ) : (
                  <Wine size={18} style={{ color: 'var(--accent-wine)' }} />
                )}
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                  {item.name}
                </p>
                <p className="truncate" style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
                  {item.subtitle}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
