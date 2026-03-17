import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'

export const maxDuration = 30

interface GenerateReviewRequestBody {
  recordId: string
  answers: Record<string, string>
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

interface BlogSection {
  type: 'text' | 'photo'
  content: string
  photoIndex?: number
  caption?: string
}

interface AiQuestion {
  id: string
  question: string
  options: string[]
  type: 'select' | 'freetext'
}

interface BlogResult {
  title: string
  sections: BlogSection[]
  summary: string
  recommendFor: string[]
}

function buildQuestionsPrompt(record: Record<string, unknown>, analysis: Record<string, unknown> | null): string {
  const restaurantName = (record.menu_name as string) || '이 식당'
  const category = (record.category as string) || ''
  const orderedItems = analysis
    ? (analysis.ordered_items as string[]) ?? []
    : []
  const occasion = analysis
    ? ((analysis.companion_data as Record<string, unknown>)?.occasion as string) ?? null
    : null

  return `당신은 맛집 리뷰 작성을 도와주는 AI 어시스턴트입니다.
사용자가 방문한 식당의 정보를 바탕으로, 블로그 리뷰를 작성하기 위한 질문 3~5개를 생성하세요.

## 방문 정보
- 식당: ${restaurantName}
- 카테고리: ${category}
- 주문 메뉴: ${orderedItems.join(', ') || '정보 없음'}
- 방문 성격: ${occasion || '정보 없음'}
- 평점: ${record.rating_overall ?? '정보 없음'}/100

## 질문 생성 규칙
1. 질문은 3~5개 생성
2. 각 질문은 블로그 글의 풍성한 내용을 위한 것
3. 선택형 질문: 3~4개의 선택지 + 마지막에 "직접 입력" 옵션
4. 자유 입력형 질문: 1~2개 포함 (짧은 한줄 답변 유도)
5. 자연스럽고 친근한 톤

## 응답 형식 (JSON)
{
  "questions": [
    {
      "id": "q1",
      "question": "질문 내용",
      "options": ["선택지1", "선택지2", "선택지3", "직접 입력"],
      "type": "select"
    },
    {
      "id": "q2",
      "question": "질문 내용",
      "options": [],
      "type": "freetext"
    }
  ]
}

JSON만 반환하세요.`
}

function buildBlogPrompt(
  record: Record<string, unknown>,
  analysis: Record<string, unknown> | null,
  answers: Record<string, string>,
  photoCount: number,
): string {
  const restaurantName = (record.menu_name as string) || '맛집'
  const category = (record.category as string) || ''
  const orderedItems = analysis
    ? (analysis.ordered_items as string[]) ?? []
    : []
  const flavorTags = (record.flavor_tags as string[]) ?? []
  const textureTags = (record.texture_tags as string[]) ?? []
  const ratingOverall = record.rating_overall ?? 0

  return `당신은 잡지 스타일의 맛집 리뷰 작가입니다.
아래 데이터를 바탕으로 매력적인 블로그 리뷰를 작성하세요.

## 방문 데이터
- 식당: ${restaurantName}
- 카테고리: ${category}
- 주문 메뉴: ${orderedItems.join(', ') || '정보 없음'}
- 맛 태그: ${flavorTags.join(', ') || '정보 없음'}
- 식감 태그: ${textureTags.join(', ') || '정보 없음'}
- 평점: ${ratingOverall}/100
- 사진 수: ${photoCount}장

## 사용자 답변
${Object.entries(answers).map(([key, val]) => `- ${key}: ${val}`).join('\n')}

## 작성 규칙
1. 제목: 매력적이고 클릭하고 싶은 제목 (15자 이내)
2. 3~5개 섹션, 각 섹션 2~3문장
3. 사진이 있으면 적절한 위치에 photo 섹션을 삽입 (photoIndex는 0부터 시작, 최대 ${photoCount - 1})
4. 자연스럽고 친근한 문체 (반말 OK)
5. 마지막에 한줄 총평
6. 추천 대상 2~3개 (예: "친구모임", "데이트", "혼밥" 등)

## 응답 형식 (JSON)
{
  "title": "블로그 제목",
  "sections": [
    { "type": "text", "content": "본문 텍스트..." },
    { "type": "photo", "content": "", "photoIndex": 0, "caption": "사진 설명" },
    { "type": "text", "content": "본문 텍스트..." }
  ],
  "summary": "한줄 총평",
  "recommendFor": ["추천 대상1", "추천 대상2"]
}

JSON만 반환하세요.`
}

export async function POST(request: NextRequest) {
  try {
    // Auth check — skip in development for testing
    const supabase = await createClient()
    if (process.env.NODE_ENV !== 'development') {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 },
        )
      }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'AI service not configured' },
        { status: 503 },
      )
    }

    let body: GenerateReviewRequestBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 },
      )
    }

    const { recordId, answers } = body
    if (!recordId) {
      return NextResponse.json(
        { success: false, error: 'recordId is required' },
        { status: 400 },
      )
    }

    // Fetch record
    const { data: record, error: recordError } = await supabase
      .from('records')
      .select('*')
      .eq('id', recordId)
      .single()

    if (recordError || !record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 },
      )
    }

    // Fetch AI analysis if available
    const { data: analysisRows } = await supabase
      .from('record_ai_analyses' as never)
      .select('*')
      .eq('record_id' as never, recordId as never)
      .order('created_at' as never, { ascending: false } as never)
      .limit(1)

    const analysis = (analysisRows as Record<string, unknown>[] | null)?.[0] ?? null

    // Fetch photo count
    const { count: photoCount } = await supabase
      .from('record_photos')
      .select('id', { count: 'exact', head: true })
      .eq('record_id', recordId)

    const hasAnswers = answers && Object.keys(answers).length > 0

    // Build prompt based on whether we need questions or blog
    const prompt = hasAnswers
      ? buildBlogPrompt(record as Record<string, unknown>, analysis as Record<string, unknown> | null, answers, photoCount ?? 0)
      : buildQuestionsPrompt(record as Record<string, unknown>, analysis as Record<string, unknown> | null)

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
      const errorBody = await geminiRes.text().catch(() => '')
      console.error('[generate-review] Gemini API failed:', geminiRes.status, errorBody.slice(0, 500))
      return NextResponse.json(
        { success: false, error: 'AI generation failed' },
        { status: 502 },
      )
    }

    const geminiData: GeminiResponse = await geminiRes.json()
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      console.error('[generate-review] No text in Gemini response')
      return NextResponse.json(
        { success: false, error: 'AI returned empty response' },
        { status: 502 },
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      console.error('[generate-review] Failed to parse Gemini JSON:', text.slice(0, 500))
      return NextResponse.json(
        { success: false, error: 'AI returned invalid response format' },
        { status: 502 },
      )
    }

    if (hasAnswers) {
      // Validate blog response
      const blog = parsed as BlogResult
      if (!blog.title || !Array.isArray(blog.sections) || !blog.summary) {
        console.error('[generate-review] Invalid blog structure:', JSON.stringify(parsed).slice(0, 500))
        return NextResponse.json(
          { success: false, error: 'AI returned incomplete blog' },
          { status: 502 },
        )
      }
      return NextResponse.json({ success: true, blog })
    } else {
      // Validate questions response
      const result = parsed as { questions: AiQuestion[] }
      if (!Array.isArray(result.questions) || result.questions.length === 0) {
        console.error('[generate-review] Invalid questions structure:', JSON.stringify(parsed).slice(0, 500))
        return NextResponse.json(
          { success: false, error: 'AI returned invalid questions' },
          { status: 502 },
        )
      }
      return NextResponse.json({ success: true, questions: result.questions })
    }
  } catch (error) {
    console.error('[generate-review] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
