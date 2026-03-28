import { createClient } from '@/infrastructure/supabase/client'
import type { SavedFilterRepository } from '@/domain/repositories/saved-filter-repository'
import type { SavedFilter, FilterRule, FilterTargetType, SortOption } from '@/domain/entities/saved-filter'

export class SupabaseSavedFilterRepository implements SavedFilterRepository {
  private get supabase() { return createClient() }

  async getByUser(userId: string, targetType: string): Promise<SavedFilter[]> {
    const { data } = await this.supabase
      .from('saved_filters')
      .select('*')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .order('order_index')
    return (data ?? []).map(mapFilter)
  }

  async create(params: { userId: string; name: string; targetType: string; rules: FilterRule[]; sortBy?: string }): Promise<SavedFilter> {
    const { data, error } = await this.supabase
      .from('saved_filters')
      .insert({ user_id: params.userId, name: params.name, target_type: params.targetType, rules: params.rules, sort_by: params.sortBy ?? null })
      .select()
      .single()
    if (error) throw new Error(`필터 저장 실패: ${error.message}`)
    return mapFilter(data)
  }

  async delete(filterId: string): Promise<void> {
    await this.supabase.from('saved_filters').delete().eq('id', filterId)
  }

  async getRecordCount(userId: string, targetType: string): Promise<number> {
    const { count } = await this.supabase
      .from('records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('target_type', targetType)
    return count ?? 0
  }
}

function mapFilter(r: Record<string, unknown>): SavedFilter {
  return {
    id: r.id as string, userId: r.user_id as string, name: r.name as string,
    targetType: r.target_type as FilterTargetType, contextId: r.context_id as string | null,
    rules: r.rules as FilterRule[], sortBy: r.sort_by as SortOption | null,
    orderIndex: r.order_index as number, createdAt: r.created_at as string,
  }
}
