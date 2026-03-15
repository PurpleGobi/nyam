'use client'

import { useState, useMemo, useCallback } from 'react'
import { ExternalLink, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { CopyButton } from './copy-button'
import { usePrompts } from '@/application/hooks/use-prompts'
import { usePromptBridge } from '@/application/hooks/use-prompt-bridge'
import type { PromptTemplate } from '@/domain/entities/prompt'
import type { PromptContext } from '@/shared/utils/prompt-resolver'
import { resolveVariables, getUnfilledVariables } from '@/shared/utils/prompt-resolver'
import { buildPrompt } from '@/domain/services/prompt-builder'
import { cn } from '@/shared/utils/cn'

interface PromptBridgeSheetProps {
  /** Initial context for auto-filling variables */
  readonly context: PromptContext
  /** Restaurant ID for usage logging */
  readonly restaurantId?: string
  /** Trigger element */
  readonly children: React.ReactNode
  /** Control open state externally */
  readonly open?: boolean
  /** Callback when open state changes */
  readonly onOpenChange?: (open: boolean) => void
}

/**
 * Bottom sheet showing prompt templates with auto-filled variables.
 * Used from restaurant detail and home situation buttons.
 */
export function PromptBridgeSheet({
  context,
  restaurantId,
  children,
  open,
  onOpenChange,
}: PromptBridgeSheetProps) {
  const { prompts, isLoading } = usePrompts()
  const { copyToClipboard, openInChatGPT } = usePromptBridge()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editedVars, setEditedVars] = useState<Record<string, Record<string, string>>>({})

  const getResolvedVars = useCallback(
    (template: PromptTemplate): Record<string, string> => {
      const autoVars = resolveVariables(template, context)
      const userEdits = editedVars[template.id] ?? {}
      return { ...autoVars, ...userEdits }
    },
    [context, editedVars],
  )

  const handleVarChange = useCallback(
    (templateId: string, key: string, value: string) => {
      setEditedVars((prev) => ({
        ...prev,
        [templateId]: { ...(prev[templateId] ?? {}), [key]: value },
      }))
    },
    [],
  )

  const handleCopy = useCallback(
    (template: PromptTemplate) => {
      const vars = getResolvedVars(template)
      const text = buildPrompt(template, vars)
      void copyToClipboard(text, template.id, restaurantId)
    },
    [getResolvedVars, copyToClipboard, restaurantId],
  )

  const handleDeeplink = useCallback(
    (template: PromptTemplate) => {
      const vars = getResolvedVars(template)
      const text = buildPrompt(template, vars)
      void openInChatGPT(text, template.id, restaurantId)
    },
    [getResolvedVars, openInChatGPT, restaurantId],
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger>{children}</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-5 pb-8 pt-0">
        <SheetHeader className="sticky top-0 z-10 bg-background pb-2 pt-4">
          {/* Drag handle */}
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--color-neutral-300)]" />
          <SheetTitle className="flex items-center gap-2 text-lg font-bold">
            <Sparkles size={20} className="text-[var(--color-primary-500)]" />
            AI 프롬프트 선택
          </SheetTitle>
          <SheetDescription>
            {context.restaurantName
              ? `${context.restaurantName} 정보가 자동으로 입력됩니다`
              : '프롬프트를 선택하고 변수를 입력하세요'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 pt-2">
          {isLoading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl bg-[var(--color-neutral-100)]"
                />
              ))}
            </div>
          )}

          {!isLoading && prompts.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--color-neutral-500)]">
              사용 가능한 프롬프트가 없어요.
            </p>
          )}

          {!isLoading &&
            prompts.map((template) => (
              <PromptBridgeCard
                key={template.id}
                template={template}
                resolvedVars={getResolvedVars(template)}
                expanded={expandedId === template.id}
                onToggle={() =>
                  setExpandedId((prev) => (prev === template.id ? null : template.id))
                }
                onVarChange={(key, value) => handleVarChange(template.id, key, value)}
                onCopy={() => handleCopy(template)}
                onDeeplink={() => handleDeeplink(template)}
              />
            ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// --- Internal card component for the sheet ---

interface PromptBridgeCardProps {
  template: PromptTemplate
  resolvedVars: Record<string, string>
  expanded: boolean
  onToggle: () => void
  onVarChange: (key: string, value: string) => void
  onCopy: () => void
  onDeeplink: () => void
}

function PromptBridgeCard({
  template,
  resolvedVars,
  expanded,
  onToggle,
  onVarChange,
  onCopy,
  onDeeplink,
}: PromptBridgeCardProps) {
  const previewText = useMemo(
    () => buildPrompt(template, resolvedVars),
    [template, resolvedVars],
  )

  const unfilled = useMemo(
    () => getUnfilledVariables(template, resolvedVars),
    [template, resolvedVars],
  )

  return (
    <div className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] p-4">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between text-left"
      >
        <div className="min-w-0 flex-1">
          <h4 className="text-base font-semibold text-[var(--color-neutral-800)]">
            {template.title}
          </h4>
          {template.description && (
            <p className="mt-0.5 text-sm text-[var(--color-neutral-500)]">
              {template.description}
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={18} className="shrink-0 text-[var(--color-neutral-400)]" />
        ) : (
          <ChevronDown size={18} className="shrink-0 text-[var(--color-neutral-400)]" />
        )}
      </button>

      {/* Variable status chips */}
      {template.variables.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {template.variables.map((v) => {
            const filled = Boolean(resolvedVars[v.key])
            return (
              <span
                key={v.key}
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                  filled
                    ? 'bg-[var(--color-success-50)] text-[var(--color-success-700)]'
                    : 'bg-[var(--color-warning-50)] text-[var(--color-warning-700)]',
                )}
              >
                {v.label}: {filled ? resolvedVars[v.key] : '미입력'}
              </span>
            )
          })}
        </div>
      )}

      {/* Expanded area */}
      {expanded && (
        <div className="mt-3 flex flex-col gap-3">
          {/* Variable input form */}
          {unfilled.length > 0 && (
            <div className="flex flex-col gap-2">
              {unfilled.map((v) => (
                <label key={v.key} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-[var(--color-neutral-600)]">
                    {v.label}
                  </span>
                  <input
                    type="text"
                    placeholder={`${v.label} 입력`}
                    value={resolvedVars[v.key] ?? ''}
                    onChange={(e) => onVarChange(v.key, e.target.value)}
                    className="rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-400)] focus:ring-1 focus:ring-[var(--color-primary-400)]"
                  />
                </label>
              ))}
            </div>
          )}

          {/* Already-filled variables (editable) */}
          {template.variables.filter((v) => resolvedVars[v.key]).length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-[var(--color-neutral-400)]">
                자동 입력됨 (수정 가능)
              </span>
              {template.variables
                .filter((v) => resolvedVars[v.key])
                .map((v) => (
                  <label key={v.key} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-[var(--color-neutral-600)]">
                      {v.label}
                    </span>
                    <input
                      type="text"
                      value={resolvedVars[v.key] ?? ''}
                      onChange={(e) => onVarChange(v.key, e.target.value)}
                      className="rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-400)] focus:ring-1 focus:ring-[var(--color-primary-400)]"
                    />
                  </label>
                ))}
            </div>
          )}

          {/* Preview */}
          <div className="relative overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-neutral-50)] p-3">
            <p className="whitespace-pre-wrap font-mono text-xs leading-[1.6] text-[var(--color-neutral-700)]">
              {previewText}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <CopyButton
              text={previewText}
              label="복사하기"
              onCopied={onCopy}
              className="flex-1"
              variant="secondary"
            />
            <button
              type="button"
              onClick={onDeeplink}
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
      )}
    </div>
  )
}
