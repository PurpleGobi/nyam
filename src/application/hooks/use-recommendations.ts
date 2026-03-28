'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { RecommendationCard } from '@/domain/entities/recommendation'

interface UseRecommendationsResult {
  cards: RecommendationCard[]
  isLoading: boolean
  totalCount: number
  coldStartMode: boolean
  dismiss: (cardId: string) => void
}

export function useRecommendations(userId: string | null, recordCount: number): UseRecommendationsResult {
  const [cards, setCards] = useState<RecommendationCard[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [coldStartMode, setColdStartMode] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!userId || fetchedRef.current) return
    fetchedRef.current = true

    let cancelled = false

    async function load() {
      setIsLoading(true)

      try {
        let endpoints: string[]

        if (recordCount < 5) {
          // < 5개 기록 → 권위만 (콜드스타트)
          setColdStartMode(true)
          endpoints = ['/api/recommend/authority']
        } else if (recordCount < 20) {
          // 5~19개 → 재방문 + 권위 + 버블
          endpoints = ['/api/recommend/revisit', '/api/recommend/authority', '/api/recommend/bubble']
        } else {
          // 20+ → 전체 7종 (wine-pairing은 주요 3카테고리 병렬 호출)
          endpoints = [
            '/api/recommend/revisit',
            '/api/recommend/authority',
            '/api/recommend/bubble',
            '/api/recommend/scene',
            '/api/recommend/wine-pairing?category=red_meat',
            '/api/recommend/wine-pairing?category=seafood',
            '/api/recommend/wine-pairing?category=cheese',
          ]
        }

        const results = await Promise.allSettled(
          endpoints.map((ep) =>
            fetch(ep).then((r) => r.json() as Promise<{ cards: RecommendationCard[] }>),
          ),
        )

        if (cancelled) return

        const allCards: RecommendationCard[] = []
        const seen = new Set<string>()
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.cards) {
            for (const card of result.value.cards) {
              if (!seen.has(card.targetId)) {
                seen.add(card.targetId)
                allCards.push(card)
              }
            }
          }
        }

        allCards.sort((a, b) => b.normalizedScore - a.normalizedScore)
        setCards(allCards)
      } catch {
        setColdStartMode(true)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [userId, recordCount])

  const dismiss = useCallback((cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId))
    // 서버에 dismiss 전달
    void fetch('/api/recommend/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cardId }),
    })
  }, [])

  return {
    cards,
    isLoading,
    totalCount: cards.length,
    coldStartMode,
    dismiss,
  }
}
