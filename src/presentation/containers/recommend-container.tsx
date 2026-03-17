"use client"

import { useState } from "react"
import { Sparkles, MapPin, Loader2, Star } from "lucide-react"
import { useRecommendation } from "@/application/hooks/use-recommendation"
import { useGeolocation } from "@/application/hooks/use-geolocation"
import { TasteDnaRadar } from "@/presentation/components/profile/taste-dna-radar"
import { RESTAURANT_SCENES } from "@/shared/constants/scenes"

export function RecommendContainer() {
  const [selectedScene, setSelectedScene] = useState<string | null>(null)
  const { recommendations, tasteDna, isLoading, error, requestRecommendation } =
    useRecommendation()
  const { location, requestLocation } = useGeolocation()

  const handleRecommend = async () => {
    const params: { scene?: string; location?: { lat: number; lng: number } } = {}
    if (selectedScene) params.scene = selectedScene
    if (location) params.location = { lat: location.lat, lng: location.lng }
    await requestRecommendation(params)
  }

  const dnaAxes = tasteDna
    ? [
        { label: "매운맛", value: tasteDna.spicy },
        { label: "단맛", value: tasteDna.sweet },
        { label: "짠맛", value: tasteDna.salty },
        { label: "신맛", value: tasteDna.sour },
        { label: "감칠맛", value: tasteDna.umami },
        { label: "풍미", value: tasteDna.rich },
      ]
    : null

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-4">
      {/* Taste DNA */}
      <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-sm)]">
        <h2 className="text-sm font-semibold text-neutral-700 mb-1">나의 Taste DNA</h2>
        {dnaAxes ? (
          <TasteDnaRadar axes={dnaAxes} size={160} />
        ) : (
          <p className="text-xs text-neutral-400 py-4 text-center">
            기록이 쌓이면 AI가 맛 DNA를 분석해요
          </p>
        )}
      </div>

      {/* Scene filter */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">상황 선택</h3>
        <div className="flex flex-wrap gap-2">
          {RESTAURANT_SCENES.map((scene) => (
            <button
              key={scene.value}
              type="button"
              onClick={() =>
                setSelectedScene((prev) => (prev === scene.value ? null : scene.value))
              }
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                selectedScene === scene.value
                  ? "bg-primary-500 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {scene.label}
            </button>
          ))}
        </div>
      </div>

      {/* Location + Request */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={requestLocation}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-3 text-xs font-medium transition-colors ${
            location
              ? "bg-green-50 text-green-600 ring-1 ring-green-200"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          {location ? "위치 적용됨" : "내 위치"}
        </button>
        <button
          type="button"
          onClick={handleRecommend}
          disabled={isLoading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          추천 받기
        </button>
      </div>

      {/* Results */}
      {recommendations.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-neutral-700">
            추천 맛집 ({recommendations.length})
          </h3>
          {recommendations.map((rec, i) => (
            <div
              key={rec.id}
              className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-500">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-800">{rec.name}</p>
                {rec.genre && (
                  <span className="mt-0.5 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                    {rec.genre}
                  </span>
                )}
                {rec.address && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                    <MapPin className="h-3 w-3" />
                    {rec.address}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-0.5 text-xs font-semibold text-amber-500">
                <Star className="h-3.5 w-3.5 fill-amber-500" />
                {rec.score}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-center text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
