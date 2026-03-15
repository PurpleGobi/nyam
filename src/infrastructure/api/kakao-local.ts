import 'server-only'

const KAKAO_API_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json'

interface KakaoSearchParams {
  readonly query: string
  readonly region?: string
  readonly page?: number
  readonly size?: number
}

interface KakaoPlace {
  readonly id: string
  readonly place_name: string
  readonly address_name: string
  readonly road_address_name: string
  readonly phone: string
  readonly category_name: string // e.g., "음식점 > 한식 > 국밥"
  readonly x: string // longitude
  readonly y: string // latitude
  readonly place_url: string
}

interface KakaoSearchResponse {
  readonly documents: readonly KakaoPlace[]
  readonly meta: {
    readonly total_count: number
    readonly pageable_count: number
    readonly is_end: boolean
  }
}

/**
 * Search restaurants via Kakao Local API.
 * Uses category_group_code=FD6 to restrict results to food/restaurants.
 */
export async function searchKakaoPlaces(params: KakaoSearchParams): Promise<KakaoSearchResponse> {
  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) throw new Error('KAKAO_REST_API_KEY is not configured')

  const searchQuery = params.region
    ? `${params.region} ${params.query}`
    : params.query

  const url = new URL(KAKAO_API_URL)
  url.searchParams.set('query', searchQuery)
  url.searchParams.set('category_group_code', 'FD6') // 음식점
  url.searchParams.set('page', String(params.page ?? 1))
  url.searchParams.set('size', String(params.size ?? 15))
  url.searchParams.set('sort', 'accuracy')

  const response = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    next: { revalidate: 3600 }, // Cache for 1 hour
  })

  if (!response.ok) {
    throw new Error(`Kakao API error: ${response.status}`)
  }

  return response.json() as Promise<KakaoSearchResponse>
}

/** Extract cuisine sub-category from Kakao's full category_name string */
export function extractCuisineCategory(categoryName: string): string {
  const parts = categoryName.split(' > ')
  if (parts.length >= 2) return parts[1]
  return '기타'
}

/** Map Kakao cuisine sub-category to our CuisineCategory type */
export function mapKakaoCuisineCategory(category: string): string {
  const mapping: Record<string, string> = {
    '한식': '한식',
    '일식': '일식',
    '중식': '중식',
    '양식': '양식',
    '카페': '카페',
    '분식': '분식',
    '치킨': '치킨',
    '피자': '피자',
    '패스트푸드': '패스트푸드',
    '아시안': '아시안',
    '멕시칸': '멕시칸',
  }
  return mapping[category] ?? '기타'
}
