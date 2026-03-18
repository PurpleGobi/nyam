"use client"

import { useCallback, useState } from "react"
import { Loader2 } from "lucide-react"
import { FOOD_CATEGORIES } from "@/shared/constants/categories"
import { RESTAURANT_SCENES } from "@/shared/constants/scenes"
import { cn } from "@/shared/utils/cn"
import type { OnboardingSelections } from "@/application/hooks/use-discover-onboarding"

const ONBOARDING_AREAS = [
  "강남역", "성수동", "홍대/합정", "이태원/경리단길",
  "여의도", "종로/광화문", "잠실/송파", "기타",
] as const

const ONBOARDING_GENRES = FOOD_CATEGORIES.slice(0, 8)

interface DiscoverOnboardingProps {
  onComplete: (selections: OnboardingSelections) => void
  onSkip: () => void
  isSaving: boolean
}

export function DiscoverOnboarding({ onComplete, onSkip, isSaving }: DiscoverOnboardingProps) {
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set())
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set())
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set())

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) => {
      const next = new Set(prev)
      if (next.has(genre)) { next.delete(genre) } else if (next.size < 3) { next.add(genre) }
      return next
    })
  }, [])

  const toggleArea = useCallback((area: string) => {
    setSelectedAreas((prev) => {
      const next = new Set(prev)
      if (next.has(area)) { next.delete(area) } else if (next.size < 2) { next.add(area) }
      return next
    })
  }, [])

  const toggleScene = useCallback((scene: string) => {
    setSelectedScenes((prev) => {
      const next = new Set(prev)
      if (next.has(scene)) { next.delete(scene) } else if (next.size < 2) { next.add(scene) }
      return next
    })
  }, [])

  const canSubmit = selectedGenres.size >= 1 && selectedAreas.size >= 1 && selectedScenes.size >= 1

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return
    onComplete({
      genres: [...selectedGenres],
      areas: [...selectedAreas],
      scenes: [...selectedScenes],
    })
  }, [canSubmit, selectedGenres, selectedAreas, selectedScenes, onComplete])

  return (
    <div className="flex flex-col gap-6 px-4 pt-8 pb-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-neutral-800">취향을 알려주세요!</h1>
        <p className="mt-1 text-sm text-neutral-500">맞춤 추천을 준비할게요</p>
      </div>

      {/* Genre selection */}
      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-700">
          어떤 음식을 좋아하세요?{" "}
          <span className="font-normal text-neutral-400">(최대 3개)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {ONBOARDING_GENRES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => toggleGenre(cat.value)}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                selectedGenres.has(cat.value)
                  ? "bg-primary-500 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Area selection */}
      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-700">
          자주 가는 지역은?{" "}
          <span className="font-normal text-neutral-400">(최대 2개)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {ONBOARDING_AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => toggleArea(area)}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                selectedAreas.has(area)
                  ? "bg-blue-500 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
              )}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      {/* Scene selection */}
      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-700">
          주로 어떤 상황에서?{" "}
          <span className="font-normal text-neutral-400">(최대 2개)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {RESTAURANT_SCENES.map((scene) => (
            <button
              key={scene.value}
              type="button"
              onClick={() => toggleScene(scene.value)}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                selectedScenes.has(scene.value)
                  ? "bg-amber-500 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
              )}
            >
              {scene.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || isSaving}
        className={cn(
          "mt-2 w-full rounded-xl py-3 text-sm font-semibold transition-all",
          canSubmit
            ? "bg-primary-500 text-white hover:bg-primary-600 active:scale-[0.98]"
            : "bg-neutral-200 text-neutral-400 cursor-not-allowed",
        )}
      >
        {isSaving ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            준비중...
          </span>
        ) : (
          "맞춤 추천 시작하기"
        )}
      </button>

      {/* Skip */}
      <button
        type="button"
        onClick={onSkip}
        disabled={isSaving}
        className="text-sm text-neutral-400 hover:text-neutral-500 transition-colors"
      >
        건너뛰기
      </button>
    </div>
  )
}
