import type { Bookmark, BookmarkType, BookmarkTargetType } from '@/domain/entities/bookmark'

export interface BookmarkRepository {
  /** 찜/셀러 토글 — 있으면 삭제, 없으면 생성 */
  toggle(userId: string, targetId: string, targetType: BookmarkTargetType, type: BookmarkType): Promise<boolean>

  /** 특정 대상의 찜 여부 확인 */
  isBookmarked(userId: string, targetId: string, targetType: BookmarkTargetType): Promise<boolean>

  /** 특정 대상의 셀러 여부 확인 */
  isCellar(userId: string, targetId: string): Promise<boolean>

  /** 사용자의 찜/셀러 목록 조회 */
  findByUser(userId: string, targetType: BookmarkTargetType, type?: BookmarkType): Promise<Bookmark[]>

  /** 특정 대상들의 찜 여부 일괄 확인 */
  findBookmarkedTargetIds(userId: string, targetIds: string[], targetType: BookmarkTargetType): Promise<Set<string>>
}
