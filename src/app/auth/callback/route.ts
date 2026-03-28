import { createClient } from '@/infrastructure/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 프로필 존재 확인 → 없으면 생성 (첫 가입)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: existingProfile } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!existingProfile) {
          const meta = user.user_metadata
          await supabase.from('users').insert({
            id: user.id,
            email: user.email,
            nickname: (meta?.name ?? meta?.full_name ?? meta?.preferred_username ?? '냠유저').slice(0, 20),
            avatar_url: meta?.avatar_url ?? null,
            auth_provider: user.app_metadata?.provider ?? 'google',
            auth_provider_id: user.app_metadata?.provider_id ?? user.id,
            privacy_profile: 'bubble_only',
            privacy_records: 'shared_only',
          })
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`)
}
