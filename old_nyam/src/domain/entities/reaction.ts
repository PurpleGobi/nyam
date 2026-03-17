export type ReactionType = 'like' | 'comment'

export interface Bookmark {
  userId: string
  recordId: string
  createdAt: string
}

export interface Reaction {
  id: string
  userId: string
  recordId: string
  type: ReactionType
  commentText: string | null
  createdAt: string
}
