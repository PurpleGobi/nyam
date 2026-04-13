import type { RestaurantPrestige } from '@/domain/entities/restaurant'
import { PrestigeBadges } from '@/presentation/components/ui/prestige-badges'

interface MapCompactItemProps {
  name: string
  genre: string | null
  distanceKm: number | null
  myScore: number | null
  followingScore: number | null
  bubbleScore: number | null
  nyamScore: number | null
  googleRating: number | null
  prestige: RestaurantPrestige[]
  inNyamDb: boolean
  isSelected: boolean
  onClick: () => void
  /** 버블 추가 선택 모드 */
  isBubbleSelecting?: boolean
  /** 버블 추가 선택 여부 */
  isBubbleSelected?: boolean
  /** 버블 추가 선택 토글 */
  onBubbleSelectToggle?: () => void
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}

export function MapCompactItem({
  name,
  genre,
  distanceKm,
  myScore,
  followingScore,
  bubbleScore,
  nyamScore,
  googleRating,
  prestige,
  inNyamDb,
  isSelected,
  onClick,
  isBubbleSelecting,
  isBubbleSelected,
  onBubbleSelectToggle,
}: MapCompactItemProps) {
  const meta = [genre, distanceKm != null ? formatDistance(distanceKm) : null]
    .filter(Boolean)
    .join(' \u00B7 ')

  const handleClick = isBubbleSelecting && onBubbleSelectToggle
    ? () => onBubbleSelectToggle()
    : onClick

  const bgColor = isBubbleSelecting && isBubbleSelected
    ? 'var(--accent-food-light)'
    : isSelected ? 'var(--bg-elevated)' : 'transparent'

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center gap-2 text-left transition-all"
      style={{
        padding: '8px 12px',
        backgroundColor: bgColor,
        borderLeft: isSelected
          ? '3px solid var(--accent-food)'
          : '3px solid transparent',
      }}
    >
      {/* 좌: 이름 + 메타 */}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1">
          <span
            className="truncate text-[13px] font-semibold"
            style={{ color: 'var(--text)' }}
          >
            {name}
          </span>
          {prestige.length > 0 && <PrestigeBadges prestige={prestige} />}
          {!inNyamDb && (
            <span
              className="shrink-0 text-[9px] font-bold"
              style={{ color: 'var(--text-hint)' }}
            >
              NEW
            </span>
          )}
        </p>
        {meta && (
          <p
            className="truncate text-[11px]"
            style={{ color: 'var(--text-sub)' }}
          >
            {meta}
          </p>
        )}
      </div>

      {/* 우: 최우선 점수 1개 표시 (내 > 버블 > nyam > google) */}
      <div className="flex shrink-0 items-center">
        {(() => {
          const score = myScore ?? bubbleScore ?? nyamScore ?? googleRating
          if (score == null) return null
          const color = myScore != null ? 'var(--accent-food)' : 'var(--text-sub)'
          return (
            <span
              className="text-[15px] font-bold"
              style={{ color }}
            >
              {score}
            </span>
          )
        })()}
      </div>

    </button>
  )
}
