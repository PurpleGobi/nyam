// src/domain/entities/add-flow.ts
// R1: 외부 의존 0

export type AddFlowStep =
  | 'camera'
  | 'ai_result'
  | 'wine_confirm'
  | 'search'
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

/** AI 인식 → 기록 화면 pre-fill 데이터 */
export interface AIPreFillData {
  genre?: string | null
  suggestedScene?: string | null
  ocrData?: {
    wine_name: string
    vintage: string | null
    producer: string | null
  }
  wineType?: string | null
  region?: string | null
  gps?: { latitude: number; longitude: number } | null
  capturedAt?: string | null
}

/** status 결정 규칙 (RECORD_FLOW.md §1) */
export function determineRecordStatus(
  entryPath: AddFlowEntryPath,
  hasRating: boolean,
): 'checked' | 'rated' {
  if (entryPath === 'search' && !hasRating) {
    return 'checked'
  }
  return 'rated'
}
