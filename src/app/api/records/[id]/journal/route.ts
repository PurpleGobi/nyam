import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"

export async function PATCH(
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

  const body = await request.json()
  const updateData: Record<string, unknown> = {}

  if (body.blogTitle !== undefined) updateData.blog_title = body.blogTitle
  if (body.blogContent !== undefined) updateData.blog_content = body.blogContent

  const { error } = await supabase
    .from("record_journals")
    .update(updateData)
    .eq("record_id", recordId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
