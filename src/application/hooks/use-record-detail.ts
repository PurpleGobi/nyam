'use client'

// src/application/hooks/use-record-detail.ts
// R3: domain 인터페이스에만 의존. infrastructure 직접 사용 금지.

import { useState, useEffect, useCallback } from 'react'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import type { RecordRepository } from '@/domain/repositories/record-repository'
import type { RestaurantRepository } from '@/domain/repositories/restaurant-repository'
import type { WineRepository } from '@/domain/repositories/wine-repository'
import type { XpRepository } from '@/domain/repositories/xp-repository'
import type { WishlistRepository } from '@/domain/repositories/wishlist-repository'

/** XP 이력 항목 */
export interface XpEarnedItem {
  axisType: string
  axisValue: string
  xpAmount: number
  currentLevel: number
  levelColor: string
}

/** 연결 대상 (식당 또는 와인) */
export interface LinkedTarget {
  id: string
  name: string
  targetType: 'restaurant' | 'wine'
  /** 와인: "생산자 · 빈티지" */
  subText: string | null
}

export interface RecordDetailState {
  record: DiningRecord | null
  photos: RecordPhoto[]
  targetInfo: LinkedTarget | null
  linkedItem: LinkedTarget | null
  otherRecords: DiningRecord[]
  xpEarned: XpEarnedItem[]
  isLoading: boolean
  error: string | null
  isDeleting: boolean
  deleteError: string | null
}

export interface RecordDetailActions {
  deleteRecord: () => Promise<boolean>
}

export function useRecordDetail(
  recordId: string,
  userId: string | null,
  deps: {
    recordRepo: RecordRepository
    restaurantRepo: RestaurantRepository
    wineRepo: WineRepository
    xpRepo: XpRepository
    wishlistRepo: WishlistRepository
  },
): RecordDetailState & RecordDetailActions {
  const [record, setRecord] = useState<DiningRecord | null>(null)
  const [photos, setPhotos] = useState<RecordPhoto[]>([])
  const [targetInfo, setTargetInfo] = useState<LinkedTarget | null>(null)
  const [linkedItem, setLinkedItem] = useState<LinkedTarget | null>(null)
  const [otherRecords, setOtherRecords] = useState<DiningRecord[]>([])
  const [xpEarned, setXpEarned] = useState<XpEarnedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        // 1. 기록 + 사진 병렬
        const [r, p] = await Promise.all([
          deps.recordRepo.findById(recordId),
          deps.recordRepo.findPhotosByRecordId(recordId),
        ])
        if (cancelled) return
        if (!r) {
          setError('기록을 찾을 수 없습니다')
          setIsLoading(false)
          return
        }
        setRecord(r)
        setPhotos(p)

        // 2. 대상 정보 + 연결 아이템 + 다른 기록 + XP 이력 병렬
        const promises: Promise<void>[] = []

        // 2a. 대상 정보 (식당 또는 와인)
        promises.push(
          (async () => {
            if (r.targetType === 'restaurant') {
              const rest = await deps.restaurantRepo.findById(r.targetId)
              if (!cancelled && rest) {
                setTargetInfo({ id: rest.id, name: rest.name, targetType: 'restaurant', subText: null })
              }
            } else {
              const wine = await deps.wineRepo.findById(r.targetId)
              if (!cancelled && wine) {
                const parts = [wine.producer, wine.vintage ? String(wine.vintage) : null].filter(Boolean)
                setTargetInfo({
                  id: wine.id, name: wine.name, targetType: 'wine',
                  subText: parts.length > 0 ? parts.join(' · ') : null,
                })
              }
            }
          })(),
        )

        // 2b. 연결 아이템
        promises.push(
          (async () => {
            if (r.linkedWineId) {
              const wine = await deps.wineRepo.findById(r.linkedWineId)
              if (!cancelled && wine) {
                const parts = [wine.producer, wine.vintage ? String(wine.vintage) : null].filter(Boolean)
                setLinkedItem({
                  id: wine.id, name: wine.name, targetType: 'wine',
                  subText: parts.length > 0 ? parts.join(' · ') : null,
                })
              }
            } else if (r.linkedRestaurantId) {
              const rest = await deps.restaurantRepo.findById(r.linkedRestaurantId)
              if (!cancelled && rest) {
                setLinkedItem({ id: rest.id, name: rest.name, targetType: 'restaurant', subText: null })
              }
            }
          })(),
        )

        // 2c. 같은 대상의 다른 기록 (사분면 참조 점)
        if (userId) {
          promises.push(
            (async () => {
              const others = await deps.recordRepo.findByUserAndTarget(userId, r.targetId)
              if (!cancelled) {
                setOtherRecords(others.filter((o) => o.id !== recordId))
              }
            })(),
          )
        }

        // 2d. XP 이력
        promises.push(
          (async () => {
            try {
              const histories = await deps.xpRepo.getHistoriesByRecord(recordId)
              if (cancelled) return
              // XP 이력을 XpEarnedItem으로 변환
              // 현재 레벨은 user_experiences에서 조회 필요하나,
              // S6(XP 엔진) 단계에서 완성 예정. 지금은 이력 데이터만 표시.
              const items: XpEarnedItem[] = histories
                .filter((h) => h.axisValue && h.xpAmount)
                .map((h) => ({
                  axisType: h.axisType ?? '',
                  axisValue: h.axisValue ?? '',
                  xpAmount: h.xpAmount ?? 0,
                  currentLevel: 1, // TODO: S6에서 user_experiences JOIN으로 실제 레벨 조회
                  levelColor: '#7EAE8B', // TODO: S6에서 level_thresholds.color 조회
                }))
              setXpEarned(items)
            } catch {
              // XP 이력 조회 실패는 치명적이지 않으므로 무시
            }
          })(),
        )

        await Promise.all(promises)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '데이터 로딩 실패')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [recordId, userId, deps])

  const deleteRecord = useCallback(async () => {
    if (!record || !userId) return false
    setIsDeleting(true)
    setDeleteError(null)
    try {
      // 1. records DELETE (record_photos ON DELETE CASCADE 자동)
      await deps.recordRepo.delete(recordId)

      // 2. wishlist is_visited 복원: 같은 target의 다른 기록 확인
      const remaining = await deps.recordRepo.findByUserAndTarget(userId, record.targetId)
      if (remaining.filter((r) => r.id !== recordId).length === 0) {
        await deps.wishlistRepo.updateVisitStatus(userId, record.targetId, record.targetType, false)
      }

      // TODO: S6 XP 엔진 완성 시 — xp_histories DELETE + user_experiences 재계산 + users.total_xp 갱신
      return true
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : '삭제 실패')
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [recordId, userId, record, deps])

  return {
    record,
    photos,
    targetInfo,
    linkedItem,
    otherRecords,
    xpEarned,
    isLoading,
    error,
    isDeleting,
    deleteError,
    deleteRecord,
  }
}
