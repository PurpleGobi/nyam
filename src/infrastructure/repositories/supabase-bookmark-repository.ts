import { createClient } from '@/infrastructure/supabase/client'
import type { BookmarkRepository } from '@/domain/repositories/bookmark-repository'
import type { Bookmark, BookmarkType, BookmarkTargetType } from '@/domain/entities/bookmark'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToBookmark(row: any): Bookmark {
  return {
    id: row.id,
    userId: row.user_id,
    targetId: row.target_id,
    targetType: row.target_type,
    type: row.type,
    createdAt: row.created_at,
  }
}

export class SupabaseBookmarkRepository implements BookmarkRepository {
  private get supabase() { return createClient() }

  async toggle(
    userId: string,
    targetId: string,
    targetType: BookmarkTargetType,
    type: BookmarkType,
  ): Promise<boolean> {
    const { data: existing } = await this.supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .eq('type', type)
      .maybeSingle()

    if (existing) {
      const { error } = await this.supabase
        .from('bookmarks')
        .delete()
        .eq('id', existing.id)
      if (error) throw new Error(`북마크 삭제 실패: ${error.message}`)
      return false
    }

    const { error } = await this.supabase
      .from('bookmarks')
      .insert({
        user_id: userId,
        target_id: targetId,
        target_type: targetType,
        type,
      })
    if (error) throw new Error(`북마크 추가 실패: ${error.message}`)
    return true
  }

  async isBookmarked(
    userId: string,
    targetId: string,
    targetType: BookmarkTargetType,
  ): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('bookmarks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .eq('type', 'bookmark')

    // RLS에 의해 세션 없으면 빈 에러 반환 — false로 처리
    if (error) return false
    return (count ?? 0) > 0
  }

  async isCellar(userId: string, targetId: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('bookmarks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .eq('type', 'cellar')

    if (error) throw new Error(`셀러 확인 실패: ${error.message}`)
    return (count ?? 0) > 0
  }

  async findByUser(
    userId: string,
    targetType: BookmarkTargetType,
    type?: BookmarkType,
  ): Promise<Bookmark[]> {
    let query = this.supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query
    if (error) throw new Error(`북마크 목록 조회 실패: ${error.message}`)
    return (data ?? []).map(mapDbToBookmark)
  }

  async findBookmarkedTargetIds(
    userId: string,
    targetIds: string[],
    targetType: BookmarkTargetType,
  ): Promise<Set<string>> {
    if (targetIds.length === 0) return new Set()

    const { data, error } = await this.supabase
      .from('bookmarks')
      .select('target_id')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .in('target_id', targetIds)

    if (error) throw new Error(`북마크 일괄 확인 실패: ${error.message}`)
    return new Set((data ?? []).map((row: { target_id: string }) => row.target_id))
  }

  async batchAdd(
    userId: string,
    targets: Array<{ targetId: string; targetType: BookmarkTargetType }>,
    type: BookmarkType,
  ): Promise<void> {
    if (targets.length === 0) return

    const rows = targets.map((t) => ({
      user_id: userId,
      target_id: t.targetId,
      target_type: t.targetType,
      type,
    }))

    const { error } = await this.supabase
      .from('bookmarks')
      .upsert(rows, { onConflict: 'user_id,target_id,target_type,type' })

    if (error) throw new Error(`북마크 일괄 추가 실패: ${error.message}`)
  }

  async batchRemove(
    userId: string,
    targetIds: string[],
    type: BookmarkType,
  ): Promise<void> {
    if (targetIds.length === 0) return

    const { error } = await this.supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('type', type)
      .in('target_id', targetIds)

    if (error) throw new Error(`북마크 일괄 삭제 실패: ${error.message}`)
  }
}
