import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { SupabaseDiscoverRepository } from "@/infrastructure/repositories/supabase-discover-repository"
import type { DiscoverFeedbackInput } from "@/domain/entities/discover"

/**
 * POST /api/discover/feedback
 *
 * Save user feedback on discover recommendations.
 * MVP: 3+ bad feedback on same restaurant → blacklist from future recommendations.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json() as DiscoverFeedbackInput

    if (!body.restaurantName || !body.feedback) {
      return NextResponse.json(
        { error: "restaurantName과 feedback은 필수입니다" },
        { status: 400 },
      )
    }

    if (body.feedback !== "good" && body.feedback !== "bad") {
      return NextResponse.json(
        { error: "feedback은 'good' 또는 'bad'만 가능합니다" },
        { status: 400 },
      )
    }

    const repo = new SupabaseDiscoverRepository(supabase)
    await repo.saveFeedback(user.id, body)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[Discover Feedback] Error:", message)
    return NextResponse.json({ error: `피드백 저장 실패: ${message}` }, { status: 500 })
  }
}
