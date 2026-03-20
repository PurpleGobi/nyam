import { NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // 약관 동의 여부 확인
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("terms_agreed_at")
          .eq("id", user.id)
          .single()

        if (!profile?.terms_agreed_at) {
          return NextResponse.redirect(`${origin}/auth/consent?next=${encodeURIComponent(next)}`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
