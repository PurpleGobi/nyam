// src/infrastructure/api/google-image-search.ts
// 서버 전용 — GOOGLE_CSE_API_KEY 클라이언트 노출 금지

const CSE_API_URL = 'https://www.googleapis.com/customsearch/v1'

interface ImageSearchResult {
  url: string
  photoUrl: string
  width: number
  height: number
}

/**
 * Google Custom Search API로 와인 라벨 이미지 검색
 * 무료 100회/일, 초과 시 $5/1000회
 */
export async function searchWineLabelImage(wineName: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY
  const cx = process.env.GOOGLE_CSE_CX

  if (!apiKey || !cx) return null

  try {
    const query = `${wineName} wine bottle label`
    const params = new URLSearchParams({
      key: apiKey,
      cx,
      q: query,
      searchType: 'image',
      num: '1',
      imgSize: 'medium',
      safe: 'active',
    })

    const response = await fetch(`${CSE_API_URL}?${params}`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return null

    const data = await response.json()
    const items = data.items as Array<{
      link: string
      image: { thumbnailLink: string; width: number; height: number }
    }> | undefined

    if (!items || items.length === 0) return null

    return items[0].link
  } catch {
    return null
  }
}

/**
 * 여러 와인의 라벨 이미지를 병렬로 검색
 * 하나라도 실패해도 다른 결과에 영향 없음
 */
export async function searchWineLabelImages(
  wineNames: string[],
): Promise<Map<string, string>> {
  const results = new Map<string, string>()

  const apiKey = process.env.GOOGLE_CSE_API_KEY
  const cx = process.env.GOOGLE_CSE_CX
  if (!apiKey || !cx) return results

  const promises = wineNames.map(async (name) => {
    const url = await searchWineLabelImage(name)
    if (url) results.set(name, url)
  })

  await Promise.allSettled(promises)
  return results
}
