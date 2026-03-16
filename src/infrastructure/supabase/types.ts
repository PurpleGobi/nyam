export type RecordType = 'restaurant' | 'wine' | 'homemade'
export type VisibilityType = 'private' | 'group' | 'public'
export type AuthProviderType = 'kakao' | 'naver' | 'google' | 'apple'
export type GroupType = 'private' | 'public' | 'viewonly' | 'paid'
export type GroupRole = 'owner' | 'moderator' | 'member'
export type MembershipStatus = 'active' | 'pending' | 'banned'
export type ReactionType = 'like' | 'comment' | 'useful' | 'yummy'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          nickname: string
          avatar_url: string | null
          email: string
          auth_provider: AuthProviderType
          created_at: string
          last_active_at: string
        }
        Insert: {
          id?: string
          nickname: string
          avatar_url?: string | null
          email: string
          auth_provider: AuthProviderType
          created_at?: string
          last_active_at?: string
        }
        Update: {
          id?: string
          nickname?: string
          avatar_url?: string | null
          email?: string
          auth_provider?: AuthProviderType
          created_at?: string
          last_active_at?: string
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          id: string
          name: string
          address: string | null
          region: string | null
          category: string | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          hours: Record<string, unknown> | null
          source: string | null
          external_id: string | null
          external_url: string | null
          menu_items: Record<string, unknown> | null
          synced_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          region?: string | null
          category?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          hours?: Record<string, unknown> | null
          source?: string | null
          external_id?: string | null
          external_url?: string | null
          menu_items?: Record<string, unknown> | null
          synced_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          region?: string | null
          category?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          hours?: Record<string, unknown> | null
          source?: string | null
          external_id?: string | null
          external_url?: string | null
          menu_items?: Record<string, unknown> | null
          synced_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      records: {
        Row: {
          id: string
          user_id: string
          restaurant_id: string | null
          record_type: RecordType
          created_at: string
          menu_name: string | null
          category: string | null
          sub_category: string | null
          price_per_person: number | null
          rating_taste: number | null
          rating_value: number | null
          rating_service: number | null
          rating_atmosphere: number | null
          rating_cleanliness: number | null
          rating_portion: number | null
          rating_aroma: number | null
          rating_body: number | null
          rating_acidity: number | null
          rating_finish: number | null
          rating_balance: number | null
          rating_difficulty: number | null
          rating_time_spent: number | null
          rating_reproducibility: number | null
          rating_overall: number | null
          comment: string | null
          tags: string[]
          flavor_tags: string[]
          texture_tags: string[]
          atmosphere_tags: string[]
          visibility: VisibilityType
          ai_recognized: boolean
          completeness_score: number
          location_lat: number | null
          location_lng: number | null
        }
        Insert: {
          id?: string
          user_id: string
          restaurant_id?: string | null
          record_type: RecordType
          created_at?: string
          menu_name?: string | null
          category?: string | null
          sub_category?: string | null
          price_per_person?: number | null
          rating_taste?: number | null
          rating_value?: number | null
          rating_service?: number | null
          rating_atmosphere?: number | null
          rating_cleanliness?: number | null
          rating_portion?: number | null
          rating_aroma?: number | null
          rating_body?: number | null
          rating_acidity?: number | null
          rating_finish?: number | null
          rating_balance?: number | null
          rating_difficulty?: number | null
          rating_time_spent?: number | null
          rating_reproducibility?: number | null
          rating_overall?: number | null
          comment?: string | null
          tags?: string[]
          flavor_tags?: string[]
          texture_tags?: string[]
          atmosphere_tags?: string[]
          visibility?: VisibilityType
          ai_recognized?: boolean
          completeness_score?: number
          location_lat?: number | null
          location_lng?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          restaurant_id?: string | null
          record_type?: RecordType
          created_at?: string
          menu_name?: string | null
          category?: string | null
          sub_category?: string | null
          price_per_person?: number | null
          rating_taste?: number | null
          rating_value?: number | null
          rating_service?: number | null
          rating_atmosphere?: number | null
          rating_cleanliness?: number | null
          rating_portion?: number | null
          rating_aroma?: number | null
          rating_body?: number | null
          rating_acidity?: number | null
          rating_finish?: number | null
          rating_balance?: number | null
          rating_difficulty?: number | null
          rating_time_spent?: number | null
          rating_reproducibility?: number | null
          rating_overall?: number | null
          comment?: string | null
          tags?: string[]
          flavor_tags?: string[]
          texture_tags?: string[]
          atmosphere_tags?: string[]
          visibility?: VisibilityType
          ai_recognized?: boolean
          completeness_score?: number
          location_lat?: number | null
          location_lng?: number | null
        }
        Relationships: []
      }
      record_photos: {
        Row: {
          id: string
          record_id: string
          photo_url: string
          thumbnail_url: string | null
          order_index: number
          ai_labels: string[]
        }
        Insert: {
          id?: string
          record_id: string
          photo_url: string
          thumbnail_url?: string | null
          order_index?: number
          ai_labels?: string[]
        }
        Update: {
          id?: string
          record_id?: string
          photo_url?: string
          thumbnail_url?: string | null
          order_index?: number
          ai_labels?: string[]
        }
        Relationships: []
      }
      record_journals: {
        Row: {
          id: string
          record_id: string
          companions: Record<string, unknown> | null
          occasion: string | null
          mood_tags: string[]
          memo: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          record_id: string
          companions?: Record<string, unknown> | null
          occasion?: string | null
          mood_tags?: string[]
          memo?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          record_id?: string
          companions?: Record<string, unknown> | null
          occasion?: string | null
          mood_tags?: string[]
          memo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          type: GroupType
          created_at: string
          entry_requirements: Record<string, unknown> | null
          price_monthly: number | null
          trial_days: number | null
          is_active: boolean
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          type: GroupType
          created_at?: string
          entry_requirements?: Record<string, unknown> | null
          price_monthly?: number | null
          trial_days?: number | null
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          type?: GroupType
          created_at?: string
          entry_requirements?: Record<string, unknown> | null
          price_monthly?: number | null
          trial_days?: number | null
          is_active?: boolean
        }
        Relationships: []
      }
      group_memberships: {
        Row: {
          group_id: string
          user_id: string
          role: GroupRole
          joined_at: string
          status: MembershipStatus
        }
        Insert: {
          group_id: string
          user_id: string
          role?: GroupRole
          joined_at?: string
          status?: MembershipStatus
        }
        Update: {
          group_id?: string
          user_id?: string
          role?: GroupRole
          joined_at?: string
          status?: MembershipStatus
        }
        Relationships: []
      }
      record_shares: {
        Row: {
          record_id: string
          group_id: string
          shared_at: string
        }
        Insert: {
          record_id: string
          group_id: string
          shared_at?: string
        }
        Update: {
          record_id?: string
          group_id?: string
          shared_at?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          user_id: string
          record_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          record_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          record_id?: string
          created_at?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          id: string
          user_id: string
          record_id: string
          type: ReactionType
          comment_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          record_id: string
          type: ReactionType
          comment_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          record_id?: string
          type?: ReactionType
          comment_text?: string | null
          created_at?: string
        }
        Relationships: []
      }
      taste_dna: {
        Row: {
          user_id: string
          flavor_spicy: number
          flavor_sweet: number
          flavor_salty: number
          flavor_sour: number
          flavor_umami: number
          flavor_rich: number
          texture_crispy: number
          texture_tender: number
          texture_chewy: number
          atmosphere_noise: number
          atmosphere_formality: number
          atmosphere_space: number
          price_sensitivity: number
          price_avg: number | null
          price_range_min: number | null
          price_range_max: number | null
          category_preferences: Record<string, unknown> | null
          peak_day: number | null
          peak_hour: number | null
          adventurousness: number
          taste_type_code: string | null
          taste_type_name: string | null
          sample_count: number
          updated_at: string
        }
        Insert: {
          user_id: string
          flavor_spicy?: number
          flavor_sweet?: number
          flavor_salty?: number
          flavor_sour?: number
          flavor_umami?: number
          flavor_rich?: number
          texture_crispy?: number
          texture_tender?: number
          texture_chewy?: number
          atmosphere_noise?: number
          atmosphere_formality?: number
          atmosphere_space?: number
          price_sensitivity?: number
          price_avg?: number | null
          price_range_min?: number | null
          price_range_max?: number | null
          category_preferences?: Record<string, unknown> | null
          peak_day?: number | null
          peak_hour?: number | null
          adventurousness?: number
          taste_type_code?: string | null
          taste_type_name?: string | null
          sample_count?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          flavor_spicy?: number
          flavor_sweet?: number
          flavor_salty?: number
          flavor_sour?: number
          flavor_umami?: number
          flavor_rich?: number
          texture_crispy?: number
          texture_tender?: number
          texture_chewy?: number
          atmosphere_noise?: number
          atmosphere_formality?: number
          atmosphere_space?: number
          price_sensitivity?: number
          price_avg?: number | null
          price_range_min?: number | null
          price_range_max?: number | null
          category_preferences?: Record<string, unknown> | null
          peak_day?: number | null
          peak_hour?: number | null
          adventurousness?: number
          taste_type_code?: string | null
          taste_type_name?: string | null
          sample_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      taste_dna_wine: {
        Row: {
          user_id: string
          pref_body: number
          pref_acidity: number
          pref_tannin: number
          pref_sweetness: number
          aroma_fruit: number
          aroma_floral: number
          aroma_spice: number
          aroma_oak: number
          aroma_mineral: number
          aroma_herbal: number
          preferred_varieties: string[]
          preferred_origins: string[]
          price_range_min: number | null
          price_range_max: number | null
          sample_count: number
          updated_at: string
        }
        Insert: {
          user_id: string
          pref_body?: number
          pref_acidity?: number
          pref_tannin?: number
          pref_sweetness?: number
          aroma_fruit?: number
          aroma_floral?: number
          aroma_spice?: number
          aroma_oak?: number
          aroma_mineral?: number
          aroma_herbal?: number
          preferred_varieties?: string[]
          preferred_origins?: string[]
          price_range_min?: number | null
          price_range_max?: number | null
          sample_count?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          pref_body?: number
          pref_acidity?: number
          pref_tannin?: number
          pref_sweetness?: number
          aroma_fruit?: number
          aroma_floral?: number
          aroma_spice?: number
          aroma_oak?: number
          aroma_mineral?: number
          aroma_herbal?: number
          preferred_varieties?: string[]
          preferred_origins?: string[]
          price_range_min?: number | null
          price_range_max?: number | null
          sample_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      taste_dna_homecook: {
        Row: {
          user_id: string
          pref_difficulty: number
          pref_time_investment: number
          method_preferences: Record<string, unknown> | null
          preferred_cuisines: string[]
          sample_count: number
          updated_at: string
        }
        Insert: {
          user_id: string
          pref_difficulty?: number
          pref_time_investment?: number
          method_preferences?: Record<string, unknown> | null
          preferred_cuisines?: string[]
          sample_count?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          pref_difficulty?: number
          pref_time_investment?: number
          method_preferences?: Record<string, unknown> | null
          preferred_cuisines?: string[]
          sample_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      experience_atlas_regions: {
        Row: {
          user_id: string
          region: string
          record_count: number
          unique_restaurants: number
          sub_region_count: number
          level: number
          xp: number
          xp_to_next: number
          volume_score: number
          diversity_score: number
          recency_score: number
          consistency_score: number
          first_record_at: string | null
          last_record_at: string | null
        }
        Insert: {
          user_id: string
          region: string
          record_count?: number
          unique_restaurants?: number
          sub_region_count?: number
          level?: number
          xp?: number
          xp_to_next?: number
          volume_score?: number
          diversity_score?: number
          recency_score?: number
          consistency_score?: number
          first_record_at?: string | null
          last_record_at?: string | null
        }
        Update: {
          user_id?: string
          region?: string
          record_count?: number
          unique_restaurants?: number
          sub_region_count?: number
          level?: number
          xp?: number
          xp_to_next?: number
          volume_score?: number
          diversity_score?: number
          recency_score?: number
          consistency_score?: number
          first_record_at?: string | null
          last_record_at?: string | null
        }
        Relationships: []
      }
      experience_atlas_genres: {
        Row: {
          user_id: string
          category: string
          record_count: number
          sub_category_count: number
          sub_categories: string[]
          avg_rating: number | null
          percentage: number | null
          level: number
          xp: number
          xp_to_next: number
          volume_score: number
          diversity_score: number
          recency_score: number
          consistency_score: number
          first_record_at: string | null
          last_record_at: string | null
        }
        Insert: {
          user_id: string
          category: string
          record_count?: number
          sub_category_count?: number
          sub_categories?: string[]
          avg_rating?: number | null
          percentage?: number | null
          level?: number
          xp?: number
          xp_to_next?: number
          volume_score?: number
          diversity_score?: number
          recency_score?: number
          consistency_score?: number
          first_record_at?: string | null
          last_record_at?: string | null
        }
        Update: {
          user_id?: string
          category?: string
          record_count?: number
          sub_category_count?: number
          sub_categories?: string[]
          avg_rating?: number | null
          percentage?: number | null
          level?: number
          xp?: number
          xp_to_next?: number
          volume_score?: number
          diversity_score?: number
          recency_score?: number
          consistency_score?: number
          first_record_at?: string | null
          last_record_at?: string | null
        }
        Relationships: []
      }
      experience_atlas_scenes: {
        Row: {
          user_id: string
          scene: string
          record_count: number
          unique_restaurants: number
          category_diversity: number
          level: number
          xp: number
          xp_to_next: number
          volume_score: number
          diversity_score: number
          recency_score: number
          consistency_score: number
          first_record_at: string | null
          last_record_at: string | null
        }
        Insert: {
          user_id: string
          scene: string
          record_count?: number
          unique_restaurants?: number
          category_diversity?: number
          level?: number
          xp?: number
          xp_to_next?: number
          volume_score?: number
          diversity_score?: number
          recency_score?: number
          consistency_score?: number
          first_record_at?: string | null
          last_record_at?: string | null
        }
        Update: {
          user_id?: string
          scene?: string
          record_count?: number
          unique_restaurants?: number
          category_diversity?: number
          level?: number
          xp?: number
          xp_to_next?: number
          volume_score?: number
          diversity_score?: number
          recency_score?: number
          consistency_score?: number
          first_record_at?: string | null
          last_record_at?: string | null
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          user_id: string
          total_records: number
          total_photos: number
          records_this_week: number
          records_this_month: number
          avg_weekly_frequency: number
          current_streak_days: number
          longest_streak_days: number
          avg_completeness: number
          nyam_level: number
          points: number
          groups_count: number
          shared_records_count: number
          reactions_received: number
          updated_at: string
        }
        Insert: {
          user_id: string
          total_records?: number
          total_photos?: number
          records_this_week?: number
          records_this_month?: number
          avg_weekly_frequency?: number
          current_streak_days?: number
          longest_streak_days?: number
          avg_completeness?: number
          nyam_level?: number
          points?: number
          groups_count?: number
          shared_records_count?: number
          reactions_received?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          total_records?: number
          total_photos?: number
          records_this_week?: number
          records_this_month?: number
          avg_weekly_frequency?: number
          current_streak_days?: number
          longest_streak_days?: number
          avg_completeness?: number
          nyam_level?: number
          points?: number
          groups_count?: number
          shared_records_count?: number
          reactions_received?: number
          updated_at?: string
        }
        Relationships: []
      }
      group_stats: {
        Row: {
          group_id: string
          member_count: number
          record_count: number
          records_this_week: number
          activity_score: number
          quality_score: number
          diversity_score: number
          external_citation: number
          growth_rate: number
          overall_score: number
          top_restaurants: Record<string, unknown> | null
          top_categories: Record<string, unknown> | null
          updated_at: string
        }
        Insert: {
          group_id: string
          member_count?: number
          record_count?: number
          records_this_week?: number
          activity_score?: number
          quality_score?: number
          diversity_score?: number
          external_citation?: number
          growth_rate?: number
          overall_score?: number
          top_restaurants?: Record<string, unknown> | null
          top_categories?: Record<string, unknown> | null
          updated_at?: string
        }
        Update: {
          group_id?: string
          member_count?: number
          record_count?: number
          records_this_week?: number
          activity_score?: number
          quality_score?: number
          diversity_score?: number
          external_citation?: number
          growth_rate?: number
          overall_score?: number
          top_restaurants?: Record<string, unknown> | null
          top_categories?: Record<string, unknown> | null
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_stats: {
        Row: {
          restaurant_id: string
          record_count: number
          unique_users: number
          avg_taste: number | null
          avg_value: number | null
          avg_service: number | null
          avg_atmosphere: number | null
          avg_overall: number | null
          latest_record_at: string | null
          updated_at: string
        }
        Insert: {
          restaurant_id: string
          record_count?: number
          unique_users?: number
          avg_taste?: number | null
          avg_value?: number | null
          avg_service?: number | null
          avg_atmosphere?: number | null
          avg_overall?: number | null
          latest_record_at?: string | null
          updated_at?: string
        }
        Update: {
          restaurant_id?: string
          record_count?: number
          unique_users?: number
          avg_taste?: number | null
          avg_value?: number | null
          avg_service?: number | null
          avg_atmosphere?: number | null
          avg_overall?: number | null
          latest_record_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      record_type: RecordType
      visibility: VisibilityType
      auth_provider: AuthProviderType
      group_type: GroupType
      group_role: GroupRole
      membership_status: MembershipStatus
      reaction_type: ReactionType
    }
    CompositeTypes: Record<string, never>
  }
}
