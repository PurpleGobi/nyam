'use client'

import useSWR from 'swr'
import { createClient } from '@/infrastructure/supabase/client'
import { CHALLENGE_TEMPLATES } from '@/shared/constants/challenges'
import type { Challenge, ChallengeWithProgress } from '@/domain/entities/challenge'

/**
 * Returns the Monday 00:00:00 of the current week (Asia/Seoul).
 */
function getWeekStart(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

/**
 * Deterministically pick 2 challenges for a given group + week.
 */
function getWeekChallenges(groupId: string): [Challenge, Challenge] {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  const seed = groupId.charCodeAt(0) + weekNum
  const idx = seed % CHALLENGE_TEMPLATES.length
  return [
    CHALLENGE_TEMPLATES[idx % CHALLENGE_TEMPLATES.length],
    CHALLENGE_TEMPLATES[(idx + 1) % CHALLENGE_TEMPLATES.length],
  ]
}

interface WeekRecord {
  id: string
  category: string | null
  created_at: string
}

interface PreviousCategory {
  category: string | null
}

export function useGroupChallenges(
  groupId: string | undefined,
  userId: string | undefined,
) {
  const { data, isLoading } = useSWR(
    groupId && userId ? ['group-challenges', groupId, userId] : null,
    async (): Promise<ChallengeWithProgress[]> => {
      const supabase = createClient()
      const weekStart = getWeekStart()
      const [c1, c2] = getWeekChallenges(groupId!)

      // Fetch this week's records for the user
      const { data: weekRecords } = await supabase
        .from('records')
        .select('id, category, created_at')
        .eq('user_id', userId!)
        .gte('created_at', weekStart.toISOString())

      const records: WeekRecord[] = weekRecords ?? []

      // For 'category' type challenges, fetch previous categories (before this week)
      let previousCategories: Set<string> = new Set()
      const needsPrevious = [c1, c2].some((c) => c.type === 'category')
      if (needsPrevious) {
        const { data: prevData } = await supabase
          .from('records')
          .select('category')
          .eq('user_id', userId!)
          .lt('created_at', weekStart.toISOString())

        const prev: PreviousCategory[] = prevData ?? []
        previousCategories = new Set(
          prev.map((r) => r.category).filter((c): c is string => c !== null),
        )
      }

      const recordCategories = records
        .map((r) => r.category)
        .filter((c): c is string => c !== null)

      function calcProgress(challenge: Challenge): number {
        switch (challenge.type) {
          case 'frequency':
            return records.length
          case 'variety':
            return new Set(recordCategories).size
          case 'category': {
            const weekCategories = new Set(recordCategories)
            let newCount = 0
            for (const cat of weekCategories) {
              if (!previousCategories.has(cat)) newCount++
            }
            return newCount
          }
          case 'region':
            // Simplified: count records as proxy for visiting new places
            return Math.min(records.length, 1)
          default:
            return 0
        }
      }

      return [c1, c2].map((challenge) => {
        const current = calcProgress(challenge)
        return {
          ...challenge,
          progress: {
            challengeId: challenge.id,
            current: Math.min(current, challenge.target),
            target: challenge.target,
            completed: current >= challenge.target,
          },
        }
      })
    },
  )

  return {
    challenges: data ?? [],
    isLoading,
  }
}
