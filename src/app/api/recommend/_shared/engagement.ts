import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 식당/와인 ID 목록 → 해당 records의 like/comment 집계
 * reactions(target_type='record') + comments(target_type='record')
 */
export async function fetchEngagementCounts(
  supabase: SupabaseClient,
  targetIds: string[],
  targetType: 'restaurant' | 'wine',
): Promise<Map<string, { likes: number; comments: number }>> {
  const result = new Map<string, { likes: number; comments: number }>()
  if (targetIds.length === 0) return result

  // 1. 해당 타겟의 record ID 수집
  const { data: records } = await supabase
    .from('records')
    .select('id, target_id')
    .in('target_id', targetIds)
    .eq('target_type', targetType)

  if (!records || records.length === 0) return result

  const recordIds = records.map((r) => r.id)
  const recordToTarget = new Map<string, string>()
  for (const r of records) {
    recordToTarget.set(r.id, r.target_id)
  }

  // 2. reactions (like) 카운트
  const { data: reactions } = await supabase
    .from('reactions')
    .select('target_id')
    .eq('target_type', 'record')
    .eq('reaction_type', 'like')
    .in('target_id', recordIds)

  // 3. comments 카운트
  const { data: comments } = await supabase
    .from('comments')
    .select('target_id')
    .eq('target_type', 'record')
    .in('target_id', recordIds)

  // 4. target별 집계
  for (const id of targetIds) {
    result.set(id, { likes: 0, comments: 0 })
  }

  for (const r of reactions ?? []) {
    const tid = recordToTarget.get(r.target_id)
    if (tid) {
      const entry = result.get(tid)
      if (entry) entry.likes += 1
    }
  }

  for (const c of comments ?? []) {
    const tid = recordToTarget.get(c.target_id)
    if (tid) {
      const entry = result.get(tid)
      if (entry) entry.comments += 1
    }
  }

  return result
}
