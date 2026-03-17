"use client"

import { Gift } from "lucide-react"
import { EmptyState } from "@/presentation/components/ui/empty-state"
import { ROUTES } from "@/shared/constants/routes"

export function WrappedContainer() {
  return (
    <div className="px-4 pt-6 pb-4">
      <EmptyState
        icon={Gift}
        title="Nyam Wrapped"
        description="올 한 해의 맛 여정을 돌아보세요. 연말에 만나요!"
        actionLabel="홈으로"
        actionHref={ROUTES.HOME}
      />
    </div>
  )
}
