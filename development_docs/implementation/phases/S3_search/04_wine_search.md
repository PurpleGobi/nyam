# S3-T04: 와인 검색 (Nyam DB + 라벨 OCR)

> Nyam DB 우선 검색 → 매칭 실패 시 라벨 OCR 폴백. 와인명/생산자/빈티지 기반 검색. 확인 화면에서 사용자 컨펌.

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `pages/01_SEARCH_REGISTER.md` | §6 와인 검색 화면 | 자동완성 순서, 검색 결과 항목, 빈티지 처리 |
| `pages/01_SEARCH_REGISTER.md` | §5 와인 확인 화면 | 라벨 인식 후 확인/거부 분기 |
| `pages/01_SEARCH_REGISTER.md` | §4 OCR 인식 데이터 | individual/shelf/receipt OCR JSONB 구조 |
| `systems/DATA_MODEL.md` | wines 테이블 | name, producer, vintage, wine_type, region, country, variety |
| `prototype/01_home.html` | `screen-add-wine-search`, `screen-add-wine-confirm` | 비주얼 레퍼런스 |

---

## 선행 조건

- S1-T01 (DB 스키마) 완료 — wines 테이블 존재
- S3-T02 (검색 UI) 완료 — `WineSearchResult` 타입, `useSearch` hook
- S3-T01 (카메라 AI) 완료 — `recognizeWineLabel` (`ai-recognition.ts`) 사용 가능

---

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/domain/repositories/wine-repository.ts` | domain | 검색 메서드 인터페이스 추가 |
| `src/infrastructure/repositories/supabase-wine-repository.ts` | infrastructure | 와인 검색 구현 |
| `src/app/api/wines/search/route.ts` | app | 와인 DB 검색 API route |
| `src/app/api/wines/search-ai/route.ts` | app | AI 와인 텍스트 검색 API route (DB 결과 부족 시 폴백) |
| `src/app/api/wines/detail-ai/route.ts` | app | AI 와인 상세 조회 + DB 저장 API route (후보 선택 시) |
| `src/application/hooks/use-wine-search.ts` | application | 와인 검색 + OCR 폴백 + AI 검색 통합 hook |

### 스코프 외

- 와인 라벨 OCR (Gemini Vision) — `01_camera_ai.md`에서 구현
- 와인 확인 카드 UI — `01_camera_ai.md`에서 구현 (wine-confirm-card.tsx)
- 신규 와인 등록 폼 — `06_register.md`에서 구현

---

## 상세 구현 지침

### 1. Domain 인터페이스 — `src/domain/repositories/wine-repository.ts`

```typescript
// src/domain/repositories/wine-repository.ts
// R1: 외부 의존 0

import type { WineSearchResult } from '@/domain/entities/search'
import type { CreateWineInput } from '@/domain/entities/register'

export type { CreateWineInput }

export interface WineRepository {
  /** 텍스트 검색 (name, producer ILIKE) */
  search(query: string, userId: string): Promise<WineSearchResult[]>

  /** 신규 와인 등록 (중복 체크 포함 — 같은 이름+빈티지 존재 시 기존 ID 반환) */
  create(input: CreateWineInput): Promise<{ id: string; name: string; isExisting: boolean }>
}
```

> **설계 변경 사항**: 초기 설계의 `searchByName(params)`, `findByNameAndVintage()` 메서드는 구현 시 단순화됨.
> - `searchByName` → `search` (개별 파라미터, limit 고정 20)
> - `findByNameAndVintage` → `create()` 내부 중복 체크 로직으로 통합
> - `create` 반환값에 `isExisting` 플래그 추가 (기존 와인 재사용 지원)

### 2. `src/infrastructure/repositories/supabase-wine-repository.ts`

```typescript
// src/infrastructure/repositories/supabase-wine-repository.ts

import type { SupabaseClient } from '@supabase/supabase-js'
import type { WineRepository, CreateWineInput } from '@/domain/repositories/wine-repository'
import type { WineSearchResult } from '@/domain/entities/search'

export class SupabaseWineRepository implements WineRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  // 설계 변경: searchByName(params) → search(query, userId) — 개별 파라미터, limit 고정 20
  async search(query: string, userId: string): Promise<WineSearchResult[]> {
    // 이름 or 생산자로 검색
    const { data: wines, error } = await this.supabase
      .from('wines')
      .select('id, name, producer, vintage, wine_type, region, country')
      .or(`name.ilike.%${query}%,producer.ilike.%${query}%`)
      .order('name')
      .limit(20)

    if (error || !wines) return []

    // 사용자 기록 여부 확인
    const wineIds = wines.map((w) => w.id)
    const { data: records } = wineIds.length > 0
      ? await this.supabase
          .from('records')
          .select('target_id')
          .eq('user_id', userId)
          .eq('target_type', 'wine')
          .in('target_id', wineIds)
      : { data: [] }

    const recordedIds = new Set((records ?? []).map((r) => r.target_id))

    return wines.map((w) => ({
      id: w.id,
      type: 'wine' as const,
      name: w.name,
      producer: w.producer,
      vintage: w.vintage,
      wineType: w.wine_type,
      region: w.region,
      country: w.country,
      hasRecord: recordedIds.has(w.id),
    }))
  }

  // 설계 변경: findByNameAndVintage() → create() 내부 중복 체크로 통합
  // create() 반환값이 { id, name, isExisting } 구조로 변경됨
  async create(wine: CreateWineInput): Promise<{ id: string; name: string; isExisting: boolean }> {
    // 중복 체크 (이름+빈티지) — .maybeSingle() 사용 (결과 없으면 null, 에러 없음)
    let dupQuery = this.supabase
      .from('wines')
      .select('id, name')
      .ilike('name', wine.name)
    if (wine.vintage) {
      dupQuery = dupQuery.eq('vintage', wine.vintage)
    }
    const { data: existing } = await dupQuery.limit(1).maybeSingle()

    if (existing) {
      return { id: existing.id, name: existing.name, isExisting: true }
    }

    const { data, error } = await this.supabase
      .from('wines')
      .insert({
        name: wine.name,
        producer: wine.producer,
        wine_type: wine.wineType,
        vintage: wine.vintage,
        region: wine.region,
        country: wine.country,
        variety: wine.variety,
        label_image_url: wine.labelImageUrl ?? null,  // OCR 라벨 이미지 URL
      })
      .select('id, name')
      .single()

    if (error || !data) {
      throw new Error(`Failed to create wine: ${error?.message}`)
    }

    return { id: data.id, name: data.name, isExisting: false }
  }
}
```

### 3. `src/app/api/wines/search/route.ts`

```typescript
// src/app/api/wines/search/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import type { WineSearchResult } from '@/domain/entities/search'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ results: [] }, { status: 401 })
  }

  const query = request.nextUrl.searchParams.get('q') ?? ''

  if (query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // ── Step 1: Nyam DB 검색 (이름 + 생산자) ──
  const { data: wines } = await supabase
    .from('wines')
    .select('id, name, producer, vintage, wine_type, region, country')
    .or(`name.ilike.%${query}%,producer.ilike.%${query}%`)
    .order('name')
    .limit(20)

  if (!wines || wines.length === 0) {
    return NextResponse.json({ results: [] })
  }

  // ── 사용자 기록 여부 ──
  const wineIds = wines.map((w) => w.id)
  const { data: records } = await supabase
    .from('records')
    .select('target_id')
    .eq('user_id', user.id)
    .eq('target_type', 'wine')
    .in('target_id', wineIds)

  const recordedIds = new Set((records ?? []).map((r) => r.target_id))

  const results: WineSearchResult[] = wines.map((w) => ({
    id: w.id,
    type: 'wine' as const,
    name: w.name,
    producer: w.producer,
    vintage: w.vintage,
    wineType: w.wine_type,
    region: w.region,
    country: w.country,
    hasRecord: recordedIds.has(w.id),
  }))

  // ── 정렬: 기록 있는 항목 우선 → 이름순 ──
  results.sort((a, b) => {
    if (a.hasRecord && !b.hasRecord) return -1
    if (!a.hasRecord && b.hasRecord) return 1
    return a.name.localeCompare(b.name)
  })

  return NextResponse.json({ results })
}
```

### 4. `src/application/hooks/use-wine-search.ts`

**와인 검색 + OCR 폴백 + AI 검색 통합**

> **설계 변경 사항**:
> - `WineSearchCandidate` 타입 import (`@/infrastructure/api/ai-recognition`) — R3 위반 주의: 실제 코드에서는 infrastructure import이 존재함 (타입 전용)
> - `wineRepo` DI 컨테이너에서 `search()` 직접 호출 (DB 검색)
> - AI 검색: `searchAI()` → `/api/wines/search-ai` POST → `aiCandidates` 업데이트
> - AI 후보 선택: `selectAiCandidate()` → `/api/wines/detail-ai` POST → DB 저장 → `WineCandidate`로 변환 → `selectedWine` 설정
> - `isSelectingWine` 상태 추가 (AI 후보 DB 저장 진행 중)

```typescript
// src/application/hooks/use-wine-search.ts (실제 구현 시그니처)

export function useWineSearch(userId: string | null) {
  // 반환:
  //   results: WineSearchResult[]            (DB 검색 결과)
  //   aiCandidates: WineSearchCandidate[]     (AI 텍스트 검색 결과)
  //   isSearching: boolean
  //   isAiSearching: boolean                  (AI 검색 진행 중)
  //   isSelectingWine: boolean                (AI 후보 DB 저장 진행 중)
  //   search: (query: string) => Promise<void>
  //   searchAI: (query: string) => Promise<void>
  //   selectAiCandidate: (candidate: WineSearchCandidate) => Promise<void>
  //   ocrCandidates: WineCandidate[]
  //   selectedWine: WineCandidate | null
  //   setOcrCandidates: (candidates: WineCandidate[]) => void
  //   selectWineCandidate: (candidate: WineCandidate) => void
  //   clearSelection: () => void
  //   needsConfirmation: boolean
}
```

---

## 목업 매핑

| 프로토타입 Screen ID | 구현 | 동작 |
|---------------------|------|------|
| `screen-add-wine-search` (검색 전) | `SearchBar` + 힌트 "와인 이름이나 생산자를 입력하세요" | `screenState='idle'` |
| `screen-add-wine-search` (검색 중) | `SearchBar` + `SearchResults` (WineSearchResult) | `screenState='results'` |
| `screen-add-wine-confirm` | `WineConfirmCard` (01_camera_ai.md) | OCR 후 → 확인 |

---

## 데이터 흐름

```
┌─ 텍스트 검색 경로 (screen-add-wine-search)
│  ├─ 사용자 입력 "Chateau Margaux"
│  ├─ GET /api/wines/search?q=Chateau+Margaux
│  ├─ Nyam DB: wines.name/producer ILIKE '%Chateau Margaux%'
│  ├─ 결과 < 3개 → POST /api/wines/search-ai 자동 트리거
│  │   → AI 추천 와인 섹션 (WineSearchCandidate[])
│  ├─ 사용자 기록 여부 뱃지 표시
│  └─ 선택:
│     ├─ DB 결과 선택 → /record 페이지 이동
│     └─ AI 후보 선택 → POST /api/wines/detail-ai → DB 저장 → /record 이동
│
├─ OCR 검색 경로 (카메라 → 라벨 인식)
│  ├─ 01_camera_ai.md: recognizeWineLabel → WineAIResult
│  ├─ WineAIResult.candidates → useWineSearch.setOcrCandidates()
│  ├─ isConfidentMatch=true → 자동 선택 → 기록 화면
│  ├─ 후보 존재 → WineConfirmCard (screen-add-wine-confirm)
│  │   ├─ "맞아요" → 기록 화면 (screen-wine-record)
│  │   └─ "다른 와인이에요" → 카메라로 돌아감
│  └─ 후보 0개 → "와인을 찾지 못했어요"
│     ├─ [이름으로 검색] → screen-add-wine-search
│     └─ [직접 등록] → 06_register.md
│
└─ 빈티지 처리 (SEARCH_REGISTER.md §6)
   ├─ 같은 와인 + 다른 빈티지 = 다른 기록
   ├─ "빈티지 모름" 선택 가능 (vintage=null)
   └─ 최근 연도 기본 선택
```

---

## 검증 체크리스트

```
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
□ R1: domain/repositories/wine-repository.ts에 외부 import 없음
□ R2: SupabaseWineRepository implements WineRepository
□ R3: application/hooks/use-wine-search.ts에 infrastructure import 없음
□ 텍스트 검색: 와인명, 생산자 모두 검색 가능
□ 검색 결과 정렬: 기록 있는 항목 우선 → 이름순
□ "기록 있음" 뱃지: accent-wine 컬러
□ "기록 있음" 선택 → 토스트 + 상세 페이지 이동
□ OCR 결과 → 확실한 매칭 → 바로 기록 화면
□ OCR 결과 → 후보 다수 → 확인 화면 (WineConfirmCard)
□ OCR 실패 → "이름으로 검색" 또는 "직접 등록"
□ 빈티지 구분: 같은 와인 다른 빈티지 = 별도 항목
□ TypeScript strict: any/as any/@ts-ignore/! 0개
```
