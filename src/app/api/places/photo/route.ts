import { NextRequest, NextResponse } from 'next/server'

/**
 * Google Places Photo 프록시.
 *
 * 입력:  GET /api/places/photo?name={photo_name}&max=800
 * 동작:  Google Places Photo API (New) 호출 → 실제 이미지 URL로 302 redirect
 *
 * - photo_name 형식: "places/XXX/photos/YYY" (Edge Function이 DB에 저장한 값 그대로)
 * - Google API 키를 클라이언트에 노출하지 않기 위한 서버 프록시
 * - skipHttpRedirect=true로 photoUri(JSON)만 받고 서버가 302 내려줌
 * - Google CDN이 실제 이미지 서빙 → 원본 저작권 준수 (재호스팅/저장 없음)
 */

const DEFAULT_MAX = 800

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY missing' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')
  const maxParam = searchParams.get('max')
  const max = maxParam ? Math.min(Math.max(parseInt(maxParam, 10) || DEFAULT_MAX, 100), 1600) : DEFAULT_MAX

  if (!name || !/^places\/[^/]+\/photos\/[^/]+$/.test(name)) {
    return NextResponse.json({ error: 'invalid name' }, { status: 400 })
  }

  try {
    const url =
      `https://places.googleapis.com/v1/${name}/media` +
      `?maxHeightPx=${max}&skipHttpRedirect=true&key=${encodeURIComponent(apiKey)}`

    const resp = await fetch(url, { cache: 'no-store' })
    if (!resp.ok) {
      return NextResponse.json({ error: 'places fetch failed' }, { status: resp.status })
    }
    const data = (await resp.json()) as { photoUri?: string }
    const photoUri = data.photoUri
    if (!photoUri) {
      return NextResponse.json({ error: 'no photoUri' }, { status: 502 })
    }

    // Google CDN으로 302 redirect. 클라이언트는 이 응답을 <img src>로 사용.
    return NextResponse.redirect(photoUri, {
      status: 302,
      headers: {
        // 브라우저 이미지 캐시 1시간 (photoUri 만료 대응)
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
