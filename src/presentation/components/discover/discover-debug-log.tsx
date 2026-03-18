"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { cn } from "@/shared/utils/cn"

interface LogStep {
  label: string
  delay: number
}

const STEPS: LogStep[] = [
  { label: "LLM 랭킹 엔진 (씬 가중치 + 다출처 평가)", delay: 0 },
  { label: "후보 10개 JSON 구조화", delay: 1000 },
  { label: "카카오맵 실존 검증", delay: 2000 },
  { label: "내부 DB 기록 매칭", delay: 3000 },
  { label: "사용자 DNA 로딩 (taste + style)", delay: 3500 },
  { label: "LLM 점수 + DNA 점수 블렌딩", delay: 4000 },
  { label: "Top 5 선별 (안전픽/모험픽)", delay: 4500 },
]

interface DiscoverDebugLogProps {
  isLoading: boolean
  isNearby: boolean
  scenes: string[]
  areas: string[]
  resultCount?: number
}

export function DiscoverDebugLog({
  isLoading,
  isNearby,
  scenes,
  areas,
  resultCount,
}: DiscoverDebugLogProps) {
  const [visibleCount, setVisibleCount] = useState(0)
  const [done, setDone] = useState(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Reset and start when loading begins
  useEffect(() => {
    if (isLoading) {
      setVisibleCount(0)
      setDone(false)

      const timers = STEPS.map((step, i) =>
        setTimeout(() => setVisibleCount(i + 1), step.delay),
      )
      timersRef.current = timers

      return () => timers.forEach(clearTimeout)
    }
  }, [isLoading])

  // Mark done when loading finishes
  useEffect(() => {
    if (!isLoading && visibleCount > 0) {
      setVisibleCount(STEPS.length)
      const t = setTimeout(() => setDone(true), 300)
      return () => clearTimeout(t)
    }
  }, [isLoading, visibleCount])

  if (done) return null

  const queryDesc = [
    isNearby ? "GPS nearby" : null,
    ...areas,
    ...scenes,
  ].filter(Boolean).join(", ") || "default"

  return (
    <div className="rounded-xl bg-neutral-900 p-3 font-mono text-[11px] leading-relaxed">
      {/* Header */}
      <div className="text-green-400">
        {`> discover-engine --query="${queryDesc}"`}
      </div>
      <div className="mt-1 text-neutral-500">
        {`[${new Date().toLocaleTimeString("ko-KR")}] pipeline started`}
      </div>

      {/* Steps */}
      <div className="mt-2 flex flex-col gap-0.5">
        {STEPS.slice(0, visibleCount).map((step, i) => {
          const isLast = i === visibleCount - 1
          const isComplete = !isLoading || !isLast

          return (
            <div
              key={step.label}
              className={cn(
                "flex items-center gap-1.5 transition-opacity duration-200",
                isLast && isLoading ? "text-yellow-400" : "text-neutral-400",
              )}
            >
              {isComplete ? (
                <Check className="h-3 w-3 shrink-0 text-green-500" />
              ) : (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-yellow-400" />
              )}
              <span>{step.label}</span>
              {isComplete && (
                <span className="text-neutral-600 ml-auto">
                  {`${((STEPS[i + 1]?.delay ?? (step.delay + 400)) - step.delay)}ms`}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Result summary */}
      {!isLoading && resultCount != null && (
        <div className="mt-2 border-t border-neutral-700 pt-2 text-green-400">
          {`> ${resultCount}건 추천 완료`}
        </div>
      )}
    </div>
  )
}
