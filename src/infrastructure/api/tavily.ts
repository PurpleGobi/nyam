// src/infrastructure/api/tavily.ts
// 서버 전용 — TAVILY_API_KEY 클라이언트 노출 금지

const TAVILY_API_URL = 'https://api.tavily.com/search'

interface TavilySearchOptions {
  maxResults?: number
  searchDepth?: 'basic' | 'advanced'
}

export interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
}

export interface TavilySearchResponse {
  answer: string | null
  results: TavilyResult[]
}

export async function searchTavily(
  query: string,
  options?: TavilySearchOptions,
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not configured')
  }

  const response = await fetch(TAVILY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: options?.searchDepth ?? 'basic',
      include_answer: true,
      max_results: options?.maxResults ?? 5,
    }),
  })

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  return {
    answer: (data.answer as string) ?? null,
    results: Array.isArray(data.results)
      ? (data.results as Array<Record<string, unknown>>).map((r) => ({
          title: (r.title as string) ?? '',
          url: (r.url as string) ?? '',
          content: (r.content as string) ?? '',
          score: (r.score as number) ?? 0,
        }))
      : [],
  }
}

export async function searchRestaurantInfo(
  restaurantName: string,
  area?: string,
): Promise<TavilySearchResponse> {
  const locationPart = area ? ` ${area}` : ''
  const query = `${restaurantName}${locationPart} 식당 메뉴 리뷰 영업시간`

  return searchTavily(query, { maxResults: 5, searchDepth: 'advanced' })
}
