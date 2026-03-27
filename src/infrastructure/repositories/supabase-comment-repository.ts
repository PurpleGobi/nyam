import { createClient } from '@/infrastructure/supabase/client'
import type { CommentRepository } from '@/domain/repositories/comment-repository'
import type { Comment } from '@/domain/entities/comment'

export class SupabaseCommentRepository implements CommentRepository {
  private get supabase() { return createClient() }

  async getByTarget(targetType: string, targetId: string, bubbleId: string): Promise<Comment[]> {
    const { data } = await this.supabase
      .from('comments')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('bubble_id', bubbleId)
      .order('created_at', { ascending: true })
    return (data ?? []).map(mapComment)
  }

  async create(params: {
    targetType: string
    targetId: string
    bubbleId: string
    userId: string
    content: string
    isAnonymous: boolean
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
      })
      .select()
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
  return {
    id: r.id as string,
    targetType: r.target_type as 'record',
    targetId: r.target_id as string,
    bubbleId: r.bubble_id as string | null,
    userId: r.user_id as string | null,
    content: r.content as string,
    isAnonymous: r.is_anonymous as boolean,
    createdAt: r.created_at as string,
  }
}
