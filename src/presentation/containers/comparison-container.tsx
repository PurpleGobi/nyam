"use client"

import { Trophy } from "lucide-react"
import { EmptyState } from "@/presentation/components/ui/empty-state"
import { ROUTES } from "@/shared/constants/routes"

export function ComparisonContainer() {
  return (
    <div className="px-4 pt-6 pb-4">
      <EmptyState
        icon={Trophy}
        title="비교 게임"
        description="기록을 비교하고 진짜 순위를 매겨보세요. Phase 3에서 만나요!"
        actionLabel="홈으로"
        actionHref={ROUTES.HOME}
      />
    </div>
  )
}
