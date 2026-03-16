'use client'

import { cn } from '@/shared/utils/cn'

interface SectionHeaderProps {
  title: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)}>
      <h2 className="font-semibold text-base text-[#334E68]">{title}</h2>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-sm text-[#FF6038] font-medium transition-colors hover:text-[#e8552f]"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
