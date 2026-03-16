import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import {
  FOOD_CATEGORIES,
  FLAVOR_TAGS,
  TEXTURE_TAGS,
} from '@/shared/constants/categories'

/**
 * POST /api/records/enrich
 *
 * Background enrichment: AI analyzes photos + location to identify
 * restaurant, menu, prices, etc. Then updates the record.
 *
 * Called fire-and-forget after Phase 1 save.
 */
export async function POST(request: NextRequest) {
  try {
    const { recordId, photoUrls, location } = await request.json()

    if (!recordId || !Array.isArray(photoUrls)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Skip if no photos to analyze
    if (photoUrls.length === 0) {
      return NextResponse.json({ enriched: false, reason: 'no photos' })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ enriched: false, reason: 'no api key' })
    }

    // Fetch nearby places for context
    let nearbyContext = ''
    if (location?.lat && location?.lng) {
      try {
        const kakaoKey = process.env.KAKAO_REST_API_KEY
        if (kakaoKey) {
          const kakaoRes = await fetch(
            `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&x=${location.lng}&y=${location.lat}&radius=500&sort=distance&size=10`,
            { headers: { Authorization: `KakaoAK ${kakaoKey}` } },
          )
          if (kakaoRes.ok) {
            const kakaoData = await kakaoRes.json()
            const places = (kakaoData.documents ?? []).map((d: Record<string, string>, i: number) =>
              `${i + 1}. ${d.place_name} — ${d.road_address_name || d.address_name} (${d.category_name})`
            )
            nearbyContext = places.length > 0
              ? `\n\n## 주변 식당 (GPS 기반)\n${places.join('\n')}`
              : ''
          }
        }
      } catch {
        // non-critical
      }
    }

    // Download photos and convert to base64 for Gemini
    const photoBase64s: string[] = []
    for (const url of photoUrls.slice(0, 4)) {
      try {
        const res = await fetch(url)
        if (res.ok) {
          const buffer = await res.arrayBuffer()
          photoBase64s.push(Buffer.from(buffer).toString('base64'))
        }
      } catch {
        // skip failed downloads
      }
    }

    if (photoBase64s.length === 0) {
      return NextResponse.json({ enriched: false, reason: 'photo download failed' })
    }

    // Call Gemini for analysis
    const parts = photoBase64s.map(data => ({
      inline_data: { mime_type: 'image/jpeg', data },
    }))

    parts.push({
      inline_data: undefined as never,
      ...{ text: `당신은 음식점 방문 분석 전문가입니다. 사진을 분석하여 JSON으로 응답하세요.
${nearbyContext}

## 필수 규칙
- "category"는 반드시 아래 허용 목록 중 하나의 값(영문 key)을 그대로 사용하세요. 목록에 없는 값은 절대 사용하지 마세요.
- "flavorTags"는 반드시 아래 맛 태그 허용 목록에 있는 값만 사용하세요.
- "textureTags"는 반드시 아래 식감 태그 허용 목록에 있는 값만 사용하세요.

## category 허용 목록
${FOOD_CATEGORIES.map(c => `- "${c.value}" → ${c.label}`).join('\n')}

## flavorTags 허용 목록
[${FLAVOR_TAGS.map(t => `"${t}"`).join(', ')}]

## textureTags 허용 목록
[${TEXTURE_TAGS.map(t => `"${t}"`).join(', ')}]

## 응답 형식
{
  "restaurantName": "식당 이름 (간판에서 읽거나 추정, 없으면 빈 문자열)",
  "category": "${FOOD_CATEGORIES.map(c => c.value).join(' | ')}",
  "orderedItems": ["주문 메뉴 추정"],
  "menuItems": [{"name": "메뉴명", "price": 가격숫자}],
  "totalCost": 총액_또는_null,
  "perPersonCost": 인당_또는_null,
  "companionCount": 인원수(기본1),
  "flavorTags": ["해당하는 맛 태그"],
  "textureTags": ["해당하는 식감 태그"]
}

JSON만 반환하세요.` },
    } as never)

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { response_mime_type: 'application/json' },
        }),
      },
    )

    if (!geminiRes.ok) {
      console.error('[enrich] Gemini failed:', geminiRes.status)
      return NextResponse.json({ enriched: false, reason: 'gemini failed' })
    }

    const geminiData = await geminiRes.json()
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return NextResponse.json({ enriched: false, reason: 'empty response' })
    }

    let analysis: Record<string, unknown>
    try {
      analysis = JSON.parse(text)
    } catch {
      console.error('[enrich] JSON parse failed:', text.slice(0, 300))
      return NextResponse.json({ enriched: false, reason: 'parse failed' })
    }

    // Update record with enriched data
    const supabase = await createClient()
    const updateData: Record<string, unknown> = {
      ai_recognized: true,
    }

    const restaurantName = analysis.restaurantName as string
    if (restaurantName) {
      updateData.menu_name = restaurantName
    }

    const orderedItems = analysis.orderedItems as string[]
    if (Array.isArray(orderedItems) && orderedItems.length > 0) {
      // Use first ordered item as menu_name if restaurant name found
      if (restaurantName) {
        updateData.menu_name = orderedItems[0]
      }
    }

    const categoryValues = FOOD_CATEGORIES.map(c => c.value)
    const category = analysis.category as string
    if (category && categoryValues.includes(category)) {
      updateData.category = category
    }

    const flavorTags = analysis.flavorTags as string[]
    if (Array.isArray(flavorTags)) {
      updateData.flavor_tags = flavorTags.filter(t => (FLAVOR_TAGS as readonly string[]).includes(t))
    }

    const textureTags = analysis.textureTags as string[]
    if (Array.isArray(textureTags)) {
      updateData.texture_tags = textureTags.filter(t => (TEXTURE_TAGS as readonly string[]).includes(t))
    }

    const totalCost = analysis.totalCost as number | null
    if (totalCost) updateData.total_cost = totalCost

    const perPersonCost = analysis.perPersonCost as number | null
    if (perPersonCost) updateData.price_per_person = perPersonCost

    const companionCount = analysis.companionCount as number | null
    if (companionCount) updateData.companion_count = companionCount

    // Save AI analysis result
    await supabase.from('record_ai_analyses' as never).insert({
      record_id: recordId,
      raw_response: analysis,
      identified_restaurant: restaurantName ? { name: restaurantName, matchedPlaceId: null, confidence: 0.8 } : null,
      extracted_menu_items: analysis.menuItems ?? [],
      ordered_items: orderedItems ?? [],
      receipt_data: totalCost ? { totalCost, perPersonCost, itemCount: null } : null,
      companion_data: companionCount ? { count: companionCount, occasion: null } : null,
      photo_classifications: [],
      confidence_score: 0.8,
    } as never)

    // Update the record
    const { error: updateError } = await supabase
      .from('records')
      .update(updateData)
      .eq('id', recordId)

    if (updateError) {
      console.error('[enrich] Update failed:', updateError.message)
      return NextResponse.json({ enriched: false, reason: updateError.message })
    }

    return NextResponse.json({ enriched: true })
  } catch (error) {
    console.error('[enrich] Error:', error)
    return NextResponse.json({ enriched: false, reason: 'unexpected error' })
  }
}
