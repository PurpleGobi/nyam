import { MapPin, Clock, Car, ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react"
import type { DiscoverResult } from "@/domain/entities/discover"
import { cn } from "@/shared/utils/cn"

const RANK_STYLES: Record<number, { badge: string; label: string }> = {
  1: { badge: "bg-amber-500 text-white", label: "1" },
  2: { badge: "bg-neutral-400 text-white", label: "2" },
  3: { badge: "bg-amber-700 text-white", label: "3" },
}

interface DiscoverResultCardProps {
  result: DiscoverResult
  onFeedback?: (feedback: "good" | "bad") => void
}

export function DiscoverResultCard({ result, onFeedback }: DiscoverResultCardProps) {
  const rankStyle = RANK_STYLES[result.rank]
  const { restaurant, practicalInfo, scores, reason, highlights } = result

  return (
    <div className="rounded-2xl bg-white shadow-[var(--shadow-sm)] overflow-hidden">
      <div className="p-4">
        {/* Header: rank + name + score */}
        <div className="flex items-start gap-3">
          {rankStyle && (
            <span className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
              rankStyle.badge,
            )}>
              {rankStyle.label}
            </span>
          )}
          {!rankStyle && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold text-neutral-500">
              {result.rank}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-neutral-800 truncate">{restaurant.name}</h3>
            <p className="mt-0.5 text-xs text-primary-600 leading-snug">&quot;{reason}&quot;</p>
          </div>
          <span className="shrink-0 text-lg font-bold text-primary-500">{scores.overall}</span>
        </div>

        {/* Practical info row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
          {result.distance != null && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {result.distance < 1000 ? `${result.distance}m` : `${(result.distance / 1000).toFixed(1)}km`}
            </span>
          )}
          {practicalInfo.parking != null && (
            <span className="flex items-center gap-0.5">
              <Car className="h-3 w-3" />
              {practicalInfo.parking ? "주차가능" : "주차불가"}
            </span>
          )}
          {restaurant.hours && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {restaurant.hours}
            </span>
          )}
          {practicalInfo.priceRange && (
            <PriceIndicator range={practicalInfo.priceRange} />
          )}
        </div>

        {/* Popular menus */}
        {practicalInfo.popularMenus.length > 0 && (
          <p className="mt-2 text-xs text-neutral-600">
            <span className="font-medium">인기 메뉴:</span>{" "}
            {practicalInfo.popularMenus.join(", ")}
          </p>
        )}

        {/* Highlights + internal records */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {highlights.map((h, i) => (
            <span key={i} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
              {h}
            </span>
          ))}
          {result.hasVisited && (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] text-green-600 font-medium">
              방문함
            </span>
          )}
        </div>

        {/* Action row */}
        <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2.5">
          <a
            href={restaurant.kakaoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
          >
            <ExternalLink className="h-3 w-3" />
            카카오맵
          </a>

          {onFeedback && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onFeedback("good")}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-neutral-500 hover:bg-green-50 hover:text-green-600 transition-colors"
              >
                <ThumbsUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onFeedback("bad")}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-neutral-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <ThumbsDown className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PriceIndicator({ range }: { range: string }) {
  const labels: Record<string, string> = {
    budget: "저",
    mid: "중",
    high: "고",
    premium: "특",
  }
  return (
    <span className="font-medium text-amber-600">
      {labels[range] ?? range}
    </span>
  )
}
