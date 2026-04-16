import { createClient } from '@/infrastructure/supabase/client'
import type { CommentRepository } from '@/domain/repositories/comment-repository'
import type { Comment, CommentTargetType } from '@/domain/entities/comment'

const COMMENT_SELECT = '*, users:user_id(nickname, handle, avatar_color)'

export class SupabaseCommentRepository implements CommentRepository {
  private get supabase() { return createClient() }

  async getById(id: string): Promise<Comment | null> {
    const { data } = await this.supabase.from('comments').select(COMMENT_SELECT).eq('id', id).single()
    return data ? mapComment(data as Record<string, unknown>) : null
  }

  async getByTarget(targetType: string, targetId: string, bubbleId: string | null, options?: {
    limit?: number
    offset?: number
  }): Promise<{ data: Comment[]; total: number }> {
    let query = this.supabase
      .from('comments')
      .select(COMMENT_SELECT, { count: 'exact' })
      .eq('target_type', targetType)
      .eq('target_id', targetId)
    if (bubbleId) query = query.eq('bubble_id', bubbleId)
    else query = query.is('bubble_id', null)
    query = query.order('created_at', { ascending: true })

    if (options?.limit) {
      const offset = options.offset ?? 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, count } = await query
    return { data: (data ?? []).map(mapComment), total: count ?? 0 }
  }

  async getCountByTarget(targetType: string, targetId: string, bubbleId: string | null): Promise<number> {
    let query = this.supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', targetType)
      .eq('target_id', targetId)
    if (bubbleId) query = query.eq('bubble_id', bubbleId)
    else query = query.is('bubble_id', null)
    const { count } = await query
    return count ?? 0
  }

  async getCountsByTargetIds(targetType: string, targetIds: string[], bubbleId: string | null): Promise<Map<string, number>> {
    const result = new Map<string, number>()
    if (targetIds.length === 0) return result
    let query = this.supabase
      .from('comments')
      .select('target_id')
      .eq('target_type', targetType)
      .in('target_id', targetIds)
    if (bubbleId) query = query.eq('bubble_id', bubbleId)
    else query = query.is('bubble_id', null)
    const { data } = await query
    for (const row of data ?? []) {
      const tid = row.target_id as string
      result.set(tid, (result.get(tid) ?? 0) + 1)
    }
    return result
  }

  async create(params: {
    targetType: string
    targetId: string
    bubbleId: string | null
    userId: string
    content: string
    isAnonymous: boolean
    parentId?: string | null
  }): Promise<Comment> {
    const { data, error } = await this.supabase
      .from('comments')
      .insert({
        target_type: params.targetType,
        target_id: params.targetId,
        bubble_id: params.bubbleId,
        user_id: params.userId,
        content: params.content,
        is_anonymous: params.isAnonymous,
        parent_id: params.parentId ?? null,
      })
      .select(COMMENT_SELECT)
      .single()
    if (error) throw new Error(`댓글 생성 실패: ${error.message}`)
    return mapComment(data)
  }

  async delete(commentId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId)
    if (error) throw new Error(`댓글 삭제 실패: ${error.message}`)
  }
}

function mapComment(r: Record<string, unknown>): Comment {
  const userObj = r.users as Record<string, unknown> | null
  return {
    id: r.id as string,
    targetType: r.target_type as CommentTargetType,
    targetId: r.target_id as string,
    bubbleId: r.bubble_id as string | null,
    userId: r.user_id as string | null,
    content: r.content as string,
    isAnonymous: r.is_anonymous as boolean,
    createdAt: r.created_at as string,
    parentId: (r.parent_id as string) ?? null,
    authorNickname: (userObj?.nickname as string) ?? null,
    authorHandle: (userObj?.handle as string) ?? null,
    authorAvatarColor: (userObj?.avatar_color as string) ?? null,
  }
}
