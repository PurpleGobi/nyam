import type { AromaSectorId, AromaRing } from '@/domain/entities/aroma'
import { AROMA_SECTORS } from '@/shared/constants/aroma-sectors'

/**
 * 활성 섹터 ID 목록에서 한국어 라벨 추출
 */
export function extractAromaLabels(activeIds: AromaSectorId[]): string[] {
  return activeIds
    .map((id) => AROMA_SECTORS.find((s) => s.id === id)?.nameKo)
    .filter((name): name is string => name !== undefined)
}

/**
 * 활성 섹터가 걸쳐 있는 링(1/2/3) 집합 반환
 */
export function getActiveRings(activeIds: AromaSectorId[]): Set<AromaRing> {
  const rings = new Set<AromaRing>()
  for (const id of activeIds) {
    const sector = AROMA_SECTORS.find((s) => s.id === id)
    if (sector) rings.add(sector.ring)
  }
  return rings
}
