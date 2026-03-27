// src/domain/entities/add-flow.ts
// R1: 외부 의존 0

export type AddFlowStep =
  | 'camera'
  | 'ai_result'
  | 'wine_confirm'
  | 'search'
  | 'register'
  | 'record'
  | 'success'

export type AddFlowEntryPath = 'camera' | 'search' | 'detail_fab' | 'nudge' | 'recommend'

export interface AddFlowTarget {
  id: string
  name: string
  type: 'restaurant' | 'wine'
  meta: string
  isAiRecognized: boolean
}
