import { cn } from '@/shared/utils/cn';

export interface ProgressBarProps {
  readonly current: number;
  readonly target: number;
  readonly label: string;
  readonly tierLabel: string;
}

export function ProgressBar({ current, target, label, tierLabel }: ProgressBarProps) {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--color-neutral-700)]">{label}</span>
        <span className="text-xs text-[var(--color-neutral-500)]">{tierLabel}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-neutral-200)]">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            'bg-gradient-to-r from-[var(--color-primary-400)] to-[var(--color-primary-600)]',
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-neutral-500)]">
          {current} / {target}
        </span>
        <span className="text-xs font-medium text-[var(--color-primary-500)]">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}
