'use client'

import { UtensilsCrossed, Wine, ChefHat } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import type { RecordType } from '@/domain/entities/record'

interface RecordTypeSelectorProps {
  value: RecordType
  onChange: (type: RecordType) => void
}

const RECORD_TYPE_OPTIONS: { type: RecordType; label: string; icon: typeof UtensilsCrossed }[] = [
  { type: 'restaurant', label: '식당', icon: UtensilsCrossed },
  { type: 'wine', label: '와인', icon: Wine },
  { type: 'homemade', label: '홈쿡', icon: ChefHat },
]

export function RecordTypeSelector({ value, onChange }: RecordTypeSelectorProps) {
  return (
    <div className="flex gap-2">
      {RECORD_TYPE_OPTIONS.map(({ type, label, icon: Icon }) => {
        const isActive = value === type
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-[#FF6038] text-white'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300',
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
