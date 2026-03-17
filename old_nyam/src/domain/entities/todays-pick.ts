export type RecommendationType =
  | 'revisit'
  | 'friend_find'
  | 'taste_match'
  | 'wine_match'
  | 'group_rec'
  | 'dormant_regular'
  | 'new_opening'

export interface TodaysPick {
  id: string
  type: RecommendationType
  reason: string
  subtext: string
  restaurantName: string
  area: string
  score: string
  photoUrl: string
  recordId: string | null
  restaurantId: string | null
}
