'use client'

import { Lock, Users, Globe } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import type { RecordVisibility } from '@/domain/entities/record'

interface VisibilitySelectorProps {
  value: RecordVisibility
  onChange: (v: RecordVisibility) => void
}

const VISIBILITY_OPTIONS: { visibility: RecordVisibility; label: string; icon: typeof Lock }[] = [
  { visibility: 'private', label: '나만 보기', icon: Lock },
  { visibility: 'group', label: '그룹 공개', icon: Users },
  { visibility: 'public', label: '전체 공개', icon: Globe },
]

export function VisibilitySelector({ value, onChange }: VisibilitySelectorProps) {
  return (
    <div className="flex gap-2">
      {VISIBILITY_OPTIONS.map(({ visibility, label, icon: Icon }) => {
        const isActive = value === visibility
        return (
          <button
            key={visibility}
            type="button"
            onClick={() => onChange(visibility)}
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
