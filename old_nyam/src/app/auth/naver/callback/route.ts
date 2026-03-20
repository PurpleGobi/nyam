import { NextResponse } from "next/server"
import { createAdminClient } from "@/infrastructure/supabase/admin"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(`${origin}/auth/login?error=naver_auth_failed`)
  }

  try {
    // 1. Exchange code for token
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.NAVER_CLIENT_ID!,
      client_secret: process.env.NAVER_CLIENT_SECRET!,
      code,
      state: state ?? "",
    })

    const tokenRes = await fetch(
      `https://nid.naver.com/oauth2.0/token?${tokenParams}`,
    )
    const tokenData = await tokenRes.json()

    if (tokenData.error || !tokenData.access_token) {
      return NextResponse.redirect(`${origin}/auth/login?error=naver_token_failed`)
    }

    // 2. Get user profile
    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profileData = await profileRes.json()

    if (profileData.resultcode !== "00") {
      return NextResponse.redirect(`${origin}/auth/login?error=naver_profile_failed`)
    }

    const naverUser = profileData.response
    const email = naverUser.email
    const nickname = naverUser.nickname ?? naverUser.name ?? "사용자"
    const avatarUrl = naverUser.profile_image ?? null

    if (!email) {
      return NextResponse.redirect(`${origin}/auth/login?error=naver_no_email`)
    }

    // 3. Sign in or create user via Supabase Admin
    const supabase = createAdminClient()

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u) => u.email === email)

    if (!existingUser) {
      // Create new user
      const { error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: nickname,
          avatar_url: avatarUrl,
          provider: "naver",
        },
        app_metadata: {
          provider: "naver",
        },
      })
      if (createError) {
        return NextResponse.redirect(`${origin}/auth/login?error=naver_create_failed`)
      }
    }

    // 4. Generate a magic link to sign in the user
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      })

    if (linkError || !linkData) {
      return NextResponse.redirect(`${origin}/auth/login?error=naver_link_failed`)
    }

    // Extract the token from the link and redirect to verify
    const linkUrl = new URL(linkData.properties.action_link)
    const token = linkUrl.searchParams.get("token")
    const type = linkUrl.searchParams.get("type")

    if (!token) {
      return NextResponse.redirect(`${origin}/auth/login?error=naver_token_missing`)
    }

    // Redirect to Supabase auth verify endpoint
    const verifyUrl = new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify`)
    verifyUrl.searchParams.set("token", token)
    verifyUrl.searchParams.set("type", type ?? "magiclink")
    verifyUrl.searchParams.set("redirect_to", `${origin}/`)

    return NextResponse.redirect(verifyUrl.toString())
  } catch {
    return NextResponse.redirect(`${origin}/auth/login?error=naver_error`)
  }
}
