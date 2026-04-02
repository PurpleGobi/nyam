'use client'

import { useState, useEffect, useMemo } from 'react'
import type { BubbleMember } from '@/domain/entities/bubble'
import { bubbleRepo, profileRepo } from '@/shared/di/container'
import { getLevelTitle } from '@/domain/services/xp-calculator'

export interface BubblerItem {
  userId: string
  nickname: string
  avatarUrl: string | null
  avatarColor: string | null
  level: number
  levelTitle: string
  role: string
  totalRecords: number
  avgSatisfaction: number | null
  sharedBubbleCount: number
  sharedBubbleNames: string[]
}

export function useBubblersList(userId: string | null, bubbles: Array<{ id: string; name: string }>) {
  const [bubblers, setBubblers] = useState<BubblerItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId || bubbles.length === 0) {
      setBubblers([])
      return
    }

    setIsLoading(true)

    const load = async () => {
      try {
        // 모든 버블의 active 멤버를 병렬 로드
        const results = await Promise.all(
          bubbles.map(async (b) => {
            const res = await bubbleRepo.getMembers(b.id, { status: 'active' })
            return { bubbleName: b.name, members: res.data }
          })
        )

        // userId별로 그룹핑 (자기 자신 제외)
        const map = new Map<string, { member: BubbleMember; bubbleNames: string[] }>()
        for (const { bubbleName, members } of results) {
          for (const m of members) {
            if (m.userId === userId) continue
            const existing = map.get(m.userId)
            if (existing) {
              existing.bubbleNames.push(bubbleName)
              // 더 높은 통계 값 유지
              if (m.memberUniqueTargetCount > existing.member.memberUniqueTargetCount) {
                existing.member = m
              }
            } else {
              map.set(m.userId, { member: m, bubbleNames: [bubbleName] })
            }
          }
        }

        // 프로필 병렬 로드
        const entries = Array.from(map.entries())
        const profiles = await Promise.all(
          entries.map(([uid]) => profileRepo.getUserProfile(uid).catch(() => null))
        )

        const items: BubblerItem[] = entries.map(([uid, { member, bubbleNames }], i) => {
          const p = profiles[i]
          const level = p ? Math.max(1, Math.floor(p.totalXp / 100) + 1) : 1
          return {
            userId: uid,
            nickname: p?.nickname ?? uid.substring(0, 6),
            avatarUrl: p?.avatarUrl ?? null,
            avatarColor: p?.avatarColor ?? null,
            level,
            levelTitle: getLevelTitle(level),
            role: member.role,
            totalRecords: member.memberUniqueTargetCount,
            avgSatisfaction: member.avgSatisfaction,
            sharedBubbleCount: bubbleNames.length,
            sharedBubbleNames: bubbleNames,
          }
        })

        // 공유 버블 수 > 기록 수 순 정렬
        items.sort((a, b) => b.sharedBubbleCount - a.sharedBubbleCount || b.totalRecords - a.totalRecords)
        setBubblers(items)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [userId, bubbles])

  return { bubblers, isLoading }
}
