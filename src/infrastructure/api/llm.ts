// src/infrastructure/api/llm.ts
// LLM 통합 호출 — config 기반 provider 라우팅
// 서버 전용

import { LLM_CONFIG } from '@/shared/constants/llm-config'
import { geminiVision, geminiText } from '@/infrastructure/api/providers/gemini'

/** 이미지 + 프롬프트 → 텍스트 응답 */
export async function callVision(imageUrl: string, prompt: string): Promise<string> {
  const { provider, model } = LLM_CONFIG.vision
  switch (provider) {
    case 'gemini':
      return geminiVision(model, imageUrl, prompt)
    // case 'openai':
    //   return openaiVision(model, imageUrl, prompt)
    // case 'anthropic':
    //   return anthropicVision(model, imageUrl, prompt)
    default:
      throw new Error(`Unsupported vision provider: ${provider}`)
  }
}

/** 텍스트 프롬프트 → 텍스트 응답 */
export async function callText(prompt: string): Promise<string> {
  const { provider, model } = LLM_CONFIG.text
  switch (provider) {
    case 'gemini':
      return geminiText(model, prompt)
    // case 'openai':
    //   return openaiText(model, prompt)
    // case 'anthropic':
    //   return anthropicText(model, prompt)
    default:
      throw new Error(`Unsupported text provider: ${provider}`)
  }
}
