import type { FilterState, Restaurant } from "@/types"

export function filterRestaurants(
  restaurants: Restaurant[],
  filters: FilterState
): Restaurant[] {
  return restaurants.filter((restaurant) => {
    if (filters.cuisines.length > 0) {
      if (!filters.cuisines.includes(restaurant.cuisine)) return false
    }

    if (filters.priceRange.length > 0) {
      if (!filters.priceRange.includes(restaurant.priceRange)) return false
    }

    if (filters.moods.length > 0) {
      const hasMatchingMood = filters.moods.some((mood) =>
        restaurant.mood.includes(mood)
      )
      if (!hasMatchingMood) return false
    }

    if (filters.areas.length > 0) {
      const hasMatchingArea = filters.areas.some(
        (area) =>
          restaurant.region.includes(area) ||
          restaurant.shortAddress.includes(area)
      )
      if (!hasMatchingArea) return false
    }

    if (filters.occasions.length > 0) {
      const hasMatchingOccasion = filters.occasions.some((occasion) =>
        restaurant.mood.includes(occasion)
      )
      if (!hasMatchingOccasion) return false
    }

    if (filters.options.parking || filters.options.reservation || filters.options.noWaiting) {
      // 목업에서는 옵션 필터 패스 (실제 데이터에서 구현)
    }

    return true
  })
}

export function parseFiltersFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): FilterState {
  const toArray = (value: string | string[] | undefined): string[] => {
    if (!value) return []
    if (Array.isArray(value)) return value
    return value.split(",").filter(Boolean)
  }

  return {
    areas: toArray(searchParams.areas),
    partySize: (searchParams.partySize as string) || "",
    cuisines: toArray(searchParams.cuisines),
    occasions: toArray(searchParams.occasions),
    priceRange: toArray(searchParams.priceRange),
    moods: toArray(searchParams.moods),
    options: {
      parking: searchParams.parking === "true",
      reservation: searchParams.reservation === "true",
      noWaiting: searchParams.noWaiting === "true",
    },
  }
}

const priceRangeLabels: Record<string, string> = {
  cheap: "저렴한",
  moderate: "보통",
  expensive: "고급",
  premium: "프리미엄",
}

export function getPriceRangeLabel(priceRange: string): string {
  return priceRangeLabels[priceRange] || priceRange
}

export function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원"
}
