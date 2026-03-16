import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

const VALID_CATEGORIES = [
  'korean', 'japanese', 'chinese', 'western', 'cafe',
  'dessert', 'wine', 'cooking', 'seafood', 'meat', 'vegan', 'street',
] as const

const VALID_FLAVOR_TAGS = [
  '매운', '달콤한', '짭짤한', '시큼한', '감칠맛',
  '담백한', '기름진', '고소한', '향긋한', '깔끔한',
] as const

const VALID_TEXTURE_TAGS = [
  '바삭한', '부드러운', '쫄깃한', '크리미한', '아삭한', '촉촉한',
] as const

const PROMPT = `Analyze the food in this image and return a JSON object with these fields:
- "menuName": the name of the dish (in Korean if identifiable, otherwise English)
- "category": one of [${VALID_CATEGORIES.join(', ')}]
- "recordType": one of ["restaurant", "wine", "cooking"]
- "flavorTags": array of applicable tags from [${VALID_FLAVOR_TAGS.join(', ')}]
- "textureTags": array of applicable tags from [${VALID_TEXTURE_TAGS.join(', ')}]
- "confidence": number between 0 and 1 indicating recognition confidence

Return ONLY the JSON object, no other text.`

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
    return NextResponse.json({
      available: true,
      menuName: parsed.menuName,
      category: parsed.category,
      recordType: parsed.recordType,
      flavorTags: parsed.flavorTags,
      textureTags: parsed.textureTags,
      confidence: parsed.confidence,
    })
  } catch {
    console.error('[food-recognition] Failed to parse Gemini JSON:', text)
    return NextResponse.json({ available: false })
  }
}
