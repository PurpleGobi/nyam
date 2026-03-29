import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { searchTavily } from '@/infrastructure/api/tavily'

async function callGeminiText(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
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

interface RecommendRequest {
  question: string
  restaurants: Array<{ name: string; score: number; reason: string }>
  area: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body: RecommendRequest = await request.json()
  const { question, restaurants, area } = body

  if (!question?.trim() || !restaurants?.length) {
    return NextResponse.json({ success: false, error: 'MISSING_FIELDS' }, { status: 400 })
  }

  try {
    // 1. Tavily: 사용자 질문 + 상위 식당들로 검색
    const top5Names = restaurants.slice(0, 5).map((r) => r.name).join(', ')
    const searchQuery = `${area} ${question} ${top5Names}`

    const tavilyResult = await searchTavily(searchQuery, {
      searchDepth: 'advanced',
      maxResults: 8,
    })

    const webContext = [
      tavilyResult.answer ? `웹 요약: ${tavilyResult.answer}` : '',
      ...tavilyResult.results.map((r) => `[${r.title}] ${r.content}`),
    ].filter(Boolean).join('\n\n')

    // 2. Gemini: 질문 + 식당 리스트 + 웹 정보 → 추천
    const restaurantListText = restaurants.slice(0, 20).map((r, i) =>
      `${i + 1}. ${r.name} (점수: ${r.score}) — ${r.reason}`,
    ).join('\n')

    const prompt = `당신은 친절하고 전문적인 한국 맛집 추천 AI입니다.

## 사용자 질문
"${question}"

## ${area} 지역 식당 리스트 (AI 추천 점수순)
${restaurantListText}

## 웹 검색 추가 정보
${webContext}

## 지시사항
사용자의 질문에 맞는 식당을 위 리스트에서 1~3곳 추천해주세요.
각 추천에는 구체적인 이유를 포함하세요.
웹 검색에서 찾은 실제 정보(메뉴, 가격, 분위기 등)를 근거로 답변하세요.
리스트에 적합한 곳이 없으면 솔직히 말해주세요.

## 응답 형식 (JSON)
{
  "answer": "자연스러운 한국어 답변 (2~4문장)",
  "picks": [
    { "name": "식당명", "reason": "추천 이유 (구체적, 1~2문장)" }
  ]
}

JSON만 응답하세요.`

    const geminiResponse = await callGeminiText(prompt)
    const cleaned = geminiResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()

    let result: { answer: string; picks: Array<{ name: string; reason: string }> }
    try {
      result = JSON.parse(cleaned)
    } catch {
      result = { answer: geminiResponse, picks: [] }
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
