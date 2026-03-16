'use client'

import { useState, useMemo, useCallback } from 'react'
import { ExternalLink, Sparkles } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/presentation/components/ui/sheet'
import { CopyButton } from './copy-button'
import type { PromptTemplate } from '@/domain/entities/prompt'
import { buildPrompt } from '@/domain/services/prompt-builder'
import { SITUATION_PRESETS } from '@/shared/constants/situations'
import { cn } from '@/shared/utils/cn'

interface PromptEditorSheetProps {
  /** The template to edit, or null to close */
  readonly template: PromptTemplate | null
  /** Callback to close the sheet */
  readonly onClose: () => void
  /** Pre-filled situation (from home quick button) */
  readonly situation?: string
  /** Copy prompt text to clipboard */
  readonly onCopyToClipboard: (text: string, templateId?: string) => Promise<void>
  /** Open prompt in ChatGPT */
  readonly onOpenInChatGPT: (text: string, templateId?: string) => Promise<void>
}

/** Map of variable labels that support preset chip selection */
const PRESET_LABELS: Record<string, readonly string[]> = {
  '상황': SITUATION_PRESETS.map((s) => s.label),
  '인원': ['1명', '2명', '3~4명', '5~6명', '7명 이상'],
  '예산': ['1만원 이하', '1~2만원', '2~3만원', '3~5만원', '5만원 이상'],
}

/**
 * Bottom sheet for editing prompt variables with live preview.
 * Used from the prompts tab when a card is clicked.
 */
export function PromptEditorSheet({
  template,
  onClose,
  situation,
  onCopyToClipboard,
  onOpenInChatGPT,
}: PromptEditorSheetProps) {
  const [variables, setVariables] = useState<Record<string, string>>({})

  // Pre-fill situation if provided
  const effectiveVars = useMemo(() => {
    if (!template) return variables
    const result = { ...variables }
    if (situation) {
      const situationVar = template.variables.find((v) => v.label === '상황')
      if (situationVar && !result[situationVar.key]) {
        const preset = SITUATION_PRESETS.find((s) => s.id === situation)
        if (preset) {
          result[situationVar.key] = preset.label
        }
      }
    }
    return result
  }, [template, variables, situation])

  const previewText = useMemo(() => {
    if (!template) return ''
    return buildPrompt(template, effectiveVars)
  }, [template, effectiveVars])

  const handleVarChange = useCallback((key: string, value: string) => {
    setVariables((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleCopy = useCallback(() => {
    if (!template) return
    void onCopyToClipboard(previewText, template.id)
  }, [template, previewText, onCopyToClipboard])

  const handleDeeplink = useCallback(() => {
    if (!template) return
    void onOpenInChatGPT(previewText, template.id)
  }, [template, previewText, onOpenInChatGPT])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose()
        setVariables({})
      }
    },
    [onClose],
  )

  return (
    <Sheet open={template !== null} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-5 pb-8 pt-0">
        <SheetHeader className="sticky top-0 z-10 bg-background pb-2 pt-4">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--color-neutral-300)]" />
          <SheetTitle className="flex items-center gap-2 text-lg font-bold">
            <Sparkles size={20} className="text-[var(--color-primary-500)]" />
            {template?.title ?? '프롬프트 편집'}
          </SheetTitle>
          {template?.description && (
            <SheetDescription>{template.description}</SheetDescription>
          )}
        </SheetHeader>

        {template && (
          <div className="flex flex-col gap-4 pt-2">
            {/* Variable inputs */}
            {template.variables.length > 0 && (
              <div className="flex flex-col gap-3">
                {template.variables.map((v) => {
                  const presets = PRESET_LABELS[v.label]
                  const currentValue = effectiveVars[v.key] ?? ''

                  return (
                    <div key={v.key} className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-[var(--color-neutral-700)]">
                        {v.label}
                      </span>

                      {presets ? (
                        <div className="flex flex-wrap gap-1.5">
                          {presets.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleVarChange(v.key, preset)}
                              className={cn(
                                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                                currentValue === preset
                                  ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] font-medium text-[var(--color-primary-600)]'
                                  : 'border-[var(--color-neutral-200)] text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-50)]',
                              )}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder={`${v.label} 입력`}
                          value={currentValue}
                          onChange={(e) => handleVarChange(v.key, e.target.value)}
                          className="rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-400)] focus:ring-1 focus:ring-[var(--color-primary-400)]"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Live preview */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--color-neutral-700)]">
                미리보기
              </span>
              <div className="rounded-[var(--radius-md)] bg-[var(--color-neutral-50)] p-3">
                <p className="whitespace-pre-wrap font-mono text-xs leading-[1.6] text-[var(--color-neutral-700)]">
                  {previewText}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <CopyButton
                text={previewText}
                label="복사하기"
                onCopied={handleCopy}
                className="flex-1"
                variant="secondary"
              />
              <button
                type="button"
                onClick={handleDeeplink}
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
      </SheetContent>
    </Sheet>
  )
}
