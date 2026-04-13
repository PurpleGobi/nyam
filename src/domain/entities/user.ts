import type { AuthProvider } from './auth'

export type FollowPolicy = 'blocked' | 'auto_approve' | 'manual_approve' | 'conditional'

export interface User {
  id: string
  email: string | null
  nickname: string
  handle: string | null
  avatar_url: string | null
  avatar_color: string | null
  bio: string | null
  taste_summary: string | null
  taste_tags: string[] | null
  taste_updated_at: string | null
  preferred_areas: string[] | null
  is_public: boolean
  follow_policy: FollowPolicy
  follow_min_records: number | null
  follow_min_level: number | null
  visibility_public: VisibilityConfig
  visibility_bubble: VisibilityConfig
  notify_push: boolean
  notify_level_up: boolean
  notify_bubble_join: boolean
  notify_follow: boolean
  dnd_start: string | null
  dnd_end: string | null
  pref_landing: 'last' | 'home' | 'bubbles' | 'profile'
  pref_home_tab: 'last' | 'restaurant' | 'wine'
  pref_restaurant_sub: 'last' | 'visited' | 'following'
  pref_wine_sub: 'last' | 'tasted'
  pref_bubble_tab: 'last' | 'bubble' | 'bubbler'
  pref_view_mode: 'last' | 'card' | 'list' | 'calendar'
  pref_default_sort: 'latest' | 'score_high' | 'score_low' | 'name' | 'visit_count' | 'distance'
  pref_record_input: 'camera' | 'search'
  pref_bubble_share: 'ask' | 'auto' | 'never'
  pref_temp_unit: 'C' | 'F'
  deleted_at: string | null
  delete_mode: 'anonymize' | 'hard_delete' | null
  delete_scheduled_at: string | null
  record_count: number
  follower_count: number
  following_count: number
  current_streak: number
  total_xp: number
  active_xp: number
  active_verified: number
  auth_provider: AuthProvider
  auth_provider_id: string
  created_at: string
  updated_at: string
}

export interface VisibilityConfig {
  score: boolean
  comment: boolean
  photos: boolean
  level: boolean
  quadrant: boolean
  bubbles: boolean
  price: boolean
}
