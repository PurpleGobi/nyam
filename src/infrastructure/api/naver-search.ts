import 'server-only'

const NAVER_SEARCH_URL = 'https://openapi.naver.com/v1/search/local.json'

interface NaverSearchParams {
  readonly query: string
  readonly display?: number
  readonly start?: number
}

interface NaverPlace {
  readonly title: string // May contain <b> tags
  readonly link: string
  readonly category: string
  readonly description: string
  readonly telephone: string
  readonly address: string
  readonly roadAddress: string
  readonly mapx: string
  readonly mapy: string
}

interface NaverSearchResponse {
  readonly total: number
  readonly start: number
  readonly display: number
  readonly items: readonly NaverPlace[]
}

/**
 * Search restaurants via Naver Local Search API.
 * Sorted by comment count (review popularity) by default.
 */
export async function searchNaverPlaces(params: NaverSearchParams): Promise<NaverSearchResponse> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Naver API credentials not configured')
  }

  const url = new URL(NAVER_SEARCH_URL)
  url.searchParams.set('query', params.query)
  url.searchParams.set('display', String(params.display ?? 5))
  url.searchParams.set('start', String(params.start ?? 1))
  url.searchParams.set('sort', 'comment') // Sort by review count

  const response = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`Naver API error: ${response.status}`)
  }

  return response.json() as Promise<NaverSearchResponse>
}

/** Strip HTML tags from Naver's title (they wrap matches in <b> tags) */
export function cleanNaverTitle(title: string): string {
  return title.replace(/<[^>]*>/g, '')
}
