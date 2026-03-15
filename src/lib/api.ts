import type { FilterState, Restaurant } from "@/types"
import { mockRestaurants } from "@/data/mock-restaurants"
import { filterRestaurants } from "@/lib/filter"

export interface RecommendResponse {
  restaurants: Restaurant[]
  query: string
}

export interface VerificationResult {
  verified: boolean
  status: "open" | "closed" | "unknown"
  reviews: { source: string; content: string; rating: number }[]
  rating: {
    naver: number | null
    kakao: number | null
    google: number | null
    average: number
  }
}

export async function recommendRestaurants(
  filters: FilterState,
): Promise<Restaurant[]> {
  try {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters),
    })

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`)
    }

    const data: RecommendResponse = await res.json()
    return data.restaurants
  } catch (error) {
    console.warn("API 호출 실패, 목업 데이터로 폴백:", error)
    return filterRestaurants(mockRestaurants, filters)
  }
}

export async function verifyRestaurant(
  name: string,
  address: string,
): Promise<VerificationResult> {
  const res = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, address }),
  })

  if (!res.ok) {
    throw new Error(`Verification API error: ${res.status}`)
  }

  return res.json() as Promise<VerificationResult>
}

const SESSION_KEY = "matzip-results"

export function saveResultsToSession(restaurants: Restaurant[]): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(restaurants))
}

export function loadResultsFromSession(): Restaurant[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Restaurant[]) : null
  } catch {
    return null
  }
}

export function getRestaurantFromSession(id: string): Restaurant | null {
  const results = loadResultsFromSession()
  return results?.find((r) => r.id === id) ?? null
}
