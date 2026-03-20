import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Find accounts past the 30-day grace period
  const { data: deletions } = await admin
    .from("account_deletions")
    .select("user_id")
    .lte("scheduled_at", new Date().toISOString())
    .eq("status", "pending")

  if (!deletions?.length) {
    return NextResponse.json({ processed: 0 })
  }

  let processed = 0

  for (const { user_id } of deletions) {
    try {
      // a. Storage files (record_photos has no user_id — JOIN through records)
      const { data: records } = await admin
        .from("records")
        .select("id")
        .eq("user_id", user_id)

      if (records?.length) {
        const recordIds = records.map((r) => r.id as string)
        const { data: photos } = await admin
          .from("record_photos")
          .select("photo_url")
          .in("record_id", recordIds)

        if (photos?.length) {
          const paths = photos
            .map((p) => p.photo_url as string)
            .filter(Boolean)
          if (paths.length) {
            await admin.storage.from("record-photos").remove(paths)
          }
        }
      }

      // b. records DELETE — CASCADE removes:
      //    record_photos, record_ai_analyses, record_taste_profiles,
      //    record_shares, bookmarks, reactions, phase_completions
      await admin.from("records").delete().eq("user_id", user_id)

      // c. comparisons DELETE — CASCADE removes comparison_matchups
      await admin.from("comparisons").delete().eq("user_id", user_id)

      // d. Groups owned by this user — transfer or delete
      const { data: ownedGroups } = await admin
        .from("groups")
        .select("id")
        .eq("owner_id", user_id)

      if (ownedGroups?.length) {
        for (const group of ownedGroups) {
          const { data: nextOwner } = await admin
            .from("group_memberships")
            .select("user_id")
            .eq("group_id", group.id)
            .neq("user_id", user_id)
            .eq("role", "admin")
            .limit(1)
            .maybeSingle()

          if (nextOwner) {
            await admin.from("groups").update({ owner_id: nextOwner.user_id }).eq("id", group.id)
          } else {
            // No other admin — delete the group
            await admin.from("group_memberships").delete().eq("group_id", group.id)
            await admin.from("groups").delete().eq("id", group.id)
          }
        }
      }

      // e. group_memberships (non-owned groups)
      await admin.from("group_memberships").delete().eq("user_id", user_id)

      // f. notifications
      await admin.from("notifications").delete().eq("user_id", user_id)

      // g. Taste DNA
      await admin.from("taste_dna_restaurant").delete().eq("user_id", user_id)
      await admin.from("taste_dna_wine").delete().eq("user_id", user_id)
      await admin.from("taste_dna_cooking").delete().eq("user_id", user_id)

      // h. Style DNA (restaurant + wine + cooking)
      const styleTables = [
        "style_dna_restaurant_genres",
        "style_dna_restaurant_areas",
        "style_dna_restaurant_scenes",
        "style_dna_wine_varieties",
        "style_dna_wine_regions",
        "style_dna_wine_types",
        "style_dna_wine_scenes",
        "style_dna_cooking_genres",
        "style_dna_cooking_scenes",
      ]
      for (const table of styleTables) {
        await admin.from(table).delete().eq("user_id", user_id)
      }

      // i-j. user_stats + account_deletions + users
      await admin.from("user_stats").delete().eq("user_id", user_id)
      await admin.from("account_deletions").delete().eq("user_id", user_id)
      await admin.from("users").delete().eq("id", user_id)

      // k. Supabase Auth user
      await admin.auth.admin.deleteUser(user_id)

      processed++
    } catch (error) {
      console.error(`Failed to delete user ${user_id}:`, error)
      // Keep pending status — will retry on next cron run
      await admin.from("account_deletions").update({
        updated_at: new Date().toISOString(),
      }).eq("user_id", user_id)
    }
  }

  return NextResponse.json({ processed, total: deletions.length })
}
