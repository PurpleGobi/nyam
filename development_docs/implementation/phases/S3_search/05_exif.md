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

**브라우저 환경에서 File 객체의 EXIF 메타데이터 파싱.** piexifjs 대신 자체 바이너리 파싱으로 외부 의존 최소화.

```typescript
// src/shared/utils/exif-parser.ts

/** EXIF 파싱 결과 */
export interface ExifData {
  /** GPS 좌표 */
  gps: {
    latitude: number
    longitude: number
  } | null
  /** 촬영 시각 (ISO string) */
  capturedAt: string | null
  /** 원본 EXIF에 GPS 정보가 존재하는지 */
  hasGps: boolean
}

/**
 * File 객체에서 EXIF 메타데이터 추출
 * GPS 좌표 + 촬영 시각만 추출 (최소 파싱)
 */
export async function parseExifFromFile(file: File): Promise<ExifData> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer
        const result = extractExifFromBuffer(arrayBuffer)
        resolve(result)
      } catch {
        resolve({ gps: null, capturedAt: null, hasGps: false })
      }
    }

    reader.onerror = () => {
      resolve({ gps: null, capturedAt: null, hasGps: false })
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * base64 문자열에서 EXIF 추출
 */
export async function parseExifFromBase64(base64: string): Promise<ExifData> {
  try {
    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    return extractExifFromBuffer(bytes.buffer)
  } catch {
    return { gps: null, capturedAt: null, hasGps: false }
  }
}

/**
 * ArrayBuffer에서 EXIF GPS + DateTimeOriginal 추출
 * JPEG EXIF IFD 바이너리 파싱 (최소 구현)
 */
function extractExifFromBuffer(buffer: ArrayBuffer): ExifData {
  const view = new DataView(buffer)
  let offset = 0

  // JPEG SOI 마커 확인 (0xFFD8)
  if (view.getUint16(0) !== 0xFFD8) {
    return { gps: null, capturedAt: null, hasGps: false }
  }
  offset = 2

  let gpsLatitude: number | null = null
  let gpsLongitude: number | null = null
  let capturedAt: string | null = null

  // APP1 마커 (0xFFE1) 탐색
  while (offset < view.byteLength - 2) {
    const marker = view.getUint16(offset)

    if (marker === 0xFFE1) {
      // EXIF 데이터 발견
      const length = view.getUint16(offset + 2)
      const exifOffset = offset + 4

      // "Exif\0\0" 시그니처 확인
      if (
        view.getUint8(exifOffset) === 0x45 &&  // E
        view.getUint8(exifOffset + 1) === 0x78 && // x
        view.getUint8(exifOffset + 2) === 0x69 && // i
        view.getUint8(exifOffset + 3) === 0x66    // f
      ) {
        const tiffOffset = exifOffset + 6
        const isLittleEndian = view.getUint16(tiffOffset) === 0x4949

        // IFD0 파싱 → GPS IFD 오프셋, DateTimeOriginal 추출
        const parsed = parseTiffIfd(view, tiffOffset, isLittleEndian)
        gpsLatitude = parsed.latitude
        gpsLongitude = parsed.longitude
        capturedAt = parsed.dateTimeOriginal
      }

      break  // 첫 번째 EXIF 블록만 처리
    }

    // 다음 마커로 이동
    if ((marker & 0xFF00) === 0xFF00) {
      offset += 2 + view.getUint16(offset + 2)
    } else {
      break
    }
  }

  const hasGps = gpsLatitude !== null && gpsLongitude !== null

  return {
    gps: (hasGps && gpsLatitude !== null && gpsLongitude !== null)
      ? { latitude: gpsLatitude, longitude: gpsLongitude }
      : null,
    capturedAt,
    hasGps,
  }
}

/** 간략화된 TIFF IFD 파싱 (GPS + DateTimeOriginal만 추출) */
function parseTiffIfd(
  view: DataView,
  tiffOffset: number,
  isLittleEndian: boolean
): { latitude: number | null; longitude: number | null; dateTimeOriginal: string | null } {
  // 실제 구현에서는 TIFF IFD 구조를 따라
  // Tag 0x8825 (GPSInfo) → GPS IFD → Tag 0x0002 (GPSLatitude), 0x0004 (GPSLongitude)
  // Tag 0x8769 (ExifIFD) → Tag 0x9003 (DateTimeOriginal)
  // 를 바이너리 파싱합니다.
  //
  // 이 부분은 구현 시 piexifjs 또는 exif-reader 라이브러리 사용을 권장합니다.
  // 아래는 라이브러리 없는 최소 구현 스켈레톤입니다.

  // TODO: S3 구현 시 piexifjs 의존성 추가 또는 자체 바이너리 파싱 완성
  // 현재는 null 반환 (런타임에서 라이브러리 로드)
  return {
    latitude: null,
    longitude: null,
    dateTimeOriginal: null,
  }
}

/**
 * DMS (도/분/초) → DD (소수점) 변환
 * EXIF GPS 좌표는 DMS 형식으로 저장됨
 */
export function dmsToDecimal(
  degrees: number,
  minutes: number,
  seconds: number,
  ref: 'N' | 'S' | 'E' | 'W'
): number {
  const decimal = degrees + minutes / 60 + seconds / 3600
  return ref === 'S' || ref === 'W' ? -decimal : decimal
}
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
  /** 경고 메시지 (1개월+ 사진일 때) */
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
export function validateExif(params: {
  photoGps: { latitude: number; longitude: number } | null
  targetLat: number | null
  targetLng: number | null
  capturedAt: string | null
  now?: Date
}): ExifValidationResult {
  const { photoGps, targetLat, targetLng, capturedAt, now = new Date() } = params

  // GPS 없음
  if (!photoGps) {
    return {
      hasGps: false,
      isWithinRadius: false,
      daysSinceCaptured: calculateDaysSince(capturedAt, now),
      isOldPhoto: isPhotoOlderThanDays(capturedAt, 30, now),
      warningMessage: generateWarningMessage(capturedAt, now),
    }
  }

  // 식당 좌표 없음 (DB에 lat/lng 미등록)
  if (targetLat === null || targetLng === null) {
    return {
      hasGps: true,
      isWithinRadius: false,
      daysSinceCaptured: calculateDaysSince(capturedAt, now),
      isOldPhoto: isPhotoOlderThanDays(capturedAt, 30, now),
      warningMessage: generateWarningMessage(capturedAt, now),
    }
  }

  // 거리 계산 (Haversine)
  const distanceMeters = haversineDistance(
    photoGps.latitude,
    photoGps.longitude,
    targetLat,
    targetLng
  )

  // 반경 200m 이내 판정
  const RADIUS_METERS = 200
  const isWithinRadius = distanceMeters <= RADIUS_METERS

  return {
    hasGps: true,
    isWithinRadius,
    daysSinceCaptured: calculateDaysSince(capturedAt, now),
    isOldPhoto: isPhotoOlderThanDays(capturedAt, 30, now),
    warningMessage: generateWarningMessage(capturedAt, now),
  }
}

/**
 * Haversine 거리 계산 (미터)
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // 지구 반경 (m)
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * 촬영일~현재 경과 일수
 */
function calculateDaysSince(capturedAt: string | null, now: Date): number | null {
  if (!capturedAt) return null
  const captured = new Date(capturedAt)
  if (isNaN(captured.getTime())) return null
  const diffMs = now.getTime() - captured.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * 사진이 N일 이상 된 것인지
 */
function isPhotoOlderThanDays(
  capturedAt: string | null,
  days: number,
  now: Date
): boolean {
  const daysSince = calculateDaysSince(capturedAt, now)
  if (daysSince === null) return false
  return daysSince >= days
}

/**
 * SEARCH_REGISTER.md §8: "N개월 전 사진이네요"
 */
function generateWarningMessage(capturedAt: string | null, now: Date): string | null {
  const daysSince = calculateDaysSince(capturedAt, now)
  if (daysSince === null || daysSince < 30) return null

  const months = Math.floor(daysSince / 30)
  if (months < 1) return null
  return `${months}개월 전 사진이네요`
}
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
│  │   ├─ isOldPhoto=true → 경고 "N개월 전 사진이네요"
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
□ 1개월+ 사진: "N개월 전 사진이네요" 경고 메시지
□ TypeScript strict: any/as any/@ts-ignore/! 0개
□ 단위 테스트: validateExif 각 케이스
```
