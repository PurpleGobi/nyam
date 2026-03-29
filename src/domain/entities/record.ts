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

/** records.meal_time */
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

// ─── Record 엔티티 ───

/**
 * records 테이블 1:1 매핑
 * DATA_MODEL.md §2 records 테이블 전체 컬럼
 *
 * 주요 규칙:
 * - axisX, axisY: 0~100 범위 (DECIMAL(5,2))
 * - satisfaction: 1~100 정수
 * - 와인 전용 필드: aroma*, complexity, finish, balance, autoScore, pairingCategories, purchasePrice, wineStatus, cameraMode, ocrData
 * - 식당 전용 필드: totalPrice
 * - companions: 비공개 (본인만 열람, API/버블/프로필 외부 노출 절대 금지)
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

  /** 'checked' | 'rated' | 'draft' (기본값: 'rated') */
  status: RecordStatus

  /** 와인 3분류: 'tasted' | 'cellar' | 'wishlist' (target_type='wine'일 때만) */
  wineStatus: WineStatus | null

  // ─── 카메라 모드 메타데이터 (와인 전용) ───

  /** 'individual' | 'shelf' | 'receipt' */
  cameraMode: CameraMode | null

  /**
   * 카메라 모드별 OCR 인식 결과 (JSONB)
   * - individual: { wine_name: string, vintage: string, producer: string }
   * - shelf: { wines: Array<{ name: string, price: number }> }
   * - receipt: { items: Array<{ name: string, price: number, qty: number }>, total: number }
   */
  ocrData: Record<string, unknown> | null

  // ─── 사분면 ───

  /** X축: 0~100 (식당: 음식 퀄리티, 와인: 구조·완성도) — DECIMAL(5,2) */
  axisX: number | null

  /** Y축: 0~100 (식당: 경험 가치, 와인: 즐거움·감성) — DECIMAL(5,2) */
  axisY: number | null

  /** 만족도: 1~100 — INT */
  satisfaction: number | null

  /** 상황 태그 — VARCHAR(20) */
  scene: string | null

  // ─── 와인 전용 ───

  /** 향 팔레트 칠한 영역 데이터 (JSONB) */
  aromaRegions: Record<string, unknown> | null

  /** 자동 추출된 향 라벨 (TEXT[]) — 예: ['시트러스', '열대과일', '바닐라'] */
  aromaLabels: string[] | null

  /** 점 대표 색상 hex — VARCHAR(7) — 예: '#fde047' */
  aromaColor: string | null

  /** 복합성: 0~100 — INT */
  complexity: number | null

  /** 여운: 0~100 — DECIMAL(5,2) */
  finish: number | null

  /** 균형: 0~100 — DECIMAL(5,2) */
  balance: number | null

  /** 자동 산출 만족도 — INT */
  autoScore: number | null

  // ─── 확장 (선택) ───

  /** 한줄평: 최대 200자 — VARCHAR(200) */
  comment: string | null

  /** 추천 메뉴/페어링 메모 — TEXT[] */
  menuTags: string[] | null

  /** WSET 페어링 카테고리 (와인 전용) — TEXT[] */
  pairingCategories: PairingCategory[] | null

  /** 사용팁 — TEXT */
  tips: string | null

  /**
   * 함께 간 사람 — TEXT[]
   * ⚠️ 무조건 비공개: 본인만 열람
   * API, 버블, 프로필 등 외부 노출 절대 금지
   */
  companions: string[] | null

  /** 동반자 수 (1=혼자, 2, 3, 4, 5+) — 필터/통계용, 비공개 아님 */
  companionCount: number | null

  /**
   * 개인 메모 — TEXT
   * ⚠️ 무조건 비공개: 본인만 열람
   * companions와 동일하게 외부 노출 절대 금지
   */
  privateNote: string | null

  /** 식당 1인 결제 금액 (원) — INT (총액 아님, 본인 지불 금액) */
  totalPrice: number | null

  /** 와인 구매/병 단가 (원) — INT */
  purchasePrice: number | null

  // ─── 날짜 ───

  /** 방문/음용 날짜 (wine_status='cellar'일 때는 구매 날짜) — ISO date string */
  visitDate: string | null

  /** 'breakfast' | 'lunch' | 'dinner' | 'snack' — 캘린더 뷰 시간대 라벨 */
  mealTime: MealTime | null

  // ─── 연결 ───

  /** 와인 기록의 식당 연결 — FK → restaurants.id */
  linkedRestaurantId: string | null

  /** 식당 기록의 와인 연결 — FK → wines.id */
  linkedWineId: string | null

  /** EXIF GPS 존재 여부 */
  hasExifGps: boolean

  /** GPS가 식당 위치 반경 200m 이내일 때 true */
  isExifVerified: boolean

  /** 이 기록으로 획득한 총 XP (비정규화) */
  recordQualityXp: number

  /** 만족도 점수 마지막 부여 시점 (6개월 제한 기준) — ISO datetime */
  scoreUpdatedAt: string | null

  /** 생성 시각 — ISO datetime */
  createdAt: string

  /** 수정 시각 — ISO datetime */
  updatedAt: string
}

// ─── 팩토리 함수 ───

/**
 * DiningRecord 기본값 생성 (신규 기록 초기 상태)
 * infrastructure에서 DB insert 전에 사용
 */
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
    axisX: null,
    axisY: null,
    satisfaction: null,
    scene: null,
    aromaRegions: null,
    aromaLabels: null,
    aromaColor: null,
    complexity: null,
    finish: null,
    balance: null,
    autoScore: null,
    comment: null,
    menuTags: null,
    pairingCategories: null,
    tips: null,
    companions: null,
    companionCount: null,
    privateNote: null,
    totalPrice: null,
    purchasePrice: null,
    visitDate: null,
    mealTime: null,
    linkedRestaurantId: null,
    linkedWineId: null,
    hasExifGps: false,
    isExifVerified: false,
    recordQualityXp: 0,
    scoreUpdatedAt: null,
  }
}

// ─── 대상(식당/와인) 정보 포함 기록 ───

/**
 * DiningRecord + 대상(식당/와인) 메타데이터
 * 홈 화면 등에서 JOIN 결과로 사용
 * R1 준수: 외부 의존 없는 순수 타입
 */
export type RecordSource = 'mine' | 'following' | 'bubble'

export interface RecordWithTarget extends DiningRecord {
  /** 대상 이름 (restaurants.name 또는 wines.name) */
  targetName: string
  /** 대상 장르/품종 (restaurants.genre 또는 wines.variety) */
  targetMeta: string | null
  /** 대상 지역 (restaurants.area 또는 wines.region) */
  targetArea: string | null
  /** 대상 대표 사진 URL */
  targetPhotoUrl: string | null
  /** 대상 위도 (restaurants.lat) */
  targetLat: number | null
  /** 대상 경도 (restaurants.lng) */
  targetLng: number | null
  /** 가상 속성: 레코드 소스 (mine=내 기록, following=팔로잉 유저 기록) */
  source?: RecordSource
  // ─── 필터용 대상 속성 (식당) ───
  genre?: string | null
  area?: string | null
  priceRange?: number | null
  michelinStars?: number | null
  hasBlueRibbon?: boolean | null
  mediaAppearances?: string[] | null
  // ─── 필터용 대상 속성 (와인) ───
  wineType?: string | null
  variety?: string | null
  country?: string | null
  region?: string | null
  vintage?: number | null
}

// ─── 기록 생성 입력 타입 ───

/**
 * 기록 생성 시 전달하는 입력 데이터
 * RecordRepository.create()의 파라미터 타입
 */
export interface CreateRecordInput {
  userId: string
  targetId: string
  targetType: RecordTargetType
  status: RecordStatus
  wineStatus?: WineStatus | null
  cameraMode?: CameraMode | null
  axisX?: number | null
  axisY?: number | null
  satisfaction?: number | null
  scene?: string | null
  aromaRegions?: Record<string, unknown> | null
  aromaLabels?: string[] | null
  aromaColor?: string | null
  complexity?: number | null
  finish?: number | null
  balance?: number | null
  autoScore?: number | null
  comment?: string | null
  menuTags?: string[] | null
  pairingCategories?: PairingCategory[] | null
  tips?: string | null
  companions?: string[] | null
  companionCount?: number | null
  privateNote?: string | null
  totalPrice?: number | null
  purchasePrice?: number | null
  visitDate?: string | null
  mealTime?: MealTime | null
  linkedRestaurantId?: string | null
  linkedWineId?: string | null
  hasExifGps?: boolean
  isExifVerified?: boolean
}
