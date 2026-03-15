import type { FilterState, Restaurant, RecommendationHistory } from "@/types"

const STORAGE_KEYS = {
  HISTORY: "nyam-history",
  FAVORITES: "nyam-favorites",
  VISITED: "nyam-visited",
  RECENT_VIEWS: "nyam-recent-views",
} as const

const MAX_RECENT_VIEWS = 50

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function setItem(key: string, value: unknown): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

// --- History ---

export function saveRecommendation(
  filters: FilterState,
  results: Restaurant[],
): void {
  const history = getHistory()
  const entry: RecommendationHistory = {
    id: crypto.randomUUID(),
    filters,
    results,
    createdAt: new Date().toISOString(),
    favorites: [],
    visited: [],
  }
  history.unshift(entry)
  setItem(STORAGE_KEYS.HISTORY, history)
}

export function getHistory(): RecommendationHistory[] {
  return getItem<RecommendationHistory[]>(STORAGE_KEYS.HISTORY, [])
}

export function deleteHistory(id: string): void {
  const history = getHistory().filter((h) => h.id !== id)
  setItem(STORAGE_KEYS.HISTORY, history)
}

// --- Favorites ---

export function toggleFavorite(restaurantId: string): void {
  const favs = getFavorites()
  const idx = favs.indexOf(restaurantId)
  if (idx >= 0) {
    favs.splice(idx, 1)
  } else {
    favs.push(restaurantId)
  }
  setItem(STORAGE_KEYS.FAVORITES, favs)
}

export function getFavorites(): string[] {
  return getItem<string[]>(STORAGE_KEYS.FAVORITES, [])
}

export function isFavorite(restaurantId: string): boolean {
  return getFavorites().includes(restaurantId)
}

// --- Visited ---

export function toggleVisited(restaurantId: string): void {
  const visited = getVisited()
  const idx = visited.indexOf(restaurantId)
  if (idx >= 0) {
    visited.splice(idx, 1)
  } else {
    visited.push(restaurantId)
  }
  setItem(STORAGE_KEYS.VISITED, visited)
}

export function getVisited(): string[] {
  return getItem<string[]>(STORAGE_KEYS.VISITED, [])
}

export function isVisited(restaurantId: string): boolean {
  return getVisited().includes(restaurantId)
}

// --- Recent Views ---

export function addRecentView(restaurantId: string): void {
  const views = getRecentViews()
  const filtered = views.filter((id) => id !== restaurantId)
  filtered.unshift(restaurantId)
  setItem(STORAGE_KEYS.RECENT_VIEWS, filtered.slice(0, MAX_RECENT_VIEWS))
}

export function getRecentViews(): string[] {
  return getItem<string[]>(STORAGE_KEYS.RECENT_VIEWS, [])
}

// --- Helper: get all restaurants from history by IDs ---

export function getRestaurantsFromHistory(ids: string[]): Restaurant[] {
  const history = getHistory()
  const allRestaurants = history.flatMap((h) => h.results)
  const idSet = new Set(ids)
  const seen = new Set<string>()
  const result: Restaurant[] = []
  for (const r of allRestaurants) {
    if (idSet.has(r.id) && !seen.has(r.id)) {
      seen.add(r.id)
      result.push(r)
    }
  }
  return result
}
