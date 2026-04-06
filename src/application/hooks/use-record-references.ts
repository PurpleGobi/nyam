'use client'

import { useState, useEffect } from 'react'
import type { QuadrantReferencePoint } from '@/domain/entities/quadrant'
import { recordRepo } from '@/shared/di/container'

interface UseRecordReferencesResult {
  referenceRecords: QuadrantReferencePoint[]
  recentCompanions: string[]
}

/**
 * 이전 기록 참조점 + 최근 동행자 로드 hook.
 * record-flow-container에서 recordRepo.findByUserAndTarget + recordRepo.findByUserId 호출을 대체.
 */
export function useRecordReferences(
  userId: string | null,
  targetId: string | null,
  editRecordId?: string | null,
): UseRecordReferencesResult {
  const [referenceRecords, setReferenceRecords] = useState<QuadrantReferencePoint[]>([])
  const [recentCompanions, setRecentCompanions] = useState<string[]>([])

  // 이전 기록 참조점 로드
  useEffect(() => {
    if (!userId || !targetId) return
    let cancelled = false
    const uid = userId
    const tid = targetId

    async function loadPreviousRecords() {
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
        setReferenceRecords(refs)
      } catch {
        // 참조 점 로드 실패 시 무시 — 핵심 기능 아님
      }
    }
    loadPreviousRecords()
    return () => { cancelled = true }
  }, [userId, targetId, editRecordId])

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

  return { referenceRecords, recentCompanions }
}
