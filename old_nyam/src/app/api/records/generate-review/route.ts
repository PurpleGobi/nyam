import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { createAdminClient } from "@/infrastructure/supabase/admin"
import { calculateNyamLevel } from "@/shared/utils/xp"

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

interface ReviewQuestion {
  id: string
  question: string
  options?: string[]
  type: "select" | "freetext"
}

interface BlogSection {
  type: "text" | "photo"
  content: string
  photoIndex?: number
  caption?: string
}

interface GeneratedBlog {
  title: string
  sections: BlogSection[]
  tags: string[]
}

interface RequestBody {
  recordId: string
  answers?: Record<string, string>
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json() as RequestBody
  const { recordId, answers } = body
  if (!recordId) {
    return NextResponse.json({ error: "recordId is required" }, { status: 400 })
  }

  const { data: record } = await supabase
    .from("records")
    .select("*, record_photos(*), record_ai_analysis:record_ai_analyses(*)")
    .eq("id", recordId)
    .eq("user_id", user.id)
    .single()

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  const hasAnswers = answers && Object.keys(answers).length > 0

  if (!hasAnswers) {
    return handleGenerateQuestions(record)
  }

  return handleGenerateBlog(record, answers, user.id)
}

async function callGemini(prompt: string): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
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

  if (!response.ok) {
    throw new Error("Gemini API call failed")
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"
}

function getRecordContext(record: Record<string, unknown>): string {
  const type = record.record_type as string
  const menuName = record.menu_name as string | null
  const genre = record.genre as string | null
  const rating = record.rating_overall as number | null
  const comment = record.comment as string | null
  const scene = record.scene as string | null
  const photos = (record.record_photos as Array<Record<string, unknown>>) ?? []
  const aiAnalysis = (record.record_ai_analysis as Array<Record<string, unknown>>)?.[0]

  const typeLabel = type === "restaurant" ? "식당" : type === "wine" ? "와인" : "요리"

  let context = `기록 유형: ${typeLabel}\n`
  if (menuName) context += `메뉴: ${menuName}\n`
  if (genre) context += `장르: ${genre}\n`
  if (rating) context += `종합 점수: ${rating}/100\n`
  if (comment) context += `코멘트: ${comment}\n`
  if (scene) context += `상황: ${scene}\n`
  context += `사진 수: ${photos.length}\n`

  if (aiAnalysis) {
    const restaurant = aiAnalysis.identified_restaurant as Record<string, unknown> | null
    if (restaurant) context += `식당명: ${(restaurant.name as string) || "알 수 없음"}\n`

    const menuItems = aiAnalysis.extracted_menu_items as Array<Record<string, unknown>> | null
    if (menuItems?.length) {
      context += `메뉴 항목: ${menuItems.map(m => m.name).join(", ")}\n`
    }

    const wineInfo = aiAnalysis.wine_info as Record<string, unknown> | null
    if (wineInfo) {
      context += `와인: ${wineInfo.name || "알 수 없음"}`
      if (wineInfo.vintage) context += ` (${wineInfo.vintage})`
      if (wineInfo.winery) context += `, ${wineInfo.winery}`
      context += "\n"
    }
  }

  return context
}

function buildQuestionsPrompt(record: Record<string, unknown>): string {
  const type = record.record_type as string
  const context = getRecordContext(record)

  const typeGuide = type === "restaurant"
    ? "식당 방문 경험에 대한 질문 (분위기, 서비스, 재방문 의향, 추천 대상, 특별한 점 등)"
    : type === "wine"
      ? "와인 시음 경험에 대한 질문 (향, 페어링, 인상, 구매 의향, 추천 상황 등)"
      : "요리 경험에 대한 질문 (난이도, 레시피 출처, 개선점, 재도전 의향, 특별한 팁 등)"

  return `당신은 음식 리뷰 인터뷰어입니다.
아래 기록 정보를 바탕으로, 사용자에게 리뷰 블로그 작성을 위한 질문 3~5개를 생성해주세요.

${context}

질문 가이드:
- ${typeGuide}
- 각 질문은 선택지(select) 또는 자유 입력(freetext) 중 하나
- 선택지 질문은 3~5개 선택지 제공
- 자연스럽고 친근한 톤

JSON 형식:
[
  {
    "id": "q1",
    "question": "질문 내용",
    "type": "select",
    "options": ["선택지1", "선택지2", "선택지3"]
  },
  {
    "id": "q2",
    "question": "질문 내용",
    "type": "freetext"
  }
]`
}

async function handleGenerateQuestions(
  record: Record<string, unknown>,
): Promise<NextResponse> {
  try {
    const prompt = buildQuestionsPrompt(record)
    const rawText = await callGemini(prompt)
    const questions: ReviewQuestion[] = JSON.parse(rawText)

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 })
    }

    return NextResponse.json({ success: true, questions })
  } catch {
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 })
  }
}

function buildBlogPrompt(
  record: Record<string, unknown>,
  answers: Record<string, string>,
): string {
  const context = getRecordContext(record)
  const photos = (record.record_photos as Array<Record<string, unknown>>) ?? []
  const photoCount = photos.length

  const answersText = Object.entries(answers)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n")

  return `당신은 음식 매거진 블로그 작성 전문가입니다.
아래 기록 정보와 사용자 답변을 바탕으로 매거진 스타일의 블로그를 JSON으로 생성해주세요.

${context}

사용자 답변:
${answersText}

사진 수: ${photoCount}장 (photoIndex는 0부터 ${photoCount - 1}까지 사용 가능)

JSON 형식:
{
  "title": "매거진 스타일 블로그 제목",
  "sections": [
    { "type": "text", "content": "도입부 텍스트 (2-3문장)" },
    { "type": "photo", "content": "", "photoIndex": 0, "caption": "사진 캡션" },
    { "type": "text", "content": "본문 텍스트 (2-3문장)" },
    { "type": "photo", "content": "", "photoIndex": 1, "caption": "사진 캡션" },
    { "type": "text", "content": "마무리 텍스트 (2-3문장)" }
  ],
  "tags": ["추천태그1", "추천태그2"]
}

규칙:
- 텍스트와 사진 섹션을 교차 배치
- photoIndex는 실제 사진 수 범위 내에서만 사용
- 사진이 없으면 text 섹션만 사용
- 자연스럽고 친근한 매거진 톤
- 섹션은 5-8개로 구성`
}

async function handleGenerateBlog(
  record: Record<string, unknown>,
  answers: Record<string, string>,
  userId: string,
): Promise<NextResponse> {
  try {
    const prompt = buildBlogPrompt(record, answers)
    const rawText = await callGemini(prompt)
    const blog: GeneratedBlog = JSON.parse(rawText)

    if (!blog.title || !Array.isArray(blog.sections)) {
      return NextResponse.json({ error: "Failed to generate blog" }, { status: 500 })
    }

    const admin = createAdminClient()
    const recordId = record.id as string

    const blogContent = blog.sections
      .filter(s => s.type === "text")
      .map(s => s.content)
      .join("\n\n")

    // Insert record_journals
    const { error: journalError } = await admin
      .from("record_journals")
      .insert({
        record_id: recordId,
        blog_title: blog.title,
        blog_content: blogContent,
        blog_sections: blog.sections,
        ai_questions: answers, // Store answers as reference (questions were transient)
        user_answers: answers,
      })

    if (journalError) {
      // If journal already exists, update it
      if (journalError.code === "23505") {
        await admin
          .from("record_journals")
          .update({
            blog_title: blog.title,
            blog_content: blogContent,
            blog_sections: blog.sections,
            ai_questions: answers,
            user_answers: answers,
          })
          .eq("record_id", recordId)
      } else {
        return NextResponse.json({ error: "Failed to save journal" }, { status: 500 })
      }
    }

    // Update record phase
    await admin
      .from("records")
      .update({
        phase_status: 3,
        phase2_completed_at: new Date().toISOString(),
      })
      .eq("id", recordId)

    // Insert phase completion
    await admin
      .from("phase_completions")
      .insert({
        user_id: userId,
        record_id: recordId,
        phase: 2,
        xp_earned: 15,
      })

    // Update user_stats points
    const { data: stats } = await admin
      .from("user_stats")
      .select("points")
      .eq("user_id", userId)
      .single()

    if (stats) {
      const newPoints = (stats.points ?? 0) + 15
      await admin
        .from("user_stats")
        .update({
          points: newPoints,
          nyam_level: calculateNyamLevel(newPoints),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
    }

    return NextResponse.json({ success: true, blog })
  } catch {
    return NextResponse.json({ error: "Failed to generate blog" }, { status: 500 })
  }
}
