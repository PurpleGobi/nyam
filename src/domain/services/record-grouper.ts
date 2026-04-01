// src/domain/services/record-grouper.ts
// R1: 외부 의존 0 — React, Supabase, Next.js import 금지

import type { RecordWithTarget } from '@/domain/entities/record'
import type { GroupedTarget } from '@/domain/entities/grouped-target'

/**
 * RecordWithTarget[] → GroupedTarget[] 변환
 * targetId별 그룹화, 최신 방문 기록 기준 데이터 집계
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
      satisfaction: latest.satisfaction,
      axisX: latest.axisX,
      axisY: latest.axisY,
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
