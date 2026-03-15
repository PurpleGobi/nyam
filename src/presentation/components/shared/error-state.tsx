import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

export interface ErrorStateProps {
  readonly message?: string;
  readonly onRetry?: () => void;
}

export function ErrorState({
  message = '문제가 발생했습니다. 다시 시도해주세요.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <AlertCircle size={32} strokeWidth={1.5} className="text-red-500" />
      </div>
      <p className="text-sm text-[var(--color-neutral-600)]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            'inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium',
            'border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)]',
            'text-[var(--color-neutral-700)] transition-colors hover:bg-[var(--color-neutral-50)]',
          )}
        >
          <RefreshCw size={14} strokeWidth={1.5} />
          다시 시도
        </button>
      )}
    </div>
  );
}
