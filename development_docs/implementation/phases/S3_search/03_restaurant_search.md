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

  /** GPS 기반 근처 식당 조회 (실제 nearby는 카카오맵 API route에서 처리) */
  findNearby(lat: number, lng: number, radiusMeters: number, userId: string): Promise<NearbyRestaurant[]>

  /** 신규 식당 등록 (중복 체크 포함 — 같은 이름 존재 시 기존 ID 반환) */
  create(input: CreateRestaurantInput): Promise<{ id: string; name: string; isExisting: boolean }>
}
```

> **설계 변경 사항**: 초기 설계의 `searchByName(params)`, `upsertFromExternal()`, `findWithinRadius()` 메서드는 구현 시 단순화됨.
> - `searchByName` → `search` (개별 파라미터)
> - `upsertFromExternal` → `create`로 통합 (중복 체크 포함)
> - `findWithinRadius` → nearby API Route에서 카카오맵 API 직접 호출 (PostGIS 미사용)

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

> **설계 변경 사항** (초기 설계 대비):
> - RestaurantSearchResult에 `genreDisplay`, `categoryPath`, `phone`, `kakaoMapUrl` 필드 추가
> - DB 내부 중복 제거: `deduplicateNyamResults()` — 이름+좌표 근접 기준 그룹핑, 기록있는 행 우선
> - 외부 결과 중복 제거: `isSameRestaurant()` — 이름 완전 일치+좌표 200m 이내 or 이름 유사(Levenshtein ≤2)+좌표 100m 이내
> - 카카오 카테고리 매핑: `KAKAO_TO_SSOT` 대규모 매핑 테이블 + `mapKakaoCategoryDetail()` (세분류 "음식점 > 한식 > 냉면" 파싱)
> - 정렬: 거리순 우선 (기록 있음 우선 제거됨) — `sortResults()` 단순 거리순+이름순
> - `extractDistrict()`: 주소에서 구/군 추출 ("서울 강남구 도곡로 408" → "강남구")
> - `externalData` 반환: 선택 시 DB INSERT에 사용할 원본 데이터 포함 (`district`, `kakaoMapUrl` 등)
>
> 실제 코드는 `src/app/api/restaurants/search/route.ts` 참조.

```typescript
// 핵심 구조 (실제 구현 요약)
export async function GET(request: NextRequest) {
  // Step 1: Nyam DB 검색 (name/address ILIKE)
  //   → phone, kakao_map_url 포함 select
  //   → deduplicateNyamResults(): 같은 식당 여러 행 그룹핑 (기록 있는 행 우선)
  //   → genreDisplay = genre, categoryPath = null (DB 데이터)
  //
  // nyamResults >= 5개 → 외부 API 스킵
  //
  // Step 2: 외부 API 3종 병렬 호출 (Promise.allSettled)
  //   카카오: mapKakaoCategoryDetail(categoryDetail) → { genre, display } or 폴백 mapKakaoCategory()
  //   네이버: mapNaverCategory(category) → 대분류 추출
  //   구글: genre='기타' 고정
  //
  // 중복 제거: isSameRestaurant() — 이름+좌표 근접 기반 (Levenshtein editDistance 포함)
  // 정렬: sortResults() — 거리순 → 이름순 (단순)
  //
  // 반환: { results, externalData } — externalData는 선택 시 DB INSERT용
}
```

### 6. `src/app/api/restaurants/nearby/route.ts`

> **설계 변경 사항**: PostGIS RPC(`restaurants_within_radius`) 대신 **카카오맵 API**를 직접 사용.
> - `keyword` 파라미터로 장르 필터링 (카카오 키워드 검색)
> - 키워드 없으면 카카오 카테고리 검색 (FD6 = 음식점)
> - `KAKAO_REST_API_KEY` 서버 전용
> - 결과에 `categoryPath`, `address`, `lat`, `lng` 포함
> - 인증 불필요 (API 키 기반)

```typescript
// src/app/api/restaurants/nearby/route.ts (실제 구현 요약)

export async function GET(request: NextRequest) {
  // params: lat, lng, radius (기본 2000), keyword (장르 필터)
  //
  // keyword 있음 → 카카오 키워드 검색 (category_group_code=FD6)
  // keyword 없음 → 카카오 카테고리 검색 (FD6, 거리순, 15건)
  //
  // 결과: { restaurants: [{id, name, genre, categoryPath, area, address, lat, lng, distance, hasRecord}] }
  // - id: "kakao_{kakao_id}" prefix
  // - genre: extractGenre(category_name) → KAKAO_TO_SSOT 매핑
  // - area: extractArea(address) → 구/동 추출
  // - hasRecord: false (외부 API 결과이므로)
}
```

---

## DB RPC 함수

> **설계 변경**: nearby API는 카카오맵 API를 직접 사용하므로, `restaurants_within_radius` PostGIS RPC 함수는 현재 사용되지 않음.
> 다만 식당 AI 인식(`identify` route)에서 GPS 반경 내 식당 후보 조회용으로 별도 활용 가능.
> 실제 identify route에서도 카카오 API를 사용하므로 PostGIS RPC는 미사용 상태.

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
│  ├─ 중복 제거: isSameRestaurant() — 이름+좌표 근접 (Levenshtein 편집 거리 포함)
│  ├─ 정렬: 거리순 → 이름순
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
□ nearby API: 카카오맵 API 기반 반경 검색 동작 (장르/반경 필터)
□ TypeScript strict: any/as any/@ts-ignore/! 0개
```
