/**
 * Prompt repository interface
 * Infrastructure layer implements this with Supabase
 */

import type { PromptTemplate, PromptCategory, PromptUsageLog, PromptReaction, ReactionType } from '../entities/prompt';

/** Data required to log prompt usage */
export interface LogPromptUsageInput {
  readonly userId?: string;
  readonly promptTemplateId: string;
  readonly restaurantId?: string;
  readonly action: string;
}

/** Data required to react to a prompt */
export interface ReactToPromptInput {
  readonly userId: string;
  readonly promptTemplateId: string;
  readonly reaction: ReactionType;
}

export interface PromptRepository {
  /** Find all prompt templates */
  findAll(): Promise<readonly PromptTemplate[]>;

  /** Find prompt templates by category */
  findByCategory(category: PromptCategory): Promise<readonly PromptTemplate[]>;

  /** Find a single prompt template by ID */
  findById(id: string): Promise<PromptTemplate | null>;

  /** Log a prompt usage event */
  logUsage(input: LogPromptUsageInput): Promise<PromptUsageLog>;

  /** Add or update a reaction on a prompt template */
  react(input: ReactToPromptInput): Promise<PromptReaction>;
}
