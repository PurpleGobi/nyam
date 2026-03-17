'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12',
        className,
      )}
    >
      <Icon className="size-12 text-neutral-300" strokeWidth={1.5} />
      <p className="text-base font-medium text-neutral-500 mt-4">{title}</p>
      {description && (
        <p className="text-sm text-neutral-400 mt-1 text-center max-w-xs">
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 text-sm font-medium text-[#FF6038] border border-[#FF6038]/30 rounded-full px-4 py-2 transition-colors duration-200 hover:bg-[#FF6038]/5"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
