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
  const updateData: Record<string, unknown> = { source: "manual" }

  const fieldMap: Record<string, string> = {
    spicy: "spicy", sweet: "sweet", salty: "salty",
    sour: "sour", umami: "umami", rich: "rich",
    wineAcidity: "wine_acidity", wineBody: "wine_body",
    wineTannin: "wine_tannin", wineSweetness: "wine_sweetness",
    wineBalance: "wine_balance", wineFinish: "wine_finish",
    wineAroma: "wine_aroma",
  }

  for (const [key, dbKey] of Object.entries(fieldMap)) {
    if (body[key] !== undefined) updateData[dbKey] = body[key]
  }

  // Upsert: update existing or insert new
  const { data: existing } = await supabase
    .from("record_taste_profiles")
    .select("id")
    .eq("record_id", recordId)
    .single()

  if (existing) {
    const { error } = await supabase
      .from("record_taste_profiles")
      .update(updateData)
      .eq("record_id", recordId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from("record_taste_profiles")
      .insert({ record_id: recordId, ...updateData })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
