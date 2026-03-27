// src/domain/entities/aroma.ts
// R1: 외부 의존 0

/**
 * 아로마 섹터 ID (15개)
 * RATING_ENGINE.md §8 아로마 팔레트
 *
 * Ring 1 (1차향, 바깥, 8섹터): citrus ~ white_floral
 * Ring 2 (2차향, 중간, 4섹터): butter ~ herb
 * Ring 3 (3차향, 안쪽, 3섹터): leather ~ nut
 */
export type AromaSectorId =
  // Ring 1 — 1차향 (과일/꽃)
  | 'citrus'        // 12시, 시트러스, #fde047
  | 'apple_pear'    // 1시, 사과/배, #a3e635
  | 'tropical'      // 2시, 열대과일, #fb923c
  | 'stone_fruit'   // 3시, 핵과, #fda4af
  | 'red_berry'     // 4시, 붉은베리, #f87171
  | 'dark_berry'    // 5시, 검은베리, #a855f7
  | 'floral'        // 6시, 꽃, #f472b6
  | 'white_floral'  // 7시, 흰꽃, #fef3c7
  // Ring 2 — 2차향 (발효/숙성)
  | 'butter'        // 8시, 버터/브리오슈, #fde68a
  | 'vanilla'       // 9시, 바닐라/토스트, #d97706
  | 'spice'         // 10시, 향신료, #991b1b
  | 'herb'          // 11시, 허브, #4ade80
  // Ring 3 — 3차향 (숙성)
  | 'leather'       // 중앙-좌, 가죽/담배, #78350f
  | 'earth'         // 중앙-우, 흙/미네랄, #78716c
  | 'nut'           // 중앙-하, 견과/초콜릿, #92400e

/** 아로마 링 번호 */
export type AromaRing = 1 | 2 | 3

/**
 * 아로마 섹터 메타데이터 (정적 상수)
 */
export interface AromaSectorMeta {
  id: AromaSectorId
  ring: AromaRing
  position: string
  nameKo: string
  nameEn: string
  hex: string
}

/**
 * 아로마 팔레트 선택 값 객체
 * records.aroma_regions (JSONB), records.aroma_labels (TEXT[]), records.aroma_color (VARCHAR(7))
 */
export interface AromaSelection {
  /**
   * 활성화된 섹터 ID → 활성화 상태
   * 예: { citrus: true, tropical: true, vanilla: true }
   * JSONB로 records.aroma_regions에 저장
   */
  regions: Partial<globalThis.Record<AromaSectorId, boolean>>

  /**
   * 선택된 섹터의 한국어 이름 배열 (자동 추출)
   * 예: ['시트러스', '열대과일', '바닐라']
   * records.aroma_labels에 저장
   */
  labels: string[]

  /**
   * 선택 영역의 가중 평균 hex 색상
   * records.aroma_color에 저장
   * null = 아무것도 선택 안 함
   */
  color: string | null
}
