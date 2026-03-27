'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { RecommendationCard } from '@/domain/entities/recommendation'

interface UseRecommendationsResult {
  cards: RecommendationCard[]
  totalCount: number
  coldStartMode: boolean
  dismiss: (cardId: string) => void
}

export function useRecommendations(userId: string | null): UseRecommendationsResult {
  const [cards, setCards] = useState<RecommendationCard[]>([])
  const [coldStartMode, setColdStartMode] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!userId || fetchedRef.current) return
    fetchedRef.current = true

    let cancelled = false

    async function load() {
      try {
        const endpoints = [
          '/api/recommend/revisit',
          '/api/recommend/authority',
          '/api/recommend/bubble',
        ]

        const results = await Promise.allSettled(
          endpoints.map((ep) =>
            fetch(ep).then((r) => r.json() as Promise<{ cards: RecommendationCard[] }>),
          ),
        )

        if (cancelled) return

        const allCards: RecommendationCard[] = []
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.cards) {
            allCards.push(...result.value.cards)
          }
        }

        allCards.sort((a, b) => b.normalizedScore - a.normalizedScore)

        if (allCards.length === 0) {
          setColdStartMode(true)
        }

        setCards(allCards)
      } catch {
        setColdStartMode(true)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [userId])

  const dismiss = useCallback((cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId))
  }, [])

  return {
    cards,
    totalCount: cards.length,
    coldStartMode,
    dismiss,
  }
}
