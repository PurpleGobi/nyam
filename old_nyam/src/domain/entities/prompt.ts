/**
 * Prompt domain entities
 * Aligned with: prompt_templates, prompt_usage_logs, prompt_reactions tables
 */

/** Prompt template category */
export type PromptCategory =
  | 'review_verify'
  | 'situation_recommend'
  | 'compare'
  | 'info_check'
  | 'hidden_gem';

/** Variable input type within a prompt template */
export type PromptVariableType = 'auto' | 'input' | 'preset';

/** Variable definition embedded in a prompt template */
export interface PromptVariable {
  readonly key: string;
  readonly label: string;
  readonly type: PromptVariableType;
}

/** Prompt template entity */
export interface PromptTemplate {
  readonly id: string;
  readonly authorId: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly category: PromptCategory;
  readonly template: string;
  readonly variables: readonly PromptVariable[];
  readonly isOfficial: boolean;
  readonly isPublic: boolean;
  readonly usageCount: number;
  readonly likeCount: number;
  readonly dislikeCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Action type for prompt usage logging */
export type PromptAction = 'copy' | 'deeplink_chatgpt' | 'share';

/** Prompt usage log entry */
export interface PromptUsageLog {
  readonly id: string;
  readonly userId: string | null;
  readonly promptTemplateId: string | null;
  readonly restaurantId: string | null;
  readonly action: PromptAction;
  readonly createdAt: string;
}

/** Reaction type for prompt feedback */
export type ReactionType = 'like' | 'dislike';

/** User reaction on a prompt template */
export interface PromptReaction {
  readonly id: string;
  readonly userId: string;
  readonly promptTemplateId: string;
  readonly reaction: ReactionType;
  readonly createdAt: string;
}
