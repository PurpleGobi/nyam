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

  if (body.identifiedRestaurant !== undefined) updateData.identified_restaurant = body.identifiedRestaurant
  if (body.orderedItems !== undefined) updateData.ordered_items = body.orderedItems
  if (body.extractedMenuItems !== undefined) updateData.extracted_menu_items = body.extractedMenuItems
  if (body.wineInfo !== undefined) updateData.wine_info = body.wineInfo
  if (body.wineTastingAi !== undefined) updateData.wine_tasting_ai = body.wineTastingAi

  // Auto-track verified fields
  const changedFields = Object.keys(updateData)
  updateData.verified_at = new Date().toISOString()
  updateData.verified_fields = changedFields // empty array = "verified without changes"

  // Get latest AI analysis row
  const { data: analysis } = await supabase
    .from("record_ai_analyses")
    .select("id")
    .eq("record_id", recordId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!analysis) {
    return NextResponse.json({ error: "No AI analysis found" }, { status: 404 })
  }

  const { error } = await supabase
    .from("record_ai_analyses")
    .update(updateData)
    .eq("id", analysis.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
