'use client'

import { useState, useCallback } from 'react'
import type { PromptTemplate } from '@/domain/entities/prompt'
import { buildPrompt } from '@/domain/services/prompt-builder'
import { supabasePromptRepository } from '@/infrastructure/repositories/supabase-prompt-repository'
import { useAuth } from './use-auth'

/** ChatGPT deeplink base URL */
const CHATGPT_DEEPLINK_URL = 'https://chat.openai.com/'

interface UsePromptBridgeReturn {
  /** Build a prompt string from a template and variable values */
  readonly buildPromptText: (
    template: PromptTemplate,
    variables: Record<string, string>,
  ) => string
  /** Copy text to clipboard and log usage */
  readonly copyToClipboard: (
    text: string,
    promptTemplateId?: string,
    restaurantId?: string,
  ) => Promise<void>
  /** Open text in ChatGPT via deeplink */
  readonly openInChatGPT: (
    text: string,
    promptTemplateId?: string,
    restaurantId?: string,
  ) => Promise<void>
  /** Share text via Web Share API */
  readonly sharePrompt: (
    text: string,
    promptTemplateId?: string,
    restaurantId?: string,
  ) => Promise<void>
  /** Whether text was recently copied to clipboard */
  readonly copied: boolean
}

/**
 * Core prompt bridge hook.
 * Handles prompt building, clipboard copy, ChatGPT deeplink, and Web Share API.
 * Logs all usage events to the prompt repository.
 */
export function usePromptBridge(): UsePromptBridgeReturn {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)

  const logUsage = useCallback(
    async (
      action: string,
      promptTemplateId?: string,
      restaurantId?: string,
    ) => {
      if (!promptTemplateId) return
      try {
        await supabasePromptRepository.logUsage({
          userId: user?.id,
          promptTemplateId,
          restaurantId,
          action,
        })
      } catch {
        // Usage logging is non-critical; silently ignore failures
      }
    },
    [user],
  )

  const buildPromptText = useCallback(
    (template: PromptTemplate, variables: Record<string, string>): string => {
      return buildPrompt(template, variables)
    },
    [],
  )

  const copyToClipboard = useCallback(
    async (
      text: string,
      promptTemplateId?: string,
      restaurantId?: string,
    ) => {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      await logUsage('copy', promptTemplateId, restaurantId)
    },
    [logUsage],
  )

  const openInChatGPT = useCallback(
    async (
      text: string,
      promptTemplateId?: string,
      restaurantId?: string,
    ) => {
      const url = `${CHATGPT_DEEPLINK_URL}?q=${encodeURIComponent(text)}`
      window.open(url, '_blank', 'noopener,noreferrer')
      await logUsage('deeplink_chatgpt', promptTemplateId, restaurantId)
    },
    [logUsage],
  )

  const sharePrompt = useCallback(
    async (
      text: string,
      promptTemplateId?: string,
      restaurantId?: string,
    ) => {
      if (!navigator.share) {
        // Fallback to clipboard copy if Web Share API is not available
        await copyToClipboard(text, promptTemplateId, restaurantId)
        return
      }

      await navigator.share({
        title: 'Nyam - AI 맛집 검증 프롬프트',
        text,
      })
      await logUsage('share', promptTemplateId, restaurantId)
    },
    [logUsage, copyToClipboard],
  )

  return {
    buildPromptText,
    copyToClipboard,
    openInChatGPT,
    sharePrompt,
    copied,
  }
}
