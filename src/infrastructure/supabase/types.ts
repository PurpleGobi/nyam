/**
 * Supabase Database Types
 * 마이그레이션 파일(001~013) 기반 수동 생성
 * Supabase CLI `supabase gen types typescript` 로 재생성 가능
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
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
          privacy_profile: 'public' | 'bubble_only' | 'private'
          privacy_records: 'all' | 'shared_only'
          visibility_public: Json
          visibility_bubble: Json
          notify_push: boolean
          notify_level_up: boolean
          notify_bubble_join: boolean
          notify_follow: boolean
          dnd_start: string | null
          dnd_end: string | null
          pref_landing: 'last' | 'home' | 'bubbles' | 'profile'
          pref_home_tab: 'last' | 'restaurant' | 'wine'
          pref_restaurant_sub: 'last' | 'visited' | 'wishlist' | 'following'
          pref_wine_sub: 'last' | 'tasted' | 'wishlist' | 'cellar'
          pref_bubble_tab: 'last' | 'bubble' | 'bubbler'
          pref_view_mode: 'last' | 'card' | 'list' | 'calendar'
          pref_default_sort: 'latest' | 'score_high' | 'score_low' | 'name' | 'visit_count'
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
          auth_provider: 'kakao' | 'google' | 'apple' | 'naver'
          auth_provider_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          nickname: string
          handle?: string | null
          avatar_url?: string | null
          avatar_color?: string | null
          bio?: string | null
          taste_summary?: string | null
          taste_tags?: string[] | null
          taste_updated_at?: string | null
          preferred_areas?: string[] | null
          privacy_profile?: 'public' | 'bubble_only' | 'private'
          privacy_records?: 'all' | 'shared_only'
          visibility_public?: Json
          visibility_bubble?: Json
          notify_push?: boolean
          notify_level_up?: boolean
          notify_bubble_join?: boolean
          notify_follow?: boolean
          dnd_start?: string | null
          dnd_end?: string | null
          pref_landing?: 'last' | 'home' | 'bubbles' | 'profile'
          pref_home_tab?: 'last' | 'restaurant' | 'wine'
          pref_restaurant_sub?: 'last' | 'visited' | 'wishlist' | 'following'
          pref_wine_sub?: 'last' | 'tasted' | 'wishlist' | 'cellar'
          pref_bubble_tab?: 'last' | 'bubble' | 'bubbler'
          pref_view_mode?: 'last' | 'card' | 'list' | 'calendar'
          pref_default_sort?: 'latest' | 'score_high' | 'score_low' | 'name' | 'visit_count'
          pref_record_input?: 'camera' | 'search'
          pref_bubble_share?: 'ask' | 'auto' | 'never'
          pref_temp_unit?: 'C' | 'F'
          deleted_at?: string | null
          delete_mode?: 'anonymize' | 'hard_delete' | null
          delete_scheduled_at?: string | null
          record_count?: number
          follower_count?: number
          following_count?: number
          current_streak?: number
          total_xp?: number
          active_xp?: number
          active_verified?: number
          auth_provider: 'kakao' | 'google' | 'apple' | 'naver'
          auth_provider_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          nickname?: string
          handle?: string | null
          avatar_url?: string | null
          avatar_color?: string | null
          bio?: string | null
          taste_summary?: string | null
          taste_tags?: string[] | null
          taste_updated_at?: string | null
          preferred_areas?: string[] | null
          privacy_profile?: 'public' | 'bubble_only' | 'private'
          privacy_records?: 'all' | 'shared_only'
          visibility_public?: Json
          visibility_bubble?: Json
          notify_push?: boolean
          notify_level_up?: boolean
          notify_bubble_join?: boolean
          notify_follow?: boolean
          dnd_start?: string | null
          dnd_end?: string | null
          pref_landing?: 'last' | 'home' | 'bubbles' | 'profile'
          pref_home_tab?: 'last' | 'restaurant' | 'wine'
          pref_restaurant_sub?: 'last' | 'visited' | 'wishlist' | 'following'
          pref_wine_sub?: 'last' | 'tasted' | 'wishlist' | 'cellar'
          pref_bubble_tab?: 'last' | 'bubble' | 'bubbler'
          pref_view_mode?: 'last' | 'card' | 'list' | 'calendar'
          pref_default_sort?: 'latest' | 'score_high' | 'score_low' | 'name' | 'visit_count'
          pref_record_input?: 'camera' | 'search'
          pref_bubble_share?: 'ask' | 'auto' | 'never'
          pref_temp_unit?: 'C' | 'F'
          deleted_at?: string | null
          delete_mode?: 'anonymize' | 'hard_delete' | null
          delete_scheduled_at?: string | null
          record_count?: number
          follower_count?: number
          following_count?: number
          current_streak?: number
          total_xp?: number
          active_xp?: number
          active_verified?: number
          auth_provider?: 'kakao' | 'google' | 'apple' | 'naver'
          auth_provider_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      restaurants: {
        Row: {
          id: string
          name: string
          address: string | null
          country: string | null
          city: string | null
          area: string | null
          district: string | null
          genre: string | null
          price_range: number | null
          lat: number | null
          lng: number | null
          phone: string | null
          hours: Json | null
          photos: string[] | null
          menus: Json | null
          naver_rating: number | null
          kakao_rating: number | null
          google_rating: number | null
          michelin_stars: number | null
          has_blue_ribbon: boolean
          media_appearances: Json | null
          nyam_score: number | null
          nyam_score_updated_at: string | null
          external_ids: Json | null
          cached_at: string | null
          next_refresh_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          country?: string | null
          city?: string | null
          area?: string | null
          district?: string | null
          genre?: string | null
          price_range?: number | null
          lat?: number | null
          lng?: number | null
          phone?: string | null
          hours?: Json | null
          photos?: string[] | null
          menus?: Json | null
          naver_rating?: number | null
          kakao_rating?: number | null
          google_rating?: number | null
          michelin_stars?: number | null
          has_blue_ribbon?: boolean
          media_appearances?: Json | null
          nyam_score?: number | null
          nyam_score_updated_at?: string | null
          external_ids?: Json | null
          cached_at?: string | null
          next_refresh_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          country?: string | null
          city?: string | null
          area?: string | null
          district?: string | null
          genre?: string | null
          price_range?: number | null
          lat?: number | null
          lng?: number | null
          phone?: string | null
          hours?: Json | null
          photos?: string[] | null
          menus?: Json | null
          naver_rating?: number | null
          kakao_rating?: number | null
          google_rating?: number | null
          michelin_stars?: number | null
          has_blue_ribbon?: boolean
          media_appearances?: Json | null
          nyam_score?: number | null
          nyam_score_updated_at?: string | null
          external_ids?: Json | null
          cached_at?: string | null
          next_refresh_at?: string | null
          created_at?: string
        }
      }
      wines: {
        Row: {
          id: string
          name: string
          producer: string | null
          region: string | null
          sub_region: string | null
          country: string | null
          variety: string | null
          grape_varieties: Json | null
          wine_type: 'red' | 'white' | 'rose' | 'sparkling' | 'orange' | 'fortified' | 'dessert'
          vintage: number | null
          abv: number | null
          label_image_url: string | null
          photos: string[] | null
          body_level: number | null
          acidity_level: number | null
          sweetness_level: number | null
          food_pairings: string[] | null
          serving_temp: string | null
          decanting: string | null
          reference_price: number | null
          drinking_window_start: number | null
          drinking_window_end: number | null
          vivino_rating: number | null
          critic_scores: Json | null
          classification: string | null
          nyam_score: number | null
          nyam_score_updated_at: string | null
          external_ids: Json | null
          cached_at: string | null
          next_refresh_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          producer?: string | null
          region?: string | null
          sub_region?: string | null
          country?: string | null
          variety?: string | null
          grape_varieties?: Json | null
          wine_type: 'red' | 'white' | 'rose' | 'sparkling' | 'orange' | 'fortified' | 'dessert'
          vintage?: number | null
          abv?: number | null
          label_image_url?: string | null
          photos?: string[] | null
          body_level?: number | null
          acidity_level?: number | null
          sweetness_level?: number | null
          food_pairings?: string[] | null
          serving_temp?: string | null
          decanting?: string | null
          reference_price?: number | null
          drinking_window_start?: number | null
          drinking_window_end?: number | null
          vivino_rating?: number | null
          critic_scores?: Json | null
          classification?: string | null
          nyam_score?: number | null
          nyam_score_updated_at?: string | null
          external_ids?: Json | null
          cached_at?: string | null
          next_refresh_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          producer?: string | null
          region?: string | null
          sub_region?: string | null
          country?: string | null
          variety?: string | null
          grape_varieties?: Json | null
          wine_type?: 'red' | 'white' | 'rose' | 'sparkling' | 'orange' | 'fortified' | 'dessert'
          vintage?: number | null
          abv?: number | null
          label_image_url?: string | null
          photos?: string[] | null
          body_level?: number | null
          acidity_level?: number | null
          sweetness_level?: number | null
          food_pairings?: string[] | null
          serving_temp?: string | null
          decanting?: string | null
          reference_price?: number | null
          drinking_window_start?: number | null
          drinking_window_end?: number | null
          vivino_rating?: number | null
          critic_scores?: Json | null
          classification?: string | null
          nyam_score?: number | null
          nyam_score_updated_at?: string | null
          external_ids?: Json | null
          cached_at?: string | null
          next_refresh_at?: string | null
          created_at?: string
        }
      }
      lists: {
        Row: {
          id: string
          user_id: string
          target_id: string
          target_type: 'restaurant' | 'wine'
          status: 'visited' | 'wishlist' | 'cellar' | 'tasted'
          source: string
          source_record_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_id: string
          target_type: 'restaurant' | 'wine'
          status: 'visited' | 'wishlist' | 'cellar' | 'tasted'
          source?: string
          source_record_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_id?: string
          target_type?: 'restaurant' | 'wine'
          status?: 'visited' | 'wishlist' | 'cellar' | 'tasted'
          source?: string
          source_record_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      records: {
        Row: {
          id: string
          list_id: string
          user_id: string
          target_id: string
          target_type: 'restaurant' | 'wine'
          camera_mode: 'individual' | 'shelf' | 'receipt' | null
          ocr_data: Json | null
          axis_x: number | null
          axis_y: number | null
          satisfaction: number | null
          scene: string | null
          aroma_regions: Json | null
          aroma_labels: string[] | null
          aroma_color: string | null
          complexity: number | null
          finish: number | null
          balance: number | null
          auto_score: number | null
          comment: string | null
          menu_tags: string[] | null
          pairing_categories: string[] | null
          companions: string[] | null
          companion_count: number | null
          total_price: number | null
          purchase_price: number | null
          visit_date: string | null
          meal_time: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          linked_restaurant_id: string | null
          linked_wine_id: string | null
          has_exif_gps: boolean
          is_exif_verified: boolean
          private_note: string | null
          record_quality_xp: number
          score_updated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          list_id: string
          user_id: string
          target_id: string
          target_type: 'restaurant' | 'wine'
          legacy_record_id?: string | null
          camera_mode?: 'individual' | 'shelf' | 'receipt' | null
          ocr_data?: Json | null
          axis_x?: number | null
          axis_y?: number | null
          satisfaction?: number | null
          scene?: string | null
          aroma_regions?: Json | null
          aroma_labels?: string[] | null
          aroma_color?: string | null
          complexity?: number | null
          finish?: number | null
          balance?: number | null
          auto_score?: number | null
          comment?: string | null
          menu_tags?: string[] | null
          pairing_categories?: string[] | null
          companions?: string[] | null
          companion_count?: number | null
          total_price?: number | null
          purchase_price?: number | null
          visit_date?: string | null
          meal_time?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          linked_restaurant_id?: string | null
          linked_wine_id?: string | null
          has_exif_gps?: boolean
          is_exif_verified?: boolean
          private_note?: string | null
          record_quality_xp?: number
          score_updated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          list_id?: string
          user_id?: string
          target_id?: string
          target_type?: 'restaurant' | 'wine'
          legacy_record_id?: string | null
          camera_mode?: 'individual' | 'shelf' | 'receipt' | null
          ocr_data?: Json | null
          axis_x?: number | null
          axis_y?: number | null
          satisfaction?: number | null
          scene?: string | null
          aroma_regions?: Json | null
          aroma_labels?: string[] | null
          aroma_color?: string | null
          complexity?: number | null
          finish?: number | null
          balance?: number | null
          auto_score?: number | null
          comment?: string | null
          menu_tags?: string[] | null
          pairing_categories?: string[] | null
          companions?: string[] | null
          companion_count?: number | null
          total_price?: number | null
          purchase_price?: number | null
          visit_date?: string | null
          meal_time?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          linked_restaurant_id?: string | null
          linked_wine_id?: string | null
          has_exif_gps?: boolean
          is_exif_verified?: boolean
          private_note?: string | null
          record_quality_xp?: number
          score_updated_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      record_photos: {
        Row: {
          id: string
          record_id: string
          url: string
          thumbnail_url: string | null
          order_index: number
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          record_id: string
          url: string
          thumbnail_url?: string | null
          order_index?: number
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          record_id?: string
          url?: string
          thumbnail_url?: string | null
          order_index?: number
          is_public?: boolean
          created_at?: string
        }
      }
      bubbles: {
        Row: {
          id: string
          name: string
          description: string | null
          focus_type: 'all' | 'restaurant' | 'wine'
          area: string | null
          visibility: 'private' | 'public'
          content_visibility: 'rating_only' | 'rating_and_comment'
          allow_comments: boolean
          allow_external_share: boolean
          join_policy: 'invite_only' | 'closed' | 'manual_approve' | 'auto_approve' | 'open'
          min_records: number
          min_level: number
          max_members: number | null
          rules: string[] | null
          is_searchable: boolean
          search_keywords: string[] | null
          follower_count: number
          member_count: number
          record_count: number
          avg_satisfaction: number | null
          last_activity_at: string | null
          unique_target_count: number
          weekly_record_count: number
          prev_weekly_record_count: number
          icon: string | null
          icon_bg_color: string | null
          created_by: string | null
          invite_code: string | null
          invite_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          focus_type?: 'all' | 'restaurant' | 'wine'
          area?: string | null
          visibility?: 'private' | 'public'
          content_visibility?: 'rating_only' | 'rating_and_comment'
          allow_comments?: boolean
          allow_external_share?: boolean
          join_policy?: 'invite_only' | 'closed' | 'manual_approve' | 'auto_approve' | 'open'
          min_records?: number
          min_level?: number
          max_members?: number | null
          rules?: string[] | null
          is_searchable?: boolean
          search_keywords?: string[] | null
          follower_count?: number
          member_count?: number
          record_count?: number
          avg_satisfaction?: number | null
          last_activity_at?: string | null
          unique_target_count?: number
          weekly_record_count?: number
          prev_weekly_record_count?: number
          icon?: string | null
          icon_bg_color?: string | null
          created_by?: string | null
          invite_code?: string | null
          invite_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          focus_type?: 'all' | 'restaurant' | 'wine'
          area?: string | null
          visibility?: 'private' | 'public'
          content_visibility?: 'rating_only' | 'rating_and_comment'
          allow_comments?: boolean
          allow_external_share?: boolean
          join_policy?: 'invite_only' | 'closed' | 'manual_approve' | 'auto_approve' | 'open'
          min_records?: number
          min_level?: number
          max_members?: number | null
          rules?: string[] | null
          is_searchable?: boolean
          search_keywords?: string[] | null
          follower_count?: number
          member_count?: number
          record_count?: number
          avg_satisfaction?: number | null
          last_activity_at?: string | null
          unique_target_count?: number
          weekly_record_count?: number
          prev_weekly_record_count?: number
          icon?: string | null
          icon_bg_color?: string | null
          created_by?: string | null
          invite_code?: string | null
          invite_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bubble_members: {
        Row: {
          bubble_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'follower'
          status: 'pending' | 'active' | 'rejected'
          visibility_override: Json | null
          taste_match_pct: number | null
          common_target_count: number
          avg_satisfaction: number | null
          member_unique_target_count: number
          weekly_share_count: number
          badge_label: string | null
          joined_at: string
        }
        Insert: {
          bubble_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'follower'
          status?: 'pending' | 'active' | 'rejected'
          visibility_override?: Json | null
          taste_match_pct?: number | null
          common_target_count?: number
          avg_satisfaction?: number | null
          member_unique_target_count?: number
          weekly_share_count?: number
          badge_label?: string | null
          joined_at?: string
        }
        Update: {
          bubble_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member' | 'follower'
          status?: 'pending' | 'active' | 'rejected'
          visibility_override?: Json | null
          taste_match_pct?: number | null
          common_target_count?: number
          avg_satisfaction?: number | null
          member_unique_target_count?: number
          weekly_share_count?: number
          badge_label?: string | null
          joined_at?: string
        }
      }
      bubble_shares: {
        Row: {
          id: string
          record_id: string
          bubble_id: string
          shared_by: string
          shared_at: string
          auto_synced: boolean
          target_id: string
          target_type: 'restaurant' | 'wine'
        }
        Insert: {
          id?: string
          record_id: string
          bubble_id: string
          shared_by: string
          shared_at?: string
          auto_synced?: boolean
          target_id: string
          target_type: 'restaurant' | 'wine'
        }
        Update: {
          id?: string
          record_id?: string
          bubble_id?: string
          shared_by?: string
          shared_at?: string
          auto_synced?: boolean
          target_id?: string
          target_type?: 'restaurant' | 'wine'
        }
      }
      comments: {
        Row: {
          id: string
          target_type: 'record'
          target_id: string
          bubble_id: string | null
          user_id: string | null
          content: string
          is_anonymous: boolean
          created_at: string
        }
        Insert: {
          id?: string
          target_type: 'record'
          target_id: string
          bubble_id?: string | null
          user_id?: string | null
          content: string
          is_anonymous?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          target_type?: 'record'
          target_id?: string
          bubble_id?: string | null
          user_id?: string | null
          content?: string
          is_anonymous?: boolean
          created_at?: string
        }
      }
      reactions: {
        Row: {
          id: string
          target_type: 'record' | 'comment'
          target_id: string
          reaction_type: 'like' | 'bookmark' | 'want' | 'check' | 'fire'
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          target_type: 'record' | 'comment'
          target_id: string
          reaction_type: 'like' | 'bookmark' | 'want' | 'check' | 'fire'
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          target_type?: 'record' | 'comment'
          target_id?: string
          reaction_type?: 'like' | 'bookmark' | 'want' | 'check' | 'fire'
          user_id?: string | null
          created_at?: string
        }
      }
      bubble_ranking_snapshots: {
        Row: {
          bubble_id: string
          target_id: string
          target_type: 'restaurant' | 'wine'
          period_start: string
          rank_position: number
          avg_satisfaction: number | null
          record_count: number
        }
        Insert: {
          bubble_id: string
          target_id: string
          target_type: 'restaurant' | 'wine'
          period_start: string
          rank_position: number
          avg_satisfaction?: number | null
          record_count?: number
        }
        Update: {
          bubble_id?: string
          target_id?: string
          target_type?: 'restaurant' | 'wine'
          period_start?: string
          rank_position?: number
          avg_satisfaction?: number | null
          record_count?: number
        }
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
      }
      xp_totals: {
        Row: {
          id: string
          user_id: string
          axis_type: 'category' | 'area' | 'genre' | 'wine_variety' | 'wine_region'
          axis_value: string
          total_xp: number
          level: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          axis_type: 'category' | 'area' | 'genre' | 'wine_variety' | 'wine_region'
          axis_value: string
          total_xp?: number
          level?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          axis_type?: 'category' | 'area' | 'genre' | 'wine_variety' | 'wine_region'
          axis_value?: string
          total_xp?: number
          level?: number
          updated_at?: string
        }
      }
      xp_log_changes: {
        Row: {
          id: string
          user_id: string
          record_id: string | null
          axis_type: string | null
          axis_value: string | null
          xp_amount: number | null
          reason: 'record_name' | 'record_score' | 'record_photo' | 'record_full' | 'category' | 'social_share' | 'social_like' | 'social_follow' | 'social_mutual' | 'bonus_onboard' | 'bonus_first_record' | 'bonus_first_bubble' | 'bonus_first_share' | 'milestone' | 'revisit' | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          record_id?: string | null
          axis_type?: string | null
          axis_value?: string | null
          xp_amount?: number | null
          reason?: 'record_name' | 'record_score' | 'record_photo' | 'record_full' | 'category' | 'social_share' | 'social_like' | 'social_follow' | 'social_mutual' | 'bonus_onboard' | 'bonus_first_record' | 'bonus_first_bubble' | 'bonus_first_share' | 'milestone' | 'revisit' | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          record_id?: string | null
          axis_type?: string | null
          axis_value?: string | null
          xp_amount?: number | null
          reason?: 'record_name' | 'record_score' | 'record_photo' | 'record_full' | 'category' | 'social_share' | 'social_like' | 'social_follow' | 'social_mutual' | 'bonus_onboard' | 'bonus_first_record' | 'bonus_first_bubble' | 'bonus_first_share' | 'milestone' | 'revisit' | null
          created_at?: string
        }
      }
      xp_seed_levels: {
        Row: {
          level: number
          required_xp: number
          title: string | null
          color: string | null
        }
        Insert: {
          level: number
          required_xp: number
          title?: string | null
          color?: string | null
        }
        Update: {
          level?: number
          required_xp?: number
          title?: string | null
          color?: string | null
        }
      }
      xp_seed_milestones: {
        Row: {
          id: string
          axis_type: 'category' | 'area' | 'genre' | 'wine_variety' | 'wine_region' | 'global'
          metric: string
          threshold: number
          xp_reward: number
          label: string
        }
        Insert: {
          id?: string
          axis_type: 'category' | 'area' | 'genre' | 'wine_variety' | 'wine_region' | 'global'
          metric: string
          threshold: number
          xp_reward: number
          label: string
        }
        Update: {
          id?: string
          axis_type?: 'category' | 'area' | 'genre' | 'wine_variety' | 'wine_region' | 'global'
          metric?: string
          threshold?: number
          xp_reward?: number
          label?: string
        }
      }
      xp_log_milestones: {
        Row: {
          user_id: string
          milestone_id: string
          axis_value: string
          achieved_at: string
        }
        Insert: {
          user_id: string
          milestone_id: string
          axis_value?: string
          achieved_at?: string
        }
        Update: {
          user_id?: string
          milestone_id?: string
          axis_value?: string
          achieved_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          notification_type: 'level_up' | 'bubble_join_request' | 'bubble_join_approved' | 'follow_request' | 'follow_accepted' | 'bubble_invite' | 'bubble_new_record' | 'bubble_member_joined' | 'reaction_like' | 'comment_reply'
          actor_id: string | null
          target_type: string | null
          target_id: string | null
          bubble_id: string | null
          metadata: Json | null
          is_read: boolean
          action_status: 'pending' | 'accepted' | 'rejected' | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notification_type: 'level_up' | 'bubble_join_request' | 'bubble_join_approved' | 'follow_request' | 'follow_accepted' | 'bubble_invite' | 'bubble_new_record' | 'bubble_member_joined' | 'reaction_like' | 'comment_reply'
          actor_id?: string | null
          target_type?: string | null
          target_id?: string | null
          bubble_id?: string | null
          metadata?: Json | null
          is_read?: boolean
          action_status?: 'pending' | 'accepted' | 'rejected' | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notification_type?: 'level_up' | 'bubble_join_request' | 'bubble_join_approved' | 'follow_request' | 'follow_accepted' | 'bubble_invite' | 'bubble_new_record' | 'bubble_member_joined' | 'reaction_like' | 'comment_reply'
          actor_id?: string | null
          target_type?: string | null
          target_id?: string | null
          bubble_id?: string | null
          metadata?: Json | null
          is_read?: boolean
          action_status?: 'pending' | 'accepted' | 'rejected' | null
          created_at?: string
        }
      }
      saved_filters: {
        Row: {
          id: string
          user_id: string
          name: string
          target_type: 'restaurant' | 'wine' | 'bubble' | 'bubbler' | 'bubble_feed' | 'bubble_ranking' | 'bubble_member'
          context_id: string | null
          rules: Json
          sort_by: 'latest' | 'score_high' | 'score_low' | 'name' | 'visit_count' | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          target_type: 'restaurant' | 'wine' | 'bubble' | 'bubbler' | 'bubble_feed' | 'bubble_ranking' | 'bubble_member'
          context_id?: string | null
          rules: Json
          sort_by?: 'latest' | 'score_high' | 'score_low' | 'name' | 'visit_count' | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          target_type?: 'restaurant' | 'wine' | 'bubble' | 'bubbler' | 'bubble_feed' | 'bubble_ranking' | 'bubble_member'
          context_id?: string | null
          rules?: Json
          sort_by?: 'latest' | 'score_high' | 'score_low' | 'name' | 'visit_count' | null
          order_index?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// 편의 타입 aliases
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
