import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `너는 맛집 비교 분석 전문가야. 사용자가 제공한 식당 정보를 바탕으로 비교 분석해줘.

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트 없이 순수 JSON만 반환해:

{
  "restaurants": [
    {
      "restaurantId": "식당 ID",
      "restaurantName": "식당 이름",
      "score": 8.5,
      "pros": ["장점1", "장점2", "장점3"],
      "cons": ["단점1", "단점2"],
      "situationFit": "상황 적합도 설명"
    }
  ],
  "summary": "전체 비교 요약 (2~3문장)",
  "recommendedOrder": ["추천순으로 정렬된 식당 ID 배열"]
}

규칙:
- score는 0~10 사이 소수점 1자리
- pros/cons는 각각 2~4개, 구체적으로
- summary는 핵심만 간결하게
- recommendedOrder는 가장 추천하는 순서로 정렬
- 사용자의 상황(인원, 예산, 모임 종류)을 고려해서 분석`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, restaurantIds } = body as { prompt: string; restaurantIds: string[] }

    if (!prompt || !restaurantIds?.length) {
      return NextResponse.json(
        { error: 'Missing prompt or restaurantIds' },
        { status: 400 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json(
        { error: 'Unexpected response type' },
        { status: 500 }
      )
    }

    const text = content.text.trim()

    // Parse JSON response (with or without markdown code block)
    try {
      const jsonStr = text.startsWith('{')
        ? text
        : text.match(/```(?:json)?\n?([\s\S]*?)\n?```/)?.[1] ?? text
      const parsed = JSON.parse(jsonStr)
      return NextResponse.json(parsed)
    } catch {
      // Fallback: return raw text as summary
      return NextResponse.json({
        restaurants: [],
        summary: text,
        recommendedOrder: restaurantIds,
      })
    }
  } catch (error) {
    console.error('[compare] API error:', error)
    return NextResponse.json(
      { error: 'Internal comparison error', detail: String(error) },
      { status: 500 }
    )
  }
}
