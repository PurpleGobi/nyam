# S3-T03: 식당 검색 (Nyam DB + 외부 API)

> 검색 우선순위: Nyam DB 캐시 → 외부 API 폴백 (카카오/네이버/구글 Places 동시 호출) → 결과 통합 정렬 → 선택 시 restaurants 자동 INSERT

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `pages/01_SEARCH_REGISTER.md` | §3 자동완성 순서 | 1. Nyam DB → 2. 활동 지역 → 3. 외부 API |
| `pages/01_SEARCH_REGISTER.md` | §9 캐싱 정책 | 첫 등록 시 외부→DB 저장, 갱신 2주 |
| `pages/01_SEARCH_REGISTER.md` | §3 근처 식당 | GPS 기반 거리순 nearby 목록 |
| `systems/DATA_MODEL.md` | restaurants 테이블 | `external_ids`, `cached_at`, `next_refresh_at`, `lat`, `lng` |
| CLAUDE.md | Supabase 규칙 | `SUPABASE_SERVICE_ROLE_KEY`, 외부 API 키 → 서버 전용 |

---

## 선행 조건

- S1-T01 (DB 스키마) 완료 — restaurants 테이블 + PostGIS 인덱스
- S3-T02 (검색 UI) 완료 — `SearchResult` 타입, `useSearch` hook
- 환경 변수 설정: `KAKAO_REST_API_KEY`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `GOOGLE_PLACES_API_KEY`

---

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/domain/repositories/restaurant-repository.ts` | domain | 검색 메서드 인터페이스 추가 (기존 파일에 추가) |
| `src/infrastructure/api/kakao-local.ts` | infrastructure | 카카오 로컬 API 클라이언트 |
| `src/infrastructure/api/naver-local.ts` | infrastructure | 네이버 지역 검색 API 클라이언트 |
| `src/infrastructure/api/google-places.ts` | infrastructure | 구글 Places API 클라이언트 |
| `src/infrastructure/repositories/supabase-restaurant-repository.ts` | infrastructure | 검색 메서드 구현 (기존 파일에 추가) |
| `src/app/api/restaurants/search/route.ts` | app | 통합 검색 API route |
| `src/app/api/restaurants/nearby/route.ts` | app | GPS 기반 nearby API route |

### 스코프 외

- 검색 UI 컴포넌트 — `02_search_ui.md`에서 구현
- 와인 검색 — `04_wine_search.md`에서 구현
- 신규 등록 폼 — `06_register.md`에서 구현

---

## 상세 구현 지침

### 1. Domain 인터페이스 추가 — `src/domain/repositories/restaurant-repository.ts`

기존 RestaurantRepository 인터페이스에 검색 메서드 추가.

```typescript
// src/domain/repositories/restaurant-repository.ts (추가 메서드)

import type { RestaurantSearchResult, NearbyRestaurant } from '@/domain/entities/search'

export interface RestaurantRepository {
  // ... 기존 메서드 (S1에서 정의)

  /** 텍스트 검색 (Nyam DB) */
  searchByName(params: {
    query: string
    userId: string
    limit: number
  }): Promise<RestaurantSearchResult[]>

  /** GPS 기반 근처 식당 조회 */
  findNearby(params: {
    latitude: number
    longitude: number
    radiusMeters: number
    userId: string
    limit: number
  }): Promise<NearbyRestaurant[]>

  /** 외부 API 결과로 식당 INSERT (캐싱) */
  upsertFromExternal(restaurant: ExternalRestaurantData): Promise<string>

  /** 반경 내 식당 조회 (AI 매칭용) */
  findWithinRadius(params: {
    latitude: number
    longitude: number
    radiusMeters: number
  }): Promise<Array<{
    id: string
    name: string
    genre: string | null
    area: string | null
    distance: number
  }>>
}

/** 외부 API에서 가져온 식당 데이터 */
export interface ExternalRestaurantData {
  name: string
  address: string | null
  area: string | null
  genre: string | null
  lat: number | null
  lng: number | null
  phone: string | null
  externalIds: {
    kakao?: string
    naver?: string
    google?: string
  }
}
```

### 2. `src/infrastructure/api/kakao-local.ts`

```typescript
// src/infrastructure/api/kakao-local.ts
// 서버 전용 — KAKAO_REST_API_KEY 클라이언트 노출 금지

const KAKAO_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json'

export interface KakaoSearchResult {
  id: string
  placeName: string
  categoryGroupCode: string
  categoryGroupName: string
  phone: string
  addressName: string
  roadAddressName: string
  x: string  // longitude
  y: string  // latitude
  distance: string  // meters (좌표 기준 검색 시)
}

interface KakaoSearchParams {
  query: string
  /** 중심 좌표 (거리순 정렬용) */
  x?: number
  y?: number
  /** 반경 (m), 최대 20000 */
  radius?: number
  /** 페이지 (1~45) */
  page?: number
  /** 1~15 */
  size?: number
}

export async function searchKakaoLocal(params: KakaoSearchParams): Promise<KakaoSearchResult[]> {
  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) {
    throw new Error('KAKAO_REST_API_KEY is not configured')
  }

  const url = new URL(KAKAO_SEARCH_URL)
  url.searchParams.set('query', params.query)
  url.searchParams.set('category_group_code', 'FD6')  // 음식점
  url.searchParams.set('size', String(params.size ?? 10))
  url.searchParams.set('page', String(params.page ?? 1))

  if (params.x && params.y) {
    url.searchParams.set('x', String(params.x))
    url.searchParams.set('y', String(params.y))
    url.searchParams.set('sort', 'distance')
    if (params.radius) {
      url.searchParams.set('radius', String(params.radius))
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  })

  if (!response.ok) {
    throw new Error(`Kakao API error: ${response.status}`)
  }

  const data = await response.json()

  return (data.documents ?? []).map((doc: Record<string, string>) => ({
    id: doc.id,
    placeName: doc.place_name,
    categoryGroupCode: doc.category_group_code,
    categoryGroupName: doc.category_group_name,
    phone: doc.phone,
    addressName: doc.address_name,
    roadAddressName: doc.road_address_name,
    x: doc.x,
    y: doc.y,
    distance: doc.distance,
  }))
}
```

### 3. `src/infrastructure/api/naver-local.ts`

```typescript
// src/infrastructure/api/naver-local.ts
// 서버 전용 — NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 클라이언트 노출 금지

const NAVER_SEARCH_URL = 'https://openapi.naver.com/v1/search/local.json'

export interface NaverSearchResult {
  title: string       // HTML 태그 포함 가능 (<b> 등)
  link: string
  category: string    // "한식>육류,고기요리" 형태
  description: string
  telephone: string
  address: string
  roadAddress: string
  mapx: string        // KATEC x좌표
  mapy: string        // KATEC y좌표
}

interface NaverSearchParams {
  query: string
  display?: number  // 1~5
  start?: number
  sort?: 'random' | 'comment'  // random=정확도, comment=리뷰순
}

export async function searchNaverLocal(params: NaverSearchParams): Promise<NaverSearchResult[]> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('NAVER_CLIENT_ID or NAVER_CLIENT_SECRET is not configured')
  }

  const url = new URL(NAVER_SEARCH_URL)
  url.searchParams.set('query', `${params.query} 맛집`)  // "맛집" 추가로 음식점 필터링
  url.searchParams.set('display', String(params.display ?? 5))
  url.searchParams.set('start', String(params.start ?? 1))
  url.searchParams.set('sort', params.sort ?? 'random')

  const response = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  })

  if (!response.ok) {
    throw new Error(`Naver API error: ${response.status}`)
  }

  const data = await response.json()
  return data.items ?? []
}

/** HTML 태그 제거 유틸 */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}
```

### 4. `src/infrastructure/api/google-places.ts`

```typescript
// src/infrastructure/api/google-places.ts
// 서버 전용 — GOOGLE_PLACES_API_KEY 클라이언트 노출 금지

const GOOGLE_PLACES_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json'

export interface GooglePlaceResult {
  placeId: string
  name: string
  formattedAddress: string
  geometry: {
    location: { lat: number; lng: number }
  }
  types: string[]
  rating: number | null
  openingHours: { openNow: boolean } | null
}

interface GooglePlacesSearchParams {
  query: string
  /** 중심 좌표 */
  latitude?: number
  longitude?: number
  /** 반경 (m) */
  radius?: number
  /** 언어 */
  language?: string
  /** 타입 필터 */
  type?: string
}

export async function searchGooglePlaces(params: GooglePlacesSearchParams): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured')
  }

  const url = new URL(GOOGLE_PLACES_URL)
  url.searchParams.set('query', params.query)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('language', params.language ?? 'ko')
  url.searchParams.set('type', params.type ?? 'restaurant')

  if (params.latitude && params.longitude) {
    url.searchParams.set('location', `${params.latitude},${params.longitude}`)
    if (params.radius) {
      url.searchParams.set('radius', String(params.radius))
    }
  }

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`)
  }

  const data = await response.json()

  return (data.results ?? []).map((result: Record<string, unknown>) => ({
    placeId: result.place_id as string,
    name: result.name as string,
    formattedAddress: result.formatted_address as string,
    geometry: result.geometry as { location: { lat: number; lng: number } },
    types: result.types as string[],
    rating: (result.rating as number) ?? null,
    openingHours: (result.opening_hours as { open_now: boolean } | null)
      ? { openNow: (result.opening_hours as { open_now: boolean }).open_now }
      : null,
  }))
}
```

### 5. `src/app/api/restaurants/search/route.ts`

**통합 검색 API**: Nyam DB 우선 → 외부 API 폴백 → 결과 병합 정렬

```typescript
// src/app/api/restaurants/search/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/server'
import { searchKakaoLocal } from '@/infrastructure/api/kakao-local'
import { searchNaverLocal, stripHtmlTags } from '@/infrastructure/api/naver-local'
import { searchGooglePlaces } from '@/infrastructure/api/google-places'
import type { RestaurantSearchResult } from '@/domain/entities/search'
import type { ExternalRestaurantData } from '@/domain/repositories/restaurant-repository'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ results: [] }, { status: 401 })
  }

  const query = request.nextUrl.searchParams.get('q') ?? ''
  const lat = request.nextUrl.searchParams.get('lat')
  const lng = request.nextUrl.searchParams.get('lng')

  if (query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // ── Step 1: Nyam DB 검색 ──
  const { data: dbResults } = await supabase
    .from('restaurants')
    .select('id, name, genre, area, address, lat, lng')
    .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
    .limit(20)

  // 사용자 기록 여부 확인
  const restaurantIds = (dbResults ?? []).map((r) => r.id)
  const { data: userRecords } = restaurantIds.length > 0
    ? await supabase
        .from('records')
        .select('target_id')
        .eq('user_id', user.id)
        .eq('target_type', 'restaurant')
        .in('target_id', restaurantIds)
    : { data: [] }

  const recordedIds = new Set((userRecords ?? []).map((r) => r.target_id))

  const nyamResults: RestaurantSearchResult[] = (dbResults ?? []).map((r) => ({
    id: r.id,
    type: 'restaurant' as const,
    name: r.name,
    genre: r.genre,
    area: r.area,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    distance: lat && lng && r.lat && r.lng
      ? calculateDistance(Number(lat), Number(lng), r.lat, r.lng)
      : null,
    hasRecord: recordedIds.has(r.id),
  }))

  // Nyam DB 결과가 5개 이상이면 외부 API 스킵
  if (nyamResults.length >= 5) {
    return NextResponse.json({
      results: sortResults(nyamResults),
    })
  }

  // ── Step 2: 외부 API 동시 호출 (폴백) ──
  const externalResults = await fetchExternalResults(query, lat ? Number(lat) : undefined, lng ? Number(lng) : undefined)

  // 중복 제거 (이름+주소 기준)
  const existingNames = new Set(nyamResults.map((r) => normalizeForDedup(r.name)))
  const newExternals = externalResults.filter(
    (ext) => !existingNames.has(normalizeForDedup(ext.name))
  )

  // 외부 결과를 SearchResult로 변환 (아직 DB에 미저장)
  const externalSearchResults: RestaurantSearchResult[] = newExternals.map((ext) => ({
    id: `ext_${ext.externalIds.kakao ?? ext.externalIds.naver ?? ext.externalIds.google ?? ''}`,
    type: 'restaurant' as const,
    name: ext.name,
    genre: ext.genre,
    area: ext.area,
    address: ext.address,
    lat: ext.lat,
    lng: ext.lng,
    distance: lat && lng && ext.lat && ext.lng
      ? calculateDistance(Number(lat), Number(lng), ext.lat, ext.lng)
      : null,
    hasRecord: false,
  }))

  return NextResponse.json({
    results: sortResults([...nyamResults, ...externalSearchResults]),
    // 외부 데이터 (선택 시 DB INSERT 용)
    externalData: newExternals,
  })
}

/** 외부 API 3종 동시 호출 → 통합 */
async function fetchExternalResults(
  query: string,
  lat?: number,
  lng?: number
): Promise<ExternalRestaurantData[]> {
  const results: ExternalRestaurantData[] = []

  // 병렬 호출 (실패해도 다른 API 결과는 유지)
  const [kakaoResult, naverResult, googleResult] = await Promise.allSettled([
    searchKakaoLocal({ query, x: lng, y: lat, radius: 20000, size: 5 }),
    searchNaverLocal({ query, display: 5 }),
    searchGooglePlaces({ query, latitude: lat, longitude: lng, radius: 20000 }),
  ])

  // 카카오 결과 변환
  if (kakaoResult.status === 'fulfilled') {
    for (const item of kakaoResult.value) {
      results.push({
        name: item.placeName,
        address: item.roadAddressName || item.addressName || null,
        area: extractArea(item.roadAddressName || item.addressName),
        genre: mapKakaoCategory(item.categoryGroupName),
        lat: item.y ? Number(item.y) : null,
        lng: item.x ? Number(item.x) : null,
        phone: item.phone || null,
        externalIds: { kakao: item.id },
      })
    }
  }

  // 네이버 결과 변환
  if (naverResult.status === 'fulfilled') {
    for (const item of naverResult.value) {
      results.push({
        name: stripHtmlTags(item.title),
        address: item.roadAddress || item.address || null,
        area: extractArea(item.roadAddress || item.address),
        genre: mapNaverCategory(item.category),
        lat: null,  // KATEC 좌표 변환 필요 — 별도 처리
        lng: null,
        phone: item.telephone || null,
        externalIds: { naver: item.link },
      })
    }
  }

  // 구글 결과 변환
  if (googleResult.status === 'fulfilled') {
    for (const item of googleResult.value) {
      results.push({
        name: item.name,
        address: item.formattedAddress || null,
        area: extractArea(item.formattedAddress),
        genre: null,  // 구글 types → 장르 매핑 별도 필요
        lat: item.geometry.location.lat,
        lng: item.geometry.location.lng,
        phone: null,
        externalIds: { google: item.placeId },
      })
    }
  }

  return results
}

/** 결과 정렬: Nyam DB 우선 → 거리순 */
function sortResults(results: RestaurantSearchResult[]): RestaurantSearchResult[] {
  return results.sort((a, b) => {
    // Nyam DB 항목 우선 (ext_ prefix 없는 것)
    const aIsNyam = !a.id.startsWith('ext_')
    const bIsNyam = !b.id.startsWith('ext_')
    if (aIsNyam && !bIsNyam) return -1
    if (!aIsNyam && bIsNyam) return 1

    // 같은 소스 내에서는 거리순
    const aDist = a.distance ?? Infinity
    const bDist = b.distance ?? Infinity
    return aDist - bDist
  })
}

/** Haversine 거리 계산 (m) */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** 중복 제거용 이름 정규화 */
function normalizeForDedup(name: string): string {
  return name.replace(/\s/g, '').toLowerCase()
}

/** 주소에서 동네명 추출 (간략) */
function extractArea(address: string | null): string | null {
  if (!address) return null
  // "서울특별시 중구 을지로3가" → "을지로3가"
  const parts = address.split(' ')
  return parts.length >= 3 ? parts[parts.length - 1] : null
}

/** 카카오 카테고리 → 장르 매핑 */
function mapKakaoCategory(category: string): string | null {
  const map: Record<string, string> = {
    '음식점': '한식',
    '한식': '한식',
    '일식': '일식',
    '양식': '양식',
    '중식': '중식',
    '카페': '카페',
    '분식': '한식',
    '패스트푸드': '양식',
  }
  return map[category] ?? null
}

/** 네이버 카테고리 → 장르 매핑 */
function mapNaverCategory(category: string): string | null {
  // "한식>육류,고기요리" → "한식"
  const primary = category.split('>')[0]?.trim()
  return primary || null
}
```

### 6. `src/app/api/restaurants/nearby/route.ts`

```typescript
// src/app/api/restaurants/nearby/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/server'
import type { NearbyRestaurant } from '@/domain/entities/search'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ restaurants: [] }, { status: 401 })
  }

  const lat = request.nextUrl.searchParams.get('lat')
  const lng = request.nextUrl.searchParams.get('lng')
  const radius = request.nextUrl.searchParams.get('radius') ?? '2000'

  if (!lat || !lng) {
    return NextResponse.json({ restaurants: [] }, { status: 400 })
  }

  // PostGIS 반경 검색 (RPC)
  const { data: nearby } = await supabase.rpc('restaurants_within_radius', {
    lat: Number(lat),
    lng: Number(lng),
    radius_meters: Number(radius),
  })

  if (!nearby || nearby.length === 0) {
    return NextResponse.json({ restaurants: [] })
  }

  // 기록 여부 확인
  const ids = nearby.map((r: { id: string }) => r.id)
  const { data: records } = await supabase
    .from('records')
    .select('target_id')
    .eq('user_id', user.id)
    .eq('target_type', 'restaurant')
    .in('target_id', ids)

  const recordedIds = new Set((records ?? []).map((r) => r.target_id))

  const restaurants: NearbyRestaurant[] = nearby.map((r: {
    id: string
    name: string
    genre: string | null
    area: string | null
    distance: number
  }) => ({
    id: r.id,
    name: r.name,
    genre: r.genre,
    area: r.area,
    distance: r.distance,
    hasRecord: recordedIds.has(r.id),
  }))

  return NextResponse.json({ restaurants })
}
```

---

## DB RPC 함수 (마이그레이션 필요)

```sql
-- supabase/migrations/XXX_restaurants_within_radius.sql

CREATE OR REPLACE FUNCTION restaurants_within_radius(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INT
)
RETURNS TABLE(
  id UUID,
  name VARCHAR(100),
  genre VARCHAR(30),
  area VARCHAR(50),
  distance DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    r.id,
    r.name,
    r.genre,
    r.area,
    ST_DistanceSphere(
      ST_MakePoint(r.lng, r.lat),
      ST_MakePoint(lng, lat)
    ) AS distance
  FROM restaurants r
  WHERE r.lat IS NOT NULL
    AND r.lng IS NOT NULL
    AND ST_DistanceSphere(
      ST_MakePoint(r.lng, r.lat),
      ST_MakePoint(lng, lat)
    ) <= radius_meters
  ORDER BY distance
  LIMIT 20;
$$;
```

---

## 데이터 흐름

```
┌─ 사용자: 검색 입력 "스시코우지"
│
├─ useSearch → debounce 300ms → GET /api/restaurants/search?q=스시코우지&lat=...&lng=...
│
├─ API Route:
│  ├─ Step 1: Nyam DB 검색
│  │   └─ supabase.from('restaurants').select().ilike('name', '%스시코우지%')
│  │       → 결과: [{id, name:"스시코우지", genre:"일식", area:"을지로"}]
│  │
│  ├─ DB 결과 >= 5개? → 외부 API 스킵 → 즉시 반환
│  │
│  ├─ Step 2: 외부 API 동시 호출 (DB 결과 < 5개일 때)
│  │   ├─ 카카오: searchKakaoLocal("스시코우지") → 5건
│  │   ├─ 네이버: searchNaverLocal("스시코우지") → 5건
│  │   └─ 구글: searchGooglePlaces("스시코우지") → 5건
│  │
│  ├─ 중복 제거 (이름 정규화 기준)
│  ├─ 정렬: Nyam DB 우선 → 거리순
│  └─ 반환: { results: [...], externalData: [...] }
│
├─ 사용자: 외부 결과 선택
│  └─ 07_full_flow.md:
│     ├─ POST /api/restaurants (externalData → restaurants INSERT)
│     ├─ records INSERT (status='checked')
│     └─ 성공 화면
│
└─ 캐싱: restaurants.cached_at = NOW(), next_refresh_at = NOW() + 14일
```

---

## 검증 체크리스트

```
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
□ R1: domain/repositories/restaurant-repository.ts에 외부 import 없음
□ R2: infrastructure/api/*.ts가 domain 인터페이스 구현
□ KAKAO_REST_API_KEY, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, GOOGLE_PLACES_API_KEY 서버 전용 (클라이언트 미노출)
□ Nyam DB 검색 결과 >= 5개 → 외부 API 호출 안 함
□ 외부 API 3종 병렬 호출 (Promise.allSettled — 하나 실패해도 나머지 유지)
□ 중복 제거: 같은 이름 식당 중복 표시 안 함
□ 정렬: Nyam DB 우선, 거리순
□ 외부 결과 선택 시 restaurants 테이블 자동 INSERT
□ "기록 있음" 뱃지: 사용자 기록 존재 여부 정확
□ nearby API: GPS 반경 검색 동작
□ TypeScript strict: any/as any/@ts-ignore/! 0개
□ PostGIS RPC 함수 마이그레이션 파일 생성
```
