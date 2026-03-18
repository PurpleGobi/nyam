"use client"

import { useEffect, useRef } from "react"
import { MapPin } from "lucide-react"
import { cn } from "@/shared/utils/cn"
import type { NearbyPlace } from "@/infrastructure/api/kakao-local"

interface NearbyRestaurantPickerProps {
  places: NearbyPlace[]
  selectedId: string | null
  onSelect: (place: NearbyPlace) => void
  isLoading: boolean
  aiMatchedPlaceId?: string
}

export function NearbyRestaurantPicker({
  places,
  selectedId,
  onSelect,
  isLoading,
  aiMatchedPlaceId,
}: NearbyRestaurantPickerProps) {
  const autoSelectedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!aiMatchedPlaceId || places.length === 0) return
    if (autoSelectedRef.current === aiMatchedPlaceId) return

    const matched = places.find((p) => p.externalId === aiMatchedPlaceId)
    if (matched) {
      autoSelectedRef.current = aiMatchedPlaceId
      onSelect(matched)
    }
  }, [aiMatchedPlaceId, places, onSelect])
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-100" />
        ))}
      </div>
    )
  }

  if (places.length === 0) {
    return (
      <p className="text-center text-sm text-neutral-400 py-4">
        주변 식당을 찾지 못했어요
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      {places.map((place) => (
        <button
          key={place.externalId}
          type="button"
          onClick={() => onSelect(place)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors",
            selectedId === place.externalId
              ? "bg-primary-50 border border-primary-500"
              : "bg-card border border-neutral-200 hover:bg-neutral-50",
          )}
        >
          <MapPin className={cn(
            "h-4 w-4 shrink-0",
            selectedId === place.externalId ? "text-primary-500" : "text-neutral-400",
          )} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-neutral-800 truncate">{place.name}</p>
            <p className="text-xs text-neutral-400 truncate">{place.address}</p>
          </div>
          {place.distance > 0 && (
            <span className="text-xs text-neutral-400 shrink-0">{place.distance}m</span>
          )}
        </button>
      ))}
    </div>
  )
}
