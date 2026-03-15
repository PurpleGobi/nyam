'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

export interface CopyButtonProps {
  readonly text: string;
  readonly label?: string;
  readonly onCopied?: () => void;
  readonly className?: string;
  readonly variant?: 'primary' | 'secondary';
}

export function CopyButton({
  text,
  label = '복사하기',
  onCopied,
  className,
  variant = 'primary',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    onCopied?.();
    setTimeout(() => setCopied(false), 2000);
  }, [text, onCopied]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium',
        'transition-all duration-200',
        variant === 'primary'
          ? 'bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)]'
          : 'border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)]',
        copied && 'bg-[var(--color-success-500)] text-white',
        className,
      )}
    >
      {copied ? (
        <>
          <Check size={16} strokeWidth={2} />
          복사됨
        </>
      ) : (
        <>
          <Copy size={16} strokeWidth={1.5} />
          {label}
        </>
      )}
    </button>
  );
}
