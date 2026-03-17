"use client"

import { useState } from "react"
import { useAuth } from "@/application/hooks/use-auth"
import { useProfile } from "@/application/hooks/use-profile"
import { useTasteDna } from "@/application/hooks/use-taste-dna"
import { TasteDnaRadar } from "@/presentation/components/profile/taste-dna-radar"
import { StatsSummary } from "@/presentation/components/profile/stats-summary"
import { LevelBadge } from "@/presentation/components/profile/level-badge"
import { cn } from "@/shared/utils/cn"
import { LogOut, Settings } from "lucide-react"

export function ProfileContainer() {
  const { signOut } = useAuth()
  const { user, stats } = useProfile()
  const { restaurant: tasteDnaRestaurant, wine: tasteDnaWine } = useTasteDna(user?.id ?? null)
  const [dnaTab, setDnaTab] = useState<"food" | "wine" | "cooking">("food")

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
    <div className="flex flex-col gap-4 px-4 pt-6 pb-4">
      {/* Profile header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-neutral-100 flex items-center justify-center text-lg font-semibold text-neutral-500">
            {user?.nickname?.charAt(0) ?? "?"}
          </div>
          <div>
            <p className="text-lg font-semibold text-neutral-800">{user?.nickname ?? "게스트"}</p>
            <LevelBadge level={stats?.nyamLevel ?? 1} points={stats?.points ?? 0} />
          </div>
        </div>
        <div className="flex gap-1">
          <button type="button" className="p-2 text-neutral-400 hover:text-neutral-600">
            <Settings className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => signOut()} className="p-2 text-neutral-400 hover:text-neutral-600">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      <StatsSummary stats={stats} />

      {/* DNA Tabs */}
      <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
        <div className="flex gap-1 mb-3">
          {(["food", "wine", "cooking"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setDnaTab(tab)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors",
                dnaTab === tab
                  ? tab === "wine" ? "bg-wine text-white" : "bg-primary-500 text-white"
                  : "bg-neutral-100 text-neutral-500",
              )}
            >
              {tab === "food" ? "Food" : tab === "wine" ? "Wine" : "Cooking"} DNA
            </button>
          ))}
        </div>

        <TasteDnaRadar
          axes={dnaTab === "wine" ? wineAxes : foodAxes}
          color={dnaTab === "wine" ? "var(--color-wine)" : "var(--color-primary-500)"}
        />
      </div>
    </div>
  )
}
