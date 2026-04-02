# S3-T01: 카메라 촬영 + AI 인식

> FAB(+) → 현재 탭 기반 카메라 화면 → 촬영/앨범 → Gemini Vision AI 인식 → 식당명/와인명 추출 → 기록 화면 pre-fill

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `pages/01_SEARCH_REGISTER.md` | §2 식당 카메라 화면, §4 와인 카메라 화면 | 카메라 UI 레이아웃, 진입 경로, AI 인식 분기 |
| `pages/01_SEARCH_REGISTER.md` | §4 OCR 인식 데이터 | `records.ocr_data` JSONB 구조 (individual/shelf/receipt) |
| `pages/01_SEARCH_REGISTER.md` | §5 와인 확인 화면 | `screen-add-wine-confirm` 레이아웃, 동작 |
| `pages/05_RECORD_FLOW.md` | §2 진입점 | FAB(+) → 현재 탭 기반 직접 진입 (바텀시트 없음) |
| `pages/05_RECORD_FLOW.md` | §3 Step 1 | 식당 카메라 화면 (screen-add-restaurant) |
| `pages/05_RECORD_FLOW.md` | §4 Step 1 | 와인 카메라 화면 (screen-add-wine) |
| `systems/RATING_ENGINE.md` | §9 EXIF GPS | EXIF 추출 → GPS 교차 매칭 |
| `systems/DATA_MODEL.md` | records 테이블 | `camera_mode`, `ocr_data` 컬럼 |
| `systems/DATA_MODEL.md` | restaurants 테이블 | `lat`, `lng`, `genre`, `external_ids` |
| `systems/DATA_MODEL.md` | wines 테이블 | `name`, `producer`, `vintage`, `wine_type` |
| `prototype/01_home.html` | `screen-add-restaurant`, `screen-add-wine` | 비주얼 레퍼런스 |

---

## 선행 조건

- S1-T01 (DB 스키마 마이그레이션) 완료 — restaurants, wines, records 테이블 존재
- S1-T02 (인증) 완료 — 인증된 사용자만 기록 생성 가능
- S1-T03 (디자인 토큰) 완료 — `--accent-food`, `--accent-wine` CSS 변수 사용 가능
- S2 (Core Recording) 완료 — `DiningRecord` 엔티티, `RecordRepository`, `CreateRecordInput` 타입 존재

---

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/domain/entities/camera.ts` | domain | CameraMode, OcrData 타입, AIRecognitionResult 인터페이스 |
| `src/domain/services/ai-recognition.ts` | domain | AI 인식 결과 → 매칭 로직 인터페이스 |
| `src/shared/constants/llm-config.ts` | shared | LLM provider + model 중앙 설정 (사용처별: vision, text) |
| `src/infrastructure/api/llm.ts` | infrastructure | LLM 호출 추상화 (`callVision`, `callText` — provider 선택은 llm-config 기반) |
| `src/infrastructure/api/ai-recognition.ts` | infrastructure | AI 인식 로직 — 프롬프트 + 응답 파싱 (`llm.ts` 경유) |
| `src/app/api/records/identify/route.ts` | app | API route: 이미지 → AI 인식 → 후보 반환 |
| `src/application/hooks/use-camera-capture.ts` | application | 카메라 촬영/앨범 선택 + AI 인식 호출 |
| `src/presentation/components/camera/camera-capture.tsx` | presentation | 카메라 뷰파인더 + 촬영 버튼 |
| `src/presentation/components/camera/ai-result-display.tsx` | presentation | AI 인식 결과 표시 (후보 목록) |
| `src/presentation/components/camera/wine-confirm-card.tsx` | presentation | 와인 확인 화면 (screen-add-wine-confirm) |

> **구현 시 변경 사항**: `album-picker.tsx`와 `camera-container.tsx`는 별도 파일로 분리되지 않고 `add-flow-container.tsx`에 통합됨. `useCameraCapture` hook이 앨범 선택 로직을 포함하고, 카메라/AI/와인컨펌 step 렌더링을 `AddFlowContainer` 내부에서 직접 처리.

### 스코프 외

- EXIF GPS 추출/검증 — `05_exif.md`에서 구현
- 검색 UI — `02_search_ui.md`에서 구현
- 기록 화면 (screen-rest-record, screen-wine-record) — S2에서 구현 완료
- 넛지 사진 선택 (screen-nudge-photo-picker) — S5에서 구현
- 사진 업로드/저장 — S2-T08에서 구현 완료

---

## 상세 구현 지침

### 1. `src/domain/entities/camera.ts`

**R1 준수**: 순수 TypeScript 타입만. 외부 의존 0.

```typescript
// src/domain/entities/camera.ts
// R1: React, Supabase, Next.js import 금지

import type { CameraMode } from '@/domain/entities/record'

// ─── OCR 데이터 구조 (DATA_MODEL.md records.ocr_data) ───

/** individual 모드 OCR 결과 */
export interface IndividualOcrData {
  wine_name: string
  vintage: string | null
  producer: string | null
}

/** shelf 모드 OCR 결과 */
export interface ShelfOcrData {
  wines: Array<{
    name: string
    price: number | null
  }>
}

/** receipt 모드 OCR 결과 */
export interface ReceiptOcrData {
  items: Array<{
    name: string
    price: number | null
    qty: number
  }>
  total: number | null
}

/** records.ocr_data JSONB 타입 (카메라 모드별 분기) */
export type OcrData = IndividualOcrData | ShelfOcrData | ReceiptOcrData

// ─── AI 인식 결과 ───

/** 식당 AI 인식 결과 */
export interface RestaurantAIResult {
  targetType: 'restaurant'
  /** AI가 인식한 음식 장르 (예: '일식', '중식') */
  detectedGenre: string | null
  /** AI가 인식한 식당명 (간판 촬영 시) */
  detectedName: string | null
  /** GPS 기반 매칭 후보 */
  candidates: RestaurantCandidate[]
  /** 확실한 매칭 여부 (후보 1개 + 높은 신뢰도) */
  isConfidentMatch: boolean
}

export interface RestaurantCandidate {
  restaurantId: string
  name: string
  genre: string | null
  area: string | null
  distance: number | null  // meters
  matchScore: number       // 0~1 (GPS+장르 교차 매칭 점수)
}

/** 와인 AI 인식 결과 */
export interface WineAIResult {
  targetType: 'wine'
  /** OCR로 추출한 와인 정보 */
  ocrData: IndividualOcrData
  /** DB 매칭 후보 */
  candidates: WineCandidate[]
  /** 확실한 매칭 여부 */
  isConfidentMatch: boolean
  /** 카메라 모드 */
  cameraMode: CameraMode
}

export interface WineCandidate {
  wineId: string
  name: string
  producer: string | null
  vintage: number | null
  wineType: string  // 'red' | 'white' | 'rose' | ...
  region: string | null
  country: string | null
  matchScore: number  // 0~1
}

/** AI 인식 결과 유니온 */
export type AIRecognitionResult = RestaurantAIResult | WineAIResult

// ─── API 요청/응답 ───

export interface IdentifyRequest {
  /** 이미지 URL (Supabase Storage 등에 업로드 후 URL 전달) */
  imageUrl: string
  /** 식당 or 와인 */
  targetType: 'restaurant' | 'wine'
  /** 와인 카메라 모드 (와인일 때만) */
  cameraMode?: CameraMode
  /** GPS 좌표 (EXIF에서 추출, 있으면) */
  latitude?: number
  longitude?: number
  /** EXIF 촬영 시각 */
  capturedAt?: string
}

export interface IdentifyResponse {
  success: boolean
  result: AIRecognitionResult | null
  error?: string
  /** shelf 모드 OCR 결과 (cameraMode='shelf'일 때만 포함) */
  shelfData?: ShelfOcrData
  /** receipt 모드 OCR 결과 (cameraMode='receipt'일 때만 포함) */
  receiptData?: ReceiptOcrData
}
```

### 2. `src/domain/services/ai-recognition.ts`

**R1 준수**: 순수 도메인 로직. GPS-장르 교차 매칭 점수 계산.

```typescript
// src/domain/services/ai-recognition.ts

import type { RestaurantCandidate } from '@/domain/entities/camera'

/**
 * GPS 반경 내 식당 후보와 AI 장르를 교차 매칭하여 최우선 순위 결정
 * SEARCH_REGISTER.md §2 "GPS + AI 교차 매칭" 로직
 *
 * 예: GPS 100m 내 [스시코우지(일식), 교대짬뽕(중식), 스타벅스(카페)]
 *     AI 분석 "일식/초밥류" → 스시코우지 matchScore 0.95
 */
export function rankCandidatesByGenreMatch(
  candidates: RestaurantCandidate[],
  detectedGenre: string | null
): RestaurantCandidate[] {
  if (!detectedGenre) {
    // 장르 인식 실패 → 거리순 정렬
    return [...candidates].sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
  }

  return [...candidates]
    .map((c) => ({
      ...c,
      matchScore: calculateMatchScore(c, detectedGenre),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
}

function calculateMatchScore(
  candidate: RestaurantCandidate,
  detectedGenre: string
): number {
  let score = 0

  // 장르 일치: 0.6
  if (candidate.genre && normalizeGenre(candidate.genre) === normalizeGenre(detectedGenre)) {
    score += 0.6
  }

  // 거리 근접: 0.4 (100m 이내 최고점, 200m까지 감소)
  if (candidate.distance !== null) {
    const distanceFactor = Math.max(0, 1 - candidate.distance / 200)
    score += distanceFactor * 0.4
  }

  return Math.min(score, 1)
}

/** 장르 문자열 정규화 (띄어쓰기/대소문자 무시) */
function normalizeGenre(genre: string): string {
  return genre.replace(/\s/g, '').toLowerCase()
}

/**
 * 확실한 매칭 판정: 최고 점수 후보가 0.7 이상이고, 2위와 0.2 이상 차이
 */
export function isConfidentMatch(candidates: RestaurantCandidate[]): boolean {
  if (candidates.length === 0) return false
  if (candidates.length === 1) return candidates[0].matchScore >= 0.5

  const sorted = [...candidates].sort((a, b) => b.matchScore - a.matchScore)
  return sorted[0].matchScore >= 0.7 && (sorted[0].matchScore - sorted[1].matchScore) >= 0.2
}
```

### 3. `src/infrastructure/api/ai-recognition.ts`

**AI 인식 로직 — 프롬프트 + 응답 파싱**. LLM provider 추상화 (`llm.ts` 경유). 서버 전용.

> **설계 변경 사항**:
> - `gemini.ts` → `ai-recognition.ts`로 리네임. LLM provider 직접 호출 대신 `callVision`/`callText` 추상 함수 사용 (`@/infrastructure/api/llm`)
> - `RestaurantRecognition`에 `searchKeywords: string[]` 필드 추가 — 카카오맵 검색용 키워드
> - `recognizeRestaurant(imageUrl)` — imageBase64 대신 imageUrl 수신
> - 프롬프트: "확실하지 않아도 최선의 추측", "not_food"는 음식과 전혀 무관한 사진에만
> - JSON 파싱 실패 시 텍스트 기반 폴백 (genreHints 매핑)
> - 와인 프롬프트: WSET 기반 대규모 제약조건 (country/region/sub_region/appellation/variety 정규화 목록)
> - `WineLabelRecognition` 확장 필드: `subRegion`, `appellation`, `variety`, `grapeVarieties`, `abv`, `classification`, `bodyLevel`, `acidityLevel`, `sweetnessLevel`, `foodPairings`, `servingTemp`, `decanting`, `referencePriceMin/Max`, `priceReview`, `drinkingWindowStart/End`, `vivinoRating`, `criticScores`, `tastingNotes`
> - `WineSearchCandidate` 타입 export — AI 텍스트 검색 결과용 (nameKo, labelImageUrl 포함)

```typescript
// src/infrastructure/api/ai-recognition.ts (실제 구현 시그니처)

import { callVision, callText } from '@/infrastructure/api/llm'

export interface RestaurantRecognition {
  foodType: string | null
  genre: string | null
  restaurantName: string | null
  searchKeywords: string[]        // 카카오맵 검색 키워드 (1~3개)
  confidence: number
}

export async function recognizeRestaurant(imageUrl: string): Promise<RestaurantRecognition>
export async function recognizeWineLabel(imageUrl: string): Promise<WineLabelRecognition>
export async function recognizeWineShelf(imageUrl: string): Promise<ShelfRecognition>
export async function recognizeWineReceipt(imageUrl: string): Promise<ReceiptRecognition>
export async function searchWineByText(query: string): Promise<WineSearchCandidate[]>
export async function getWineDetailByAI(name, producer, vintage): Promise<WineLabelRecognition>

/** AI 텍스트 검색 후보 (search-ai route에서 사용) */
export interface WineSearchCandidate {
  name: string
  nameKo: string | null
  producer: string | null
  vintage: number | null
  wineType: string | null
  region: string | null
  country: string | null
  labelImageUrl: string | null
}
```

// ─── 와인 라벨 OCR ───

const WINE_LABEL_PROMPT = `이 와인 라벨 사진을 분석해주세요. JSON으로 응답해주세요.
{
  "wine_name": "와인 이름",
  "producer": "생산자/와이너리 이름 (없으면 null)",
  "vintage": "빈티지 연도 (숫자, 없으면 null)",
  "region": "산지 (예: Bordeaux, Napa Valley)",
  "country": "국가 (예: France, Italy)",
  "wine_type": "red/white/rose/sparkling/orange/fortified/dessert 중 하나",
  "confidence": 0.0~1.0
}
와인 라벨이 아닌 사진이면 {"error": "not_wine_label"}로 응답.`

export interface WineLabelRecognition {
  wineName: string | null
  producer: string | null
  vintage: number | null
  region: string | null
  country: string | null
  wineType: string | null
  confidence: number
}

export async function recognizeWineLabel(imageBase64: string): Promise<WineLabelRecognition> {
  const response = await callGeminiVision({
    imageBase64,
    prompt: WINE_LABEL_PROMPT,
  })

  const parsed = safeJsonParse(response.text)

  if (parsed.error === 'not_wine_label') {
    throw new Error('NOT_WINE_LABEL')
  }

  return {
    wineName: parsed.wine_name ?? null,
    producer: parsed.producer ?? null,
    vintage: parsed.vintage ? Number(parsed.vintage) : null,
    region: parsed.region ?? null,
    country: parsed.country ?? null,
    wineType: parsed.wine_type ?? null,
    confidence: parsed.confidence ?? 0,
  }
}

// ─── 와인 진열장 OCR ───

const WINE_SHELF_PROMPT = `이 와인 진열장/매장 사진에서 보이는 와인들을 인식해주세요. JSON으로 응답해주세요.
{
  "wines": [
    {"name": "와인 이름", "price": 가격(숫자, 없으면 null)},
    ...
  ]
}
와인이 보이지 않으면 {"wines": []}로 응답.`

export interface ShelfRecognition {
  wines: Array<{ name: string; price: number | null }>
}

export async function recognizeWineShelf(imageBase64: string): Promise<ShelfRecognition> {
  const response = await callGeminiVision({
    imageBase64,
    prompt: WINE_SHELF_PROMPT,
  })

  const parsed = safeJsonParse(response.text)
  return { wines: parsed.wines ?? [] }
}

// ─── 와인 영수증 OCR ───

const WINE_RECEIPT_PROMPT = `이 영수증에서 와인 항목을 추출해주세요. JSON으로 응답해주세요.
{
  "items": [
    {"name": "와인/상품명", "price": 가격(숫자), "qty": 수량(숫자, 기본 1)},
    ...
  ],
  "total": 총합(숫자, 없으면 null)
}
영수증이 아니면 {"items": [], "total": null}로 응답.`

export interface ReceiptRecognition {
  items: Array<{ name: string; price: number | null; qty: number }>
  total: number | null
}

export async function recognizeWineReceipt(imageBase64: string): Promise<ReceiptRecognition> {
  const response = await callGeminiVision({
    imageBase64,
    prompt: WINE_RECEIPT_PROMPT,
  })

  const parsed = safeJsonParse(response.text)
  return {
    items: parsed.items ?? [],
    total: parsed.total ?? null,
  }
}
```

### 4. `src/app/api/records/identify/route.ts`

**API Route**: 이미지 URL 수신 → AI 인식 → 후보 반환. 서버 전용 키 사용.

> **설계 변경 사항**:
> - `@/infrastructure/api/gemini` → `@/infrastructure/api/ai-recognition`으로 import 경로 변경
> - `imageBase64` → `imageUrl` (이미지 URL 수신)
> - 식당 인식: PostGIS RPC 대신 **카카오 API**로 근처 식당 후보 검색
>   - `searchKakaoLocal()` 사용 — 식당 이름 > 검색 키워드 > 장르 순으로 시도
>   - 후보 ID: `kakao_{kakaoId}` prefix
>   - `isConfidentMatch`: 식당명 인식 + 후보 존재 + matchScore >= 0.5
> - 와인 인식 (individual 모드): `upsertWineFromAI()` — AI 인식 결과로 wines 테이블 자동 등록
>   - 다단계 퍼지 매칭 (이름 → 핵심 키워드 → 생산자+빈티지)
>   - 와인 데이터 대폭 확장 (region, sub_region, appellation, variety, abv, classification 등)
> - AI 실패 시 GPS 기반 폴백: 카카오 "음식점" 검색 (반경 500m, 10건)

```typescript
// src/app/api/records/identify/route.ts (실제 구현 요약)

import { recognizeRestaurant, recognizeWineLabel, recognizeWineShelf, recognizeWineReceipt } from '@/infrastructure/api/ai-recognition'
import { searchKakaoLocal } from '@/infrastructure/api/kakao-local'

export async function POST(request: NextRequest): Promise<NextResponse<IdentifyResponse>> {
  // 인증 확인
  const body: IdentifyRequest = await request.json()
  const { imageUrl, targetType, cameraMode, latitude, longitude } = body

  if (targetType === 'restaurant') {
    const recognition = await recognizeRestaurant(imageUrl)
    // 카카오 API로 후보 검색: 식당 이름 → searchKeywords → 장르 순서
    // rankCandidatesByGenreMatch() → rankedCandidates
    // isConfidentMatch: restaurantName 존재 + 후보 + matchScore >= 0.5
  }

  if (targetType === 'wine') {
    // shelf → recognizeWineShelf → shelfData 반환
    // receipt → recognizeWineReceipt → receiptData 반환
    // individual:
    //   recognizeWineLabel(imageUrl)
    //   wineName 없음 → candidates 빈 배열, isConfidentMatch=false
    //   wineName 있음 → upsertWineFromAI(supabase, recognition)
    //     1단계: 정확한 이름 매칭 (ilike + vintage)
    //     2단계: 핵심 키워드 퍼지 매칭 (Château/Domaine 접두사 제거, or 검색, 매칭 수 기반)
    //     3단계: 생산자+빈티지 매칭
    //     → 기존 와인 or 새 INSERT (확장 데이터 포함)
    //   candidates[0] = upsert 결과, matchScore = confidence >= 0.5 ? 1.0 : confidence
    //   isConfidentMatch = confidence >= 0.5
  }

  // 에러 처리:
  //   NOT_FOOD → 422
  //   NOT_WINE_LABEL → 422
  //   기타 실패 + 식당 + GPS 있음 → 카카오 "음식점" 폴백 (반경 500m, 10건)
    }

    return NextResponse.json({
      success: false,
      result: null,
      error: message,
    }, { status: 500 })
  }
}

/** 와인 DB 레코드와 OCR 인식 결과 간 매칭 점수 */
function calculateWineMatchScore(
  dbWine: { name: string; producer: string | null; vintage: number | null },
  recognition: { wineName: string | null; producer: string | null; vintage: number | null }
): number {
  let score = 0

  // 이름 유사도 (0.5)
  if (recognition.wineName && dbWine.name) {
    const nameNorm = dbWine.name.toLowerCase().replace(/\s/g, '')
    const ocrNorm = recognition.wineName.toLowerCase().replace(/\s/g, '')
    if (nameNorm === ocrNorm) score += 0.5
    else if (nameNorm.includes(ocrNorm) || ocrNorm.includes(nameNorm)) score += 0.3
  }

  // 생산자 일치 (0.25)
  if (recognition.producer && dbWine.producer) {
    const prodNorm = dbWine.producer.toLowerCase().replace(/\s/g, '')
    const ocrProdNorm = recognition.producer.toLowerCase().replace(/\s/g, '')
    if (prodNorm === ocrProdNorm) score += 0.25
    else if (prodNorm.includes(ocrProdNorm) || ocrProdNorm.includes(prodNorm)) score += 0.15
  }

  // 빈티지 일치 (0.25)
  if (recognition.vintage && dbWine.vintage) {
    if (recognition.vintage === dbWine.vintage) score += 0.25
  }

  return Math.min(score, 1)
}
```

### 5. `src/application/hooks/use-camera-capture.ts`

> **설계 변경 사항**: `identify` params에서 `imageBase64` → `imageUrl`로 변경 (이미지 업로드 후 URL 전달).
> 실제 구현에서는 촬영 이미지를 먼저 Supabase Storage에 업로드한 후 URL을 identify에 전달.

```typescript
// src/application/hooks/use-camera-capture.ts (실제 구현 시그니처)

interface UseCameraCaptureReturn {
  isRecognizing: boolean
  result: AIRecognitionResult | null
  error: string | null
  capturedImage: string | null
  identify: (params: {
    imageUrl: string                 // 업로드된 이미지 URL (imageBase64 → imageUrl 변경)
    targetType: 'restaurant' | 'wine'
    cameraMode?: CameraMode
    latitude?: number
    longitude?: number
    capturedAt?: string
  }) => Promise<AIRecognitionResult | null>
  reset: () => void
}

export function useCameraCapture(): UseCameraCaptureReturn {
  // identify():
  //   1. POST /api/records/identify { imageUrl, targetType, cameraMode, latitude, longitude }
  //   2. 에러 처리: NOT_FOOD → "음식 사진을 선택해주세요", NOT_WINE_LABEL → "와인 라벨을 찾지 못했어요"
  //   3. 성공 → result 설정 + AIRecognitionResult 반환
  // ...
  // reset(): 모든 상태 초기화
}
// 실제 구현: 이미지 촬영/앨범 선택 → base64 → Supabase Storage 업로드 → imageUrl 획득 → identify() 호출
// 이 과정은 add-flow-container.tsx에서 orchestration
```


### 6. `src/presentation/components/camera/camera-capture.tsx`

```typescript
// src/presentation/components/camera/camera-capture.tsx

import { useRef, useCallback } from 'react'
import { Camera, ImagePlus, List, Wine, UtensilsCrossed } from 'lucide-react'

// 설계 변경: onCapture(imageBase64: string) → onCapture(file: File)
// previewUrl prop 추가 — 업로드 완료된 사진 미리보기
interface CameraCaptureProps {
  targetType: 'restaurant' | 'wine'
  onCapture: (file: File) => void           // File 객체 전달 (base64 → File 변경)
  onAlbumSelect: () => void
  onSearchFallback: () => void
  onShelfMode?: () => void
  onReceiptMode?: () => void
  isRecognizing: boolean
  previewUrl?: string | null                // 업로드 완료된 사진 미리보기 URL
}

export function CameraCapture({
  targetType,
  onCapture,
  onAlbumSelect,
  onSearchFallback,
  onShelfMode,
  onReceiptMode,
  isRecognizing,
}: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleCameraCapture = useCallback(() => {
    // 모바일: 카메라 직접 실행
    if (inputRef.current) {
      inputRef.current.setAttribute('capture', 'environment')
      inputRef.current.click()
    }
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      onCapture(file)           // File 객체 직접 전달 (base64 변환은 컨테이너에서 처리)
      e.target.value = ''
    },
    [onCapture],
  )

  const isRestaurant = targetType === 'restaurant'
  const IconComponent = isRestaurant ? UtensilsCrossed : Wine

  return (
    <div className="flex flex-col items-center px-6 py-8">
      {/* 히든 file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 카메라 뷰파인더 영역 */}
      <div className="flex flex-col items-center justify-center w-full max-w-[280px] aspect-square rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] mb-4">
        <IconComponent
          size={48}
          className={isRestaurant ? 'text-[var(--accent-food)]' : 'text-[var(--accent-wine)]'}
        />
        <p className="mt-4 text-[15px] font-semibold text-[var(--text)]">
          {isRestaurant ? '음식 사진을 촬영하세요' : '라벨을 맞춰주세요'}
        </p>

        {/* 촬영 버튼 */}
        <button
          type="button"
          onClick={handleCameraCapture}
          disabled={isRecognizing}
          className={`mt-6 w-16 h-16 rounded-full flex items-center justify-center ${
            isRestaurant
              ? 'bg-[var(--accent-food)]'
              : 'bg-[var(--accent-wine)]'
          } disabled:opacity-50`}
        >
          {isRecognizing ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera size={28} className="text-white" />
          )}
        </button>
      </div>

      {/* 안내 텍스트 */}
      <p className="text-[13px] text-[var(--text-sub)] text-center mb-6">
        {isRestaurant
          ? '음식 또는 식당 사진을 촬영하면 자동으로 인식합니다'
          : '와인 라벨을 촬영하면 자동으로 인식합니다'}
      </p>

      {/* 하단 버튼 그룹 */}
      <div className={`flex gap-3 w-full ${targetType === 'wine' ? 'flex-wrap justify-center' : ''}`}>
        <button
          type="button"
          onClick={onAlbumSelect}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--border)] text-[14px] text-[var(--text)] bg-[var(--bg-card)]"
        >
          <ImagePlus size={18} />
          앨범에서 추가
        </button>

        <button
          type="button"
          onClick={onSearchFallback}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--border)] text-[14px] text-[var(--text)] bg-[var(--bg-card)]"
        >
          <List size={18} />
          {isRestaurant ? '목록에서 추가' : '이름으로 검색'}
        </button>

        {/* 와인 전용 추가 버튼 */}
        {targetType === 'wine' && onShelfMode && (
          <button
            type="button"
            onClick={onShelfMode}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--border)] text-[14px] text-[var(--text)] bg-[var(--bg-card)]"
          >
            진열장
          </button>
        )}
        {targetType === 'wine' && onReceiptMode && (
          <button
            type="button"
            onClick={onReceiptMode}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--border)] text-[14px] text-[var(--text)] bg-[var(--bg-card)]"
          >
            영수증
          </button>
        )}
      </div>
    </div>
  )
}
```

### 7. `src/presentation/components/camera/wine-confirm-card.tsx`

**SEARCH_REGISTER.md §5 와인 확인 화면**

```typescript
// src/presentation/components/camera/wine-confirm-card.tsx

import { Wine } from 'lucide-react'

interface WineConfirmCardProps {
  wineName: string
  wineType: string | null
  region: string | null
  country: string | null
  vintage: number | null
  onConfirm: () => void
  onReject: () => void
}

/** 와인 타입 → 한글 변환 + 칩 색상 */
const WINE_TYPE_MAP: Record<string, { label: string; className: string }> = {
  red: { label: '레드', className: 'bg-accent-wine-light text-accent-wine' },
  white: { label: '화이트', className: 'bg-accent-food-light text-accent-food' },
  rose: { label: '로제', className: 'bg-[var(--scene-romantic)]/10 text-[var(--scene-romantic)]' },
  sparkling: { label: '스파클링', className: 'bg-accent-social-light text-accent-social' },
  orange: { label: '오렌지', className: 'bg-[var(--caution)]/10 text-caution' },
  fortified: { label: '주정강화', className: 'bg-accent-food-dim text-accent-food' },
  dessert: { label: '디저트', className: 'bg-accent-wine-light text-accent-wine' },
}

export function WineConfirmCard({
  wineName,
  wineType,
  region,
  country,
  vintage,
  onConfirm,
  onReject,
}: WineConfirmCardProps) {
  const typeInfo = wineType ? WINE_TYPE_MAP[wineType] : null
  const locationParts = [region, country].filter(Boolean).join(', ')

  return (
    <div className="flex flex-col items-center px-6 py-8">
      <h2 className="text-[17px] font-bold text-[var(--text)] mb-6">
        이 와인이 맞나요?
      </h2>

      {/* 와인 카드 */}
      <div className="w-full max-w-[320px] p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-wine-light)] flex items-center justify-center flex-shrink-0">
            <Wine size={20} className="text-[var(--accent-wine)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-[var(--text)] truncate">
              {wineName}
            </p>
            {locationParts && (
              <p className="text-[13px] text-[var(--text-sub)] mt-0.5">
                {typeInfo ? `${typeInfo.label} · ` : ''}{locationParts}
              </p>
            )}
            {vintage && (
              <p className="text-[13px] text-[var(--text-sub)] mt-0.5">
                {vintage}
              </p>
            )}
          </div>
        </div>

        {/* 타입 칩 */}
        {typeInfo && (
          <div className="mt-3">
            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-medium ${typeInfo.className}`}>
              {typeInfo.label}
            </span>
          </div>
        )}
      </div>

      {/* 버튼 그룹 */}
      <div className="flex flex-col gap-3 w-full max-w-[320px] mt-8">
        <button
          type="button"
          onClick={onConfirm}
          className="w-full py-3.5 rounded-xl bg-[var(--accent-wine)] text-white text-[15px] font-semibold"
        >
          맞아요
        </button>
        <button
          type="button"
          onClick={onReject}
          className="w-full py-3.5 rounded-xl border border-[var(--border)] text-[var(--text)] text-[15px] font-medium bg-[var(--bg-card)]"
        >
          다른 와인이에요
        </button>
      </div>
    </div>
  )
}
```

### 8. `src/presentation/components/camera/ai-result-display.tsx`

```typescript
// src/presentation/components/camera/ai-result-display.tsx

import { UtensilsCrossed, MapPin, Sparkles } from 'lucide-react'
import type { RestaurantCandidate } from '@/domain/entities/camera'

interface AIResultDisplayProps {
  candidates: RestaurantCandidate[]
  detectedGenre: string | null
  onSelect: (restaurantId: string) => void
  onSearchFallback: () => void
}

export function AIResultDisplay({
  candidates,
  detectedGenre,
  onSelect,
  onSearchFallback,
}: AIResultDisplayProps) {
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-8">
        <p className="text-[15px] text-[var(--text)]">
          근처에서 식당을 찾지 못했어요
        </p>
        <button
          type="button"
          onClick={onSearchFallback}
          className="mt-4 px-6 py-3 rounded-xl bg-[var(--accent-food)] text-white text-[14px] font-semibold"
        >
          직접 검색하기
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      {detectedGenre && (
        <div className="flex items-center gap-1.5 mb-3 px-2">
          <Sparkles size={12} className="text-[var(--accent-food)]" />
          <span className="text-[11px] text-[var(--accent-food)]">
            AI 인식: {detectedGenre}
          </span>
        </div>
      )}

      <ul className="flex flex-col">
        {candidates.map((candidate) => (
          <li key={candidate.restaurantId}>
            <button
              type="button"
              onClick={() => onSelect(candidate.restaurantId)}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-[var(--accent-food-light)] transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-food-light)] flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed size={18} className="text-[var(--accent-food)]" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[14px] font-semibold text-[var(--text)] truncate">
                  {candidate.name}
                </p>
                <p className="text-[12px] text-[var(--text-sub)] truncate">
                  {[candidate.genre, candidate.area].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-1 text-[12px] text-[var(--text-hint)] flex-shrink-0">
                <MapPin size={12} />
                {candidate.distance !== null
                  ? candidate.distance < 1000
                    ? `${Math.round(candidate.distance)}m`
                    : `${(candidate.distance / 1000).toFixed(1)}km`
                  : ''}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## 목업 매핑

| 프로토타입 Screen ID | 구현 컴포넌트 |
|---------------------|-------------|
| `screen-add-restaurant` | `CameraCapture` (targetType='restaurant') |
| `screen-add-wine` | `CameraCapture` (targetType='wine') |
| `screen-add-wine-confirm` | `WineConfirmCard` |
| AI 인식 후보 목록 | `AIResultDisplay` |

---

## 데이터 흐름

```
┌─ 사용자: FAB(+) 탭
│
├─ 현재 홈 탭 확인 (currentHomeTab)
│  ├─ restaurant → AddFlowContainer(type='restaurant')
│  └─ wine → AddFlowContainer(type='wine')
│  (참고: camera-container.tsx는 add-flow-container.tsx에 통합되어 삭제됨)
│
├─ 촬영 or 앨범 선택
│  └─ handleFileChange → File 객체 → Storage 업로드 → imageUrl 획득
│
├─ useCameraCapture.identify() 호출
│  └─ POST /api/records/identify { imageUrl, targetType, ... }
│     ├─ targetType='restaurant'
│     │   ├─ recognizeRestaurant(imageUrl) → {genre, restaurantName, searchKeywords}
│     │   ├─ searchKakaoLocal() → 카카오 API 기반 후보 검색
│     │   └─ rankCandidatesByGenreMatch → 정렬된 후보
│     │
│     └─ targetType='wine'
│         ├─ cameraMode='individual' → recognizeWineLabel → upsertWineFromAI → DB 등록/매칭
│         ├─ cameraMode='shelf' → recognizeWineShelf → 와인 목록
│         └─ cameraMode='receipt' → recognizeWineReceipt → 구매 목록
│
├─ AI 결과 분기
│  ├─ 식당: isConfidentMatch=true → 바로 기록 화면 (screen-rest-record)
│  ├─ 식당: 후보 다수 → AIResultDisplay → 사용자 선택 → 기록 화면
│  ├─ 식당: 후보 0 → 검색 폴백 (screen-add-restaurant-search)
│  ├─ 와인: isConfidentMatch=true → 바로 기록 화면 (screen-wine-record)
│  ├─ 와인: 후보 존재 → WineConfirmCard → "맞아요" → 기록 화면
│  └─ 와인: 후보 0 → "와인을 찾지 못했어요" → 검색/등록
│
└─ 기록 화면 진입 (S2 구현체)
   └─ 사진 자동 첨부 + AI pre-fill 데이터 전달
```

---

## 검증 체크리스트

```
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
□ R1: domain/entities/camera.ts, domain/services/ai-recognition.ts에 외부 import 없음
□ R3: application/hooks/use-camera-capture.ts에 infrastructure import 없음
□ R4: presentation/components/camera/*.tsx에 infrastructure/supabase import 없음
□ 식당: 카메라 촬영 → AI 인식 → 후보 표시 → 선택 → 기록 화면 pre-fill
□ 와인 individual: 라벨 촬영 → OCR → 확인 화면 → "맞아요" → 기록 화면
□ 와인 shelf: 진열장 촬영 → 와인 목록 인식
□ 와인 receipt: 영수증 촬영 → 구매 목록 인식
□ GPS + 장르 교차 매칭: GPS 200m 내 후보 중 장르 일치 우선
□ isConfidentMatch: 후보 1개 + 0.5 이상, 또는 다수 후보 중 1위 0.7 이상 + 2위와 0.2 이상 차이 → 바로 기록 화면
□ NOT_FOOD 에러: "음식 사진을 선택해주세요" 표시
□ NOT_WINE_LABEL 에러: "와인을 찾지 못했어요" → 검색/등록 옵션
□ GEMINI_API_KEY 클라이언트 미노출 (서버 전용 API Route)
□ TypeScript strict: any/as any/@ts-ignore/! 0개
□ 디자인 토큰: --accent-food, --accent-wine 사용, 하드코딩 색상 없음
□ 모바일 360px 레이아웃 정상
```
