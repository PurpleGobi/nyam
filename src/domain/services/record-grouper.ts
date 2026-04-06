// src/domain/services/record-grouper.ts
// R1: 외부 의존 0 — React, Supabase, Next.js import 금지

import type { RecordWithTarget } from '@/domain/entities/record'
import type { GroupedTarget } from '@/domain/entities/grouped-target'

/** source 우선순위: mine > following > bubble > public > bookmark */
const SOURCE_PRIORITY: Record<string, number> = {
  mine: 0,
  following: 1,
  bubble: 2,
  public: 3,
  bookmark: 4,
}

/**
 * RecordWithTarget[] → GroupedTarget[] 변환
 * targetId별 그룹화, source 우선순위 → 최신 기록 기준 데이터 집계
 */
export function groupRecordsByTarget(records: RecordWithTarget[]): GroupedTarget[] {
  const map = new Map<string, RecordWithTarget[]>()

  for (const record of records) {
    const group = map.get(record.targetId)
    if (group) {
      group.push(record)
    } else {
      map.set(record.targetId, [record])
    }
  }

  const result: GroupedTarget[] = []

  for (const [targetId, group] of map) {
    // 최신 기록 결정: visitDate DESC → createdAt DESC
    const sorted = [...group].sort((a, b) => {
      const dateA = a.visitDate ?? ''
      const dateB = b.visitDate ?? ''
      if (dateA !== dateB) return dateB.localeCompare(dateA)
      return b.createdAt.localeCompare(a.createdAt)
    })
    const latest = sorted[0]

    // 대표 점수: source 우선순위 폴백 (나→팔로잉→버블→공개)
    // 가장 우선순위 높은 source의 records가 있으면 그 source의 평균을 사용
    const scored = group.filter((r) => r.satisfaction != null)
    let bestSatisfaction: number | null = null
    let bestAxisX: number | null = null
    let bestAxisY: number | null = null
    let bestSource: string | undefined

    if (scored.length > 0) {
      // source별 그룹화
      const bySource = new Map<string, typeof scored>()
      for (const r of scored) {
        const src = r.source ?? 'bookmark'
        const arr = bySource.get(src)
        if (arr) arr.push(r)
        else bySource.set(src, [r])
      }
      // 우선순위 순서대로 확인 → 첫 번째 존재하는 source의 평균
      const priorityOrder = ['mine', 'following', 'bubble', 'public', 'bookmark']
      for (const src of priorityOrder) {
        const srcRecords = bySource.get(src)
        if (srcRecords && srcRecords.length > 0) {
          bestSource = src
          bestSatisfaction = Math.round(
            srcRecords.reduce((sum, r) => sum + (r.satisfaction ?? 0), 0) / srcRecords.length,
          )
          const withAxis = srcRecords.filter((r) => r.axisX != null && r.axisY != null)
          if (withAxis.length > 0) {
            bestAxisX = Math.round(withAxis.reduce((sum, r) => sum + (r.axisX ?? 0), 0) / withAxis.length)
            bestAxisY = Math.round(withAxis.reduce((sum, r) => sum + (r.axisY ?? 0), 0) / withAxis.length)
          }
          break
        }
      }
    }

    result.push({
      targetId,
      targetType: latest.targetType,
      targetName: latest.targetName,
      targetMeta: latest.targetMeta,
      targetArea: latest.targetArea,
      targetPhotoUrl: latest.targetPhotoUrl,
      targetLat: latest.targetLat,
      targetLng: latest.targetLng,

      latestRecordId: latest.id,
      satisfaction: bestSatisfaction ?? latest.satisfaction,
      axisX: bestAxisX ?? latest.axisX,
      axisY: bestAxisY ?? latest.axisY,
      averageSource: bestSource,
      scene: latest.scene,
      visitDate: latest.visitDate,
      listStatus: latest.listStatus,
      createdAt: latest.createdAt,

      visitCount: group.length,
      allRecords: sorted,

      genre: latest.genre ?? null,
      district: latest.district ?? null,
      area: latest.area ?? null,
      priceRange: latest.priceRange ?? null,
      michelinStars: latest.michelinStars ?? null,
      hasBlueRibbon: latest.hasBlueRibbon ?? null,
      mediaAppearances: latest.mediaAppearances ?? null,

      wineType: latest.wineType ?? null,
      variety: latest.variety ?? null,
      country: latest.country ?? null,
      region: latest.region ?? null,
      vintage: latest.vintage ?? null,
    })
  }

  return result
}
