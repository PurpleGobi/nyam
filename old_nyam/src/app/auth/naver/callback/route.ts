import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Naver OAuth callback handler.
 * Exchanges the authorization code for user info,
 * then creates/signs in the user via Supabase admin API.
 */
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
    const email = naverUser.email
    const nickname = naverUser.nickname ?? naverUser.name ?? null
    const avatarUrl = naverUser.profile_image ?? null

    if (!email) {
      return NextResponse.redirect(
        new URL('/auth/login?error=naver_email_required', requestUrl.origin)
      )
    }

    // 3. Create or sign in user via Supabase admin
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return [] },
          setAll() { /* admin client doesn't need cookies */ },
        },
      },
    )

    // Check if user exists by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      // Create new user
      const { data: newUser, error: createError } =
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

      if (createError || !newUser.user) {
        console.error('[naver-auth] User creation failed:', createError)
        return NextResponse.redirect(
          new URL('/auth/login?error=naver_create_failed', requestUrl.origin)
        )
      }

      userId = newUser.user.id

      // Create user_profiles record
      await supabaseAdmin.from('user_profiles').insert({
        id: userId,
        nickname,
        avatar_url: avatarUrl,
        preferred_ai: 'chatgpt',
        allergies: [],
        food_preferences: [],
        tier: 'explorer',
        total_verifications: 0,
        current_streak: 0,
        longest_streak: 0,
      })
    }

    // 4. Generate a magic link to sign the user in on the client side
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

    // Extract the token hash from the magic link
    const linkUrl = new URL(linkData.properties.action_link)
    const tokenHash = linkUrl.searchParams.get('token_hash') ?? linkUrl.hash

    // Redirect to Supabase auth verify endpoint to establish session
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
