// src/shared/constants/llm-config.ts
// LLM 사용처별 provider + model 중앙 설정
// 모델 교체 시 이 파일만 수정

export type LlmProvider = 'gemini' | 'openai' | 'anthropic' | 'grok'

export interface LlmModelConfig {
  provider: LlmProvider
  model: string
}

/**
 * 사용처별 LLM 설정
 * - vision: 이미지 인식 (와인 라벨, 음식 사진, 진열장, 영수증)
 * - text: 텍스트 전용 (와인 이름 검색, 상세 정보 조회)
 */
export const LLM_CONFIG: Record<string, LlmModelConfig> = {
  vision: { provider: 'gemini', model: 'gemini-2.5-flash' },
  text: { provider: 'gemini', model: 'gemini-2.5-flash' },
}
