'use client'

import { useState, useEffect } from 'react'
import type { QuadrantReferencePoint } from '@/domain/entities/quadrant'
import type { RecordTargetType } from '@/domain/entities/record'
import { recordRepo, restaurantRepo, wineRepo } from '@/shared/di/container'

interface UseRecordReferencesResult {
  /** 동일 타깃의 과거 방문 기록 ref 점 */
  pastReferences: QuadrantReferencePoint[]
  /** 다른 타깃(내가 기록한 다른 식당/와인)의 평균 ref 점 — 비교용 */
  compareReferences: QuadrantReferencePoint[]
  recentCompanions: string[]
}

/**
 * 사분면 참조점 + 최근 동행자 로드 hook.
 * - pastReferences: 동일 타깃(같은 식당/와인)의 과거 방문 기록 (편집 중 기록은 제외)
 * - compareReferences: 내가 기록한 다른 식당/와인의 평균 (최대 12개)
 * - recentCompanions: 사용 빈도순 최근 동행자
 */
export function useRecordReferences(
  userId: string | null,
  targetId: string | null,
  targetType: RecordTargetType,
  editRecordId?: string | null,
): UseRecordReferencesResult {
  const [pastReferences, setPastReferences] = useState<QuadrantReferencePoint[]>([])
  const [compareReferences, setCompareReferences] = useState<QuadrantReferencePoint[]>([])
  const [recentCompanions, setRecentCompanions] = useState<string[]>([])

  // 동일 타깃 과거 방문 기록 로드
  useEffect(() => {
    if (!userId || !targetId) return
    let cancelled = false
    const uid = userId
    const tid = targetId

    async function loadPastRecords() {
      try {
        const records = await recordRepo.findByUserAndTarget(uid, tid)
        if (cancelled) return
        const refs: QuadrantReferencePoint[] = records
          .filter((r) => r.axisX !== null && r.axisY !== null && r.id !== editRecordId)
          .slice(0, 12)
          .map((r) => ({
            x: r.axisX ?? 50,
            y: r.axisY ?? 50,
            satisfaction: r.satisfaction ?? 50,
            name: r.visitDate ?? '',
            score: r.satisfaction ?? 50,
          }))
        setPastReferences(refs)
      } catch {
        // 참조 점 로드 실패 시 무시 — 핵심 기능 아님
      }
    }
    loadPastRecords()
    return () => { cancelled = true }
  }, [userId, targetId, editRecordId])

  // 비교용 다른 타깃 평균 refs 로드 (동일 target type만)
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const uid = userId
    const excludeId = targetId ?? ''

    async function loadCompareRefs() {
      try {
        const repo = targetType === 'wine' ? wineRepo : restaurantRepo
        const refs = await repo.findQuadrantRefs(uid, excludeId)
        if (cancelled) return
        setCompareReferences(
          refs.map((r) => ({
            x: r.avgAxisX,
            y: r.avgAxisY,
            satisfaction: r.avgSatisfaction,
            name: r.targetName,
            score: r.avgSatisfaction,
            targetId: r.targetId,
            targetType,
          })),
        )
      } catch {
        // 비교 refs 로드 실패 시 무시 — 핵심 기능 아님
      }
    }
    loadCompareRefs()
    return () => { cancelled = true }
  }, [userId, targetId, targetType])

  // 최근 동행자 목록 로드
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const uid = userId

    async function loadRecentCompanions() {
      try {
        const records = await recordRepo.findByUserId(uid)
        if (cancelled) return
        const freq = new Map<string, number>()
        for (const r of records) {
          if (r.companions) {
            for (const name of r.companions) {
              freq.set(name, (freq.get(name) ?? 0) + 1)
            }
          }
        }
        const sorted = [...freq.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([name]) => name)
          .slice(0, 10)
        setRecentCompanions(sorted)
      } catch {
        // 최근 동행자 로드 실패 시 무시
      }
    }
    loadRecentCompanions()
    return () => { cancelled = true }
  }, [userId])

  return { pastReferences, compareReferences, recentCompanions }
}
