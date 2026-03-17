import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { recordId } = await request.json() as { recordId: string }
  if (!recordId) {
    return NextResponse.json({ error: "recordId is required" }, { status: 400 })
  }

  const { data: record } = await supabase
    .from("records")
    .select("*, record_photos(*), record_ai_analysis(*)")
    .eq("id", recordId)
    .eq("user_id", user.id)
    .single()

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  const aiAnalysis = record.record_ai_analysis?.[0]
  const photos = record.record_photos ?? []

  const prompt = buildReviewPrompt(record, aiAnalysis, photos.length)

  const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    }),
  })

  if (!geminiResponse.ok) {
    return NextResponse.json({ error: "AI review generation failed" }, { status: 500 })
  }

  const geminiData = await geminiResponse.json()
  const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"

  let review: Record<string, unknown>
  try {
    review = JSON.parse(rawText)
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
  }

  // Save generated review
  await supabase.from("records").update({
    ai_review: review,
    updated_at: new Date().toISOString(),
  }).eq("id", recordId)

  return NextResponse.json({ success: true, review })
}

function buildReviewPrompt(
  record: Record<string, unknown>,
  aiAnalysis: Record<string, unknown> | undefined,
  photoCount: number,
): string {
  const type = record.record_type as string
  const title = record.title as string || ""
  const memo = record.memo as string || ""
  const rating = record.overall_rating as number || 0

  const analysisContext = aiAnalysis
    ? `AI 분석 결과: ${JSON.stringify(aiAnalysis)}`
    : ""

  return `당신은 음식 블로그 리뷰 작성 전문가입니다.
아래 정보를 바탕으로 블로그 스타일의 리뷰를 JSON으로 생성해주세요.

기록 유형: ${type}
제목: ${title}
메모: ${memo}
평점: ${rating}/100
사진 수: ${photoCount}
${analysisContext}

JSON 형식:
{
  "title": "블로그 제목",
  "summary": "한 줄 요약",
  "sections": [
    {
      "heading": "섹션 제목",
      "content": "섹션 내용 (2-3문장)",
      "photoIndex": 0
    }
  ],
  "tags": ["추천 태그"],
  "overallImpression": "총평 (2-3문장)"
}

섹션은 3-5개로 구성하고, 자연스럽고 친근한 톤으로 작성해주세요.`
}
