'use client'

import useSWR from 'swr'
import type { PromptTemplate, PromptCategory } from '@/domain/entities/prompt'
import { supabasePromptRepository } from '@/infrastructure/repositories/supabase-prompt-repository'

interface UsePromptsParams {
  readonly category?: PromptCategory
}

interface UsePromptsReturn {
  readonly prompts: readonly PromptTemplate[]
  readonly isLoading: boolean
  readonly error: Error | undefined
}

/**
 * Hook for fetching prompt templates with optional category filter.
 */
export function usePrompts(params?: UsePromptsParams): UsePromptsReturn {
  const { category } = params ?? {}

  const { data, error, isLoading } = useSWR<readonly PromptTemplate[]>(
    ['prompts', category ?? null],
    () =>
      category
        ? supabasePromptRepository.findByCategory(category)
        : supabasePromptRepository.findAll(),
  )

  return {
    prompts: data ?? [],
    isLoading,
    error,
  }
}
