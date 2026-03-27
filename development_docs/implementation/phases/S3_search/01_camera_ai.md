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
| `src/infrastructure/api/gemini.ts` | infrastructure | Gemini Vision API 호출 (식당 음식 인식, 와인 라벨 OCR) |
| `src/app/api/records/identify/route.ts` | app | API route: 이미지 → AI 인식 → 후보 반환 |
| `src/application/hooks/use-camera-capture.ts` | application | 카메라 촬영/앨범 선택 + AI 인식 호출 |
| `src/presentation/components/camera/camera-capture.tsx` | presentation | 카메라 뷰파인더 + 촬영 버튼 |
| `src/presentation/components/camera/album-picker.tsx` | presentation | 앨범에서 사진 선택 |
| `src/presentation/components/camera/ai-result-display.tsx` | presentation | AI 인식 결과 표시 (후보 목록) |
| `src/presentation/components/camera/wine-confirm-card.tsx` | presentation | 와인 확인 화면 (screen-add-wine-confirm) |
| `src/presentation/containers/camera-container.tsx` | presentation | 카메라 화면 컨테이너 (식당/와인 분기) |
| `src/presentation/containers/wine-confirm-container.tsx` | presentation | 와인 확인 컨테이너 |

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
  /** base64 인코딩된 이미지 */
  imageBase64: string
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

### 3. `src/infrastructure/api/gemini.ts`

**Gemini Vision API 연동**. 서버 전용 (클라이언트 노출 금지).

```typescript
// src/infrastructure/api/gemini.ts
// 서버 전용 — GEMINI_API_KEY 클라이언트 노출 금지

interface GeminiVisionRequest {
  imageBase64: string
  prompt: string
}

interface GeminiVisionResponse {
  text: string
  confidence: number
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

/**
 * Gemini Vision API 호출
 * @throws Error API 호출 실패 시
 */
async function callGeminiVision(request: GeminiVisionRequest): Promise<GeminiVisionResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: request.prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: request.imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  return { text, confidence: data.candidates?.[0]?.avgLogProbs ?? 0 }
}

// ─── 식당 인식 ───

const RESTAURANT_PROMPT = `이 음식/식당 사진을 분석해주세요. JSON으로 응답해주세요.
{
  "food_type": "인식된 음식 종류 (예: 초밥, 파스타, 삼겹살)",
  "genre": "음식 장르 (한식/일식/양식/중식/이탈리안/프렌치/동남아/태국/베트남/인도/스페인/멕시칸/아시안/파인다이닝/비스트로/카페/베이커리/바/주점 중 하나)",
  "restaurant_name": "간판이 보이면 식당 이름, 없으면 null",
  "confidence": 0.0~1.0
}
음식이 아닌 사진이면 {"error": "not_food"}로 응답.`

export interface RestaurantRecognition {
  foodType: string | null
  genre: string | null
  restaurantName: string | null
  confidence: number
}

export async function recognizeRestaurant(imageBase64: string): Promise<RestaurantRecognition> {
  const response = await callGeminiVision({
    imageBase64,
    prompt: RESTAURANT_PROMPT,
  })

  const parsed = JSON.parse(response.text)

  if (parsed.error === 'not_food') {
    throw new Error('NOT_FOOD')
  }

  return {
    foodType: parsed.food_type ?? null,
    genre: parsed.genre ?? null,
    restaurantName: parsed.restaurant_name ?? null,
    confidence: parsed.confidence ?? 0,
  }
}

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

  const parsed = JSON.parse(response.text)

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

  const parsed = JSON.parse(response.text)
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

  const parsed = JSON.parse(response.text)
  return {
    items: parsed.items ?? [],
    total: parsed.total ?? null,
  }
}
```

### 4. `src/app/api/records/identify/route.ts`

**API Route**: 이미지 수신 → AI 인식 → 후보 반환. 서버 전용 키 사용.

```typescript
// src/app/api/records/identify/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/server'
import {
  recognizeRestaurant,
  recognizeWineLabel,
  recognizeWineShelf,
  recognizeWineReceipt,
} from '@/infrastructure/api/gemini'
import { rankCandidatesByGenreMatch, isConfidentMatch } from '@/domain/services/ai-recognition'
import type {
  IdentifyRequest,
  IdentifyResponse,
  RestaurantAIResult,
  WineAIResult,
  RestaurantCandidate,
  WineCandidate,
} from '@/domain/entities/camera'

export async function POST(request: NextRequest): Promise<NextResponse<IdentifyResponse>> {
  const supabase = await createServerClient()

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, result: null, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body: IdentifyRequest = await request.json()
  const { imageBase64, targetType, cameraMode, latitude, longitude, capturedAt } = body

  if (!imageBase64 || !targetType) {
    return NextResponse.json({ success: false, result: null, error: 'MISSING_FIELDS' }, { status: 400 })
  }

  try {
    if (targetType === 'restaurant') {
      // ── 식당 인식 ──
      const recognition = await recognizeRestaurant(imageBase64)

      // GPS 기반 근처 식당 조회 (반경 200m)
      let candidates: RestaurantCandidate[] = []

      if (latitude && longitude) {
        const { data: nearby } = await supabase.rpc('restaurants_within_radius', {
          lat: latitude,
          lng: longitude,
          radius_meters: 200,
        })

        if (nearby) {
          candidates = nearby.map((r: {
            id: string
            name: string
            genre: string | null
            area: string | null
            distance: number
          }) => ({
            restaurantId: r.id,
            name: r.name,
            genre: r.genre,
            area: r.area,
            distance: r.distance,
            matchScore: 0,
          }))
        }
      }

      // GPS+장르 교차 매칭
      const rankedCandidates = rankCandidatesByGenreMatch(candidates, recognition.genre)

      const result: RestaurantAIResult = {
        targetType: 'restaurant',
        detectedGenre: recognition.genre,
        detectedName: recognition.restaurantName,
        candidates: rankedCandidates,
        isConfidentMatch: isConfidentMatch(rankedCandidates),
      }

      return NextResponse.json({ success: true, result })

    } else {
      // ── 와인 인식 ──
      const mode = cameraMode ?? 'individual'

      if (mode === 'shelf') {
        const recognition = await recognizeWineShelf(imageBase64)
        // shelf 모드: 와인 목록 반환 (DB 매칭은 클라이언트에서 개별 처리)
        const result: WineAIResult = {
          targetType: 'wine',
          ocrData: { wine_name: '', vintage: null, producer: null },
          candidates: [],
          isConfidentMatch: false,
          cameraMode: 'shelf',
        }
        // shelf OCR 데이터는 별도 필드로 반환
        return NextResponse.json({
          success: true,
          result,
          shelfData: recognition,
        } as IdentifyResponse & { shelfData: typeof recognition })

      } else if (mode === 'receipt') {
        const recognition = await recognizeWineReceipt(imageBase64)
        const result: WineAIResult = {
          targetType: 'wine',
          ocrData: { wine_name: '', vintage: null, producer: null },
          candidates: [],
          isConfidentMatch: false,
          cameraMode: 'receipt',
        }
        return NextResponse.json({
          success: true,
          result,
          receiptData: recognition,
        } as IdentifyResponse & { receiptData: typeof recognition })

      } else {
        // individual 모드: 라벨 OCR → DB 매칭
        const recognition = await recognizeWineLabel(imageBase64)

        const ocrData = {
          wine_name: recognition.wineName ?? '',
          vintage: recognition.vintage ? String(recognition.vintage) : null,
          producer: recognition.producer,
        }

        // DB에서 와인 매칭 검색
        let candidates: WineCandidate[] = []

        if (recognition.wineName) {
          const { data: wines } = await supabase
            .from('wines')
            .select('id, name, producer, vintage, wine_type, region, country')
            .or(`name.ilike.%${recognition.wineName}%,producer.ilike.%${recognition.wineName}%`)
            .limit(10)

          if (wines) {
            candidates = wines.map((w) => ({
              wineId: w.id,
              name: w.name,
              producer: w.producer,
              vintage: w.vintage,
              wineType: w.wine_type,
              region: w.region,
              country: w.country,
              matchScore: calculateWineMatchScore(w, recognition),
            }))

            candidates.sort((a, b) => b.matchScore - a.matchScore)
          }
        }

        const result: WineAIResult = {
          targetType: 'wine',
          ocrData,
          candidates,
          isConfidentMatch: candidates.length > 0 && candidates[0].matchScore >= 0.8,
          cameraMode: 'individual',
        }

        return NextResponse.json({ success: true, result })
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

    // 특정 에러 코드 처리
    if (message === 'NOT_FOOD') {
      return NextResponse.json({
        success: false,
        result: null,
        error: 'NOT_FOOD',
      }, { status: 422 })
    }
    if (message === 'NOT_WINE_LABEL') {
      return NextResponse.json({
        success: false,
        result: null,
        error: 'NOT_WINE_LABEL',
      }, { status: 422 })
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

```typescript
// src/application/hooks/use-camera-capture.ts

import { useState, useCallback } from 'react'
import type {
  IdentifyRequest,
  IdentifyResponse,
  AIRecognitionResult,
} from '@/domain/entities/camera'
import type { CameraMode } from '@/domain/entities/record'

interface UseCameraCaptureReturn {
  /** AI 인식 진행 중 */
  isRecognizing: boolean
  /** AI 인식 결과 */
  result: AIRecognitionResult | null
  /** 에러 메시지 */
  error: string | null
  /** 촬영된 이미지 base64 */
  capturedImage: string | null
  /** 촬영/앨범 선택 후 AI 인식 실행 */
  identify: (params: {
    imageBase64: string
    targetType: 'restaurant' | 'wine'
    cameraMode?: CameraMode
    latitude?: number
    longitude?: number
    capturedAt?: string
  }) => Promise<AIRecognitionResult | null>
  /** 결과 초기화 */
  reset: () => void
}

export function useCameraCapture(): UseCameraCaptureReturn {
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [result, setResult] = useState<AIRecognitionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const identify = useCallback(async (params: {
    imageBase64: string
    targetType: 'restaurant' | 'wine'
    cameraMode?: CameraMode
    latitude?: number
    longitude?: number
    capturedAt?: string
  }): Promise<AIRecognitionResult | null> => {
    setIsRecognizing(true)
    setError(null)
    setCapturedImage(params.imageBase64)

    try {
      const body: IdentifyRequest = {
        imageBase64: params.imageBase64,
        targetType: params.targetType,
        cameraMode: params.cameraMode,
        latitude: params.latitude,
        longitude: params.longitude,
        capturedAt: params.capturedAt,
      }

      const response = await fetch('/api/records/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data: IdentifyResponse = await response.json()

      if (!data.success || !data.result) {
        const errorMap: Record<string, string> = {
          NOT_FOOD: '음식 사진을 선택해주세요',
          NOT_WINE_LABEL: '와인 라벨을 찾지 못했어요',
          UNAUTHORIZED: '로그인이 필요합니다',
        }
        setError(errorMap[data.error ?? ''] ?? '인식에 실패했습니다. 다시 시도해주세요.')
        return null
      }

      setResult(data.result)
      return data.result
    } catch {
      setError('네트워크 오류가 발생했습니다')
      return null
    } finally {
      setIsRecognizing(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setCapturedImage(null)
    setIsRecognizing(false)
  }, [])

  return { isRecognizing, result, error, capturedImage, identify, reset }
}
```

### 6. `src/presentation/components/camera/camera-capture.tsx`

```typescript
// src/presentation/components/camera/camera-capture.tsx

import { useRef, useCallback } from 'react'
import { Camera, ImagePlus, List, Wine, UtensilsCrossed } from 'lucide-react'

interface CameraCaptureProps {
  targetType: 'restaurant' | 'wine'
  /** 카메라 촬영 완료 콜백 (base64 이미지) */
  onCapture: (imageBase64: string) => void
  /** 앨범에서 추가 버튼 */
  onAlbumSelect: () => void
  /** 목록에서 추가 (식당) / 이름으로 검색 (와인) */
  onSearchFallback: () => void
  /** 와인 전용: 진열장 모드 */
  onShelfMode?: () => void
  /** 와인 전용: 영수증 모드 */
  onReceiptMode?: () => void
  /** AI 인식 중 로딩 상태 */
  isRecognizing: boolean
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

      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        onCapture(base64)
      }
      reader.readAsDataURL(file)

      // input 리셋 (같은 파일 재선택 허용)
      e.target.value = ''
    },
    [onCapture]
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
  red: { label: '레드', className: 'bg-red-100 text-red-700' },
  white: { label: '화이트', className: 'bg-yellow-100 text-yellow-700' },
  rose: { label: '로제', className: 'bg-pink-100 text-pink-700' },
  sparkling: { label: '스파클링', className: 'bg-blue-100 text-blue-700' },
  orange: { label: '오렌지', className: 'bg-orange-100 text-orange-700' },
  fortified: { label: '주정강화', className: 'bg-amber-100 text-amber-700' },
  dessert: { label: '디저트', className: 'bg-purple-100 text-purple-700' },
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
│  ├─ restaurant → CameraContainer(targetType='restaurant')
│  └─ wine → CameraContainer(targetType='wine')
│
├─ 촬영 or 앨범 선택
│  └─ handleFileChange → base64 변환
│
├─ useCameraCapture.identify() 호출
│  └─ POST /api/records/identify
│     ├─ targetType='restaurant'
│     │   ├─ recognizeRestaurant(imageBase64) → {genre, restaurantName}
│     │   ├─ supabase.rpc('restaurants_within_radius') → 후보 목록
│     │   └─ rankCandidatesByGenreMatch → 정렬된 후보
│     │
│     └─ targetType='wine'
│         ├─ cameraMode='individual' → recognizeWineLabel → DB 매칭
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
□ isConfidentMatch: 후보 1개 + 0.7 이상 → 바로 기록 화면
□ NOT_FOOD 에러: "음식 사진을 선택해주세요" 표시
□ NOT_WINE_LABEL 에러: "와인을 찾지 못했어요" → 검색/등록 옵션
□ GEMINI_API_KEY 클라이언트 미노출 (서버 전용 API Route)
□ TypeScript strict: any/as any/@ts-ignore/! 0개
□ 디자인 토큰: --accent-food, --accent-wine 사용, 하드코딩 색상 없음
□ 모바일 360px 레이아웃 정상
```
