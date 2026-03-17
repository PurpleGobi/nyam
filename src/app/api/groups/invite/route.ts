import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { groupId } = await request.json() as { groupId: string }

  // Check ownership
  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single()

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  // Check if user is owner or moderator
  const { data: membership } = await supabase
    .from("group_memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single()

  if (!membership || (membership.role !== "owner" && membership.role !== "moderator")) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  const code = crypto.randomUUID().slice(0, 8)
  await supabase.from("groups").update({ invite_code: code }).eq("id", groupId)

  return NextResponse.json({
    success: true,
    inviteCode: code,
    inviteUrl: `${request.nextUrl.origin}/groups/join?code=${code}`,
  })
}
