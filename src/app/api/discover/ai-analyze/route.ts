import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { searchRestaurantInfo } from '@/infrastructure/api/tavily'

interface AnalysisResult {
  taste: string
  atmosphere: string
  tips: string
  priceRange: string
  recommendedDishes: string[]
  summary: string
}

interface AnalyzeResponse {
  success: boolean
  analysis: AnalysisResult | null
  error?: string
}

async function callGeminiText(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
  })
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { success: false, analysis: null, error: 'UNAUTHORIZED' },
      { status: 401 },
    )
  }

  const body = await request.json()
  const { restaurantName, area } = body as { restaurantName: string; area?: string }

  if (!restaurantName) {
    return NextResponse.json(
      { success: false, analysis: null, error: 'MISSING_RESTAURANT_NAME' },
      { status: 400 },
    )
  }

  try {
    // Step 1: Search restaurant info via Tavily
    const tavilyResult = await searchRestaurantInfo(restaurantName, area)

    // Step 2: Compile context from Tavily results
    const contextParts: string[] = []
    if (tavilyResult.answer) {
      contextParts.push(`요약: ${tavilyResult.answer}`)
    }
    for (const result of tavilyResult.results.slice(0, 5)) {
      contextParts.push(`[${result.title}]\n${result.content}`)
    }
    const context = contextParts.join('\n\n')

    // Step 3: Call Gemini to analyze
    const locationInfo = area ? ` (${area} 지역)` : ''
    const prompt = `다음은 "${restaurantName}"${locationInfo} 식당에 대한 웹 검색 결과입니다.

${context}

위 정보를 바탕으로 아래 항목을 JSON 형식으로 분석해주세요. 정보가 부족한 항목은 "정보 없음"으로 표시하세요.

{
  "taste": "맛과 대표 메뉴 특징 (2-3문장)",
  "atmosphere": "분위기와 인테리어 (2-3문장)",
  "tips": "방문 꿀팁 - 예약, 웨이팅, 추천 시간대 등 (2-3문장)",
  "priceRange": "1인 기준 가격대 (예: 15,000~25,000원)",
  "recommendedDishes": ["추천 메뉴1", "추천 메뉴2", "추천 메뉴3"],
  "summary": "한줄 평가 (20자 이내)"
}

반드시 유효한 JSON만 출력하세요. 다른 텍스트는 포함하지 마세요.`

    const geminiResponse = await callGeminiText(prompt)

    // Step 4: Parse Gemini response
    const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { success: false, analysis: null, error: 'AI_PARSE_FAILED' },
        { status: 500 },
      )
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>

    const analysis: AnalysisResult = {
      taste: String(parsed.taste ?? '정보 없음'),
      atmosphere: String(parsed.atmosphere ?? '정보 없음'),
      tips: String(parsed.tips ?? '정보 없음'),
      priceRange: String(parsed.priceRange ?? '정보 없음'),
      recommendedDishes: Array.isArray(parsed.recommendedDishes)
        ? parsed.recommendedDishes.map(String)
        : [],
      summary: String(parsed.summary ?? '정보 없음'),
    }

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    return NextResponse.json(
      { success: false, analysis: null, error: message },
      { status: 500 },
    )
  }
}
