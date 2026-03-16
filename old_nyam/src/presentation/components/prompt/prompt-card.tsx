'use client';

import { ExternalLink, Sparkles, ThumbsUp, Users } from 'lucide-react';
import type { PromptTemplate, PromptCategory } from '@/domain/entities/prompt';
import { cn } from '@/shared/utils/cn';
import { CopyButton } from './copy-button';

export interface PromptCardProps {
  /** Prompt template data */
  template: PromptTemplate;
  /** Callback when copy button is clicked */
  onCopy?: (text: string) => void;
  /** Callback when ChatGPT deeplink button is clicked */
  onDeeplink?: (templateId: string) => void;
  /** Number of times this prompt has been used */
  usageCount?: number;
  /** Percentage of positive reactions */
  likePercentage?: number;
}

const categoryLabels: Record<PromptCategory, string> = {
  review_verify: '리뷰 검증',
  situation_recommend: '상황 추천',
  compare: '비교 분석',
  info_check: '정보 확인',
  hidden_gem: '숨은 맛집',
};

/**
 * Formats a large number with K suffix.
 */
function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return count.toLocaleString();
}

/**
 * Prompt template card displaying category, preview, stats, and action buttons.
 */
export function PromptCard({
  template,
  onCopy,
  onDeeplink,
  usageCount,
  likePercentage,
}: PromptCardProps) {
  const displayUsage = usageCount ?? template.usageCount;
  const displayLike = likePercentage ?? (
    template.likeCount + template.dislikeCount > 0
      ? Math.round((template.likeCount / (template.likeCount + template.dislikeCount)) * 100)
      : null
  );

  return (
    <div
      className={cn(
        'flex flex-col rounded-[var(--radius-lg)] border border-[var(--color-neutral-200)]',
        'bg-[var(--color-neutral-0)] p-4',
      )}
    >
      {/* Header: icon + title + subtitle */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-50)]">
          <Sparkles size={20} className="text-[var(--color-primary-500)]" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-lg font-semibold leading-[1.4] text-[var(--color-neutral-800)]">
            {template.title}
          </h4>
          {template.description && (
            <p className="mt-0.5 text-sm text-[var(--color-neutral-500)]">
              {template.description}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="my-3 h-px bg-[var(--color-neutral-200)]" />

      {/* Prompt preview */}
      <div className="relative overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-neutral-50)] p-3">
        <p className="line-clamp-3 font-mono text-sm leading-[1.5] text-[var(--color-neutral-700)]">
          {template.template}
        </p>
        {/* Fade-out gradient */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[var(--color-neutral-50)] to-transparent" />
      </div>

      {/* Category tags */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center rounded-full bg-[var(--color-primary-50)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary-600)]">
          {categoryLabels[template.category]}
        </span>
        {template.variables.map((v) => (
          <span
            key={v.key}
            className="inline-flex items-center rounded-full bg-[var(--color-neutral-100)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-neutral-600)]"
          >
            {v.label}
          </span>
        ))}
      </div>

      {/* Usage stats */}
      <div className="mt-3 flex items-center gap-3 text-sm text-[var(--color-neutral-500)]">
        <span className="flex items-center gap-1">
          <Users size={14} strokeWidth={1.5} />
          <span className="font-semibold">{formatCount(displayUsage)}</span>회 사용
        </span>
        {displayLike !== null && (
          <span className="flex items-center gap-1">
            <ThumbsUp size={14} strokeWidth={1.5} />
            <span className="font-semibold">{displayLike}%</span>
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex gap-2">
        <CopyButton
          text={template.template}
          label="복사하기"
          onCopied={() => onCopy?.(template.template)}
          className="flex-1"
          variant="secondary"
        />
        <button
          type="button"
          onClick={() => onDeeplink?.(template.id)}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)]',
            'bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-600)]',
            'px-4 py-2.5 text-sm font-medium text-white',
            'transition-all duration-200',
            'hover:brightness-105',
            'active:scale-[0.98]',
          )}
        >
          <ExternalLink size={16} strokeWidth={1.5} />
          ChatGPT
        </button>
      </div>
    </div>
  );
}
