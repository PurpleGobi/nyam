"use client"

import { useState } from "react"
import { Sparkles, Lightbulb, ChevronLeft, MapPin, MessageSquare } from "lucide-react"
import Link from "next/link"
import { useAuthContext } from "@/presentation/providers/auth-provider"
import { useTasteDna } from "@/application/hooks/use-taste-dna"
import { useRecommendation, type Recommendation } from "@/application/hooks/use-recommendation"
import { SITUATIONS } from "@/shared/constants/categories"

export function RecommendContainer() {
  const { user: authUser } = useAuthContext()
  const userId = authUser?.id
  const { data: tasteDna, isLoading: dnaLoading } = useTasteDna(userId)
  const { getRecommendation, recommendations, isLoading, error, isAvailable } = useRecommendation()

  const [selectedSituation, setSelectedSituation] = useState<string | null>(null)
  const [location, setLocation] = useState("")
  const [additionalContext, setAdditionalContext] = useState("")

  const hasTasteDna = tasteDna && tasteDna.sampleCount >= 5

  const handleSubmit = async () => {
    if (!tasteDna || !selectedSituation) return

    await getRecommendation({
      tasteDna: {
        flavorSpicy: tasteDna.flavorSpicy,
        flavorSweet: tasteDna.flavorSweet,
        flavorSalty: tasteDna.flavorSalty,
        flavorSour: tasteDna.flavorSour,
        flavorUmami: tasteDna.flavorUmami,
        flavorRich: tasteDna.flavorRich,
        tasteTypeName: tasteDna.tasteTypeName,
      },
      situation: selectedSituation,
      location: location.trim() || undefined,
      additionalContext: additionalContext.trim() || undefined,
    })
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-neutral-100)]"
        >
          <ChevronLeft className="h-5 w-5 text-[var(--color-neutral-600)]" />
        </Link>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#FF6038]" />
          <h1 className="text-xl font-bold text-[var(--color-neutral-800)]">
            AI 맛집 추천
          </h1>
        </div>
      </div>

      {/* API not available */}
      {isAvailable === false && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-12">
          <Sparkles className="mb-2 h-5 w-5 text-[var(--color-neutral-400)]" />
          <p className="text-center text-sm text-[var(--color-neutral-500)]">
            AI 추천 기능은 준비 중입니다
          </p>
        </div>
      )}

      {/* Taste DNA not ready */}
      {!dnaLoading && !hasTasteDna && isAvailable !== false && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-12">
          <Sparkles className="mb-2 h-5 w-5 text-[var(--color-neutral-400)]" />
          <p className="text-center text-sm text-[var(--color-neutral-500)]">
            기록이 5개 이상이면 AI 추천을 받을 수 있어요
          </p>
          <p className="mt-1 text-center text-xs text-[var(--color-neutral-400)]">
            현재 {tasteDna?.sampleCount ?? 0}개의 기록이 있습니다
          </p>
        </div>
      )}

      {/* Input form */}
      {hasTasteDna && isAvailable !== false && (
        <>
          {/* Situation selector */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-[var(--color-neutral-700)]">
              어떤 상황인가요?
            </h2>
            <div className="flex flex-wrap gap-2">
              {SITUATIONS.map((situation) => (
                <button
                  key={situation}
                  type="button"
                  onClick={() => setSelectedSituation(
                    selectedSituation === situation ? null : situation
                  )}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    selectedSituation === situation
                      ? "bg-[#FF6038] text-white"
                      : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] active:bg-[var(--color-neutral-200)]"
                  }`}
                >
                  {situation}
                </button>
              ))}
            </div>
          </section>

          {/* Location input */}
          <section className="flex flex-col gap-2">
            <label
              htmlFor="location-input"
              className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-neutral-700)]"
            >
              <MapPin className="h-4 w-4" />
              지역 (선택)
            </label>
            <input
              id="location-input"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="강남, 을지로, 홍대..."
              className="rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3 text-sm text-[var(--color-neutral-800)] placeholder:text-[var(--color-neutral-400)] focus:border-[#FF6038] focus:outline-none"
            />
          </section>

          {/* Additional context */}
          <section className="flex flex-col gap-2">
            <label
              htmlFor="context-input"
              className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-neutral-700)]"
            >
              <MessageSquare className="h-4 w-4" />
              추가 요청사항 (선택)
            </label>
            <input
              id="context-input"
              type="text"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="매운거 땡김, 가성비 좋은 곳..."
              className="rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3 text-sm text-[var(--color-neutral-800)] placeholder:text-[var(--color-neutral-400)] focus:border-[#FF6038] focus:outline-none"
            />
          </section>

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedSituation || isLoading}
            className="rounded-xl bg-[#FF6038] px-6 py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {isLoading ? "추천 생성 중..." : "추천 받기"}
          </button>
        </>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl bg-[var(--color-neutral-100)] p-5"
            >
              <div className="mb-3 h-5 w-1/3 rounded bg-[var(--color-neutral-200)]" />
              <div className="mb-2 h-4 w-full rounded bg-[var(--color-neutral-200)]" />
              <div className="h-4 w-2/3 rounded bg-[var(--color-neutral-200)]" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Results */}
      {recommendations.length > 0 && !isLoading && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[var(--color-neutral-700)]">
            추천 결과
          </h2>
          {recommendations.map((rec: Recommendation, index: number) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5"
            >
              <h3 className="text-base font-bold text-[var(--color-neutral-800)]">
                {rec.food}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-neutral-600)]">
                {rec.reason}
              </p>
              <div className="flex items-start gap-2 rounded-xl bg-[#FFF5F2] px-4 py-3">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6038]" />
                <p className="text-sm leading-relaxed text-[var(--color-neutral-700)]">
                  {rec.tip}
                </p>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
