"use client"

import { Heart } from "lucide-react"
import { EmptyState } from "@/presentation/components/ui/empty-state"
import { ROUTES } from "@/shared/constants/routes"

export function CompatibilityContainer() {
  return (
    <div className="px-4 pt-6 pb-4">
      <EmptyState
        icon={Heart}
        title="맛 궁합 매칭"
        description="친구와의 맛 궁합을 확인하세요. 곧 만나요!"
        actionLabel="홈으로"
        actionHref={ROUTES.HOME}
      />
    </div>
  )
}
