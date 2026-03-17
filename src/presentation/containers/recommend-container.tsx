"use client"

import { Sparkles } from "lucide-react"
import { EmptyState } from "@/presentation/components/ui/empty-state"
import { ROUTES } from "@/shared/constants/routes"

export function RecommendContainer() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-4">
      {/* Taste DNA summary placeholder */}
      <div className="rounded-2xl bg-white p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-sm font-semibold text-neutral-700 mb-2">나의 Taste DNA</h2>
        <p className="text-xs text-neutral-500">
          기록이 쌓이면 AI가 당신만의 맛 DNA를 분석해요.
          그 데이터를 기반으로 딱 맞는 맛집을 추천해드릴게요.
        </p>
      </div>

      <EmptyState
        icon={Sparkles}
        title="AI 맞춤 추천"
        description="Taste DNA 기반 맞춤 추천을 준비하고 있어요. 곧 만나요!"
        actionLabel="홈으로"
        actionHref={ROUTES.HOME}
      />
    </div>
  )
}
