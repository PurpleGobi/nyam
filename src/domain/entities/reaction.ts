import type { ReactionType } from "@/infrastructure/supabase/types"

export interface Reaction {
  id: string
  userId: string
  recordId: string
  type: ReactionType
  commentText: string | null
  createdAt: string
}
