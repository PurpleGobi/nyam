"use client"

import { useCallback, useRef } from "react"
import { cn } from "@/shared/utils/cn"
import type { RecordType } from "@/infrastructure/supabase/types"

interface RatingItem {
  key: string
  label: string
  description?: string
}

const RESTAURANT_RATINGS: RatingItem[] = [
  { key: "taste", label: "맛" },
  { key: "value", label: "가성비" },
  { key: "service", label: "서비스" },
  { key: "atmosphere", label: "분위기" },
  { key: "cleanliness", label: "청결" },
  { key: "portion", label: "양" },
]

const WINE_RATINGS: RatingItem[] = [
  { key: "taste", label: "맛" },
  { key: "value", label: "가성비" },
]

const WINE_WSET_RATINGS: RatingItem[] = [
  { key: "wineAcidity", label: "산미", description: "낮음 ← → 높음" },
  { key: "wineBody", label: "바디감", description: "라이트 ← → 풀바디" },
  { key: "wineTannin", label: "타닌", description: "없음 ← → 매우 강함" },
  { key: "wineSweetness", label: "당도", description: "드라이 ← → 스위트" },
  { key: "wineBalance", label: "균형", description: "불균형 ← → 완벽" },
  { key: "wineFinish", label: "여운", description: "짧음 ← → 매우 긺" },
  { key: "wineAroma", label: "향 복합성", description: "단순 ← → 복합" },
]

const COOKING_RATINGS: RatingItem[] = [
  { key: "balance", label: "맛 균형" },
  { key: "taste", label: "맛" },
  { key: "difficulty", label: "난이도" },
  { key: "timeSpent", label: "소요시간" },
  { key: "reproducibility", label: "재현성" },
  { key: "plating", label: "플레이팅" },
  { key: "materialCost", label: "재료비" },
]

const COOKING_FLAVOR_RATINGS: RatingItem[] = [
  { key: "flavorSpicy", label: "매운맛", description: "안 매움 ← → 매우 매움" },
  { key: "flavorSweet", label: "단맛", description: "안 달음 ← → 매우 달음" },
  { key: "flavorSalty", label: "짠맛", description: "안 짬 ← → 매우 짬" },
  { key: "flavorSour", label: "신맛", description: "안 심 ← → 매우 심" },
  { key: "flavorUmami", label: "감칠맛", description: "약함 ← → 강함" },
  { key: "flavorRich", label: "기름진맛", description: "담백 ← → 기름짐" },
]

interface RatingScalesProps {
  recordType: RecordType
  values: Record<string, number>
  onChange: (key: string, value: number) => void
}

export function RatingScales({ recordType, values, onChange }: RatingScalesProps) {
  return (
    <div className="space-y-6">
      {/* Main ratings */}
      <RatingSection
        items={getMainRatings(recordType)}
        values={values}
        onChange={onChange}
      />

      {/* Wine WSET tasting notes (optional) */}
      {recordType === "wine" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-neutral-600">WSET 테이스팅 노트</h4>
            <span className="text-[10px] text-neutral-400">선택사항</span>
          </div>
          <p className="text-[10px] text-neutral-400">
            와인의 특성을 직접 평가해주세요. AI 분석과 평균하여 Taste DNA에 반영됩니다.
          </p>
          <RatingSection
            items={WINE_WSET_RATINGS}
            values={values}
            onChange={onChange}
          />
        </div>
      )}

      {/* Cooking manual flavor input */}
      {recordType === "cooking" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-neutral-600">맛 특성 (직접 입력)</h4>
            <span className="text-[10px] text-neutral-400">Taste DNA에 반영</span>
          </div>
          <p className="text-[10px] text-neutral-400">
            만든 요리의 맛 특성을 직접 평가해주세요.
          </p>
          <RatingSection
            items={COOKING_FLAVOR_RATINGS}
            values={values}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  )
}

function getMainRatings(recordType: RecordType): RatingItem[] {
  switch (recordType) {
    case "restaurant": return RESTAURANT_RATINGS
    case "wine": return WINE_RATINGS
    case "cooking": return COOKING_RATINGS
  }
}

function RatingSection({
  items,
  values,
  onChange,
}: {
  items: RatingItem[]
  values: Record<string, number>
  onChange: (key: string, value: number) => void
}) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <RatingSlider
          key={item.key}
          label={item.label}
          description={item.description}
          value={values[item.key] ?? 0}
          onChange={(v) => onChange(item.key, v)}
        />
      ))}
    </div>
  )
}

function RatingSlider({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description?: string
  value: number
  onChange: (value: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)

  const handleInteraction = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      onChange(Math.round(ratio * 100))
    },
    [onChange],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      handleInteraction(e.touches[0].clientX)
    },
    [handleInteraction],
  )

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-3">
        <span className="w-16 text-xs text-neutral-500 shrink-0">{label}</span>
        <div
          ref={trackRef}
          className="relative flex-1 h-10 flex items-center touch-none"
          onMouseDown={(e) => handleInteraction(e.clientX)}
          onMouseMove={(e) => { if (e.buttons === 1) handleInteraction(e.clientX) }}
          onTouchStart={(e) => handleInteraction(e.touches[0].clientX)}
          onTouchMove={handleTouchMove}
        >
          <div className="w-full h-3 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-75"
              style={{ width: `${value}%` }}
            />
          </div>
          <div
            className="absolute w-6 h-6 rounded-full bg-white border-2 border-primary-500 shadow-sm -translate-x-1/2 pointer-events-none"
            style={{ left: `${value}%` }}
          />
        </div>
        <span className={cn("w-8 text-right text-sm tabular-nums", value > 0 ? "text-neutral-800 font-medium" : "text-neutral-300")}>
          {value}
        </span>
      </div>
      {description && (
        <span className="ml-16 text-[10px] text-neutral-300">{description}</span>
      )}
    </div>
  )
}
