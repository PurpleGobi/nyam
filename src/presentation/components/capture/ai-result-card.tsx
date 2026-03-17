import { Sparkles } from "lucide-react"

interface AiResultCardProps {
  restaurantName?: string | null
  genre?: string | null
  orderedItems?: string[]
  wineName?: string | null
  wineVariety?: string | null
  cookingDish?: string | null
  confidence?: number
}

export function AiResultCard({
  restaurantName,
  genre,
  orderedItems,
  wineName,
  wineVariety,
  cookingDish,
  confidence,
}: AiResultCardProps) {
  const hasContent = restaurantName || wineName || cookingDish

  if (!hasContent) return null

  return (
    <div className="rounded-2xl bg-primary-50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary-500" />
        <span className="text-xs font-medium text-primary-500">AI 인식 결과</span>
        {confidence != null && (
          <span className="text-[10px] text-neutral-400">
            {Math.round(confidence * 100)}%
          </span>
        )}
      </div>

      {restaurantName && (
        <p className="text-sm font-semibold text-neutral-800">{restaurantName}</p>
      )}
      {genre && (
        <p className="text-xs text-neutral-500 mt-0.5">{genre}</p>
      )}
      {orderedItems && orderedItems.length > 0 && (
        <p className="text-xs text-neutral-500 mt-1">
          {orderedItems.join(", ")}
        </p>
      )}

      {wineName && (
        <p className="text-sm font-semibold text-neutral-800">{wineName}</p>
      )}
      {wineVariety && (
        <p className="text-xs text-neutral-500 mt-0.5">{wineVariety}</p>
      )}

      {cookingDish && (
        <p className="text-sm font-semibold text-neutral-800">{cookingDish}</p>
      )}
    </div>
  )
}
