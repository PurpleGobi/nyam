// src/domain/entities/map-discovery.ts
// R1: 외부 의존 0

import type { RestaurantPrestige } from '@/domain/entities/restaurant'

/** 지도 뷰 통합 아이템 — 내 기록 + nearby 모두 이 타입으로 표현 */
export interface MapDiscoveryItem {
  /** 표시용 ID. Nyam DB 식당: restaurants.id, 미등록: "kakao_{카카오ID}" */
  id: string
  /** 원본 카카오 ID (nearby 데이터는 항상 존재, 내 기록은 externalIds.kakao) */
  kakaoId: string | null
  name: string
  genre: string | null
  area: string | null
  lat: number
  lng: number
  /** 현재 위치로부터의 거리 (km). 클라이언트에서 계산 */
  distanceKm: number | null

  /** Nyam DB에 등록된 식당인지 여부 */
  inNyamDb: boolean
  /** Nyam DB의 restaurant ID (inNyamDb=true일 때만 존재) */
  restaurantId: string | null

  // --- 5종 점수 (가용한 것만 non-null, 모두 0~100 스케일) ---
  myScore: number | null          // 내 satisfaction
  followingScore: number | null   // 팔로잉 유저 평균
  bubbleScore: number | null      // 버블 평균
  nyamScore: number | null        // calcNyamScore 결과
  googleRating: number | null     // Google Places (5.0 → 100점 환산 저장)

  // --- 메타 ---
  prestige: RestaurantPrestige[]
  /** 이 아이템의 출처들 ('mine'|'bookmark'|'following'|'bubble'|'nearby') */
  sources: MapViewFilter[]
}

/**
 * 대표 점수: 우선순위 내점수 > 팔로잉 > 버블 > nyam > 구글.
 * 첫 번째 non-null 값이 대표 점수가 된다.
 */
export function getRepresentativeScore(item: MapDiscoveryItem): number | null {
  if (item.myScore != null) return item.myScore
  if (item.followingScore != null) return item.followingScore
  if (item.bubbleScore != null) return item.bubbleScore
  if (item.nyamScore != null) return item.nyamScore
  if (item.googleRating != null) return item.googleRating
  return null
}

/** 보기 필터 (멀티셀렉) */
export type MapViewFilter = 'mine' | 'bookmark' | 'following' | 'bubble'

/** 명성 필터 (멀티셀렉) */
export type MapPrestigeFilter = 'michelin' | 'blue_ribbon' | 'tv'

/** 클러스터 결과 */
export interface MapCluster {
  lat: number
  lng: number
  count: number
  items: MapDiscoveryItem[]
}

/** selectTop30 + clusterPoints 결과 */
export interface MapDisplayResult {
  /** 클러스터에 포함되지 않은 단독 아이템 */
  singles: MapDiscoveryItem[]
  /** 2개 이상 밀집 클러스터 */
  clusters: MapCluster[]
}
