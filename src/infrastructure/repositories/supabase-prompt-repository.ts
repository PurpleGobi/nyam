/**
 * Supabase implementation of PromptRepository
 */

import { createClient } from '../supabase/client';
import type { Row } from '../supabase/types';
import type {
  PromptTemplate,
  PromptCategory,
  PromptUsageLog,
  PromptReaction,
  PromptVariable,
  PromptAction,
  ReactionType,
} from '@/domain/entities/prompt';
import type {
  PromptRepository,
  LogPromptUsageInput,
  ReactToPromptInput,
} from '@/domain/repositories/prompt-repository';

type PromptRow = Row<'prompt_templates'>;
type UsageLogRow = Row<'prompt_usage_logs'>;
type ReactionRow = Row<'prompt_reactions'>;

/** Map a Supabase prompt template row to the domain entity */
function toPromptTemplate(row: PromptRow): PromptTemplate {
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    description: row.description,
    category: row.category as PromptCategory,
    template: row.template,
    variables: row.variables as readonly PromptVariable[],
    isOfficial: row.is_official,
    isPublic: row.is_public,
    usageCount: row.usage_count,
    likeCount: row.like_count,
    dislikeCount: row.dislike_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Map a Supabase usage log row to the domain entity */
function toUsageLog(row: UsageLogRow): PromptUsageLog {
  return {
    id: row.id,
    userId: row.user_id,
    promptTemplateId: row.prompt_template_id,
    restaurantId: row.restaurant_id,
    action: row.action as PromptAction,
    createdAt: row.created_at,
  };
}

/** Map a Supabase reaction row to the domain entity */
function toReaction(row: ReactionRow): PromptReaction {
  return {
    id: row.id,
    userId: row.user_id,
    promptTemplateId: row.prompt_template_id,
    reaction: row.reaction as ReactionType,
    createdAt: row.created_at,
  };
}

export const supabasePromptRepository: PromptRepository = {
  async findAll(): Promise<readonly PromptTemplate[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .order('usage_count', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch prompt templates: ${error.message}`);
    }

    return (data ?? []).map(toPromptTemplate);
  },

  async findByCategory(category: PromptCategory): Promise<readonly PromptTemplate[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('category', category)
      .order('usage_count', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch prompt templates by category: ${error.message}`);
    }

    return (data ?? []).map(toPromptTemplate);
  },

  async findById(id: string): Promise<PromptTemplate | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch prompt template: ${error.message}`);
    }

    return toPromptTemplate(data);
  },

  async logUsage(input: LogPromptUsageInput): Promise<PromptUsageLog> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('prompt_usage_logs')
      .insert({
        user_id: input.userId ?? null,
        prompt_template_id: input.promptTemplateId,
        restaurant_id: input.restaurantId ?? null,
        action: input.action,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log prompt usage: ${error.message}`);
    }

    // Increment usage_count on the prompt template
    // Ideally done via RPC or DB trigger; here we read-then-write as fallback.
    const { data: template } = await supabase
      .from('prompt_templates')
      .select('usage_count')
      .eq('id', input.promptTemplateId)
      .single();

    if (template) {
      await supabase
        .from('prompt_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', input.promptTemplateId);
    }

    return toUsageLog(data);
  },

  async react(input: ReactToPromptInput): Promise<PromptReaction> {
    const supabase = createClient();

    // Check for existing reaction by this user on this prompt
    const { data: existing } = await supabase
      .from('prompt_reactions')
      .select('*')
      .eq('user_id', input.userId)
      .eq('prompt_template_id', input.promptTemplateId)
      .single();

    if (existing) {
      // Update existing reaction
      const { data, error } = await supabase
        .from('prompt_reactions')
        .update({ reaction: input.reaction })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update prompt reaction: ${error.message}`);
      }

      // Update counts on the prompt template
      await updateReactionCounts(input.promptTemplateId);

      return toReaction(data);
    }

    // Insert new reaction
    const { data, error } = await supabase
      .from('prompt_reactions')
      .insert({
        user_id: input.userId,
        prompt_template_id: input.promptTemplateId,
        reaction: input.reaction,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create prompt reaction: ${error.message}`);
    }

    // Update counts on the prompt template
    await updateReactionCounts(input.promptTemplateId);

    return toReaction(data);
  },
};

/** Recalculate and update like/dislike counts on a prompt template */
async function updateReactionCounts(promptTemplateId: string): Promise<void> {
  const supabase = createClient();

  const { count: likeCount } = await supabase
    .from('prompt_reactions')
    .select('*', { count: 'exact', head: true })
    .eq('prompt_template_id', promptTemplateId)
    .eq('reaction', 'like');

  const { count: dislikeCount } = await supabase
    .from('prompt_reactions')
    .select('*', { count: 'exact', head: true })
    .eq('prompt_template_id', promptTemplateId)
    .eq('reaction', 'dislike');

  await supabase
    .from('prompt_templates')
    .update({
      like_count: likeCount ?? 0,
      dislike_count: dislikeCount ?? 0,
    })
    .eq('id', promptTemplateId);
}
