'use client'

import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

interface RatingConfig {
  key: string
  label: string
  icon?: ReactNode
}

interface RatingInputProps {
  config: RatingConfig[]
  values: Record<string, number>
  onChange: (key: string, value: number) => void
}

export function RatingInput({ config, values, onChange }: RatingInputProps) {
  return (
    <div className="flex flex-col gap-1">
      {config.map(({ key, label, icon }) => {
        const currentValue = values[key] ?? 0
        return (
          <div
            key={key}
            className="flex items-center justify-between h-10"
          >
            <div className="flex items-center gap-1.5 text-sm text-neutral-700">
              {icon}
              <span>{label}</span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(key, n)}
                  className={cn(
                    'size-7 rounded-full border-2 transition-colors',
                    n <= currentValue
                      ? 'bg-[#FF6038] border-[#FF6038]'
                      : 'bg-white border-neutral-200 hover:border-neutral-300',
                  )}
                  aria-label={`${label} ${n}점`}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
