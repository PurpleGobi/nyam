import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { reason, reasonCategory } = await request.json() as {
    reason?: string
    reasonCategory?: string
  }

  const scheduledAt = new Date()
  scheduledAt.setDate(scheduledAt.getDate() + 30)

  await supabase.from("account_deletions").insert({
    user_id: user.id,
    reason: reason ?? null,
    reason_category: reasonCategory ?? null,
    scheduled_at: scheduledAt.toISOString(),
  })

  await supabase.from("users").update({
    is_deactivated: true,
    deactivated_at: new Date().toISOString(),
  }).eq("id", user.id)

  return NextResponse.json({ success: true, scheduledAt: scheduledAt.toISOString() })
}
