import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/infrastructure/supabase/admin'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/auth/login?error=naver_auth_failed', requestUrl.origin)
    )
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NAVER_CLIENT_ID!,
        client_secret: process.env.NAVER_CLIENT_SECRET!,
        code,
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      console.error('[naver-auth] Token exchange failed:', tokenData)
      return NextResponse.redirect(
        new URL('/auth/login?error=naver_token_failed', requestUrl.origin)
      )
    }

    // 2. Get user profile from Naver
    const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profileData = await profileRes.json()

    if (profileData.resultcode !== '00') {
      console.error('[naver-auth] Profile fetch failed:', profileData)
      return NextResponse.redirect(
        new URL('/auth/login?error=naver_profile_failed', requestUrl.origin)
      )
    }

    const naverUser = profileData.response
    const email = naverUser.email as string | undefined
    const nickname = (naverUser.nickname ?? naverUser.name ?? null) as string | null
    const avatarUrl = (naverUser.profile_image ?? null) as string | null

    if (!email) {
      return NextResponse.redirect(
        new URL('/auth/login?error=naver_email_required', requestUrl.origin)
      )
    }

    // 3. Create or find user via Supabase admin
    const supabaseAdmin = createAdminClient()

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (!existingUser) {
      const { error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            full_name: nickname,
            avatar_url: avatarUrl,
            provider: 'naver',
            naver_id: naverUser.id,
          },
        })

      if (createError) {
        console.error('[naver-auth] User creation failed:', createError)
        return NextResponse.redirect(
          new URL('/auth/login?error=naver_create_failed', requestUrl.origin)
        )
      }
    }

    // 4. Generate magic link to establish session
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      })

    if (linkError || !linkData) {
      console.error('[naver-auth] Magic link failed:', linkError)
      return NextResponse.redirect(
        new URL('/auth/login?error=naver_session_failed', requestUrl.origin)
      )
    }

    // 5. Verify OTP to set session cookies
    const linkUrl = new URL(linkData.properties.action_link)
    const tokenHash = linkUrl.searchParams.get('token_hash') ?? linkUrl.hash

    const cookieStore = await cookies()
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          },
        },
      },
    )

    const { error: verifyError } = await supabaseClient.auth.verifyOtp({
      type: 'magiclink',
      token_hash: tokenHash!,
    })

    if (verifyError) {
      console.error('[naver-auth] OTP verify failed:', verifyError)
      return NextResponse.redirect(
        new URL('/auth/login?error=naver_verify_failed', requestUrl.origin)
      )
    }

    return NextResponse.redirect(new URL('/', requestUrl.origin))
  } catch (err) {
    console.error('[naver-auth] Unexpected error:', err)
    return NextResponse.redirect(
      new URL('/auth/login?error=naver_unknown', requestUrl.origin)
    )
  }
}
