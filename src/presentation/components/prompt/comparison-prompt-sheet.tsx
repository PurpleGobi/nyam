'use client'

import { useState, useMemo } from 'react'
import {
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  GitCompareArrows,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/presentation/components/ui/sheet'
import { Button } from '@/presentation/components/ui/button'
import { ScrollArea } from '@/presentation/components/ui/scroll-area'
import { Separator } from '@/presentation/components/ui/separator'
import { cn } from '@/shared/utils/cn'
import {
  buildComparisonPrompt,
  buildUserContext,
} from '@/shared/utils/prompt-resolver'
import type { PromptContext, RestaurantContextData } from '@/shared/utils/prompt-resolver'
import type { RestaurantWithSummary } from '@/domain/entities/restaurant'
import type { UserProfile } from '@/domain/entities/user'
import type { UserTasteProfile, DiningExperience } from '@/domain/entities/user-taste'
import type { ComparisonResult } from '@/domain/entities/comparison-result'
import { SITUATION_PRESETS, resolvePresetLabel } from '@/shared/constants/situations'
import { ComparisonResultView } from '@/presentation/components/comparison/comparison-result-view'

interface ComparisonPromptSheetProps {
  readonly restaurants: readonly RestaurantWithSummary[]
  readonly onRemove: (id: string) => void
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly profile: UserProfile | null
  readonly tasteProfile: UserTasteProfile | null
  readonly experiences: readonly DiningExperience[]
  readonly onCopyPrompt: (text: string) => Promise<void>
  readonly onOpenChatGPT: (text: string) => Promise<void>
  readonly copied: boolean
  /** Shared filter values from context */
  readonly sharedOccasion: string | null
  readonly sharedPartySize: string | null
  readonly sharedBudget: string | null
  readonly onOccasionChange: (value: string | null) => void
  readonly onPartySizeChange: (value: string | null) => void
  readonly onBudgetChange: (value: string | null) => void
  /** AI comparison */
  readonly comparisonResult?: ComparisonResult | null
  readonly isComparing?: boolean
  readonly comparisonError?: Error | null
  readonly onAutoCompare?: () => void
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
  profile,
  tasteProfile,
  experiences,
  onCopyPrompt,
  onOpenChatGPT,
  copied,
  sharedOccasion,
  sharedPartySize,
  sharedBudget,
  onOccasionChange,
  onPartySizeChange,
  onBudgetChange,
  comparisonResult,
  isComparing,
  comparisonError,
  onAutoCompare,
}: ComparisonPromptSheetProps) {

  const [showPreview, setShowPreview] = useState(false)
  const [showManualSection, setShowManualSection] = useState(false)

  // Use shared filter values (synced with home/explore filters)
  const occasion = sharedOccasion
  const partySize = sharedPartySize
  const budget = sharedBudget

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
      void onCopyPrompt(comparisonPrompt)
    }
  }

  const handleOpenChatGPT = () => {
    if (comparisonPrompt) {
      void onOpenChatGPT(comparisonPrompt)
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

            {/* Filter conditions - synced from shared context */}
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-[var(--color-neutral-600)]">
                내 조건
                {(occasion || partySize || budget) && (
                  <span className="ml-1.5 text-xs text-[var(--color-primary-500)]">
                    (홈 필터 연동)
                  </span>
                )}
              </span>

              {/* Occasion */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-[var(--color-neutral-500)]">상황</span>
                <div className="flex flex-wrap gap-1.5">
                  {SITUATION_PRESETS.map(preset => {
                    const label = resolvePresetLabel(preset)
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onOccasionChange(occasion === label ? null : label)}
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

              {/* Party size */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-[var(--color-neutral-500)]">인원</span>
                <div className="flex flex-wrap gap-1.5">
                  {PARTY_SIZES.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => onPartySizeChange(partySize === size ? null : size)}
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
                      onClick={() => onBudgetChange(budget === b ? null : b)}
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

            {/* AI Auto-Compare Result */}
            {isComparing && (
              <div className="flex flex-col items-center gap-3 rounded-xl bg-[var(--color-neutral-50)] p-6">
                <Loader2 size={32} className="animate-spin text-[var(--color-primary-500)]" />
                <p className="text-sm font-medium text-[var(--color-neutral-600)]">
                  AI가 비교 분석 중이에요...
                </p>
              </div>
            )}

            {comparisonError && !isComparing && (
              <div className="rounded-xl bg-red-50 p-4 text-center">
                <p className="text-sm text-red-600">
                  분석에 실패했어요. 다시 시도하거나 직접 분석을 이용해주세요.
                </p>
                {onAutoCompare && (
                  <button
                    type="button"
                    onClick={onAutoCompare}
                    className="mt-2 text-sm font-medium text-[var(--color-primary-500)]"
                  >
                    다시 시도
                  </button>
                )}
              </div>
            )}

            {comparisonResult && !isComparing && (
              <ComparisonResultView result={comparisonResult} />
            )}

            {/* Manual section - collapsible */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowManualSection(!showManualSection)}
                className="flex items-center justify-between text-sm font-medium text-[var(--color-neutral-500)]"
              >
                직접 분석 (프롬프트 복사)
                {showManualSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showManualSection && (
                <div className="flex flex-col gap-3">
                  {/* Prompt preview */}
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center justify-between text-xs font-medium text-[var(--color-neutral-500)]"
                  >
                    프롬프트 미리보기
                    {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showPreview && (
                    <div className="max-h-[30vh] overflow-y-auto rounded-lg bg-[var(--color-neutral-50)] p-4 font-mono text-xs leading-relaxed text-[var(--color-neutral-700)] whitespace-pre-wrap">
                      {comparisonPrompt || '2개 이상 식당을 선택해주세요.'}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleCopy}
                      variant="outline"
                      className="flex-1 gap-2"
                      size="sm"
                      disabled={restaurants.length < 2}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? '복사됨' : '복사하기'}
                    </Button>
                    <Button
                      onClick={handleOpenChatGPT}
                      variant="outline"
                      className="flex-1 gap-2"
                      size="sm"
                      disabled={restaurants.length < 2}
                    >
                      <ExternalLink size={14} />
                      ChatGPT로 열기
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Action buttons - sticky bottom */}
        <div className="absolute inset-x-0 bottom-0 border-t bg-white px-5 pb-[env(safe-area-inset-bottom)] pt-4">
          <Button
            onClick={onAutoCompare}
            className="w-full gap-2 bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)]"
            size="lg"
            disabled={restaurants.length < 2 || isComparing}
          >
            {isComparing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                AI 자동 비교 분석
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
