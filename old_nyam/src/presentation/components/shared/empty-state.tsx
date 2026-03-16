import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

export interface EmptyStateProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-neutral-100)]">
        <Icon size={32} strokeWidth={1.5} className="text-[var(--color-neutral-400)]" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-[var(--color-neutral-700)]">{title}</h3>
        <p className="text-sm text-[var(--color-neutral-500)]">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            'rounded-[var(--radius-md)] px-6 py-2.5 text-sm font-medium',
            'bg-[var(--color-primary-500)] text-white',
            'transition-colors duration-200 hover:bg-[var(--color-primary-600)]',
          )}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
