import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  FOOD_CATEGORIES,
  FLAVOR_TAGS,
  TEXTURE_TAGS,
} from '@/shared/constants/categories'

interface RecognizeRequestBody {
  imageBase64: string
}

interface GeminiContentPart {
  text?: string
  inline_data?: {
    mime_type: string
    data: string
  }
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
  }>
}

interface RecognitionOutput {
  menuName: string
  category: string
  recordType: 'restaurant' | 'wine' | 'cooking'
  flavorTags: string[]
  textureTags: string[]
  confidence: number
}

const CATEGORY_VALUES = FOOD_CATEGORIES.map(c => c.value)

const PROMPT = `사진 속 음식을 분석하여 아래 JSON 형식으로 응답하세요.

## 필수 규칙
- "category"는 반드시 아래 허용 목록 중 하나의 값(영문 key)을 그대로 사용하세요. 목록에 없는 값은 절대 사용하지 마세요.
- "flavorTags"는 반드시 아래 허용 목록에 있는 값만 사용하세요.
- "textureTags"는 반드시 아래 허용 목록에 있는 값만 사용하세요.

## category 허용 목록
${FOOD_CATEGORIES.map(c => `- "${c.value}" → ${c.label}`).join('\n')}

## flavorTags 허용 목록
[${FLAVOR_TAGS.map(t => `"${t}"`).join(', ')}]

## textureTags 허용 목록
[${TEXTURE_TAGS.map(t => `"${t}"`).join(', ')}]

## 응답 형식
{
  "menuName": "메뉴 이름 (한국어 우선)",
  "category": "${CATEGORY_VALUES.join(' | ')}",
  "recordType": "restaurant | wine | cooking",
  "flavorTags": ["해당하는 맛 태그"],
  "textureTags": ["해당하는 식감 태그"],
  "confidence": 0.0~1.0
}

JSON만 반환하세요.`

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ available: false })
  }

  let body: RecognizeRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    )
  }

  if (!body.imageBase64) {
    return NextResponse.json(
      { error: 'imageBase64 is required' },
      { status: 400 },
    )
  }

  const parts: GeminiContentPart[] = [
    { text: PROMPT },
    {
      inline_data: {
        mime_type: 'image/jpeg',
        data: body.imageBase64,
      },
    },
  ]

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
    console.error('[food-recognition] Gemini API failed:', geminiRes.status)
    return NextResponse.json({ available: false })
  }

  const geminiData: GeminiResponse = await geminiRes.json()
  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    console.error('[food-recognition] No text in Gemini response')
    return NextResponse.json({ available: false })
  }

  try {
    const parsed: RecognitionOutput = JSON.parse(text)

    const validCategory = CATEGORY_VALUES.includes(parsed.category)
      ? parsed.category
      : 'korean'
    const validFlavorTags = (parsed.flavorTags ?? []).filter(
      (t: string) => (FLAVOR_TAGS as readonly string[]).includes(t),
    )
    const validTextureTags = (parsed.textureTags ?? []).filter(
      (t: string) => (TEXTURE_TAGS as readonly string[]).includes(t),
    )

    return NextResponse.json({
      available: true,
      menuName: parsed.menuName,
      category: validCategory,
      recordType: parsed.recordType,
      flavorTags: validFlavorTags,
      textureTags: validTextureTags,
      confidence: parsed.confidence,
    })
  } catch {
    console.error('[food-recognition] Failed to parse Gemini JSON:', text)
    return NextResponse.json({ available: false })
  }
}
