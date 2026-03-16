'use client'

import { useState, useMemo, useRef } from 'react'
import {
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ClipboardPaste,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/presentation/components/ui/sheet'
import { Button } from '@/presentation/components/ui/button'
import { ScrollArea } from '@/presentation/components/ui/scroll-area'
import { Separator } from '@/presentation/components/ui/separator'
import { cn } from '@/shared/utils/cn'
import { buildEnhancedPrompt, buildUserContext, buildBehaviorInsights } from '@/shared/utils/prompt-resolver'
import type { PromptContext } from '@/shared/utils/prompt-resolver'
import type { PromptTemplate } from '@/domain/entities/prompt'
import type { UserProfile } from '@/domain/entities/user'
import type { UserTasteProfile, DiningExperience } from '@/domain/entities/user-taste'
import type { UserPreferenceSummary } from '@/domain/entities/interaction'

interface PromptBridgeSheetProps {
  /** Context with restaurant data for prompt generation */
  readonly context: PromptContext
  /** Restaurant ID for usage logging */
  readonly restaurantId?: string
  /** Trigger element */
  readonly children: React.ReactNode
  /** Control open state externally */
  readonly open?: boolean
  /** Callback when open state changes */
  readonly onOpenChange?: (open: boolean) => void
  /** User profile for personalization */
  readonly profile: UserProfile | null
  /** User taste profile */
  readonly tasteProfile: UserTasteProfile | null
  /** User dining experiences */
  readonly experiences: readonly DiningExperience[]
  /** Available prompt templates */
  readonly prompts: readonly PromptTemplate[]
  /** Whether prompts are loading */
  readonly promptsLoading: boolean
  /** User preference summary from interactions */
  readonly preferenceSummary: UserPreferenceSummary | null
  /** Copy prompt to clipboard */
  readonly onCopyPrompt: (text: string, templateId?: string, restaurantId?: string) => Promise<void>
  /** Open prompt in ChatGPT */
  readonly onOpenChatGPT: (text: string, templateId?: string, restaurantId?: string) => Promise<void>
  /** Whether text was recently copied */
  readonly copied: boolean
  /** Track prompt usage */
  readonly onTrackPromptUse: (templateId: string, category: string) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  review_verify: '리뷰 검증',
  situation_recommend: '상황 추천',
  compare: '비교 분석',
  info_check: '정보 확인',
  hidden_gem: '숨은 맛집',
}

/**
 * Enhanced prompt bridge bottom sheet.
 * Generates expert-level, personalized prompts by injecting
 * restaurant context, user profile, and taste history.
 */
export function PromptBridgeSheet({
  context,
  restaurantId,
  children,
  open,
  onOpenChange,
  profile,
  tasteProfile,
  experiences,
  prompts,
  promptsLoading,
  preferenceSummary,
  onCopyPrompt,
  onOpenChatGPT,
  copied,
  onTrackPromptUse,
}: PromptBridgeSheetProps) {

  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [resultText, setResultText] = useState('')
  const [resultCopied, setResultCopied] = useState(false)
  const resultTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-select first template when prompts load
  const activeTemplate = selectedTemplate ?? prompts[0] ?? null

  // Build enhanced prompt with all context (restaurant + user + taste)
  const enhancedPrompt = useMemo(() => {
    if (!activeTemplate) return ''

    const fullContext: PromptContext = {
      ...context,
      user: profile
        ? buildUserContext(profile, tasteProfile, experiences)
        : undefined,
      behaviorInsights: preferenceSummary ? buildBehaviorInsights(preferenceSummary) : undefined,
    }

    return buildEnhancedPrompt(activeTemplate, fullContext)
  }, [activeTemplate, context, profile, tasteProfile, experiences, preferenceSummary])

  const handleCopy = () => {
    if (enhancedPrompt && activeTemplate) {
      onTrackPromptUse(activeTemplate.id, activeTemplate.category)
      void onCopyPrompt(enhancedPrompt, activeTemplate.id, restaurantId)
    }
  }

  const handleOpenChatGPT = () => {
    if (enhancedPrompt && activeTemplate) {
      onTrackPromptUse(activeTemplate.id, activeTemplate.category)
      void onOpenChatGPT(enhancedPrompt, activeTemplate.id, restaurantId)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl px-0">
        <SheetHeader className="px-5 pb-2">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--color-neutral-300)]" />
          <SheetTitle className="flex items-center gap-2 text-left text-lg">
            <Sparkles size={20} className="text-[var(--color-primary-500)]" />
            AI 검증 프롬프트
          </SheetTitle>
          <SheetDescription>
            {context.restaurant
              ? `${context.restaurant.name} 정보가 자동으로 반영됩니다`
              : '프롬프트를 선택하세요'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-5">
          <div className="flex flex-col gap-4 pb-32">
            {/* Template selector chips */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[var(--color-neutral-600)]">
                프롬프트 선택
              </span>
              <div className="flex gap-2 overflow-x-auto">
                {promptsLoading && (
                  <div className="flex gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-9 w-24 animate-pulse rounded-full bg-[var(--color-neutral-100)]"
                      />
                    ))}
                  </div>
                )}
                {prompts.map(template => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template)}
                    className={cn(
                      'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all',
                      activeTemplate?.id === template.id
                        ? 'bg-[var(--color-primary-500)] text-white'
                        : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)]',
                    )}
                  >
                    {CATEGORY_LABELS[template.category] ?? template.title}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Personalization status */}
            {profile && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--color-success-50)] px-3 py-2">
                <Check size={14} className="text-[var(--color-success-600)]" />
                <span className="text-xs text-[var(--color-success-700)]">
                  내 취향이 반영된 맞춤 프롬프트
                  {tasteProfile ? ' (취향 프로필 적용됨)' : ''}
                </span>
              </div>
            )}

            {/* Prompt preview toggle */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center justify-between text-sm font-medium text-[var(--color-neutral-600)]"
              >
                프롬프트 미리보기
                {showPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showPreview && (
                <div className="max-h-[40vh] overflow-y-auto rounded-lg bg-[var(--color-neutral-50)] p-4 font-mono text-xs leading-relaxed text-[var(--color-neutral-700)] whitespace-pre-wrap">
                  {enhancedPrompt || '프롬프트를 생성할 수 없습니다.'}
                </div>
              )}
            </div>

            {/* Restaurant info summary card */}
            {context.restaurant && (
              <div className="rounded-lg border border-[var(--color-neutral-200)] p-4">
                <h3 className="font-semibold text-[var(--color-neutral-800)]">
                  {context.restaurant.name}
                </h3>
                <p className="mt-1 text-sm text-[var(--color-neutral-500)]">
                  {context.restaurant.cuisineCategory} · {context.restaurant.address}
                </p>
                {context.restaurant.externalRatings.length > 0 && (
                  <div className="mt-2 flex gap-3 text-xs text-[var(--color-neutral-500)]">
                    {context.restaurant.externalRatings.map(r => (
                      <span key={r.source}>
                        {r.source} {r.rating ?? '-'}점 ({r.reviewCount}리뷰)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* LLM result paste-back section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--color-neutral-600)]">
                  AI 결과 붙여넣기
                </span>
                {resultText && (
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(resultText)
                      setResultCopied(true)
                      setTimeout(() => setResultCopied(false), 2000)
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary-500)]"
                  >
                    {resultCopied ? <Check size={12} /> : <Copy size={12} />}
                    {resultCopied ? '복사됨' : '결과 복사'}
                  </button>
                )}
              </div>
              <div className="relative">
                <textarea
                  ref={resultTextareaRef}
                  value={resultText}
                  onChange={e => setResultText(e.target.value)}
                  placeholder="ChatGPT 등에서 받은 결과를 여기에 붙여넣으세요..."
                  className="min-h-[120px] w-full resize-y rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] p-3 text-sm leading-relaxed text-[var(--color-neutral-700)] placeholder:text-[var(--color-neutral-400)] focus:border-[var(--color-primary-300)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-200)]"
                />
                {!resultText && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText()
                        setResultText(text)
                      } catch {
                        resultTextareaRef.current?.focus()
                      }
                    }}
                    className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-[var(--color-neutral-500)] shadow-sm"
                  >
                    <ClipboardPaste size={12} />
                    붙여넣기
                  </button>
                )}
              </div>
              {resultText && (
                <p className="text-xs text-[var(--color-neutral-400)]">
                  결과가 저장되었어요. 상단 &quot;결과 복사&quot; 버튼으로 다시 복사할 수 있어요.
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Action buttons - sticky bottom */}
        <div className="absolute inset-x-0 bottom-0 border-t bg-white px-5 pb-[env(safe-area-inset-bottom)] pt-4">
          <div className="flex gap-3">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex-1 gap-2"
              size="lg"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? '복사됨' : '복사하기'}
            </Button>
            <Button
              onClick={handleOpenChatGPT}
              className="flex-1 gap-2 bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)]"
              size="lg"
            >
              <ExternalLink size={18} />
              ChatGPT로 열기
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
