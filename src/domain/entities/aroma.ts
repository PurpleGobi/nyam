// src/domain/entities/aroma.ts
// R1: 외부 의존 0

/**
 * 아로마 섹터 ID (16개, WSET Level 3 기준)
 *
 * Ring 1 (1차향 — 포도 유래, 바깥, 9섹터): citrus ~ herb
 * Ring 2 (2차향 — 양조 유래, 중간, 4섹터): butter ~ toast
 * Ring 3 (3차향 — 숙성 유래, 안쪽, 3섹터): leather ~ nut
 */
export type AromaSectorId =
  // Ring 1 — 1차향 (포도 유래)
  | 'citrus'        // 시트러스
  | 'apple_pear'    // 사과/배
  | 'tropical'      // 열대과일
  | 'stone_fruit'   // 핵과
  | 'red_berry'     // 붉은베리
  | 'dark_berry'    // 검은베리
  | 'floral'        // 꽃
  | 'white_floral'  // 흰꽃
  | 'herb'          // 허브/채소
  // Ring 2 — 2차향 (양조 유래)
  | 'butter'        // 버터/크림 (MLF)
  | 'vanilla'       // 바닐라/삼나무 (오크)
  | 'spice'         // 정향/계피 (오크 향신료)
  | 'toast'         // 토스트/훈연 (효모/오크)
  // Ring 3 — 3차향 (숙성 유래)
  | 'leather'       // 가죽/담배
  | 'earth'         // 흙/버섯
  | 'nut'           // 견과/건과일

/** 아로마 링 번호 */
export type AromaRing = 1 | 2 | 3

/**
 * 아로마 섹터 메타데이터 (정적 상수)
 */
export interface AromaSectorMeta {
  id: AromaSectorId
  ring: AromaRing
  nameKo: string
  nameEn: string
  hex: string
}

/**
 * 아로마 선택 값 객체
 * DB: records.aroma_primary (TEXT[]), records.aroma_secondary (TEXT[]), records.aroma_tertiary (TEXT[])
 */
export interface AromaSelection {
  /** 1차향 선택된 섹터 ID 배열 (Ring 1) */
  primary: AromaSectorId[]
  /** 2차향 선택된 섹터 ID 배열 (Ring 2) */
  secondary: AromaSectorId[]
  /** 3차향 선택된 섹터 ID 배열 (Ring 3) */
  tertiary: AromaSectorId[]
}
