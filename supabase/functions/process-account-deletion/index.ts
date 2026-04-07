import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * 계정 삭제 크론 Edge Function.
 * 매일 1회 실행 (00:30 UTC).
 *
 * delete_scheduled_at이 지난 유저를 delete_mode에 따라 처리:
 * - anonymize: 개인정보 익명화 (기록은 보존)
 * - hard_delete: 관련 데이터 완전 삭제
 */
serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 삭제 예정일이 지난 유저 조회
  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('id, delete_mode')
    .not('deleted_at', 'is', null)
    .lte('delete_scheduled_at', new Date().toISOString())

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!users || users.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let processed = 0
  const errors: string[] = []

  for (const user of users) {
    try {
      if (user.delete_mode === 'hard_delete') {
        await hardDelete(supabase, user.id)
      } else {
        await anonymize(supabase, user.id)
      }
      processed++
    } catch (err) {
      errors.push(`${user.id}: ${(err as Error).message}`)
    }
  }

  return new Response(
    JSON.stringify({ processed, errors: errors.length > 0 ? errors : undefined }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})

async function anonymize(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  // 개인정보 익명화 — 기록 데이터는 보존
  await supabase
    .from('users')
    .update({
      nickname: '탈퇴한 사용자',
      email: null,
      bio: null,
      avatar_url: null,
      avatar_color: null,
      taste_summary: null,
      taste_tags: null,
      delete_mode: null,
      delete_scheduled_at: null,
    })
    .eq('id', userId)

  // 소셜 관계 삭제
  await supabase.from('follows').delete().eq('follower_id', userId)
  await supabase.from('follows').delete().eq('following_id', userId)

  // 버블 멤버십 삭제
  await supabase.from('bubble_members').delete().eq('user_id', userId)

  // 알림 삭제
  await supabase.from('notifications').delete().eq('user_id', userId)
}

async function hardDelete(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  // 연관 데이터 순서대로 삭제 (FK 의존성 순서)
  await supabase.from('notifications').delete().eq('user_id', userId)
  await supabase.from('xp_histories').delete().eq('user_id', userId)
  await supabase.from('user_experiences').delete().eq('user_id', userId)
  await supabase.from('user_milestones').delete().eq('user_id', userId)
  await supabase.from('reactions').delete().eq('user_id', userId)
  await supabase.from('comments').delete().eq('user_id', userId)
  await supabase.from('follows').delete().eq('follower_id', userId)
  await supabase.from('follows').delete().eq('following_id', userId)
  await supabase.from('bubble_members').delete().eq('user_id', userId)
  await supabase.from('bookmarks').delete().eq('user_id', userId)
  await supabase.from('records').delete().eq('user_id', userId)
  await supabase.from('nudge_history').delete().eq('user_id', userId)
  await supabase.from('nudge_fatigue').delete().eq('user_id', userId)

  // 유저 레코드 삭제
  await supabase.from('users').delete().eq('id', userId)

  // Supabase Auth 유저 삭제
  await supabase.auth.admin.deleteUser(userId)
}
