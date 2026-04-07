// R1: 외부 의존 0
export type BookmarkType = 'bookmark' | 'cellar'
export type BookmarkTargetType = 'restaurant' | 'wine'

export interface Bookmark {
  id: string
  userId: string
  targetId: string
  targetType: BookmarkTargetType
  type: BookmarkType
  createdAt: string
}
