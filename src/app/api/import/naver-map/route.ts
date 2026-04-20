import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'

const NAVER_SHARE_API = 'https://pages.map.naver.com/save-pages/api/maps-bookmark/v3/shares'
const PAGE_LIMIT = 50

interface NaverBookmark {
  bookmarkId: number
  name: string
  address: string
  px: number // longitude
  py: number // latitude
  sid: string // naver place id
  mcidName: string
  type: string
}

interface NaverShareResponse {
  folder: { name: string; bookmarkCount: number; shareId: string }
  bookmarkList: NaverBookmark[]
}

// SSRF 방어: 정확히 이 호스트들로의 요청만 허용. substring 검사 금지.
const ALLOWED_HOSTS = new Set(['naver.me', 'pages.map.naver.com', 'map.naver.com'])

function safeParseUrl(input: string): URL | null {
  try {
    const url = new URL(input)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (!ALLOWED_HOSTS.has(url.hostname)) return null
    return url
  } catch {
    return null
  }
}

/** URL 또는 단축 URL에서 shareId 추출 */
async function resolveShareId(input: string): Promise<string | null> {
  // 이미 32자 hex인 경우
  if (/^[a-f0-9]{32}$/.test(input)) return input

  // full URL에서 추출
  const folderMatch = input.match(/folder\/([a-f0-9]{32})/)
  if (folderMatch) return folderMatch[1]

  // 호스트 화이트리스트 통과한 경우만 redirect 수동 추적 (각 단계 재검증)
  const startUrl = safeParseUrl(input)
  if (!startUrl) return null

  let current = startUrl.toString()
  for (let hop = 0; hop < 3; hop++) {
    const res = await fetch(current, { redirect: 'manual' })
    const finalUrl = res.url
    const match = finalUrl.match(/folder\/([a-f0-9]{32})/)
    if (match) return match[1]
    const location = res.headers.get('location')
    if (!location) break
    const next = safeParseUrl(location)
    if (!next) return null
    current = next.toString()
  }
  return null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()
  const rawInput: string = body.shareId || body.url || ''
  if (!rawInput.trim()) {
    return NextResponse.json({ error: 'SHARE_ID_REQUIRED' }, { status: 400 })
  }

  const shareId = await resolveShareId(rawInput.trim())
  if (!shareId) {
    return NextResponse.json({ error: 'INVALID_SHARE_LINK' }, { status: 400 })
  }

  try {
    const allBookmarks: NaverBookmark[] = []
    let start = 0
    let folderName = ''
    let totalCount = 0

    // Fetch first page to get total count
    const firstRes = await fetch(
      `${NAVER_SHARE_API}/${shareId}?start=${start}&limit=${PAGE_LIMIT}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': `https://pages.map.naver.com/save-pages/v2/share/folder/${shareId}`,
        },
      },
    )

    if (!firstRes.ok) {
      const errBody = await firstRes.json().catch(() => null)
      const apiCode = errBody?.apiErrorCode
      if (apiCode === 1003 || firstRes.status === 400) {
        return NextResponse.json({ error: 'INVALID_SHARE_LINK' }, { status: 400 })
      }
      return NextResponse.json({ error: 'NAVER_API_ERROR' }, { status: 502 })
    }

    const firstData: NaverShareResponse = await firstRes.json()
    folderName = firstData.folder.name
    totalCount = firstData.folder.bookmarkCount
    allBookmarks.push(...firstData.bookmarkList)
    start += PAGE_LIMIT

    // Fetch remaining pages
    while (allBookmarks.length < totalCount) {
      const res = await fetch(
        `${NAVER_SHARE_API}/${shareId}?start=${start}&limit=${PAGE_LIMIT}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Referer': `https://pages.map.naver.com/save-pages/v2/share/folder/${shareId}`,
          },
        },
      )
      if (!res.ok) break
      const data: NaverShareResponse = await res.json()
      if (data.bookmarkList.length === 0) break
      allBookmarks.push(...data.bookmarkList)
      start += PAGE_LIMIT
    }

    const places = allBookmarks
      .filter((b) => b.type === 'place')
      .map((b) => ({
        name: b.name,
        address: b.address,
        lng: b.px,
        lat: b.py,
        naverPlaceId: b.sid,
        category: b.mcidName,
      }))

    return NextResponse.json({
      folderName,
      totalCount,
      places,
    })
  } catch {
    return NextResponse.json({ error: 'FETCH_FAILED' }, { status: 502 })
  }
}
