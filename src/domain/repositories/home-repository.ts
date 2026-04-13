// src/domain/repositories/home-repository.ts
// R1: 외부 의존 0 — React, Supabase, Next.js import 금지

import type { RecordTargetType } from '@/domain/entities/record'
import type { HomeTarget } from '@/domain/entities/home-target'
import type { SortOption } from '@/domain/entities/saved-filter'

export type HomeViewType = 'mine' | 'bubble' | 'following'

/** 빈 viewTypes 폴백용 기본 뷰 목록 (전부 = 아무 선택 안 한 것과 동일) */
export const ALL_HOME_VIEWS: HomeViewType[] = ['mine', 'bubble', 'following']

/** DB에서 처리할 필터 파라미터 (식당+와인 공용) */
export interface HomeDbFilters {
  // 식당
  genre?: string
  district?: string
  area?: string
  prestige?: string      // 'michelin' | 'blue_ribbon' | 'tv' | 'none'
  priceRange?: number
  // 와인
  wineType?: string
  variety?: string
  country?: string
  vintage?: number
  vintageOp?: 'eq' | 'lte'
  acidity?: number
  sweetness?: number
}

/** findHomeTargets 반환 타입 */
export interface HomeTargetsResult {
  targets: HomeTarget[]
  /** DB LIMIT+1 패턴으로 판별. limit=null이면 항상 false */
  hasMore: boolean
}

export interface HomeRepository {
  /** Target 중심 홈 피드 조회 */
  findHomeTargets(
    userId: string,
    targetType: RecordTargetType,
    views: HomeViewType[],
    socialFilter?: {
      followingUserIds?: string[]
      bubbleIds?: string[]
    },
    dbFilters?: HomeDbFilters,
    sort?: SortOption,
    limit?: number | null,
    offset?: number,
  ): Promise<HomeTargetsResult>
}
