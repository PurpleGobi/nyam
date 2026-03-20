"use client"

import { useState } from "react"
import { Utensils, MapPin, Wine, Globe } from "lucide-react"
import type { User, UserStats } from "@/domain/entities/user"
import type { TasteDnaRestaurant, TasteDnaWine } from "@/application/hooks/use-taste-dna"
import type { RestaurantStyleDna, WineStyleDna } from "@/application/hooks/use-style-dna"
import { TasteDnaRadar } from "@/presentation/components/profile/taste-dna-radar"
import { cn } from "@/shared/utils/cn"

interface HomeProfileCardProps {
  user: User | null
  stats: UserStats | null
  tasteDnaRestaurant: TasteDnaRestaurant | null
  tasteDnaWine: TasteDnaWine | null
  styleDnaRestaurant: RestaurantStyleDna | null
  styleDnaWine: WineStyleDna | null
}

export function HomeProfileCard({
  user,
  stats,
  tasteDnaRestaurant,
  tasteDnaWine,
  styleDnaRestaurant,
  styleDnaWine,
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
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-sm)]">
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
        sampleCount={tab === "food" ? (tasteDnaRestaurant?.sampleCount ?? 0) : (tasteDnaWine?.sampleCount ?? 0)}
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

      {/* Style DNA */}
      {tab === "food" && styleDnaRestaurant && (
        <div className="mt-3 border-t border-neutral-100 pt-3 space-y-2">
          {styleDnaRestaurant.genres.length > 0 && (
            <div className="flex items-start gap-1.5">
              <Utensils className="h-2.5 w-2.5 mt-0.5 shrink-0 text-neutral-400" />
              <div className="flex flex-wrap gap-1">
                {styleDnaRestaurant.genres.slice(0, 5).map((g) => (
                  <span key={g.genre} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                    {g.genre}
                  </span>
                ))}
              </div>
            </div>
          )}
          {styleDnaRestaurant.areas.length > 0 && (
            <div className="flex items-start gap-1.5">
              <MapPin className="h-2.5 w-2.5 mt-0.5 shrink-0 text-neutral-400" />
              <div className="flex flex-wrap gap-1">
                {styleDnaRestaurant.areas.slice(0, 5).map((a) => (
                  <span key={a.area} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                    {a.area}
                  </span>
                ))}
              </div>
            </div>
          )}
          {styleDnaRestaurant.scenes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {styleDnaRestaurant.scenes.slice(0, 3).map((s) => (
                <span key={s.scene} className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">
                  {s.scene}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Wine Style DNA */}
      {tab === "wine" && styleDnaWine && (
        <div className="mt-3 border-t border-neutral-100 pt-3 space-y-2">
          {styleDnaWine.varieties.length > 0 && (
            <div className="flex items-start gap-1.5">
              <Wine className="h-2.5 w-2.5 mt-0.5 shrink-0 text-neutral-400" />
              <div className="flex flex-wrap gap-1">
                {styleDnaWine.varieties.slice(0, 5).map((v) => (
                  <span key={v.variety} className="rounded-full bg-wine-light px-2 py-0.5 text-[10px] font-medium text-wine">
                    {v.variety}
                  </span>
                ))}
              </div>
            </div>
          )}
          {styleDnaWine.regions.length > 0 && (
            <div className="flex items-start gap-1.5">
              <Globe className="h-2.5 w-2.5 mt-0.5 shrink-0 text-neutral-400" />
              <div className="flex flex-wrap gap-1">
                {styleDnaWine.regions.slice(0, 5).map((r) => (
                  <span key={r.region} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                    {r.region}
                  </span>
                ))}
              </div>
            </div>
          )}
          {styleDnaWine.types.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {styleDnaWine.types.slice(0, 5).map((t) => (
                <span key={t.type} className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">
                  {t.type}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
