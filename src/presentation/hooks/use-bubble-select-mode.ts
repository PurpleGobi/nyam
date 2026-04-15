'use client'

import { useState, useCallback } from 'react'
import { useBubbleItems } from '@/application/hooks/use-bubble-items'

interface UseBubbleSelectModeParams {
  userId: string | null
}

export function useBubbleSelectMode({ userId }: UseBubbleSelectModeParams) {
  const [isBubbleSelectMode, setIsBubbleSelectMode] = useState(false)
  const [isBubbleRemoveMode, setIsBubbleRemoveMode] = useState(false)
  const [bubbleSelectIds, setBubbleSelectIds] = useState<Set<string>>(new Set())
  const [showBubblePicker, setShowBubblePicker] = useState(false)

  const { batchAddToBubble, batchRemoveFromBubble } = useBubbleItems(userId, null, 'restaurant')

  const startBubbleSelect = useCallback(() => {
    setIsBubbleSelectMode(true)
    setIsBubbleRemoveMode(false)
    setBubbleSelectIds(new Set())
  }, [])

  const startBubbleRemove = useCallback(() => {
    setIsBubbleSelectMode(true)
    setIsBubbleRemoveMode(true)
    setBubbleSelectIds(new Set())
  }, [])

  const stopBubbleSelect = useCallback(() => {
    setIsBubbleSelectMode(false)
    setIsBubbleRemoveMode(false)
    setBubbleSelectIds(new Set())
  }, [])

  const toggleBubbleSelectItem = useCallback((id: string) => {
    setBubbleSelectIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const openBubblePicker = useCallback(() => setShowBubblePicker(true), [])
  const closeBubblePicker = useCallback(() => {
    setShowBubblePicker(false)
    stopBubbleSelect()
  }, [stopBubbleSelect])

  return {
    isBubbleSelectMode,
    isBubbleRemoveMode,
    bubbleSelectIds,
    showBubblePicker,
    startBubbleSelect,
    startBubbleRemove,
    stopBubbleSelect,
    toggleBubbleSelectItem,
    openBubblePicker,
    closeBubblePicker,
    batchAddToBubble,
    batchRemoveFromBubble,
  }
}
