"use client"

import { useState } from "react"
import type { User, UserStats } from "@/domain/entities/user"
import type { TasteDnaRestaurant, TasteDnaWine } from "@/application/hooks/use-taste-dna"
import { TasteDnaRadar } from "@/presentation/components/profile/taste-dna-radar"
import { cn } from "@/shared/utils/cn"

interface HomeProfileCardProps {
  user: User | null
  stats: UserStats | null
  tasteDnaRestaurant: TasteDnaRestaurant | null
  tasteDnaWine: TasteDnaWine | null
}

export function HomeProfileCard({
  user,
  stats,
  tasteDnaRestaurant,
  tasteDnaWine,
}: HomeProfileCardProps) {
  const [tab, setTab] = useState<"food" | "wine">("food")

  const foodAxes = tasteDnaRestaurant
    ? [
        { label: "매운맛", value: tasteDnaRestaurant.flavorSpicy },
        { label: "단맛", value: tasteDnaRestaurant.flavorSweet },
        { label: "짠맛", value: tasteDnaRestaurant.flavorSalty },
        { label: "신맛", value: tasteDnaRestaurant.flavorSour },
        { label: "감칠맛", value: tasteDnaRestaurant.flavorUmami },
        { label: "풍미", value: tasteDnaRestaurant.flavorRich },
      ]
    : Array.from({ length: 6 }, (_, i) => ({
        label: ["매운맛", "단맛", "짠맛", "신맛", "감칠맛", "풍미"][i],
        value: 50,
      }))

  const wineAxes = tasteDnaWine
    ? [
        { label: "산미", value: tasteDnaWine.prefAcidity },
        { label: "바디", value: tasteDnaWine.prefBody },
        { label: "타닌", value: tasteDnaWine.prefTannin },
        { label: "당도", value: tasteDnaWine.prefSweetness },
        { label: "균형", value: tasteDnaWine.prefBalance },
        { label: "여운", value: tasteDnaWine.prefFinish },
        { label: "향", value: tasteDnaWine.prefAroma },
      ]
    : Array.from({ length: 7 }, (_, i) => ({
        label: ["산미", "바디", "타닌", "당도", "균형", "여운", "향"][i],
        value: 50,
      }))

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-semibold text-neutral-500">
          {user?.nickname?.charAt(0) ?? "?"}
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-800">{user?.nickname ?? "게스트"}</p>
          <p className="text-xs text-neutral-400">
            Lv.{stats?.nyamLevel ?? 1} · {stats?.totalRecords ?? 0}개 기록
          </p>
        </div>
      </div>

      <div className="flex gap-1 mb-3">
        <button
          type="button"
          onClick={() => setTab("food")}
          className={cn(
            "flex-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors",
            tab === "food" ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-500",
          )}
        >
          Food DNA
        </button>
        <button
          type="button"
          onClick={() => setTab("wine")}
          className={cn(
            "flex-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors",
            tab === "wine" ? "bg-wine text-white" : "bg-neutral-100 text-neutral-500",
          )}
        >
          Wine DNA
        </button>
      </div>

      <TasteDnaRadar
        axes={tab === "food" ? foodAxes : wineAxes}
        color={tab === "food" ? "var(--color-primary-500)" : "var(--color-wine)"}
      />

      {tasteDnaRestaurant?.tasteTypeName && tab === "food" && (
        <p className="mt-2 text-center text-xs text-neutral-500">
          {tasteDnaRestaurant.tasteTypeName}
        </p>
      )}
      {tasteDnaWine?.dnaSummary && tab === "wine" && (
        <p className="mt-2 text-center text-xs text-neutral-500">
          {tasteDnaWine.dnaSummary}
        </p>
      )}
    </div>
  )
}
