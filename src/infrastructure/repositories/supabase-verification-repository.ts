/**
 * Supabase implementation of VerificationRepository
 */

import { createClient } from '../supabase/client';
import type { Row } from '../supabase/types';
import type { Database } from '../supabase/types';
import type { Verification, VerificationSummary, AiModel, VerificationLevel } from '@/domain/entities/verification';
import type {
  VerificationRepository,
  CreateVerificationInput,
} from '@/domain/repositories/verification-repository';

type VerificationRow = Row<'verifications'>;
type SummaryRow = Database['public']['Views']['restaurant_verification_summary']['Row'];

/** Map a Supabase verification row to the domain entity */
function toVerification(row: VerificationRow): Verification {
  return {
    id: row.id,
    userId: row.user_id,
    restaurantId: row.restaurant_id,
    promptTemplateId: row.prompt_template_id,
    aiModel: row.ai_model as AiModel | null,
    tasteScore: row.taste_score,
    valueScore: row.value_score,
    serviceScore: row.service_score,
    ambianceScore: row.ambiance_score,
    comment: row.comment,
    visited: row.visited,
    visitedAt: row.visited_at,
    createdAt: row.created_at,
  };
}

/** Map a summary view row to the domain entity */
function toSummary(row: SummaryRow): VerificationSummary {
  return {
    restaurantId: row.restaurant_id,
    verificationCount: row.verification_count,
    avgTaste: row.avg_taste,
    avgValue: row.avg_value,
    avgService: row.avg_service,
    avgAmbiance: row.avg_ambiance,
    lastVerifiedAt: row.last_verified_at,
    verificationLevel: row.verification_level as VerificationLevel,
  };
}

export const supabaseVerificationRepository: VerificationRepository = {
  async create(input: CreateVerificationInput): Promise<Verification> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('verifications')
      .insert({
        user_id: input.userId,
        restaurant_id: input.restaurantId,
        prompt_template_id: input.promptTemplateId ?? null,
        ai_model: input.aiModel ?? null,
        taste_score: input.tasteScore ?? null,
        value_score: input.valueScore ?? null,
        service_score: input.serviceScore ?? null,
        ambiance_score: input.ambianceScore ?? null,
        comment: input.comment ?? null,
        visited: input.visited ?? false,
        visited_at: input.visitedAt ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create verification: ${error.message}`);
    }

    return toVerification(data);
  },

  async findByRestaurant(restaurantId: string): Promise<readonly Verification[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('verifications')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch verifications for restaurant: ${error.message}`);
    }

    return (data ?? []).map(toVerification);
  },

  async findByUser(userId: string): Promise<readonly Verification[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('verifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch verifications for user: ${error.message}`);
    }

    return (data ?? []).map(toVerification);
  },

  async getSummary(restaurantId: string): Promise<VerificationSummary | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('restaurant_verification_summary')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch verification summary: ${error.message}`);
    }

    return toSummary(data);
  },
};
