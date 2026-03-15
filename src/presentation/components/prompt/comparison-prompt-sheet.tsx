'use client'

import { useState, useMemo, useRef } from 'react'
import {
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  GitCompareArrows,
  ClipboardPaste,
  X,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/application/hooks/use-auth'
import { useUserProfile } from '@/application/hooks/use-user-profile'
import { useUserTaste } from '@/application/hooks/use-user-taste'
import { usePromptBridge } from '@/application/hooks/use-prompt-bridge'
import { cn } from '@/shared/utils/cn'
import {
  buildComparisonPrompt,
  buildUserContext,
} from '@/shared/utils/prompt-resolver'
import type { PromptContext, RestaurantContextData } from '@/shared/utils/prompt-resolver'
import type { RestaurantWithSummary } from '@/domain/entities/restaurant'
import { SITUATION_PRESETS, resolvePresetLabel } from '@/shared/constants/situations'

interface ComparisonPromptSheetProps {
  /** Selected restaurants for comparison */
  readonly restaurants: readonly RestaurantWithSummary[]
  /** Callback to remove a restaurant from selection */
  readonly onRemove: (id: string) => void
  /** Control open state */
  readonly open: boolean
  /** Callback when open state changes */
  readonly onOpenChange: (open: boolean) => void
}

const PARTY_SIZES = ['1명', '2명', '3~4명', '5~6명', '7명 이상']
const BUDGETS = ['1만원 이하', '1~2만원', '2~3만원', '3~5만원', '5만원 이상']

function toContextData(r: RestaurantWithSummary): RestaurantContextData {
  return {
    name: r.name,
    address: r.shortAddress ?? r.address,
    cuisine: r.cuisine,
    cuisineCategory: r.cuisineCategory,
    priceRange: r.priceRange,
    region: r.region,
    externalRatings: r.ratings.map(rt => ({
      source: rt.source,
      rating: rt.rating,
      reviewCount: rt.reviewCount,
    })),
    verificationCount: r.verificationCount,
    avgScores: {
      taste: r.avgTaste,
      value: r.avgValue,
      service: r.avgService,
      ambiance: r.avgAmbiance,
    },
  }
}

export function ComparisonPromptSheet({
  restaurants,
  onRemove,
  open,
  onOpenChange,
}: ComparisonPromptSheetProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile(user?.id)
  const { tasteProfile, experiences } = useUserTaste()
  const { copyToClipboard, openInChatGPT, copied } = usePromptBridge()

  const [showPreview, setShowPreview] = useState(false)
  const [occasion, setOccasion] = useState<string | null>(null)
  const [partySize, setPartySize] = useState<string | null>(null)
  const [budget, setBudget] = useState<string | null>(null)
  const [resultText, setResultText] = useState('')
  const [resultCopied, setResultCopied] = useState(false)
  const resultTextareaRef = useRef<HTMLTextAreaElement>(null)

  const comparisonPrompt = useMemo(() => {
    if (restaurants.length < 2) return ''

    const contextData = restaurants.map(toContextData)
    const context: PromptContext = {
      situation: {
        occasion: occasion ?? undefined,
        partySize: partySize ?? undefined,
        budget: budget ?? undefined,
      },
      user: profile
        ? buildUserContext(profile, tasteProfile, experiences)
        : undefined,
    }

    return buildComparisonPrompt(contextData, context)
  }, [restaurants, occasion, partySize, budget, profile, tasteProfile, experiences])

  const handleCopy = () => {
    if (comparisonPrompt) {
      void copyToClipboard(comparisonPrompt)
    }
  }

  const handleOpenChatGPT = () => {
    if (comparisonPrompt) {
      void openInChatGPT(comparisonPrompt)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] rounded-t-2xl px-0">
        <SheetHeader className="px-5 pb-2">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--color-neutral-300)]" />
          <SheetTitle className="flex items-center gap-2 text-left text-lg">
            <GitCompareArrows size={20} className="text-[var(--color-primary-500)]" />
            맛집 비교 분석 ({restaurants.length}곳)
          </SheetTitle>
          <SheetDescription>
            선택한 맛집들을 AI로 비교 분석합니다
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-5">
          <div className="flex flex-col gap-4 pb-32">
            {/* Selected restaurants */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[var(--color-neutral-600)]">
                비교 대상
              </span>
              <div className="flex flex-wrap gap-2">
                {restaurants.map(r => (
                  <span
                    key={r.id}
                    className="flex items-center gap-1.5 rounded-full bg-[var(--color-primary-50)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary-700)]"
                  >
                    {r.name}
                    <button
                      type="button"
                      onClick={() => onRemove(r.id)}
                      className="rounded-full p-0.5 hover:bg-[var(--color-primary-100)]"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <Separator />

            {/* Filter conditions */}
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-[var(--color-neutral-600)]">
                내 조건 (선택)
              </span>

              {/* Occasion - time-aware labels */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-[var(--color-neutral-500)]">상황</span>
                <div className="flex flex-wrap gap-1.5">
                  {SITUATION_PRESETS.map(preset => {
                    const label = resolvePresetLabel(preset)
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setOccasion(prev => prev === label ? null : label)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                          occasion === label
                            ? 'bg-[var(--color-primary-500)] text-white'
                            : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)]',
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Party size - button select */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-[var(--color-neutral-500)]">인원</span>
                <div className="flex flex-wrap gap-1.5">
                  {PARTY_SIZES.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPartySize(prev => prev === size ? null : size)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                        partySize === size
                          ? 'bg-[var(--color-primary-500)] text-white'
                          : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)]',
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-[var(--color-neutral-500)]">예산 (1인)</span>
                <div className="flex flex-wrap gap-1.5">
                  {BUDGETS.map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBudget(prev => prev === b ? null : b)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                        budget === b
                          ? 'bg-[var(--color-primary-500)] text-white'
                          : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)]',
                      )}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

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
                  {comparisonPrompt || '2개 이상 식당을 선택해주세요.'}
                </div>
              )}
            </div>

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
                  placeholder="ChatGPT 등에서 받은 비교 결과를 여기에 붙여넣으세요..."
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
              disabled={restaurants.length < 2}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? '복사됨' : '복사하기'}
            </Button>
            <Button
              onClick={handleOpenChatGPT}
              className="flex-1 gap-2 bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)]"
              size="lg"
              disabled={restaurants.length < 2}
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
