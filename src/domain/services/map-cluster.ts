// src/domain/services/map-cluster.ts
// R1: 외부 의존 0

import type {
  MapDiscoveryItem,
  MapCluster,
  MapDisplayResult,
} from '@/domain/entities/map-discovery'
import { getRepresentativeScore } from '@/domain/entities/map-discovery'

/**
 * 대표 점수 기준 상위 N개 선택.
 * 대표 점수 우선순위: 내점수 > 팔로잉 > 버블 > nyam > 구글 (모두 0~100).
 * 점수 없으면 최하위.
 */
export function selectTopN(
  items: MapDiscoveryItem[],
  limit: number = 30,
): MapDiscoveryItem[] {
  return [...items]
    .sort((a, b) => (getRepresentativeScore(b) ?? -Infinity) - (getRepresentativeScore(a) ?? -Infinity))
    .slice(0, limit)
}

/**
 * 그리드 기반 클러스터링.
 *
 * 지도 뷰포트를 cellSize(도 단위)로 분할하여 같은 셀에 속하는 아이템을 그룹화.
 * 2개 이상이면 클러스터, 1개면 단독 아이템.
 *
 * @param items selectTopN 결과
 * @param cellSize 셀 크기 (위도/경도 도 단위). 줌 레벨에 따라 조정.
 *   - 줌 16+: 0.001 (약 100m)
 *   - 줌 14-15: 0.003 (약 300m)
 *   - 줌 12-13: 0.01 (약 1km)
 *   - 줌 11-: 0.03 (약 3km)
 */
export function clusterPoints(
  items: MapDiscoveryItem[],
  cellSize: number,
): MapDisplayResult {
  const grid = new Map<string, MapDiscoveryItem[]>()

  for (const item of items) {
    const cellX = Math.floor(item.lng / cellSize)
    const cellY = Math.floor(item.lat / cellSize)
    const key = `${cellX}:${cellY}`
    const arr = grid.get(key) ?? []
    arr.push(item)
    grid.set(key, arr)
  }

  const singles: MapDiscoveryItem[] = []
  const clusters: MapCluster[] = []

  for (const group of grid.values()) {
    if (group.length === 1) {
      singles.push(group[0])
    } else {
      const avgLat = group.reduce((s, i) => s + i.lat, 0) / group.length
      const avgLng = group.reduce((s, i) => s + i.lng, 0) / group.length
      clusters.push({
        lat: avgLat,
        lng: avgLng,
        count: group.length,
        items: group,
      })
    }
  }

  return { singles, clusters }
}

/** 줌 레벨에 따른 클러스터 셀 크기 반환 */
export function zoomToCellSize(zoom: number): number {
  if (zoom >= 16) return 0.001
  if (zoom >= 14) return 0.003
  if (zoom >= 12) return 0.01
  return 0.03
}

/** 줌 레벨에 따른 nearby API 반경(미터) 반환. use-map-discovery에서 사용. */
export function zoomToRadius(zoom: number): number {
  const table: Record<number, number> = {
    18: 50, 17: 100, 16: 200, 15: 500,
    14: 1000, 13: 2000, 12: 4000, 11: 8000,
  }
  const clamped = Math.max(11, Math.min(18, Math.round(zoom)))
  return table[clamped] ?? 2000
}
