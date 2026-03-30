// src/domain/entities/record.ts
// R1: 외부 의존 0 — React, Supabase, Next.js import 금지

// ─── 타입 유니온 (DB CHECK 매핑) ───

/** records.target_type: 'restaurant' | 'wine' */
export type RecordTargetType = 'restaurant' | 'wine'

/** records.status: 'checked' | 'rated' | 'draft' */
export type RecordStatus = 'checked' | 'rated' | 'draft'

/** records.wine_status: 시음/셀러/찜 3분류 (target_type='wine'일 때만 사용) */
export type WineStatus = 'tasted' | 'cellar' | 'wishlist'

/** records.camera_mode: 개별/진열장/영수증 */
export type CameraMode = 'individual' | 'shelf' | 'receipt'

/** visit.meal_time */
export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/**
 * records.pairing_categories (와인 기록 전용)
 * WSET 8카테고리 그리드 — RATING_ENGINE.md §8
 */
export type PairingCategory =
  | 'red_meat'       // 적색육 (스테이크, 양갈비, 오리, 사슴)
  | 'white_meat'     // 백색육 (닭, 돼지, 송아지, 토끼)
  | 'seafood'        // 어패류 (생선, 갑각류, 조개, 굴, 초밥)
  | 'cheese'         // 치즈/유제품 (숙성, 블루, 브리, 크림소스)
  | 'vegetable'      // 채소/곡물 (버섯, 트러플, 리조또, 파스타)
  | 'spicy'          // 매운/발효 (커리, 마라, 김치, 된장)
  | 'dessert'        // 디저트/과일 (다크초콜릿, 타르트, 건과일)
  | 'charcuterie'    // 샤퀴트리/견과 (하몽, 살라미, 아몬드, 올리브)

// ─── RecordVisit: 방문/시음별 쌓이는 데이터 ───

/**
 * records.visits JSONB 배열의 각 항목
 * 재방문 시 핵심 입력: 사분면(axisX/axisY/satisfaction) + 한줄평(comment) + 개인메모(tips)
 * 나머지 필드는 기존 데이터 확인/수정 용도
 */
export interface RecordVisit {
  /** 방문/시음 날짜 — YYYY-MM-DD */
  date: string

  // ─── 핵심 입력 (재방문 시 새로 작성) ───

  /** X축: 0~100 (식당: 음식 퀄리티, 와인: 구조·완성도) */
  axisX: number | null
  /** Y축: 0~100 (식당: 경험 가치, 와인: 즐거움·감성) */
  axisY: number | null
  /** 만족도: 1~100 */
  satisfaction: number | null
  /** 한줄평: 최대 200자 (공유됨) */
  comment: string | null
  /** 개인메모 (비공개) */
  tips: string | null

  // ─── 부가 정보 ───

  /** 상황 태그 */
  scene: string | null
  /** 식사 시간대 */
  mealTime: MealTime | null
  /** 함께 간 사람 (비공개) */
  companions: string[] | null
  /** 동반자 수 */
  companionCount: number | null
  /** 식당 1인 결제 금액 (원) */
  totalPrice: number | null
  /** 와인 구매/병 단가 (원) */
  purchasePrice: number | null

  // ─── 와인 전용 ───

  /** 향 팔레트 영역 데이터 */
  aromaRegions: Record<string, unknown> | null
  /** 향 라벨 */
  aromaLabels: string[] | null
  /** 점 대표 색상 hex */
  aromaColor: string | null
  /** 복합성: 0~100 */
  complexity: number | null
  /** 여운: 0~100 */
  finish: number | null
  /** 균형: 0~100 */
  balance: number | null
  /** 자동 산출 만족도 */
  autoScore: number | null

  // ─── GPS 검증 ───

  /** EXIF GPS 존재 여부 */
  hasExifGps: boolean
  /** GPS가 식당 위치 반경 200m 이내 */
  isExifVerified: boolean
}

// ─── Record 엔티티 ───

/**
 * records 테이블 — 식당/와인당 1개
 * 공통 정보 + visits JSONB 배열
 */
export interface DiningRecord {
  /** UUID PK */
  id: string
  /** FK → users.id */
  userId: string
  /** FK → restaurants.id 또는 wines.id */
  targetId: string
  /** 'restaurant' | 'wine' */
  targetType: RecordTargetType

  // ─── 상태 ───

  /** 'checked' | 'rated' | 'draft' */
  status: RecordStatus
  /** 와인 3분류 (target_type='wine'일 때만) */
  wineStatus: WineStatus | null

  // ─── 카메라 메타데이터 (와인 전용) ───

  cameraMode: CameraMode | null
  ocrData: Record<string, unknown> | null

  // ─── 공통 정보 (최초 기록 시 설정, 이후 수정 가능) ───

  /** 추천 메뉴/페어링 메모 */
  menuTags: string[] | null
  /** WSET 페어링 카테고리 (와인 전용) */
  pairingCategories: PairingCategory[] | null

  // ─── 연결 ───

  /** 와인 기록의 식당 연결 */
  linkedRestaurantId: string | null
  /** 식당 기록의 와인 연결 */
  linkedWineId: string | null

  // ─── 방문 로그 (JSONB 배열) ───

  /** 방문/시음별 쌓이는 데이터 (날짜 내림차순) */
  visits: RecordVisit[]

  // ─── 비정규화 캐시 ───

  /** 방문 횟수 */
  visitCount: number
  /** 최근 방문일 */
  latestVisitDate: string | null
  /** 평균 만족도 */
  avgSatisfaction: number | null

  /** 이 기록으로 획득한 총 XP */
  recordQualityXp: number
  /** 생성 시각 */
  createdAt: string
  /** 수정 시각 */
  updatedAt: string
}

// ─── 팩토리 함수 ───

export function createDefaultRecord(
  userId: string,
  targetId: string,
  targetType: RecordTargetType,
): Omit<DiningRecord, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    userId,
    targetId,
    targetType,
    status: 'draft',
    wineStatus: targetType === 'wine' ? 'tasted' : null,
    cameraMode: null,
    ocrData: null,
    menuTags: null,
    pairingCategories: null,
    linkedRestaurantId: null,
    linkedWineId: null,
    visits: [],
    visitCount: 0,
    latestVisitDate: null,
    avgSatisfaction: null,
    recordQualityXp: 0,
  }
}

// ─── 헬퍼 함수 ───

/** visits 배열에서 최신 visit 가져오기 */
export function getLatestVisit(record: DiningRecord): RecordVisit | null {
  return record.visits[0] ?? null
}

/** visits 배열에 새 visit 추가 (날짜 내림차순 유지) */
export function addVisit(record: DiningRecord, visit: RecordVisit): RecordVisit[] {
  const updated = [visit, ...record.visits]
  updated.sort((a, b) => b.date.localeCompare(a.date))
  return updated
}

/** visits 배열에서 특정 날짜 visit 수정 */
export function updateVisit(visits: RecordVisit[], date: string, patch: Partial<RecordVisit>): RecordVisit[] {
  return visits.map((v) => v.date === date ? { ...v, ...patch } : v)
}

/** 평균 만족도 계산 */
export function calcAvgSatisfaction(visits: RecordVisit[]): number | null {
  const rated = visits.filter((v) => v.satisfaction !== null)
  if (rated.length === 0) return null
  return Math.round(rated.reduce((s, v) => s + v.satisfaction!, 0) / rated.length)
}

// ─── 대상(식당/와인) 정보 포함 기록 ───

export type RecordSource = 'mine' | 'following' | 'bubble'

export interface RecordWithTarget extends DiningRecord {
  targetName: string
  targetMeta: string | null
  targetArea: string | null
  targetPhotoUrl: string | null
  targetLat: number | null
  targetLng: number | null
  source?: RecordSource
  genre?: string | null
  district?: string | null
  area?: string[] | null
  priceRange?: number | null
  michelinStars?: number | null
  hasBlueRibbon?: boolean | null
  mediaAppearances?: string[] | null
  wineType?: string | null
  variety?: string | null
  country?: string | null
  region?: string | null
  vintage?: number | null
}

// ─── 기록 생성/수정 입력 타입 ───

/** 새 기록 생성 시 전달 */
export interface CreateRecordInput {
  userId: string
  targetId: string
  targetType: RecordTargetType
  status: RecordStatus
  wineStatus?: WineStatus | null
  cameraMode?: CameraMode | null
  menuTags?: string[] | null
  pairingCategories?: PairingCategory[] | null
  linkedRestaurantId?: string | null
  linkedWineId?: string | null
  /** 최초 방문 데이터 */
  visit: RecordVisit
}

/** 새 방문 추가 시 전달 */
export interface AddVisitInput {
  recordId: string
  visit: RecordVisit
}
