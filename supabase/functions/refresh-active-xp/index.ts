import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * 활성 XP 일일 크론 Edge Function.
 * 매일 1회 실행 (04:00 KST).
 *
 * active_xp = 최근 6개월 기록 XP만 합산 (소셜/보너스 미포함)
 * active_verified = 최근 6개월 EXIF 검증 기록 수
 */
serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  const expectedToken = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
  if (!authHeader || authHeader !== expectedToken) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { error } = await supabase.rpc('refresh_active_xp')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
