export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      area_zones: {
        Row: {
          city: string
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          radius_m: number
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
          radius_m?: number
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          radius_m?: number
        }
        Relationships: []
      }
      bubble_items: {
        Row: {
          added_at: string
          added_by: string
          bubble_id: string
          id: string
          record_id: string | null
          source: string
          target_id: string
          target_type: string
        }
        Insert: {
          added_at?: string
          added_by: string
          bubble_id: string
          id?: string
          record_id?: string | null
          source?: string
          target_id: string
          target_type: string
        }
        Update: {
          added_at?: string
          added_by?: string
          bubble_id?: string
          id?: string
          record_id?: string | null
          source?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bubble_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bubble_items_bubble_id_fkey"
            columns: ["bubble_id"]
            isOneToOne: false
            referencedRelation: "bubbles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bubble_items_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
        ]
      }
      bubble_members: {
        Row: {
          avg_satisfaction: number | null
          badge_label: string | null
          bubble_id: string
          common_target_count: number
          joined_at: string
          member_unique_target_count: number
          role: string
          share_rule: Json | null
          status: string
          taste_match_pct: number | null
          user_id: string
          visibility_override: Json | null
          weekly_share_count: number
        }
        Insert: {
          avg_satisfaction?: number | null
          badge_label?: string | null
          bubble_id: string
          common_target_count?: number
          joined_at?: string
          member_unique_target_count?: number
          role?: string
          share_rule?: Json | null
          status?: string
          taste_match_pct?: number | null
          user_id: string
          visibility_override?: Json | null
          weekly_share_count?: number
        }
        Update: {
          avg_satisfaction?: number | null
          badge_label?: string | null
          bubble_id?: string
          common_target_count?: number
          joined_at?: string
          member_unique_target_count?: number
          role?: string
          share_rule?: Json | null
          status?: string
          taste_match_pct?: number | null
          user_id?: string
          visibility_override?: Json | null
          weekly_share_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "bubble_members_bubble_id_fkey"
            columns: ["bubble_id"]
            isOneToOne: false
            referencedRelation: "bubbles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bubble_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bubble_ranking_snapshots: {
        Row: {
          avg_satisfaction: number | null
          bubble_id: string
          period_start: string
          rank_position: number
          record_count: number
          target_id: string
          target_type: string
        }
        Insert: {
          avg_satisfaction?: number | null
          bubble_id: string
          period_start: string
          rank_position: number
          record_count?: number
          target_id: string
          target_type: string
        }
        Update: {
          avg_satisfaction?: number | null
          bubble_id?: string
          period_start?: string
          rank_position?: number
          record_count?: number
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bubble_ranking_snapshots_bubble_id_fkey"
            columns: ["bubble_id"]
            isOneToOne: false
            referencedRelation: "bubbles"
            referencedColumns: ["id"]
          },
        ]
      }
      bubble_shares: {
        Row: {
          auto_synced: boolean
          bubble_id: string
          id: string
          record_id: string
          shared_at: string
          shared_by: string
          target_id: string
          target_type: string
        }
        Insert: {
          auto_synced?: boolean
          bubble_id: string
          id?: string
          record_id: string
          shared_at?: string
          shared_by: string
          target_id: string
          target_type: string
        }
        Update: {
          auto_synced?: boolean
          bubble_id?: string
          id?: string
          record_id?: string
          shared_at?: string
          shared_by?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bubble_shares_bubble_id_fkey"
            columns: ["bubble_id"]
            isOneToOne: false
            referencedRelation: "bubbles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bubble_shares_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bubble_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bubbles: {
        Row: {
          allow_comments: boolean
          allow_external_share: boolean
          area: string | null
          avg_satisfaction: number | null
          content_visibility: string
          created_at: string
          created_by: string | null
          description: string | null
          focus_type: string
          follower_count: number
          icon: string | null
          icon_bg_color: string | null
          id: string
          invite_code: string | null
          invite_expires_at: string | null
          is_searchable: boolean
          join_policy: string
          last_activity_at: string | null
          max_members: number | null
          member_count: number
          min_level: number
          min_records: number
          name: string
          prev_weekly_record_count: number
          record_count: number
          rules: string[] | null
          search_keywords: string[] | null
          unique_target_count: number
          updated_at: string
          visibility: string
          weekly_record_count: number
        }
        Insert: {
          allow_comments?: boolean
          allow_external_share?: boolean
          area?: string | null
          avg_satisfaction?: number | null
          content_visibility?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          focus_type?: string
          follower_count?: number
          icon?: string | null
          icon_bg_color?: string | null
          id?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          is_searchable?: boolean
          join_policy?: string
          last_activity_at?: string | null
          max_members?: number | null
          member_count?: number
          min_level?: number
          min_records?: number
          name: string
          prev_weekly_record_count?: number
          record_count?: number
          rules?: string[] | null
          search_keywords?: string[] | null
          unique_target_count?: number
          updated_at?: string
          visibility?: string
          weekly_record_count?: number
        }
        Update: {
          allow_comments?: boolean
          allow_external_share?: boolean
          area?: string | null
          avg_satisfaction?: number | null
          content_visibility?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          focus_type?: string
          follower_count?: number
          icon?: string | null
          icon_bg_color?: string | null
          id?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          is_searchable?: boolean
          join_policy?: string
          last_activity_at?: string | null
          max_members?: number | null
          member_count?: number
          min_level?: number
          min_records?: number
          name?: string
          prev_weekly_record_count?: number
          record_count?: number
          rules?: string[] | null
          search_keywords?: string[] | null
          unique_target_count?: number
          updated_at?: string
          visibility?: string
          weekly_record_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "bubbles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          bubble_id: string | null
          content: string
          created_at: string
          id: string
          is_anonymous: boolean
          target_id: string
          target_type: string
          user_id: string | null
        }
        Insert: {
          bubble_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          target_id: string
          target_type: string
          user_id?: string | null
        }
        Update: {
          bubble_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          target_id?: string
          target_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_bubble_id_fkey"
            columns: ["bubble_id"]
            isOneToOne: false
            referencedRelation: "bubbles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          status: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          status?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_status: string | null
          actor_id: string | null
          body: string | null
          bubble_id: string | null
          created_at: string
          id: string
          is_read: boolean
          metadata: Json | null
          notification_type: string
          target_id: string | null
          target_type: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          action_status?: string | null
          actor_id?: string | null
          body?: string | null
          bubble_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          notification_type: string
          target_id?: string | null
          target_type?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          action_status?: string | null
          actor_id?: string | null
          body?: string | null
          bubble_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          notification_type?: string
          target_id?: string | null
          target_type?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_bubble_id_fkey"
            columns: ["bubble_id"]
            isOneToOne: false
            referencedRelation: "bubbles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          target_id: string
          target_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          target_id: string
          target_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          target_id?: string
          target_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      record_photos: {
        Row: {
          captured_at: string | null
          created_at: string
          exif_lat: number | null
          exif_lng: number | null
          id: string
          is_public: boolean
          order_index: number
          record_id: string
          url: string
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          exif_lat?: number | null
          exif_lng?: number | null
          id?: string
          is_public?: boolean
          order_index?: number
          record_id: string
          url: string
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          exif_lat?: number | null
          exif_lng?: number | null
          id?: string
          is_public?: boolean
          order_index?: number
          record_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_photos_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
        ]
      }
      records: {
        Row: {
          aroma_primary: string[] | null
          aroma_secondary: string[] | null
          aroma_tertiary: string[] | null
          auto_score: number | null
          axis_x: number | null
          axis_y: number | null
          balance: number | null
          camera_mode: string | null
          comment: string | null
          companion_count: number | null
          companions: string[] | null
          complexity: number | null
          created_at: string
          finish: number | null
          has_exif_gps: boolean
          id: string
          intensity: number | null
          is_exif_verified: boolean
          linked_restaurant_id: string | null
          linked_wine_id: string | null
          meal_time: string | null
          menu_tags: string[] | null
          ocr_data: Json | null
          pairing_categories: string[] | null
          private_note: string | null
          purchase_price: number | null
          record_quality_xp: number
          satisfaction: number | null
          scene: string | null
          score_updated_at: string | null
          target_id: string
          target_type: string
          total_price: number | null
          updated_at: string
          user_id: string
          visit_date: string | null
        }
        Insert: {
          aroma_primary?: string[] | null
          aroma_secondary?: string[] | null
          aroma_tertiary?: string[] | null
          auto_score?: number | null
          axis_x?: number | null
          axis_y?: number | null
          balance?: number | null
          camera_mode?: string | null
          comment?: string | null
          companion_count?: number | null
          companions?: string[] | null
          complexity?: number | null
          created_at?: string
          finish?: number | null
          has_exif_gps?: boolean
          id?: string
          intensity?: number | null
          is_exif_verified?: boolean
          linked_restaurant_id?: string | null
          linked_wine_id?: string | null
          meal_time?: string | null
          menu_tags?: string[] | null
          ocr_data?: Json | null
          pairing_categories?: string[] | null
          private_note?: string | null
          purchase_price?: number | null
          record_quality_xp?: number
          satisfaction?: number | null
          scene?: string | null
          score_updated_at?: string | null
          target_id: string
          target_type: string
          total_price?: number | null
          updated_at?: string
          user_id: string
          visit_date?: string | null
        }
        Update: {
          aroma_primary?: string[] | null
          aroma_secondary?: string[] | null
          aroma_tertiary?: string[] | null
          auto_score?: number | null
          axis_x?: number | null
          axis_y?: number | null
          balance?: number | null
          camera_mode?: string | null
          comment?: string | null
          companion_count?: number | null
          companions?: string[] | null
          complexity?: number | null
          created_at?: string
          finish?: number | null
          has_exif_gps?: boolean
          id?: string
          intensity?: number | null
          is_exif_verified?: boolean
          linked_restaurant_id?: string | null
          linked_wine_id?: string | null
          meal_time?: string | null
          menu_tags?: string[] | null
          ocr_data?: Json | null
          pairing_categories?: string[] | null
          private_note?: string | null
          purchase_price?: number | null
          record_quality_xp?: number
          satisfaction?: number | null
          scene?: string | null
          score_updated_at?: string | null
          target_id?: string
          target_type?: string
          total_price?: number | null
          updated_at?: string
          user_id?: string
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "records_linked_restaurant_id_fkey"
            columns: ["linked_restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_linked_wine_id_fkey"
            columns: ["linked_wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_prestige: {
        Row: {
          address: string | null
          area: string | null
          created_at: string | null
          id: string
          kakao_id: string | null
          lat: number | null
          lng: number | null
          phone: string | null
          prestige_grade: string
          prestige_type: string
          prestige_year: number | null
          region: string | null
          restaurant_id: string | null
          restaurant_name: string
          restaurant_name_norm: string
          source_url: string | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          created_at?: string | null
          id?: string
          kakao_id?: string | null
          lat?: number | null
          lng?: number | null
          phone?: string | null
          prestige_grade: string
          prestige_type: string
          prestige_year?: number | null
          region?: string | null
          restaurant_id?: string | null
          restaurant_name: string
          restaurant_name_norm: string
          source_url?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          address?: string | null
          area?: string | null
          created_at?: string | null
          id?: string
          kakao_id?: string | null
          lat?: number | null
          lng?: number | null
          phone?: string | null
          prestige_grade?: string
          prestige_type?: string
          prestige_year?: number | null
          region?: string | null
          restaurant_id?: string | null
          restaurant_name?: string
          restaurant_name_norm?: string
          source_url?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_rp_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          area: string[] | null
          cached_at: string | null
          city: string
          country: string
          created_at: string
          data_source: string
          district: string | null
          external_id_google: string | null
          external_id_kakao: string | null
          external_id_naver: string | null
          genre: string | null
          geom: unknown
          google_rating: number | null
          hours: Json | null
          id: string
          is_closed: boolean
          kakao_map_url: string | null
          kakao_rating: number | null
          last_crawled_at: string | null
          lat: number | null
          lng: number | null
          menus: Json | null
          name: string
          naver_rating: number | null
          next_refresh_at: string | null
          nyam_score: number | null
          nyam_score_updated_at: string | null
          phone: string | null
          photos: string[] | null
          prestige: Json | null
          price_range: number | null
        }
        Insert: {
          address?: string | null
          area?: string[] | null
          cached_at?: string | null
          city?: string
          country?: string
          created_at?: string
          data_source?: string
          district?: string | null
          external_id_google?: string | null
          external_id_kakao?: string | null
          external_id_naver?: string | null
          genre?: string | null
          geom?: unknown
          google_rating?: number | null
          hours?: Json | null
          id?: string
          is_closed?: boolean
          kakao_map_url?: string | null
          kakao_rating?: number | null
          last_crawled_at?: string | null
          lat?: number | null
          lng?: number | null
          menus?: Json | null
          name: string
          naver_rating?: number | null
          next_refresh_at?: string | null
          nyam_score?: number | null
          nyam_score_updated_at?: string | null
          phone?: string | null
          photos?: string[] | null
          prestige?: Json | null
          price_range?: number | null
        }
        Update: {
          address?: string | null
          area?: string[] | null
          cached_at?: string | null
          city?: string
          country?: string
          created_at?: string
          data_source?: string
          district?: string | null
          external_id_google?: string | null
          external_id_kakao?: string | null
          external_id_naver?: string | null
          genre?: string | null
          geom?: unknown
          google_rating?: number | null
          hours?: Json | null
          id?: string
          is_closed?: boolean
          kakao_map_url?: string | null
          kakao_rating?: number | null
          last_crawled_at?: string | null
          lat?: number | null
          lng?: number | null
          menus?: Json | null
          name?: string
          naver_rating?: number | null
          next_refresh_at?: string | null
          nyam_score?: number | null
          nyam_score_updated_at?: string | null
          phone?: string | null
          photos?: string[] | null
          prestige?: Json | null
          price_range?: number | null
        }
        Relationships: []
      }
      saved_filters: {
        Row: {
          context_id: string | null
          created_at: string
          id: string
          name: string
          order_index: number
          rules: Json
          sort_by: string | null
          target_type: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          created_at?: string
          id?: string
          name: string
          order_index?: number
          rules: Json
          sort_by?: string | null
          target_type: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          rules?: Json
          sort_by?: string | null
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_filters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          active_verified: number
          active_xp: number
          auth_provider: string
          auth_provider_id: string
          avatar_color: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_streak: number
          delete_mode: string | null
          delete_scheduled_at: string | null
          deleted_at: string | null
          dnd_end: string | null
          dnd_start: string | null
          email: string | null
          follow_min_level: number | null
          follow_min_records: number | null
          follow_policy: string
          follower_count: number
          following_count: number
          handle: string | null
          home_filter_state: Json | null
          id: string
          is_public: boolean
          nickname: string
          notify_bubble_join: boolean
          notify_follow: boolean
          notify_level_up: boolean
          notify_push: boolean
          pref_bubble_share: string
          pref_bubble_tab: string
          pref_default_sort: string
          pref_home_tab: string
          pref_landing: string
          pref_record_input: string
          pref_restaurant_sub: string
          pref_temp_unit: string
          pref_timezone: string | null
          pref_view_mode: string
          pref_wine_sub: string
          preferred_areas: string[] | null
          record_count: number
          taste_summary: string | null
          taste_tags: string[] | null
          taste_updated_at: string | null
          total_xp: number
          updated_at: string
          visibility_bubble: Json
          visibility_public: Json
        }
        Insert: {
          active_verified?: number
          active_xp?: number
          auth_provider: string
          auth_provider_id: string
          avatar_color?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_streak?: number
          delete_mode?: string | null
          delete_scheduled_at?: string | null
          deleted_at?: string | null
          dnd_end?: string | null
          dnd_start?: string | null
          email?: string | null
          follow_min_level?: number | null
          follow_min_records?: number | null
          follow_policy?: string
          follower_count?: number
          following_count?: number
          handle?: string | null
          home_filter_state?: Json | null
          id?: string
          is_public?: boolean
          nickname: string
          notify_bubble_join?: boolean
          notify_follow?: boolean
          notify_level_up?: boolean
          notify_push?: boolean
          pref_bubble_share?: string
          pref_bubble_tab?: string
          pref_default_sort?: string
          pref_home_tab?: string
          pref_landing?: string
          pref_record_input?: string
          pref_restaurant_sub?: string
          pref_temp_unit?: string
          pref_timezone?: string | null
          pref_view_mode?: string
          pref_wine_sub?: string
          preferred_areas?: string[] | null
          record_count?: number
          taste_summary?: string | null
          taste_tags?: string[] | null
          taste_updated_at?: string | null
          total_xp?: number
          updated_at?: string
          visibility_bubble?: Json
          visibility_public?: Json
        }
        Update: {
          active_verified?: number
          active_xp?: number
          auth_provider?: string
          auth_provider_id?: string
          avatar_color?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_streak?: number
          delete_mode?: string | null
          delete_scheduled_at?: string | null
          deleted_at?: string | null
          dnd_end?: string | null
          dnd_start?: string | null
          email?: string | null
          follow_min_level?: number | null
          follow_min_records?: number | null
          follow_policy?: string
          follower_count?: number
          following_count?: number
          handle?: string | null
          home_filter_state?: Json | null
          id?: string
          is_public?: boolean
          nickname?: string
          notify_bubble_join?: boolean
          notify_follow?: boolean
          notify_level_up?: boolean
          notify_push?: boolean
          pref_bubble_share?: string
          pref_bubble_tab?: string
          pref_default_sort?: string
          pref_home_tab?: string
          pref_landing?: string
          pref_record_input?: string
          pref_restaurant_sub?: string
          pref_temp_unit?: string
          pref_timezone?: string | null
          pref_view_mode?: string
          pref_wine_sub?: string
          preferred_areas?: string[] | null
          record_count?: number
          taste_summary?: string | null
          taste_tags?: string[] | null
          taste_updated_at?: string | null
          total_xp?: number
          updated_at?: string
          visibility_bubble?: Json
          visibility_public?: Json
        }
        Relationships: []
      }
      wines: {
        Row: {
          abv: number | null
          acidity_level: number | null
          appellation: string | null
          body_level: number | null
          cached_at: string | null
          classification: string | null
          country: string | null
          created_at: string
          critic_scores: Json | null
          decanting: string | null
          drinking_window_end: number | null
          drinking_window_start: number | null
          external_ids: Json | null
          food_pairings: string[] | null
          grape_varieties: Json | null
          id: string
          label_image_url: string | null
          name: string
          next_refresh_at: string | null
          nyam_score: number | null
          nyam_score_updated_at: string | null
          photos: string[] | null
          price_review: Json | null
          producer: string | null
          reference_price_max: number | null
          reference_price_min: number | null
          region: string | null
          serving_temp: string | null
          sub_region: string | null
          sweetness_level: number | null
          tasting_notes: string | null
          variety: string | null
          vintage: number | null
          vivino_rating: number | null
          wine_type: string
        }
        Insert: {
          abv?: number | null
          acidity_level?: number | null
          appellation?: string | null
          body_level?: number | null
          cached_at?: string | null
          classification?: string | null
          country?: string | null
          created_at?: string
          critic_scores?: Json | null
          decanting?: string | null
          drinking_window_end?: number | null
          drinking_window_start?: number | null
          external_ids?: Json | null
          food_pairings?: string[] | null
          grape_varieties?: Json | null
          id?: string
          label_image_url?: string | null
          name: string
          next_refresh_at?: string | null
          nyam_score?: number | null
          nyam_score_updated_at?: string | null
          photos?: string[] | null
          price_review?: Json | null
          producer?: string | null
          reference_price_max?: number | null
          reference_price_min?: number | null
          region?: string | null
          serving_temp?: string | null
          sub_region?: string | null
          sweetness_level?: number | null
          tasting_notes?: string | null
          variety?: string | null
          vintage?: number | null
          vivino_rating?: number | null
          wine_type: string
        }
        Update: {
          abv?: number | null
          acidity_level?: number | null
          appellation?: string | null
          body_level?: number | null
          cached_at?: string | null
          classification?: string | null
          country?: string | null
          created_at?: string
          critic_scores?: Json | null
          decanting?: string | null
          drinking_window_end?: number | null
          drinking_window_start?: number | null
          external_ids?: Json | null
          food_pairings?: string[] | null
          grape_varieties?: Json | null
          id?: string
          label_image_url?: string | null
          name?: string
          next_refresh_at?: string | null
          nyam_score?: number | null
          nyam_score_updated_at?: string | null
          photos?: string[] | null
          price_review?: Json | null
          producer?: string | null
          reference_price_max?: number | null
          reference_price_min?: number | null
          region?: string | null
          serving_temp?: string | null
          sub_region?: string | null
          sweetness_level?: number | null
          tasting_notes?: string | null
          variety?: string | null
          vintage?: number | null
          vivino_rating?: number | null
          wine_type?: string
        }
        Relationships: []
      }
      xp_log_changes: {
        Row: {
          axis_type: string | null
          axis_value: string | null
          created_at: string
          id: string
          reason: string | null
          record_id: string | null
          user_id: string
          xp_amount: number | null
        }
        Insert: {
          axis_type?: string | null
          axis_value?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          record_id?: string | null
          user_id: string
          xp_amount?: number | null
        }
        Update: {
          axis_type?: string | null
          axis_value?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          record_id?: string | null
          user_id?: string
          xp_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_log_changes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_log_milestones: {
        Row: {
          achieved_at: string
          axis_value: string
          milestone_id: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          axis_value?: string
          milestone_id: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          axis_value?: string
          milestone_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_log_milestones_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "xp_seed_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_log_milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_seed_levels: {
        Row: {
          color: string | null
          level: number
          required_xp: number
          title: string | null
        }
        Insert: {
          color?: string | null
          level: number
          required_xp: number
          title?: string | null
        }
        Update: {
          color?: string | null
          level?: number
          required_xp?: number
          title?: string | null
        }
        Relationships: []
      }
      xp_seed_milestones: {
        Row: {
          axis_type: string
          id: string
          label: string
          metric: string
          threshold: number
          xp_reward: number
        }
        Insert: {
          axis_type: string
          id?: string
          label: string
          metric: string
          threshold: number
          xp_reward: number
        }
        Update: {
          axis_type?: string
          id?: string
          label?: string
          metric?: string
          threshold?: number
          xp_reward?: number
        }
        Relationships: []
      }
      xp_seed_rules: {
        Row: {
          action: string
          description: string | null
          id: string
          updated_at: string
          xp_amount: number
        }
        Insert: {
          action: string
          description?: string | null
          id?: string
          updated_at?: string
          xp_amount: number
        }
        Update: {
          action?: string
          description?: string | null
          id?: string
          updated_at?: string
          xp_amount?: number
        }
        Relationships: []
      }
      xp_totals: {
        Row: {
          axis_type: string
          axis_value: string
          id: string
          level: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          axis_type: string
          axis_value: string
          id?: string
          level?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          axis_type?: string
          axis_value?: string
          id?: string
          level?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_totals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      bubble_expertise: {
        Row: {
          avg_level: number | null
          axis_type: string | null
          axis_value: string | null
          bubble_id: string | null
          max_level: number | null
          member_count: number | null
          total_xp: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bubble_members_bubble_id_fkey"
            columns: ["bubble_id"]
            isOneToOne: false
            referencedRelation: "bubbles"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      filter_home_restaurants: {
        Args: {
          p_area?: string
          p_district?: string
          p_genre?: string
          p_ids: string[]
          p_limit?: number
          p_offset?: number
          p_prestige?: string
          p_price_range?: number
          p_sort?: string
        }
        Returns: {
          area: string[]
          city: string
          country: string
          district: string
          genre: string
          id: string
          lat: number
          lng: number
          name: string
          photos: string[]
          prestige: Json
          price_range: number
        }[]
      }
      filter_home_wines: {
        Args: {
          p_acidity?: number
          p_country?: string
          p_ids: string[]
          p_limit?: number
          p_offset?: number
          p_sort?: string
          p_sweetness?: number
          p_variety?: string
          p_vintage?: number
          p_vintage_op?: string
          p_wine_type?: string
        }
        Returns: {
          acidity_level: number
          country: string
          id: string
          name: string
          photos: string[]
          producer: string
          region: string
          sub_region: string
          sweetness_level: number
          variety: string
          vintage: number
          wine_type: string
        }[]
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      increment_user_total_xp: {
        Args: { p_user_id: string; p_xp_delta: number }
        Returns: undefined
      }
      is_mutual_follow: {
        Args: { p_target_id: string; p_user_id: string }
        Returns: boolean
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      normalize_restaurant_name: { Args: { name: string }; Returns: string }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      refresh_active_xp: { Args: never; Returns: undefined }
      restaurants_within_radius: {
        Args: { lat: number; lng: number; radius_meters?: number }
        Returns: {
          address: string
          area: string
          distance: number
          genre: string
          id: string
          lat: number
          lng: number
          name: string
          prestige: Json
        }[]
      }
      search_restaurants_bounds_auth: {
        Args: {
          p_area?: string
          p_district?: string
          p_east: number
          p_genre?: string
          p_keyword?: string
          p_limit?: number
          p_north: number
          p_offset?: number
          p_prestige_types?: string[]
          p_sort?: string
          p_south: number
          p_user_id: string
          p_west: number
        }
        Returns: {
          address: string
          area: string[]
          district: string
          genre: string
          has_record: boolean
          id: string
          kakao_map_url: string
          lat: number
          lng: number
          name: string
          phone: string
          prestige: Json
        }[]
      }
      search_restaurants_bounds_simple: {
        Args: {
          p_area?: string
          p_district?: string
          p_east: number
          p_genre?: string
          p_keyword?: string
          p_limit?: number
          p_north: number
          p_offset?: number
          p_prestige_types?: string[]
          p_sort?: string
          p_south: number
          p_west: number
        }
        Returns: {
          address: string
          area: string[]
          district: string
          genre: string
          has_record: boolean
          id: string
          kakao_map_url: string
          lat: number
          lng: number
          name: string
          phone: string
          prestige: Json
        }[]
      }
      search_restaurants_bounds_source: {
        Args: {
          p_area?: string
          p_district?: string
          p_east: number
          p_genre?: string
          p_keyword?: string
          p_limit?: number
          p_north: number
          p_offset?: number
          p_prestige_types?: string[]
          p_sort?: string
          p_sources?: string[]
          p_south: number
          p_user_id: string
          p_west: number
        }
        Returns: {
          address: string
          area: string[]
          district: string
          genre: string
          has_record: boolean
          id: string
          kakao_map_url: string
          lat: number
          lng: number
          name: string
          phone: string
          prestige: Json
        }[]
      }
      search_restaurants_in_bounds: {
        Args: {
          p_area?: string
          p_district?: string
          p_east: number
          p_genre?: string
          p_keyword?: string
          p_limit?: number
          p_north: number
          p_offset?: number
          p_prestige_types?: string[]
          p_sort?: string
          p_sources?: string[]
          p_south: number
          p_user_id?: string
          p_west: number
        }
        Returns: {
          address: string
          area: string[]
          district: string
          genre: string
          has_record: boolean
          id: string
          kakao_map_url: string
          lat: number
          lng: number
          name: string
          phone: string
          prestige: Json
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_crawled_restaurants: { Args: { items: Json }; Returns: undefined }
      upsert_user_experience: {
        Args: {
          p_axis_type: string
          p_axis_value: string
          p_new_level: number
          p_user_id: string
          p_xp_delta: number
        }
        Returns: {
          axis_type: string
          axis_value: string
          id: string
          level: number
          total_xp: number
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "xp_totals"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
