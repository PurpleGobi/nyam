import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { searchAndCacheRestaurants } from '@/infrastructure/api/restaurant-search-service'

/**
 * Time-based meal context mapping.
 * Returns appropriate search keywords for the current time of day.
 */
function getMealContext(hour: number): { query: string; label: string } {
  if (hour >= 6 && hour < 10) return { query: '아침 식사 브런치', label: '아침 식사' }
  if (hour >= 10 && hour < 14) return { query: '점심 맛집', label: '점심 추천' }
  if (hour >= 14 && hour < 17) return { query: '카페 디저트 브런치', label: '오후 간식' }
  if (hour >= 17 && hour < 21) return { query: '저녁 맛집 디너', label: '저녁 추천' }
  return { query: '야식 포장마차 치킨', label: '야식 추천' }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const region = searchParams.get('region') ?? undefined
  const cuisine = searchParams.get('cuisine') ?? undefined
  const limit = parseInt(searchParams.get('limit') ?? '6', 10)

  // Determine time-based context
  const hour = new Date().getHours()
  const mealContext = getMealContext(hour)

  // Append cuisine to query if specified
  const query = cuisine
    ? `${cuisine} ${mealContext.query}`
    : mealContext.query

  try {
    const { restaurantIds, total, hasMore } = await searchAndCacheRestaurants({
      query,
      region,
      limit,
    })

    return NextResponse.json({
      restaurantIds,
      total,
      hasMore,
      mealLabel: mealContext.label,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Recommendation failed'
    console.error('Recommendation error:', message)

    if (message.includes('not configured')) {
      return NextResponse.json({ restaurantIds: [], total: 0, hasMore: false, mealLabel: mealContext.label })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
