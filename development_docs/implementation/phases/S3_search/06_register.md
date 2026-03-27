# S3-T06: 신규 등록 플로우

> 검색 결과 없을 때 → 신규 식당/와인 등록 폼 → restaurants/wines 테이블 INSERT → 기록 화면 연결

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `pages/01_SEARCH_REGISTER.md` | §3 직접 등록 | "⊕ 목록에 없나요? 직접 등록하기" → 가게명(필수)+주소+장르 |
| `pages/01_SEARCH_REGISTER.md` | §5 라벨 인식 실패 | "와인을 찾지 못했어요" → [이름으로 검색] or [직접 등록] |
| `systems/DATA_MODEL.md` | restaurants 테이블 | name(필수), address, area, genre, price_range, lat, lng |
| `systems/DATA_MODEL.md` | wines 테이블 | name(필수), producer, wine_type(필수), vintage, region, country |
| `prototype/01_home.html` | `screen-add-restaurant-search` | 하단 "직접 등록하기" 버튼 |

---

## 선행 조건

- S3-T03 (식당 검색) 완료 — 검색 결과 없을 때 등록 유도
- S3-T04 (와인 검색) 완료 — OCR 실패 시 등록 유도
- S1-T01 (DB 스키마) 완료 — restaurants, wines 테이블 존재

---

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/domain/entities/register.ts` | domain | CreateRestaurantInput, CreateWineInput 타입 |
| `src/app/api/restaurants/route.ts` | app | POST: 신규 식당 생성 API |
| `src/app/api/wines/route.ts` | app | POST: 신규 와인 생성 API |
| `src/application/hooks/use-register.ts` | application | 등록 폼 상태 관리 + API 호출 |
| `src/presentation/components/register/restaurant-register-form.tsx` | presentation | 식당 등록 폼 |
| `src/presentation/components/register/wine-register-form.tsx` | presentation | 와인 등록 폼 |
| `src/presentation/containers/register-container.tsx` | presentation | 등록 화면 컨테이너 |

### 스코프 외

- 등록 후 기록 화면 연결 — `07_full_flow.md`에서 구현
- 폐업 감지/갱신 — Phase 2

---

## 상세 구현 지침

### 1. `src/domain/entities/register.ts`

```typescript
// src/domain/entities/register.ts
// R1: 외부 의존 0

/** 식당 등록 입력 */
export interface CreateRestaurantInput {
  /** 가게명 (필수) */
  name: string
  /** 주소 (선택) */
  address: string | null
  /** 동네 (선택) */
  area: string | null
  /** 장르 (선택) — restaurants.genre CHECK 제약 값 중 하나 */
  genre: RestaurantGenre | null
  /** 가격대 (선택) — 1~4 */
  priceRange: number | null
  /** GPS 좌표 (선택) — 사용자 현재 위치 기반 자동 입력 */
  lat: number | null
  lng: number | null
}

/** DATA_MODEL.md restaurants.genre CHECK 제약 값 */
// RestaurantGenre 정식 정의는 S4의 src/domain/entities/restaurant.ts에서 정의
// S3 시점에서는 genre를 string으로 받고, S4 구현 시 타입을 적용한다
// 구현 순서: S3(검색)과 S4(상세)가 Wave 3에서 병렬이므로,
// restaurant.ts의 RestaurantGenre 타입은 먼저 완료되는 스프린트에서 정의하고
// 나중 스프린트에서 import한다
export type RestaurantGenre =
  | '한식' | '일식' | '양식' | '중식'
  | '이탈리안' | '프렌치' | '동남아' | '태국'
  | '베트남' | '인도' | '스페인' | '멕시칸'
  | '아시안' | '파인다이닝' | '비스트로' | '카페'
  | '베이커리' | '바' | '주점'

export const RESTAURANT_GENRES: RestaurantGenre[] = [
  '한식', '일식', '양식', '중식',
  '이탈리안', '프렌치', '동남아', '태국',
  '베트남', '인도', '스페인', '멕시칸',
  '아시안', '파인다이닝', '비스트로', '카페',
  '베이커리', '바', '주점',
]

/** 와인 등록 입력 */
export interface CreateWineInput {
  /** 와인명 (필수) */
  name: string
  /** 생산자 (선택) */
  producer: string | null
  /** 와인 타입 (필수) — wines.wine_type */
  wineType: WineType
  /** 빈티지 (선택, null=NV) */
  vintage: number | null
  /** 산지 (선택) */
  region: string | null
  /** 국가 (선택) */
  country: string | null
  /** 품종 (선택) */
  variety: string | null
}

/** wines.wine_type NOT NULL */
export type WineType =
  | 'red' | 'white' | 'rose' | 'sparkling'
  | 'orange' | 'fortified' | 'dessert'

export const WINE_TYPES: { value: WineType; label: string }[] = [
  { value: 'red', label: '레드' },
  { value: 'white', label: '화이트' },
  { value: 'rose', label: '로제' },
  { value: 'sparkling', label: '스파클링' },
  { value: 'orange', label: '오렌지' },
  { value: 'fortified', label: '주정강화' },
  { value: 'dessert', label: '디저트' },
]

/** 등록 결과 (생성된 ID 반환) */
export interface RegisterResult {
  id: string
  name: string
  type: 'restaurant' | 'wine'
}
```

### 2. `src/app/api/restaurants/route.ts`

```typescript
// src/app/api/restaurants/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()

  // 필수 필드 검증
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json({ error: 'NAME_REQUIRED' }, { status: 400 })
  }

  const name = body.name.trim()

  // 중복 체크 (정규화된 이름 기준)
  const { data: existing } = await supabase
    .from('restaurants')
    .select('id, name')
    .ilike('name', name)
    .limit(1)

  if (existing && existing.length > 0) {
    // 동일 이름 존재 → 기존 ID 반환 (중복 INSERT 방지)
    return NextResponse.json({
      id: existing[0].id,
      name: existing[0].name,
      type: 'restaurant',
      isExisting: true,
    })
  }

  const { data, error } = await supabase
    .from('restaurants')
    .insert({
      name,
      address: body.address ?? null,
      area: body.area ?? null,
      genre: body.genre ?? null,
      price_range: body.priceRange ?? null,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
    })
    .select('id, name')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'INSERT_FAILED' }, { status: 500 })
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    type: 'restaurant',
    isExisting: false,
  }, { status: 201 })
}
```

### 3. `src/app/api/wines/route.ts`

```typescript
// src/app/api/wines/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()

  // 필수 필드 검증
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json({ error: 'NAME_REQUIRED' }, { status: 400 })
  }
  if (!body.wineType) {
    return NextResponse.json({ error: 'WINE_TYPE_REQUIRED' }, { status: 400 })
  }

  const name = body.name.trim()

  // 중복 체크 (이름 + 빈티지)
  let duplicateQuery = supabase
    .from('wines')
    .select('id, name')
    .ilike('name', name)

  if (body.vintage) {
    duplicateQuery = duplicateQuery.eq('vintage', body.vintage)
  }

  const { data: existing } = await duplicateQuery.limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({
      id: existing[0].id,
      name: existing[0].name,
      type: 'wine',
      isExisting: true,
    })
  }

  const { data, error } = await supabase
    .from('wines')
    .insert({
      name,
      producer: body.producer ?? null,
      wine_type: body.wineType,
      vintage: body.vintage ?? null,
      region: body.region ?? null,
      country: body.country ?? null,
      variety: body.variety ?? null,
    })
    .select('id, name')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'INSERT_FAILED' }, { status: 500 })
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    type: 'wine',
    isExisting: false,
  }, { status: 201 })
}
```

### 4. `src/application/hooks/use-register.ts`

```typescript
// src/application/hooks/use-register.ts

import { useState, useCallback } from 'react'
import type {
  CreateRestaurantInput,
  CreateWineInput,
  RegisterResult,
} from '@/domain/entities/register'

interface UseRegisterReturn {
  isSubmitting: boolean
  error: string | null
  registerRestaurant: (input: CreateRestaurantInput) => Promise<RegisterResult | null>
  registerWine: (input: CreateWineInput) => Promise<RegisterResult | null>
  reset: () => void
}

export function useRegister(): UseRegisterReturn {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const registerRestaurant = useCallback(async (
    input: CreateRestaurantInput
  ): Promise<RegisterResult | null> => {
    if (!input.name.trim()) {
      setError('가게명을 입력해주세요')
      return null
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: input.name,
          address: input.address,
          area: input.area,
          genre: input.genre,
          priceRange: input.priceRange,
          lat: input.lat,
          lng: input.lng,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error === 'NAME_REQUIRED' ? '가게명을 입력해주세요' : '등록에 실패했습니다')
        return null
      }

      return {
        id: data.id,
        name: data.name,
        type: 'restaurant',
      }
    } catch {
      setError('네트워크 오류가 발생했습니다')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const registerWine = useCallback(async (
    input: CreateWineInput
  ): Promise<RegisterResult | null> => {
    if (!input.name.trim()) {
      setError('와인명을 입력해주세요')
      return null
    }
    if (!input.wineType) {
      setError('와인 타입을 선택해주세요')
      return null
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/wines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: input.name,
          producer: input.producer,
          wineType: input.wineType,
          vintage: input.vintage,
          region: input.region,
          country: input.country,
          variety: input.variety,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMap: Record<string, string> = {
          NAME_REQUIRED: '와인명을 입력해주세요',
          WINE_TYPE_REQUIRED: '와인 타입을 선택해주세요',
        }
        setError(errorMap[data.error] ?? '등록에 실패했습니다')
        return null
      }

      return {
        id: data.id,
        name: data.name,
        type: 'wine',
      }
    } catch {
      setError('네트워크 오류가 발생했습니다')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsSubmitting(false)
    setError(null)
  }, [])

  return { isSubmitting, error, registerRestaurant, registerWine, reset }
}
```

### 5. `src/presentation/components/register/restaurant-register-form.tsx`

```typescript
// src/presentation/components/register/restaurant-register-form.tsx

import { useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import type { CreateRestaurantInput, RestaurantGenre } from '@/domain/entities/register'
import { RESTAURANT_GENRES } from '@/domain/entities/register'

interface RestaurantRegisterFormProps {
  /** 검색어 pre-fill */
  initialName: string
  /** GPS 좌표 (자동 입력) */
  currentLat: number | null
  currentLng: number | null
  /** 제출 핸들러 */
  onSubmit: (input: CreateRestaurantInput) => void
  /** 로딩 상태 */
  isSubmitting: boolean
  /** 에러 메시지 */
  error: string | null
}

export function RestaurantRegisterForm({
  initialName,
  currentLat,
  currentLng,
  onSubmit,
  isSubmitting,
  error,
}: RestaurantRegisterFormProps) {
  const [name, setName] = useState(initialName)
  const [address, setAddress] = useState('')
  const [genre, setGenre] = useState<RestaurantGenre | null>(null)

  const handleSubmit = () => {
    onSubmit({
      name: name.trim(),
      address: address.trim() || null,
      area: null,  // 주소에서 자동 추출 (API에서 처리)
      genre,
      priceRange: null,
      lat: currentLat,
      lng: currentLng,
    })
  }

  return (
    <div className="flex flex-col px-5 py-6 gap-5">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-food-light)] flex items-center justify-center">
          <UtensilsCrossed size={20} className="text-[var(--accent-food)]" />
        </div>
        <div>
          <h3 className="text-[16px] font-semibold text-[var(--text)]">새 식당 등록</h3>
          <p className="text-[12px] text-[var(--text-sub)]">목록에 없는 식당을 직접 등록하세요</p>
        </div>
      </div>

      {/* 가게명 (필수) */}
      <div>
        <label className="block text-[13px] font-medium text-[var(--text)] mb-1.5">
          가게명 <span className="text-[var(--accent-food)]">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="가게 이름을 입력하세요"
          className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[14px] text-[var(--text)] placeholder:text-[var(--text-hint)] outline-none focus:border-[var(--accent-food)]"
        />
      </div>

      {/* 주소 (선택) */}
      <div>
        <label className="block text-[13px] font-medium text-[var(--text)] mb-1.5">
          주소 <span className="text-[12px] text-[var(--text-hint)]">(선택)</span>
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="주소 또는 위치를 입력하세요"
          className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[14px] text-[var(--text)] placeholder:text-[var(--text-hint)] outline-none focus:border-[var(--accent-food)]"
        />
      </div>

      {/* 장르 (선택) */}
      <div>
        <label className="block text-[13px] font-medium text-[var(--text)] mb-1.5">
          장르 <span className="text-[12px] text-[var(--text-hint)]">(선택)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {RESTAURANT_GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenre(genre === g ? null : g)}
              className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
                genre === g
                  ? 'bg-[var(--accent-food)] text-white border-[var(--accent-food)]'
                  : 'bg-[var(--bg-card)] text-[var(--text-sub)] border-[var(--border)]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <p className="text-[13px] text-red-500">{error}</p>
      )}

      {/* 등록 버튼 */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || !name.trim()}
        className="w-full py-3.5 rounded-xl bg-[var(--accent-food)] text-white text-[15px] font-semibold disabled:opacity-50"
      >
        {isSubmitting ? '등록 중...' : '등록하기'}
      </button>
    </div>
  )
}
```

### 6. `src/presentation/components/register/wine-register-form.tsx`

```typescript
// src/presentation/components/register/wine-register-form.tsx

import { useState } from 'react'
import { Wine } from 'lucide-react'
import type { CreateWineInput, WineType } from '@/domain/entities/register'
import { WINE_TYPES } from '@/domain/entities/register'

interface WineRegisterFormProps {
  initialName: string
  initialProducer: string | null
  initialVintage: number | null
  onSubmit: (input: CreateWineInput) => void
  isSubmitting: boolean
  error: string | null
}

export function WineRegisterForm({
  initialName,
  initialProducer,
  initialVintage,
  onSubmit,
  isSubmitting,
  error,
}: WineRegisterFormProps) {
  const [name, setName] = useState(initialName)
  const [producer, setProducer] = useState(initialProducer ?? '')
  const [wineType, setWineType] = useState<WineType | null>(null)
  const [vintage, setVintage] = useState(initialVintage ? String(initialVintage) : '')
  const [region, setRegion] = useState('')
  const [country, setCountry] = useState('')

  const handleSubmit = () => {
    if (!wineType) return

    onSubmit({
      name: name.trim(),
      producer: producer.trim() || null,
      wineType,
      vintage: vintage ? Number(vintage) : null,
      region: region.trim() || null,
      country: country.trim() || null,
      variety: null,
    })
  }

  return (
    <div className="flex flex-col px-5 py-6 gap-5">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-wine-light)] flex items-center justify-center">
          <Wine size={20} className="text-[var(--accent-wine)]" />
        </div>
        <div>
          <h3 className="text-[16px] font-semibold text-[var(--text)]">새 와인 등록</h3>
          <p className="text-[12px] text-[var(--text-sub)]">목록에 없는 와인을 직접 등록하세요</p>
        </div>
      </div>

      {/* 와인명 (필수) */}
      <div>
        <label className="block text-[13px] font-medium text-[var(--text)] mb-1.5">
          와인명 <span className="text-[var(--accent-wine)]">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="와인 이름을 입력하세요"
          className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[14px] text-[var(--text)] placeholder:text-[var(--text-hint)] outline-none focus:border-[var(--accent-wine)]"
        />
      </div>

      {/* 와인 타입 (필수) */}
      <div>
        <label className="block text-[13px] font-medium text-[var(--text)] mb-1.5">
          타입 <span className="text-[var(--accent-wine)]">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {WINE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setWineType(wineType === t.value ? null : t.value)}
              className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
                wineType === t.value
                  ? 'bg-[var(--accent-wine)] text-white border-[var(--accent-wine)]'
                  : 'bg-[var(--bg-card)] text-[var(--text-sub)] border-[var(--border)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 생산자 (선택) */}
      <div>
        <label className="block text-[13px] font-medium text-[var(--text)] mb-1.5">
          생산자 <span className="text-[12px] text-[var(--text-hint)]">(선택)</span>
        </label>
        <input
          type="text"
          value={producer}
          onChange={(e) => setProducer(e.target.value)}
          placeholder="와이너리 또는 생산자명"
          className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[14px] text-[var(--text)] placeholder:text-[var(--text-hint)] outline-none focus:border-[var(--accent-wine)]"
        />
      </div>

      {/* 빈티지 (선택) */}
      <div>
        <label className="block text-[13px] font-medium text-[var(--text)] mb-1.5">
          빈티지 <span className="text-[12px] text-[var(--text-hint)]">(선택)</span>
        </label>
        <input
          type="number"
          value={vintage}
          onChange={(e) => setVintage(e.target.value)}
          placeholder="예: 2018"
          min="1900"
          max={new Date().getFullYear()}
          className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[14px] text-[var(--text)] placeholder:text-[var(--text-hint)] outline-none focus:border-[var(--accent-wine)]"
        />
      </div>

      {/* 산지 + 국가 (선택) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[13px] font-medium text-[var(--text)] mb-1.5">
            산지 <span className="text-[12px] text-[var(--text-hint)]">(선택)</span>
          </label>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="예: Bordeaux"
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[14px] text-[var(--text)] placeholder:text-[var(--text-hint)] outline-none focus:border-[var(--accent-wine)]"
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[var(--text)] mb-1.5">
            국가 <span className="text-[12px] text-[var(--text-hint)]">(선택)</span>
          </label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="예: France"
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[14px] text-[var(--text)] placeholder:text-[var(--text-hint)] outline-none focus:border-[var(--accent-wine)]"
          />
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <p className="text-[13px] text-red-500">{error}</p>
      )}

      {/* 등록 버튼 */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || !name.trim() || !wineType}
        className="w-full py-3.5 rounded-xl bg-[var(--accent-wine)] text-white text-[15px] font-semibold disabled:opacity-50"
      >
        {isSubmitting ? '등록 중...' : '등록하기'}
      </button>
    </div>
  )
}
```

---

## 데이터 흐름

```
┌─ 검색 결과 없음 → "직접 등록하기" 탭
│
├─ 식당 등록:
│  ├─ RestaurantRegisterForm 표시
│  │   ├─ name (필수, 검색어 pre-fill)
│  │   ├─ address (선택)
│  │   ├─ genre (선택, 칩 선택)
│  │   └─ lat/lng (사용자 GPS 자동 입력)
│  │
│  ├─ useRegister.registerRestaurant(input)
│  │   └─ POST /api/restaurants
│  │       ├─ 중복 체크 (name ILIKE) → 기존 ID 반환
│  │       └─ 새 INSERT → { id, name, type: 'restaurant' }
│  │
│  └─ 등록 성공 → 07_full_flow.md:
│     ├─ target_id = 새 식당 ID
│     ├─ records INSERT (status='checked')
│     └─ 성공 화면 (screen-add-success)
│
└─ 와인 등록:
   ├─ WineRegisterForm 표시
   │   ├─ name (필수, OCR 결과 pre-fill)
   │   ├─ wineType (필수, 칩 선택)
   │   ├─ producer (선택, OCR pre-fill)
   │   ├─ vintage (선택, OCR pre-fill)
   │   ├─ region (선택)
   │   └─ country (선택)
   │
   ├─ useRegister.registerWine(input)
   │   └─ POST /api/wines
   │       ├─ 중복 체크 (name+vintage) → 기존 ID 반환
   │       └─ 새 INSERT → { id, name, type: 'wine' }
   │
   └─ 등록 성공 → 07_full_flow.md 연결
```

---

## 검증 체크리스트

```
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
□ R1: domain/entities/register.ts에 외부 import 없음
□ R3: application/hooks/use-register.ts에 infrastructure import 없음
□ R4: presentation/components/register/*.tsx에 infrastructure import 없음
□ 식당 등록: name 필수, address/genre 선택
□ 와인 등록: name+wineType 필수, 나머지 선택
□ 중복 체크: 같은 이름 식당 → 기존 ID 반환 (중복 INSERT 방지)
□ 와인 중복: 같은 이름+빈티지 → 기존 ID 반환
□ OCR 결과 pre-fill: 와인명/생산자/빈티지 자동 입력
□ 검색어 pre-fill: 검색 쿼리 → 등록 폼 name 자동 입력
□ 등록 후 → target_id 전달 → 기록 화면 연결
□ RLS: 인증된 사용자만 INSERT 가능
□ TypeScript strict: any/as any/@ts-ignore/! 0개
□ 디자인 토큰 사용, 하드코딩 색상 없음
□ 모바일 360px 레이아웃 정상
```
