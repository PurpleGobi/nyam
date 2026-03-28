# S3-T05: 사진 EXIF GPS 검증

> 사진 EXIF 메타데이터에서 GPS 좌표/촬영 시각 추출 → 식당 좌표와 반경 200m 비교 → is_exif_verified 결정 → XP 차등 적용

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `systems/XP_SYSTEM.md` | §9 EXIF 검증 로직 | 반경 200m, GPS 없으면 사진 XP 부여 + 배지 없음 |
| `systems/XP_SYSTEM.md` | §4-1 기록 XP | 이름만=0, 사분면=+3, 사진(EXIF검증)=+8, 풀기록=+18 |
| `systems/XP_SYSTEM.md` | §6-1 다층 방어 체계 | EXIF GPS 검증 (반경 200m) |
| `pages/01_SEARCH_REGISTER.md` | §8 예외 처리 | EXIF 없음→검색 폴백, 1개월+→"N개월 전 사진" |
| `systems/DATA_MODEL.md` | records 테이블 | `has_exif_gps`, `is_exif_verified`, `record_quality_xp` |
| `systems/DATA_MODEL.md` | restaurants 테이블 | `lat`, `lng` |

---

## 선행 조건

- S1-T01 (DB 스키마) 완료 — records.has_exif_gps, is_exif_verified 컬럼 존재
- S3-T01 (카메라 AI) 완료 — 촬영된 이미지에서 EXIF 추출 연동

---

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/shared/utils/exif-parser.ts` | shared | EXIF 메타데이터 파싱 (GPS, 날짜) |
| `src/domain/services/exif-validator.ts` | domain | GPS 좌표 비교 + 시간 검증 로직 |

### 스코프 외

- XP 적립 DB 기록 (xp_histories INSERT, users.total_xp UPDATE) — S6에서 구현
- 프로필 "검증됨" 배지 표시 — S6에서 구현
- EXIF 위조 탐지 — Phase 2

---

## 상세 구현 지침

### 1. `src/shared/utils/exif-parser.ts`

**브라우저 환경에서 File 객체의 EXIF 메타데이터 파싱.** 외부 라이브러리 없이 자체 바이너리 파싱으로 구현 완료.

> **설계 변경 사항**: 초기 설계에서는 `parseTiffIfd`가 TODO 스켈레톤이었으나, 실제 구현에서는 외부 라이브러리 없이 완전히 구현됨.
> 내부 함수명도 단순화: `extractExifFromBuffer` → `parseExifBuffer`, `parseTiffIfd` → `parseTiff`, `dmsToDecimal` private화.
> `extractExifFromFile`은 FileReader 대신 `file.arrayBuffer()` 사용 (더 현대적).

```typescript
// src/shared/utils/exif-parser.ts (실제 구현 시그니처)

export interface ExifData {
  gps: { latitude: number; longitude: number } | null
  capturedAt: string | null
  hasGps: boolean
}

/** File 객체에서 EXIF 추출 */
export async function extractExifFromFile(file: File): Promise<ExifData>

/** base64 문자열에서 EXIF 추출 */
export async function parseExifFromBase64(base64: string): Promise<ExifData>

// 내부 함수 (private):
// parseExifBuffer(buffer: ArrayBuffer): ExifData
// parseTiff(view: DataView, tiffOffset: number, le: boolean): {...}
// dmsToDecimal(d: number, m: number, s: number, ref: string): number
```

// 내부 구현: JPEG SOI(0xFFD8) → APP1(0xFFE1) → TIFF IFD 파싱 → GPS/DateTimeOriginal 추출
// 실제 코드: parseExifBuffer(), parseTiff(), dmsToDecimal() — 외부 라이브러리 없이 완전 구현
// 상세 구현은 src/shared/utils/exif-parser.ts 참조
```

### 2. `src/domain/services/exif-validator.ts`

**R1 준수**: 순수 도메인 로직. 외부 의존 0.

```typescript
// src/domain/services/exif-validator.ts
// R1: 외부 의존 0

/** EXIF 검증 결과 */
export interface ExifValidationResult {
  /** GPS 좌표 존재 여부 */
  hasGps: boolean
  /** 반경 200m 이내 여부 (GPS 있을 때만 true 가능) */
  isWithinRadius: boolean
  /** 사진 촬영일과 현재 간 차이 (일) */
  daysSinceCaptured: number | null
  /** 1개월(30일) 이상 된 사진인지 */
  isOldPhoto: boolean
  /** 경고 메시지 (7일+ 사진일 때)
   * - 30일 이상: "N개월 전 사진이네요"
   * - 7~29일: "N일 전 사진이네요"
   * - 7일 미만: null
   */
  warningMessage: string | null
}

/**
 * EXIF GPS 검증
 * XP_SYSTEM.md §9: 반경 200m 이내 → is_exif_verified=true
 *
 * @param photoGps 사진 EXIF GPS 좌표
 * @param targetLat 식당/와인바 위도
 * @param targetLng 식당/와인바 경도
 * @param capturedAt 사진 촬영 시각 (ISO string)
 */
export function validateExifGps(
  photoGps: { latitude: number; longitude: number } | null,
  targetLat: number | null,
  targetLng: number | null,
  capturedAt: string | null,
  radiusMeters: number = 200,
): ExifValidationResult {
  const now = new Date()

  // GPS 없음 → hasGps: false 반환
  // 식당 좌표 없음 → hasGps: true, isWithinRadius: false
  // 거리 계산 (Haversine) → 반경 200m 이내 판정
  // daysSinceCaptured, isOldPhoto, warningMessage 모두 인라인 계산
  // 상세 구현: src/domain/services/exif-validator.ts 참조
}

// 내부 함수: haversineDistance(), daysSinceCaptured/isOldPhoto/warningMessage (인라인 계산)
// 설계 변경: 보조 함수(toRadians, calculateDaysSince, isPhotoOlderThanDays, generateWarningMessage)는
// 실제 구현에서 validateExifGps() 내부에 인라인 처리됨.
// 경고 메시지 분기:
//   daysSinceCaptured >= 30 → "N개월 전 사진이네요" (Math.floor(days / 30)개월)
//   daysSinceCaptured >= 7  → "N일 전 사진이네요"
//   그 외 → warningMessage: null
```

### 3. XP 계산 — S6 위임

> **참고**: XP 계산 로직은 S6(01_xp_engine.md)에서 `src/domain/services/xp-calculator.ts`에 정의한다. 이 태스크에서는 EXIF 검증 결과(`is_exif_verified`)를 `records` 테이블에 저장하는 것까지만 담당하며, XP 적립은 S6의 XP 엔진이 기록 저장 후 자동으로 수행한다.

---

## 데이터 흐름

```
┌─ 사진 촬영/앨범 선택
│
├─ parseExifFromFile(file) 또는 parseExifFromBase64(base64)
│  └─ ExifData: { gps: {lat, lng} | null, capturedAt: string | null, hasGps: boolean }
│
├─ EXIF 데이터 → AI 인식 요청에 포함
│  └─ POST /api/records/identify { latitude, longitude, capturedAt }
│
├─ 기록 저장 시:
│  ├─ validateExif({
│  │     photoGps: exif.gps,
│  │     targetLat: restaurant.lat,
│  │     targetLng: restaurant.lng,
│  │     capturedAt: exif.capturedAt
│  │   })
│  │   ├─ isWithinRadius=true → records.is_exif_verified=true
│  │   ├─ isWithinRadius=false → records.is_exif_verified=false (사진 XP는 정상)
│  │   ├─ warningMessage 있음 → record-flow-container의 exifWarning state에 저장
│  │   │     → RecordSuccess 컴포넌트에 prop으로 전달하여 화면에 표시
│  │   └─ hasGps=false → records.has_exif_gps=false
│  │
│  └─ records INSERT:
│      ├─ has_exif_gps: boolean
│      ├─ is_exif_verified: boolean
│      └─ record_quality_xp: number (0|3|8|18)
│
└─ XP 적립 (S6에서 구현):
   ├─ xp_histories INSERT (reason='record_score'|'record_photo'|'record_full')
   ├─ users.total_xp += record_quality_xp
   ├─ user_experiences (axis_type='area'|'genre') += 5 (종합 미포함)
   └─ 레벨 체크 → 알림
```

---

## 검증 체크리스트

```
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
□ R1: domain/services/exif-validator.ts에 외부 import 없음
□ EXIF GPS 추출: JPEG 파일에서 GPS 좌표 파싱
□ 반경 200m 판정: haversineDistance 정확도 검증
□ is_exif_verified=true: GPS 존재 + 반경 200m 이내
□ is_exif_verified=false: GPS 없음 or 불일치 (사진 XP는 정상)
□ 30일+ 사진: "N개월 전 사진이네요" 경고 메시지
□ 7~29일 사진: "N일 전 사진이네요" 경고 메시지
□ record-flow-container: validation.warningMessage → exifWarning state → RecordSuccess에 전달
□ TypeScript strict: any/as any/@ts-ignore/! 0개
□ 단위 테스트: validateExif 각 케이스
```
