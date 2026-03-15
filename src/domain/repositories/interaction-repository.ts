import type { InteractionEventType, UserPreferenceSummary } from '@/domain/entities/interaction'

export interface LogInteractionInput {
  readonly userId: string
  readonly eventType: InteractionEventType
  readonly eventData: Record<string, string>
}

export interface InteractionRepository {
  logInteraction(input: LogInteractionInput): Promise<void>
  getPreferenceSummary(userId: string, days?: number): Promise<UserPreferenceSummary>
}
