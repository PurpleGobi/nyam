'use client'

import { useState, useCallback } from 'react'
import { FileText } from 'lucide-react'
import { usePrompts } from '@/application/hooks/use-prompts'
import { usePromptBridge } from '@/application/hooks/use-prompt-bridge'
import { PromptCard } from '@/presentation/components/prompt/prompt-card'
import { EmptyState } from '@/presentation/components/shared/empty-state'
import type { PromptCategory } from '@/domain/entities/prompt'
import { cn } from '@/shared/utils/cn'

/** Category tab definitions with labels */
const CATEGORY_TABS: Array<{ value: PromptCategory | null; label: string }> = [
  { value: null, label: '전체' },
  { value: 'review_verify', label: '리뷰 검증' },
  { value: 'situation_recommend', label: '상황 추천' },
  { value: 'compare', label: '비교 분석' },
  { value: 'info_check', label: '정보 확인' },
  { value: 'hidden_gem', label: '숨은 맛집' },
]

/**
 * Prompts tab container.
 * Category-filtered prompt template list with copy/deeplink actions.
 */
export function PromptsContainer() {
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | null>(null)

  const { prompts, isLoading, error } = usePrompts(
    selectedCategory ? { category: selectedCategory } : undefined,
  )
  const { copyToClipboard, openInChatGPT } = usePromptBridge()

  const handleCopy = useCallback(
    (text: string) => {
      void copyToClipboard(text)
    },
    [copyToClipboard],
  )

  const handleDeeplink = useCallback(
    (templateId: string) => {
      const template = prompts.find((p) => p.id === templateId)
      if (template) {
        void openInChatGPT(template.template, template.id)
      }
    },
    [prompts, openInChatGPT],
  )

  return (
    <div className="flex flex-col gap-4 px-5 pb-20">
      {/* Page title */}
      <h1 className="text-2xl font-bold">AI 프롬프트</h1>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value ?? 'all'}
            type="button"
            onClick={() => setSelectedCategory(tab.value)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              selectedCategory === tab.value
                ? 'bg-[var(--color-primary-500)] text-white'
                : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-200)]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-xl bg-[var(--color-neutral-100)]"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-sm text-[var(--color-error-500)]">
            프롬프트를 불러오지 못했어요.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-[var(--color-primary-500)] px-4 py-2 text-sm font-medium text-white"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && prompts.length === 0 && (
        <EmptyState
          icon={FileText}
          title="프롬프트가 없어요"
          description={
            selectedCategory
              ? '이 카테고리에는 아직 프롬프트가 없어요.'
              : '프롬프트가 준비 중이에요. 곧 만나보실 수 있어요!'
          }
        />
      )}

      {/* Prompt list */}
      {!isLoading && !error && prompts.length > 0 && (
        <div className="flex flex-col gap-3">
          {prompts.map((template) => {
            const totalReactions = template.likeCount + template.dislikeCount
            const likePercentage =
              totalReactions > 0
                ? Math.round((template.likeCount / totalReactions) * 100)
                : undefined

            return (
              <PromptCard
                key={template.id}
                template={template}
                onCopy={handleCopy}
                onDeeplink={handleDeeplink}
                usageCount={template.usageCount}
                likePercentage={likePercentage}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
