import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

interface TasteDnaInput {
  flavorSpicy: number
  flavorSweet: number
  flavorSalty: number
  flavorSour: number
  flavorUmami: number
  flavorRich: number
  tasteTypeName: string
}

interface RecommendRequestBody {
  tasteDna: TasteDnaInput
  situation: string
  location?: string
  additionalContext?: string
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

interface Recommendation {
  food: string
  reason: string
  tip: string
}

function buildPrompt(body: RecommendRequestBody): string {
  const { tasteDna, situation, location, additionalContext } = body

  return `You are a Korean food recommendation expert. Based on the user's taste profile and current situation, suggest 3 restaurant/food recommendations.

User's Taste DNA:
- Taste type: ${tasteDna.tasteTypeName}
- Spicy preference: ${Math.round(tasteDna.flavorSpicy * 100)}%
- Sweet preference: ${Math.round(tasteDna.flavorSweet * 100)}%
- Salty preference: ${Math.round(tasteDna.flavorSalty * 100)}%
- Sour preference: ${Math.round(tasteDna.flavorSour * 100)}%
- Umami preference: ${Math.round(tasteDna.flavorUmami * 100)}%
- Rich preference: ${Math.round(tasteDna.flavorRich * 100)}%

Situation: ${situation}
Location: ${location || 'not specified'}
Additional context: ${additionalContext || 'none'}

Respond in Korean. For each recommendation, provide:
1. Food/cuisine type
2. Why it matches the user's taste
3. What to look for when choosing a restaurant

Format as JSON array:
[{"food": "...", "reason": "...", "tip": "..."}]`
}

function extractJson(text: string): Recommendation[] {
  // Try direct parse first
  try {
    return JSON.parse(text) as Recommendation[]
  } catch {
    // Extract JSON from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch?.[1]) {
      return JSON.parse(codeBlockMatch[1].trim()) as Recommendation[]
    }

    // Try to find array pattern
    const arrayMatch = text.match(/\[[\s\S]*\]/)
    if (arrayMatch?.[0]) {
      return JSON.parse(arrayMatch[0]) as Recommendation[]
    }

    throw new Error('No valid JSON found in response')
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ available: false })
  }

  let body: RecommendRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    )
  }

  if (!body.tasteDna || !body.situation) {
    return NextResponse.json(
      { error: 'tasteDna and situation are required' },
      { status: 400 },
    )
  }

  const prompt = buildPrompt(body)

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: 'application/json' },
        }),
      },
    )

    if (!geminiRes.ok) {
      console.error('[recommend] Gemini API failed:', geminiRes.status)
      return NextResponse.json({
        available: true,
        recommendations: [],
        error: 'AI 서비스에 일시적인 문제가 발생했습니다',
      })
    }

    const geminiData: GeminiResponse = await geminiRes.json()
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      console.error('[recommend] No text in Gemini response')
      return NextResponse.json({
        available: true,
        recommendations: [],
        error: 'AI 응답을 받지 못했습니다',
      })
    }

    const recommendations = extractJson(text)
    return NextResponse.json({ available: true, recommendations })
  } catch (err) {
    console.error('[recommend] Unexpected error:', err)
    return NextResponse.json({
      available: true,
      recommendations: [],
      error: '추천 생성 중 오류가 발생했습니다',
    })
  }
}
