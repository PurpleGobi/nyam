import { MapPin, Clock, Car, ThumbsUp, ThumbsDown, ExternalLink, Star, Award, Tv, Timer, ChefHat, Bookmark, Quote } from "lucide-react"
import type { DiscoverResult, PlatformLink, ReputationBadge } from "@/domain/entities/discover"
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
    <div className="rounded-2xl bg-card shadow-[var(--shadow-sm)] overflow-hidden">
      {/* 대표 사진 */}
      {result.photos.length > 0 && (
        <div className="flex h-32 gap-0.5 overflow-hidden">
          {result.photos.slice(0, 3).map((url, i) => (
            <div
              key={i}
              className={cn(
                "relative overflow-hidden bg-neutral-100",
                result.photos.length === 1 ? "w-full" : result.photos.length === 2 ? "w-1/2" : i === 0 ? "w-1/2" : "w-1/4",
              )}
            >
              <img
                src={url}
                alt={`${restaurant.name} ${i + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      <div className="p-4">
        {/* Header: rank + name + badges + score */}
        <div className="flex items-start gap-3">
          {rankStyle ? (
            <span className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
              rankStyle.badge,
            )}>
              {rankStyle.label}
            </span>
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold text-neutral-500">
              {result.rank}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-neutral-800 truncate">{restaurant.name}</h3>
            {/* 명성 배지 */}
            {result.badges.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {result.badges.map((badge, i) => (
                  <BadgeChip key={i} badge={badge} />
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-primary-600 leading-snug">&quot;{reason}&quot;</p>
          </div>
          <span className="shrink-0 text-lg font-bold text-primary-500">{scores.overall}</span>
        </div>

        {/* 리뷰 스니펫 */}
        {result.reviewSnippet && (
          <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-neutral-50 px-3 py-2">
            <Quote className="mt-0.5 h-3 w-3 shrink-0 text-neutral-400" />
            <div className="min-w-0">
              <p className="text-[11px] text-neutral-700 leading-snug">{result.reviewSnippet.summary}</p>
              <div className="mt-0.5 flex items-center gap-1">
                <span className="text-[10px] text-neutral-400">{result.reviewSnippet.source}</span>
                {result.reviewSnippet.url && (
                  <a
                    href={result.reviewSnippet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-400 hover:text-blue-500"
                  >
                    원문 보기
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

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

        {/* Highlights + visited */}
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

        {/* 지도 링크 + 피드백 */}
        <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2.5">
          {/* 플랫폼 링크들 (별점 포함) */}
          <div className="flex items-center gap-3">
            {result.platformLinks.length > 0 ? (
              result.platformLinks.map((link) => (
                <PlatformLinkChip key={link.platform} link={link} />
              ))
            ) : (
              <a
                href={restaurant.kakaoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
              >
                <ExternalLink className="h-3 w-3" />
                카카오맵
              </a>
            )}
          </div>

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

/* ── Sub-components ─────────────────────────────────── */

const PLATFORM_COLORS: Record<string, { text: string; hover: string; label: string }> = {
  kakao: { text: "text-yellow-600", hover: "hover:text-yellow-700", label: "카카오" },
  naver: { text: "text-green-600", hover: "hover:text-green-700", label: "네이버" },
  google: { text: "text-blue-500", hover: "hover:text-blue-600", label: "구글" },
}

function PlatformLinkChip({ link }: { link: PlatformLink }) {
  const style = PLATFORM_COLORS[link.platform] ?? PLATFORM_COLORS.kakao
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("flex items-center gap-1 text-[11px]", style.text, style.hover)}
    >
      <ExternalLink className="h-2.5 w-2.5" />
      <span className="font-medium">{style.label}</span>
      {link.rating != null && (
        <span className="flex items-center gap-0.5">
          <Star className="h-2.5 w-2.5 fill-current" />
          {link.rating.toFixed(1)}
        </span>
      )}
    </a>
  )
}

const BADGE_STYLES: Record<string, { bg: string; text: string; icon: typeof Award }> = {
  michelin: { bg: "bg-red-50", text: "text-red-600", icon: Award },
  blue_ribbon: { bg: "bg-blue-50", text: "text-blue-600", icon: Award },
  tv: { bg: "bg-purple-50", text: "text-purple-600", icon: Tv },
  nofo: { bg: "bg-amber-50", text: "text-amber-700", icon: Timer },
  specialty: { bg: "bg-emerald-50", text: "text-emerald-600", icon: ChefHat },
  catch_table: { bg: "bg-orange-50", text: "text-orange-600", icon: Bookmark },
}

function BadgeChip({ badge }: { badge: ReputationBadge }) {
  const style = BADGE_STYLES[badge.type] ?? BADGE_STYLES.tv
  const Icon = style.icon
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium", style.bg, style.text)}>
      <Icon className="h-2.5 w-2.5" />
      {badge.label}
    </span>
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
