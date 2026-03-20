import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: recordId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify ownership
  const { data: record } = await supabase
    .from("records")
    .select("user_id")
    .eq("id", recordId)
    .single()

  if (!record || record.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const baseUrl = request.nextUrl.origin
  const headers = { "Content-Type": "application/json", Cookie: request.headers.get("cookie") ?? "" }
  const body = JSON.stringify({ recordId })

  // Reset phase status to 1 (re-processing)
  await supabase
    .from("records")
    .update({ phase_status: 1 })
    .eq("id", recordId)

  // 5-step pipeline (each API skips internally if not applicable)
  try {
    await fetch(`${baseUrl}/api/records/identify`, { method: "POST", headers, body }).catch(() => {})
    await fetch(`${baseUrl}/api/records/enrich`, { method: "POST", headers, body }).catch(() => {})
    await fetch(`${baseUrl}/api/records/analyze-photos`, { method: "POST", headers, body }).catch(() => {})
    await fetch(`${baseUrl}/api/records/taste-profile`, { method: "POST", headers, body }).catch(() => {})
  } finally {
    await fetch(`${baseUrl}/api/records/post-process`, { method: "POST", headers, body }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
