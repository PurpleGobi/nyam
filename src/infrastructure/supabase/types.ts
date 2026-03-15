/**
 * Supabase Database type definitions.
 *
 * This file will eventually be auto-generated via `supabase gen types typescript`.
 * Until then, these types are manually maintained to match the migration SQL
 * defined in docs/DEVELOPMENT_PLAN.md (migrations 001-009).
 */

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string
          name: string
          address: string
          short_address: string | null
          phone: string | null
          cuisine: string
          cuisine_category: string
          price_range: string | null
          hours: Record<string, string> | null
          mood: string[]
          region: string | null
          image_url: string | null
          naver_map_url: string | null
          kakao_map_url: string | null
          google_map_url: string | null
          latitude: number | null
          longitude: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          short_address?: string | null
          phone?: string | null
          cuisine: string
          cuisine_category: string
          price_range?: string | null
          hours?: Record<string, string> | null
          mood?: string[]
          region?: string | null
          image_url?: string | null
          naver_map_url?: string | null
          kakao_map_url?: string | null
          google_map_url?: string | null
          latitude?: number | null
          longitude?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          short_address?: string | null
          phone?: string | null
          cuisine?: string
          cuisine_category?: string
          price_range?: string | null
          hours?: Record<string, string> | null
          mood?: string[]
          region?: string | null
          image_url?: string | null
          naver_map_url?: string | null
          kakao_map_url?: string | null
          google_map_url?: string | null
          latitude?: number | null
          longitude?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      restaurant_ratings: {
        Row: {
          id: string
          restaurant_id: string
          source: string
          rating: number | null
          review_count: number
          fetched_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          source: string
          rating?: number | null
          review_count?: number
          fetched_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          source?: string
          rating?: number | null
          review_count?: number
          fetched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'restaurant_ratings_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }

      user_profiles: {
        Row: {
          id: string
          nickname: string | null
          avatar_url: string | null
          preferred_ai: string
          allergies: string[]
          food_preferences: string[]
          tier: string
          total_verifications: number
          current_streak: number
          longest_streak: number
          last_verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nickname?: string | null
          avatar_url?: string | null
          preferred_ai?: string
          allergies?: string[]
          food_preferences?: string[]
          tier?: string
          total_verifications?: number
          current_streak?: number
          longest_streak?: number
          last_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nickname?: string | null
          avatar_url?: string | null
          preferred_ai?: string
          allergies?: string[]
          food_preferences?: string[]
          tier?: string
          total_verifications?: number
          current_streak?: number
          longest_streak?: number
          last_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      verifications: {
        Row: {
          id: string
          user_id: string
          restaurant_id: string
          prompt_template_id: string | null
          ai_model: string | null
          taste_score: number | null
          value_score: number | null
          service_score: number | null
          ambiance_score: number | null
          comment: string | null
          visited: boolean
          visited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          restaurant_id: string
          prompt_template_id?: string | null
          ai_model?: string | null
          taste_score?: number | null
          value_score?: number | null
          service_score?: number | null
          ambiance_score?: number | null
          comment?: string | null
          visited?: boolean
          visited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          restaurant_id?: string
          prompt_template_id?: string | null
          ai_model?: string | null
          taste_score?: number | null
          value_score?: number | null
          service_score?: number | null
          ambiance_score?: number | null
          comment?: string | null
          visited?: boolean
          visited_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'verifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'verifications_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }

      suspicious_flags: {
        Row: {
          id: string
          restaurant_id: string
          user_id: string
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          user_id: string
          reason: string
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          user_id?: string
          reason?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'suspicious_flags_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'suspicious_flags_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }

      prompt_templates: {
        Row: {
          id: string
          author_id: string | null
          title: string
          description: string | null
          category: string
          template: string
          variables: PromptVariable[]
          is_official: boolean
          is_public: boolean
          usage_count: number
          like_count: number
          dislike_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id?: string | null
          title: string
          description?: string | null
          category: string
          template: string
          variables?: PromptVariable[]
          is_official?: boolean
          is_public?: boolean
          usage_count?: number
          like_count?: number
          dislike_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          author_id?: string | null
          title?: string
          description?: string | null
          category?: string
          template?: string
          variables?: PromptVariable[]
          is_official?: boolean
          is_public?: boolean
          usage_count?: number
          like_count?: number
          dislike_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'prompt_templates_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }

      prompt_usage_logs: {
        Row: {
          id: string
          user_id: string | null
          prompt_template_id: string | null
          restaurant_id: string | null
          action: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          prompt_template_id?: string | null
          restaurant_id?: string | null
          action: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          prompt_template_id?: string | null
          restaurant_id?: string | null
          action?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'prompt_usage_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'prompt_usage_logs_prompt_template_id_fkey'
            columns: ['prompt_template_id']
            isOneToOne: false
            referencedRelation: 'prompt_templates'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'prompt_usage_logs_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }

      prompt_reactions: {
        Row: {
          id: string
          user_id: string
          prompt_template_id: string
          reaction: 'like' | 'dislike'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          prompt_template_id: string
          reaction: 'like' | 'dislike'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          prompt_template_id?: string
          reaction?: 'like' | 'dislike'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'prompt_reactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'prompt_reactions_prompt_template_id_fkey'
            columns: ['prompt_template_id']
            isOneToOne: false
            referencedRelation: 'prompt_templates'
            referencedColumns: ['id']
          },
        ]
      }

      favorites: {
        Row: {
          id: string
          user_id: string
          restaurant_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          restaurant_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          restaurant_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'favorites_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'favorites_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }

      collections: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'collections_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }

      collection_items: {
        Row: {
          id: string
          collection_id: string
          restaurant_id: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          collection_id: string
          restaurant_id: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          collection_id?: string
          restaurant_id?: string
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'collection_items_collection_id_fkey'
            columns: ['collection_id']
            isOneToOne: false
            referencedRelation: 'collections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'collection_items_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }

      badges: {
        Row: {
          id: string
          slug: string
          name: string
          description: string
          category: string
          icon: string
          tier: string | null
          condition: BadgeCondition
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description: string
          category: string
          icon: string
          tier?: string | null
          condition: BadgeCondition
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string
          category?: string
          icon?: string
          tier?: string | null
          condition?: BadgeCondition
          created_at?: string
        }
        Relationships: []
      }

      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_id: string
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_id: string
          earned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          badge_id?: string
          earned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_badges_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_badges_badge_id_fkey'
            columns: ['badge_id']
            isOneToOne: false
            referencedRelation: 'badges'
            referencedColumns: ['id']
          },
        ]
      }

      user_taste_profiles: {
        Row: {
          user_id: string
          priorities: string[]
          spice_tolerance: string
          portion_preference: string
          dining_notes: string[]
          updated_at: string
        }
        Insert: {
          user_id: string
          priorities?: string[]
          spice_tolerance?: string
          portion_preference?: string
          dining_notes?: string[]
          updated_at?: string
        }
        Update: {
          user_id?: string
          priorities?: string[]
          spice_tolerance?: string
          portion_preference?: string
          dining_notes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_taste_profiles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }

      user_interactions: {
        Row: {
          id: string
          user_id: string
          event_type: string
          event_data: Record<string, string>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          event_data?: Record<string, string>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          event_data?: Record<string, string>
          created_at?: string
        }
        Relationships: []
      }

      dining_experiences: {
        Row: {
          id: string
          user_id: string
          restaurant_id: string
          restaurant_name: string
          visit_date: string
          note: string
          liked: string[]
          disliked: string[]
          overall_feeling: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          restaurant_id: string
          restaurant_name: string
          visit_date: string
          note?: string
          liked?: string[]
          disliked?: string[]
          overall_feeling?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          restaurant_id?: string
          restaurant_name?: string
          visit_date?: string
          note?: string
          liked?: string[]
          disliked?: string[]
          overall_feeling?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'dining_experiences_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'dining_experiences_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }
    }

    Views: {
      restaurant_verification_summary: {
        Row: {
          restaurant_id: string
          verification_count: number
          avg_taste: number | null
          avg_value: number | null
          avg_service: number | null
          avg_ambiance: number | null
          last_verified_at: string | null
          verification_level: 'trusted' | 'verified' | 'partial' | 'unverified'
        }
        Relationships: [
          {
            foreignKeyName: 'restaurant_verification_summary_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: true
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }
    }

    Functions: {
      refresh_verification_summary: {
        Args: Record<string, never>
        Returns: undefined
      }
      get_user_preference_summary: {
        Args: { p_user_id: string; p_days?: number }
        Returns: Record<string, unknown>
      }
    }

    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ── Helper types ──────────────────────────────────────────────

/** JSON structure for prompt template variables */
export interface PromptVariable {
  key: string
  label: string
  type: 'auto' | 'input' | 'preset'
}

/** JSON structure for badge unlock conditions */
export interface BadgeCondition {
  type: 'verification_count' | 'streak' | 'prompt_shared' | 'early_adopter'
  value: number | boolean
}

// ── Convenience aliases ───────────────────────────────────────

type Tables = Database['public']['Tables']

/** Extract the Row type for a given table name */
export type Row<T extends keyof Tables> = Tables[T]['Row']

/** Extract the Insert type for a given table name */
export type InsertRow<T extends keyof Tables> = Tables[T]['Insert']

/** Extract the Update type for a given table name */
export type UpdateRow<T extends keyof Tables> = Tables[T]['Update']
