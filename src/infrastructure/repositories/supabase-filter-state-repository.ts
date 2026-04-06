import { createClient } from '@/infrastructure/supabase/client'
import type { FilterStateRepository } from '@/domain/repositories/filter-state-repository'
import type { HomeFilterState } from '@/domain/entities/home-filter-state'

export class SupabaseFilterStateRepository implements FilterStateRepository {
  private get supabase() {
    return createClient()
  }

  async load(userId: string): Promise<HomeFilterState> {
    const { data, error } = await this.supabase
      .from('users')
      .select('home_filter_state')
      .eq('id', userId)
      .single()

    if (error) throw new Error(`FilterState 조회 실패: ${error.message}`)

    return (data.home_filter_state as HomeFilterState) ?? {}
  }

  async save(userId: string, state: HomeFilterState): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ home_filter_state: state })
      .eq('id', userId)

    if (error) throw new Error(`FilterState 저장 실패: ${error.message}`)
  }
}
