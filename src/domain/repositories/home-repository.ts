// src/domain/repositories/home-repository.ts
// R1: 외부 의존 0 — React, Supabase, Next.js import 금지

import type { RecordTargetType } from '@/domain/entities/record'
import type { HomeTarget } from '@/domain/entities/home-target'

export type HomeViewType = 'visited' | 'tasted' | 'bookmark' | 'cellar'
  | 'unrated' | 'bubble' | 'following' | 'public'

/** 빈 viewTypes 폴백용 기본 뷰 목록 */
export const ALL_HOME_VIEWS: HomeViewType[] = ['visited', 'bookmark', 'bubble', 'following', 'public']

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
  ): Promise<HomeTarget[]>
}
