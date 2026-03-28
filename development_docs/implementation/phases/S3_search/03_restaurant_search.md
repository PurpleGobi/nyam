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
// src/domain/repositories/restaurant-repository.ts
// R1: 외부 의존 0

import type { RestaurantSearchResult, NearbyRestaurant } from '@/domain/entities/search'
import type { CreateRestaurantInput } from '@/domain/entities/register'

export type { CreateRestaurantInput }

export interface RestaurantRepository {
  /** 텍스트 검색 (Nyam DB) — name ILIKE */
  search(query: string, userId: string): Promise<RestaurantSearchResult[]>

  /** GPS 기반 근처 식당 조회 (PostGIS RPC) */
  findNearby(lat: number, lng: number, radiusMeters: number, userId: string): Promise<NearbyRestaurant[]>

  /** 신규 식당 등록 (중복 체크 포함 — 같은 이름 존재 시 기존 ID 반환) */
  create(input: CreateRestaurantInput): Promise<{ id: string; name: string; isExisting: boolean }>
}
```

> **설계 변경 사항**: 초기 설계의 `searchByName(params)`, `upsertFromExternal()`, `findWithinRadius()` 메서드는 구현 시 단순화됨.
> - `searchByName` → `search` (개별 파라미터)
> - `upsertFromExternal` → `create`로 통합 (중복 체크 포함)
> - `findWithinRadius` → API Route에서 RPC 직접 호출 (`restaurants_within_radius`)

### 2~4. 외부 API 클라이언트

> **구현 시 변경 사항**: 각 API 클라이언트는 설계의 `params` 객체 패턴 대신 **개별 파라미터 방식**으로 단순화됨.
> 실제 구현 코드는 `src/infrastructure/api/kakao-local.ts`, `naver-local.ts`, `google-places.ts` 참조.
>
> 주요 차이:
> - Kakao: `searchKakaoLocal(query, lat?, lng?, options?: { radius?, size? })` — options 객체 패턴, FD6 카테고리 필터 미적용. `radius` 기본값 20000, `size` 기본값 5
> - Naver: `searchNaverLocal(query)` — 개별 파라미터, 좌표는 `mapy/mapx` 필드를 `/ 1e7`로 변환 (KATEC 아님, 1e7 형식)
> - Google: `searchGooglePlaces(query, lat?, lng?, options?: { radius?, maxResults? })` — options 객체 패턴, New Places API(v1) POST 방식, `locationBias.circle.center` 형식 사용. `radius` 기본값 20000, `maxResults` 기본값 5

### 5. `src/app/api/restaurants/search/route.ts`

**통합 검색 API**: Nyam DB 우선 → 외부 API 폴백 → 결과 병합 정렬

```typescript
// src/app/api/restaurants/search/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'  // createClient (구 createServerClient 아님)
import { searchKakaoLocal } from '@/infrastructure/api/kakao-local'
import { searchNaverLocal, stripHtmlTags } from '@/infrastructure/api/naver-local'
import { searchGooglePlaces } from '@/infrastructure/api/google-places'
import type { RestaurantSearchResult } from '@/domain/entities/search'
// 설계 변경: ExternalRestaurantData 타입은 domain에 별도 정의하지 않고,
// search route 내부에 인라인 ExternalItem 인터페이스로 대체됨

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

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
      ? haversineDistance(Number(lat), Number(lng), r.lat, r.lng)
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

  // 중복 제거 (이름+주소 기준 — name만으로는 동명이점 구분 불가)
  const existingKeys = new Set(nyamResults.map((r) => normalizeForDedup(r.name) + '||' + normalizeForDedup(r.address ?? '')))
  const newExternals = externalResults.filter(
    (ext) => !existingKeys.has(normalizeForDedup(ext.name) + '||' + normalizeForDedup(ext.address ?? ''))
  )

  // 외부 결과를 SearchResult로 변환 (아직 DB에 미저장)
  const externalSearchResults: RestaurantSearchResult[] = newExternals.map((ext) => ({
    id: ext.externalIds.kakao ? `kakao_${ext.externalIds.kakao}` : ext.externalIds.naver ? `naver_${ext.externalIds.naver}` : `google_${ext.externalIds.google ?? ''}`,
    type: 'restaurant' as const,
    name: ext.name,
    genre: ext.genre,
    area: ext.area,
    address: ext.address,
    lat: ext.lat,
    lng: ext.lng,
    distance: lat && lng && ext.lat && ext.lng
      ? haversineDistance(Number(lat), Number(lng), ext.lat, ext.lng)
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
  // 실제 구현: Kakao/Google은 options 객체 패턴, Naver는 query만
  //   searchKakaoLocal(query, lat?, lng?, options?: { radius?, size? }) — radius 기본값 20000, size 기본값 5
  //   searchNaverLocal(query) — 좌표 미지원, mapy/mapx 필드를 / 1e7로 변환 반환
  //   searchGooglePlaces(query, lat?, lng?, options?: { radius?, maxResults? }) — New Places API(v1) POST 방식
  // 각 함수 반환값은 정규화된 인터페이스 (raw API 응답 필드 아님)
  const [kakaoResult, naverResult, googleResult] = await Promise.allSettled([
    searchKakaoLocal(query, lat, lng, { radius: 20000, size: 5 }),
    searchNaverLocal(query),
    searchGooglePlaces(query, lat, lng, { radius: 20000, maxResults: 5 }),
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
        lat: Number(item.mapy) / 1e7,  // 네이버는 1e7 형식 좌표 반환
        lng: Number(item.mapx) / 1e7,
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

/** 결과 정렬: 기록 있음 우선 → Nyam DB 우선 → 거리순 → 이름순 */
function sortResults(results: RestaurantSearchResult[]): RestaurantSearchResult[] {
  return results.sort((a, b) => {
    // 1. 기록 있는 항목 우선
    if (a.hasRecord && !b.hasRecord) return -1
    if (!a.hasRecord && b.hasRecord) return 1

    // 2. Nyam DB 항목 우선 (외부 API prefix 없는 것)
    const externalPrefixes = ['ext_', 'kakao_', 'naver_', 'google_']
    const aIsNyam = !externalPrefixes.some((p) => a.id.startsWith(p))
    const bIsNyam = !externalPrefixes.some((p) => b.id.startsWith(p))
    if (aIsNyam && !bIsNyam) return -1
    if (!aIsNyam && bIsNyam) return 1

    // 3. 같은 소스 내에서는 거리순
    const aDist = a.distance ?? Infinity
    const bDist = b.distance ?? Infinity
    if (aDist !== bDist) return aDist - bDist

    // 4. 최종 폴백: 이름순
    return a.name.localeCompare(b.name)
  })
}

/** Haversine 거리 계산 (m) */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
    '중식': '중식',
    '카페': '카페',
    '분식': '한식',
    '패스트푸드': '미국',
    '양식': '이탈리안',
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
import { createClient } from '@/infrastructure/supabase/server'
import type { NearbyRestaurant } from '@/domain/entities/search'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

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
│  ├─ 중복 제거 (이름+주소 정규화 기준)
│  ├─ 정렬: Nyam DB 우선 → 거리순
│  └─ 반환: { results: [...], externalData: [...] }
│
├─ 사용자: 외부 결과 선택 (id가 kakao_/naver_/google_ prefix)
│  └─ search-container.tsx에서 자동 INSERT:
│     ├─ POST /api/restaurants { name, address, area, genre, lat, lng }
│     │     INSERT 시 cached_at=NOW(), next_refresh_at=NOW()+14일 포함
│     ├─ 중복 체크 (name ILIKE) → 기존 ID 반환 or 새 INSERT
│     ├─ 반환된 DB ID로 targetId 교체 (외부 prefix ID → UUID)
│     ├─ /record 페이지로 이동 (targetId=새 UUID)
│     └─ INSERT 실패 시 → 외부 ID로 계속 진행 (graceful fallback)
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
□ 중복 제거: 같은 이름+주소 식당 중복 표시 안 함
□ 정렬: Nyam DB 우선, 거리순
□ 외부 결과 선택 시 restaurants 테이블 자동 INSERT
□ "기록 있음" 뱃지: 사용자 기록 존재 여부 정확
□ nearby API: GPS 반경 검색 동작
□ TypeScript strict: any/as any/@ts-ignore/! 0개
□ PostGIS RPC 함수 마이그레이션 파일 생성
```
