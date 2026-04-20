<!-- updated: 2026-04-20 -->
<!-- revised: 2026-04-20 §3.1 자기지시 오류 정정(블록 삭제) + §6.4 ON CONFLICT 키를 external_id_kakao 컬럼으로 확정 + §6.3 data_source 현재 운영값 확정(user_created/crawled) + §6.4 DATA_MODEL 라인번호 참조 → 섹션 참조로 완화 -->
# MAP_LOCATION — 지도 & 위치 시스템

> **depends_on**: DATA_MODEL, QUERY_OPTIMIZATION
> **affects**: RECOMMENDATION, RECORD_SYSTEM
>
> Nyam의 위치·지도·생활권·와인 산지 드릴다운·자체 식당 DB 구축을 통합하는 SSOT.
> DB 스키마 정의는 `DATA_MODEL.md`, 인덱스/쿼리 계획은 `QUERY_OPTIMIZATION.md`로 위임한다.
> 본 문서는 "좌표가 어떻게 의미 있는 위치(구/생활권)로 해석되는가", "지도뷰가 어떻게 서빙되는가", "자체 식당 DB가 어떻게 채워지는가"를 다룬다.

---

## 1. 좌표 시스템

### 1.1 `restaurants.geom` (PostGIS geography/geometry)

- 컬럼 정의는 `DATA_MODEL.md` 참조. `geom geometry(Point, 4326)`는 `lat`/`lng`와 별도로 저장되는 **stored column**이다.
- 동기화: `sync_restaurant_geom()` 트리거(`trg_restaurants_geom`)가 INSERT/UPDATE OF lat, lng 시점에 `ST_SetSRID(ST_MakePoint(lng, lat), 4326)`로 자동 갱신. 코드 레벨 동기화 불필요.
- 인덱스: `idx_restaurants_geom` (GiST on `geom`). 바운딩박스(`&& ST_MakeEnvelope`) 및 거리(`ST_Distance(::geography)`) 쿼리에서 공용 사용.
- 성능 근거: 062 마이그레이션에서 expression index → stored column 전환으로 290ms → 1.7ms (170배 개선). 상세는 `QUERY_OPTIMIZATION.md`.
- 근거: `supabase/migrations/062_geom_column_and_rpc_split.sql`, `DATA_MODEL.md` §11.5 인덱스 목록.

> **주의**: `geom` 컬럼 타입은 `geometry`이며, 거리 계산 시에는 `::geography` 캐스팅으로 미터 단위 결과를 얻는다 (072 마이그레이션 `ST_Distance(..., ... ::geography)` 패턴). GPS-grade 거리는 geography, 바운딩박스 교차는 geometry로 처리한다.

### 1.2 EXIF GPS 추출 (기록 사진)

- 유틸: `src/shared/utils/exif-parser.ts` — 순수 TS 구현. JPEG APP1(0xFFE1) → TIFF IFD → GPSInfo(tag 0x8825) 순회.
- 반환 타입: `ExifData = { gps: { latitude, longitude } | null; capturedAt: string | null; hasGps: boolean }`.
- DateTimeOriginal(tag 0x9003) → `captured_at`, GPSLatitude/Longitude(rational 3쌍) → DMS→decimal 변환, Ref(N/S/E/W)로 부호 결정.
- 저장 위치: `record_photos.exif_lat`, `record_photos.exif_lng`, `record_photos.captured_at` (`045_record_photos_exif_columns.sql`).

### 1.3 좌표 검증 / 보정 (GPS 반경 검증)

- 검증 로직: `src/domain/services/exif-validator.ts::validateExifGps`
  - 허용 반경 기본 200m (`radiusMeters` 파라미터로 조정).
  - `haversineDistanceMeters`로 photo EXIF GPS ↔ 식당 좌표 거리 산출.
  - 오래된 사진 경고: `capturedAt` 기준 7일 이상 → "N일 전 사진이네요", 30일 이상 → "N개월 전 사진이네요".
- 거리 계산: `src/domain/services/distance.ts` — `haversineDistance` (km), `haversineDistanceMeters` (m) 두 순수 함수. 지구 반지름 R=6371km. R1 준수 (외부 의존 0).
- 서버/클라이언트 모두 동일 함수 재사용 (API route, hook, 서비스 레이어).

### 1.4 좌표 해석 API

- 엔드포인트: `GET /api/restaurants/../../location/resolve?lat=...&lng=...` (라우트: `src/app/api/location/resolve/route.ts`)
- 반환: `{ country, city, district, area }`
- 흐름:
  1. 카카오 역지오코딩 `coord2regioncode.json` (서버에서만 호출, `KAKAO_REST_API_KEY` 노출 금지) → `region_1depth_name` → city, `region_2depth_name` → district.
  2. `area_zones` 전체 행 SELECT → haversine 거리 매칭 → `area` 결정 (§2 참조).
- API 키 부재/실패 시: district만 null, 나머지는 기본값 (`country='한국'`, `city='서울'`).

### 1.5 현재 위치 조회 훅

- 훅: `src/application/hooks/use-current-location.ts::useCurrentLocation`
  - 브라우저 `navigator.geolocation.getCurrentPosition` → `/api/location/resolve` 호출.
  - 옵션: `enableHighAccuracy: false`, `timeout: 5000ms`, `maximumAge: 60000ms` (배터리·응답성 우선).
  - 에러 매핑: PERMISSION_DENIED(code 1) → "위치 권한이 필요합니다".

---

## 2. 생활권 로직

### 2.1 area_zones 테이블

- 스키마 정의는 `DATA_MODEL.md` §`area_zones` 참조. 주요 컬럼: `name`, `city`, `lat`, `lng`, `radius_m`.
- 시드: `supabase/migrations/029_area_zones.sql` (초기 32개), `036_area_zones_radius_fix.sql` (반경 보정 + 다중 원 전환).
- 존재 이유: 사용자는 "강남", "홍대", "성수" 같은 **생활권 이름**에 익숙한데, 행정구역(구/동)과 1:1 대응이 안 됨. 도로명 주소에는 동이 없고, 생활권이 구 경계를 걸치기도 함. 따라서 **좌표 기반** 판정 채택.

### 2.2 판정 알고리즘 (haversine matching)

입력: 식당/사용자 좌표 `(lat, lng)`
출력: `area` (생활권 이름) 또는 `null`

```
closest = null
for zone in area_zones:
  dist = haversine(target.lat, target.lng, zone.lat, zone.lng)
  if dist <= zone.radius_m:
    if closest is null or dist < closest.dist:
      closest = { name: zone.name, dist }
area = closest?.name ?? null
```

- **반경 내 zone이 여러 개** → 가장 가까운 zone 1개 선택.
- **반경 밖** → `area = null` (어떤 생활권 필터에도 안 잡힘).
- 구현: `src/app/api/location/resolve/route.ts` (35~68줄) — `supabase.from('area_zones').select('name, lat, lng, radius_m')` → 클라이언트 사이드 이터레이션. 서울 시드 32개 규모라 전체 SELECT가 RPC보다 단순·충분.
- 근거: 개념문서 `_archive/개념문서_원본/생활권로직.md` (다중 원 설계), `위치필터_생활권.md` (컬럼 역할).

### 2.3 다중 원 (multi-ring) 설계

대형 상권(강남, 여의도)은 단일 원으로 커버하면 인접 구까지 침범하므로, **같은 `name`으로 N개 행 INSERT**하여 영역을 채운다.

- `area_zones.name`에 UNIQUE 제약 없음 → 중복 INSERT 허용.
- 매칭 로직상 어느 원이든 하나만 통과하면 해당 생활권으로 판정.
- 현재 다중 원:
  - **강남 (3원)**: 강남역·논현 / 대치·도곡 / 개포·수서 (각 1500m).
  - **여의도 (2원)**: 동쪽(IFC)·서쪽(국회) (1200~1300m).
- 세부 생활권(역삼/삼성/청담/압구정 등)은 단일 원으로 유지 — 더 가까운 zone이 우선 배정되므로, 별도 우선순위 로직 불필요.
- 상세 설계·반경 가이드: `_archive/개념문서_원본/생활권로직.md`.

### 2.4 생활권 기반 필터 (홈/지도뷰)

- **홈 필터** (클라이언트 사이드 문자열 비교): `src/domain/services/filter-matcher.ts` — 기록된 식당의 `area` 배열 (records 자체에는 area 없음, restaurants.area TEXT[])에 필터 값이 `includes`되면 매칭.
- **지도뷰 필터** (DB 레벨): `search_restaurants_bounds_*` RPC의 `p_area` 파라미터 → `p_area IS NULL OR p_area = ANY(rst.area)` (§3 참조).
- 좌표 재계산 없음 — 등록 시점에 결정된 `restaurants.area` 문자열/배열 값을 그대로 사용.

### 2.5 한계 및 과제

| 항목 | 상태 | 비고 |
|------|------|------|
| 식당 등록 시 `area` 자동 저장 | 등록 API 경로별 상이 | 카카오 크롤링 경로는 저장, 유저 등록 경로는 location/resolve 호출 여부에 의존 |
| 기존 식당 `area` 백필 | 필요 시 수동 SQL | area_zones 추가/반경 변경 후 재매칭 필요 |
| `area = null` 식당 | 필터 누락 | 어떤 생활권 필터에도 안 잡힘 |
| 해외 식당 | `area_zones` 미등록 | 해외 zone 추가 시까지 `area = null` |

---

## 3. 지도 뷰

### 3.1 현재 구현 상태 (2026-04-20 기준)

> **API 키 서버/공개 구분 원칙**: 렌더러(Google Maps JS)는 `NEXT_PUBLIC_GOOGLE_MAPS_KEY` 공개키 사용. 검색/Place Detail/Geocoding/Crawl 등은 `*_REST_API_KEY`/`*_SECRET_KEY` 서버 전용 키 사용. AUTH §6 키 관리 원칙 참조.

- **지도 렌더러**: Google Maps JS API (`@googlemaps/js-api-loader`). `NEXT_PUBLIC_GOOGLE_MAPS_KEY` 사용.
  - 컴포넌트: `src/presentation/components/home/map-view.tsx`, `map-pin.tsx`, `map-compact-item.tsx`.
  - POI 숨김 스타일 + 지도 톤 연하게 (도트 가시성). 커스텀 DOM 마커(`createDotHtml`/`createClusterHtml`).
- **카카오맵은 비사용**. 단, 카카오 Local API (`dapi.kakao.com`)는 서버 전용으로 다음 용도에 사용:
  1. 역지오코딩 (coord2regioncode, §1.4).
  2. 키워드 검색 (`src/infrastructure/api/kakao-local.ts`).
  3. 크롤링 시드 (§6).

### 3.2 바운딩박스 쿼리 (`search_restaurants_bounds_*`)

3-way 분리된 RPC. 호출자는 `src/app/api/restaurants/bounds/route.ts` → `useMapDiscovery`.

| RPC | 조건 | 동작 |
|-----|------|------|
| `search_restaurants_bounds_simple` | 비로그인 | `my_score = NULL`, `has_record = FALSE`. SQL language 인라인 |
| `search_restaurants_bounds_auth` | 로그인 + source 필터 없음 | correlated subquery로 유저 satisfaction 평균 → `my_score`. SQL language |
| `search_restaurants_bounds_source` | 로그인 + source 필터 있음 (`mine`/`following`/`bubble`) | PL/pgSQL, `v_filter_ids` 사전 집계 후 bounds 필터 적용 |

**공통 입력**:
- 바운딩박스: `p_north`, `p_south`, `p_east`, `p_west` → `geom && ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)`.
- 필터: `p_keyword` (ILIKE), `p_prestige_types`, `p_genre`, `p_district`, `p_area`.
- 정렬: `p_sort` ∈ `{ 'name', 'score_high', 'distance' }`.
- 거리 정렬: `p_user_lat`, `p_user_lng` → `ST_Distance(geom, ST_SetSRID(ST_MakePoint(...), 4326)::geography)` ASC.
- 페이지네이션: `p_limit + 1 OFFSET p_offset` (LIMIT+1 훅 패턴 → `hasMore` 판정).

**공통 출력 컬럼**:
`id, name, genre, district, area, address, lat, lng, phone, kakao_map_url, prestige, has_record, my_score`.

**마이그레이션 이력**:
- `057_map_bounds_rpc.sql` — 초기 단일 RPC (pg_trgm + GiST expression index, LIMIT+1).
- `062_geom_column_and_rpc_split.sql` — geom stored column + RPC 3-way 분리 (290ms → 1.7ms).
- `064_bounds_rpc_add_scores.sql` — `my_score` (satisfaction 평균) + `score_high` 정렬 + bookmarks 참조 제거.
- `072_bounds_rpc_distance_sort.sql` — `p_user_lat`/`p_user_lng` 파라미터 + 거리순 정렬.

### 3.3 클러스터링 / 거리 정렬

- **클러스터링**: 프론트엔드(`map-view.tsx`)에서 Google Maps 상에 커스텀 DOM 클러스터 렌더 (`createClusterHtml`). DB 레벨 클러스터링 없음.
- **거리 정렬 기준점**:
  - 지도뷰의 `sort=distance` → `p_user_lat`/`p_user_lng`를 **바운딩박스 중앙**으로 전송 (`useMapDiscovery`: `centerLat = (north + south) / 2`).
  - 현 위치 기반 정렬이 필요하면 호출자가 `p_user_lat`/`p_user_lng`에 사용자 실제 좌표를 전달 (검색 API는 `searchParams.lat`, `lng`).
  - `p_user_lat`가 `null`이면 `distance` 정렬 요청이어도 이름순으로 폴백.

### 3.4 검색 API (Nyam DB + 외부 3종)

- 엔드포인트: `GET /api/restaurants/search?q=...&lat=...&lng=...` (`src/app/api/restaurants/search/route.ts`).
- 흐름:
  1. Nyam DB (`restaurants`) ILIKE 검색.
  2. 결과가 5개 미만이면 카카오 Local + 네이버 Local + 구글 Places를 `Promise.allSettled`로 병렬 호출.
  3. 중복 제거(§5) 후 이름+거리 순 정렬.
- 한 글자 쿼리 최적화: `${q}%` (앞쪽 와일드카드 생략 → btree/trgm 인덱스 활용). 두 글자 이상: `%${q}%`.

---

## 4. 위치 필터

### 4.1 필터 속성 정리

| 속성 | 매칭 방식 | 정확도 | 커버리지 |
|------|----------|--------|---------|
| `district` (구/군) | 문자열 비교 | 정확 | 전국 (주소 파싱 가능 시) |
| `area` (생활권) | `ANY(restaurants.area)` (DB) / `includes` (클라이언트) | 다소 부정확 (반경 기반) | `area_zones` 등록 지역만 |
| 현 위치 반경 | ST_Distance(geom, ::geography) ≤ N | 정확 | 전국 |

### 4.2 현 위치 반경 검색

- 지도뷰: `p_user_lat`/`p_user_lng` + `sort='distance'`로 거리순 정렬만 제공. "반경 N m 이내" 하드 필터는 별도 RPC 미구현 — 바운딩박스 사이즈로 간접 제어.
- 검색 API: `searchKakaoLocal` / `searchGooglePlaces`는 반경(`radius`, 기본 20000m) 직접 지원.

### 4.3 생활권 기반 필터

- 지도뷰 RPC(`search_restaurants_bounds_*`)의 `p_area` 파라미터 → `p_area IS NULL OR p_area = ANY(rst.area)`.
- 홈 탐색: `src/application/hooks/use-map-discovery.ts` → `mapChips`에서 `attribute === 'area'` 칩 추출 → `areaFilterRef` → bounds API의 `area` 쿼리스트링으로 전달.

### 4.4 지역 푸시 (권위 추천)

- 추천 시스템이 `area` / `district` 단위로 권위 식당을 푸시하는 로직은 `RECOMMENDATION.md` 소관.
- MAP_LOCATION은 "area/district 값이 정확히 채워져 있는가"의 데이터 계층 보장만 담당.

---

## 5. 위치 기반 중복 제거 (dedup)

검색/크롤링/등록 시 "같은 식당인가?" 판정. 기록 레벨 dedup은 `RECORD_SYSTEM.md` 소관 — 본 섹션은 **식당 엔티티** dedup만.

### 5.1 판정 로직 (src/app/api/restaurants/search/route.ts::isSameRestaurant)

| 조건 | 결과 | 예시 |
|------|------|------|
| 이름 완전 일치 + 좌표 200m 이내 | 같은 식당 | "이문설농탕" ↔ "이문설농탕" |
| 이름 완전 일치 + 좌표 없음 | 같은 식당 | (해외 소스 폴백) |
| 이름 완전 일치 + 좌표 200m 초과 | 다른 식당 | 동명이점 |
| 이름 유사(편집거리 ≤2, 차이 ≤30%) + 좌표 100m 이내 | 같은 식당 | "이문설농탕" ↔ "이문설렁탕" |
| 이름 유사 + 좌표 100m 초과 | 다른 식당 | 안전하게 분리 |

- 이름 정규화: 공백 제거 + 소문자 (`normalizeForDedup`).
- 편집거리: Levenshtein (`editDistance`).
- 적용 범위:
  1. Nyam DB 내부 중복 제거 (`deduplicateNyamResults`) — 같은 이름의 여러 행 중 기록 있는 행 우선.
  2. 외부 API 결과 중복 제거 (카카오 ↔ 네이버 ↔ 구글) — 이미 채택된 결과와 비교.
- 근거: `_archive/개념문서_원본/검색 dedup 로직.md`.

### 5.2 크롤링 시점 dedup (DB 레벨)

- `restaurants.external_id_kakao` / `external_id_google` / `external_id_naver`에 UNIQUE partial 인덱스(WHERE NOT NULL).
- 카카오 크롤링 UPSERT는 `ON CONFLICT (external_id_kakao)`로 충돌 해결.
- 유저 등록 경로 dedup도 동일하게 `external_id_google`/`external_id_naver` UNIQUE partial 인덱스로 작동 (DATA_MODEL §11.5 참조).
- **덮어쓰기 정책**: `WHERE restaurants.data_source = 'crawled'` — user_created 식당은 크롤링이 덮어쓰지 않음 (유저 입력 보호).
- 근거: `056_restaurants_crawl_columns.sql` (초기 JSONB 버전), 이후 컬럼 분리. 컬럼 스키마는 `DATA_MODEL.md` 참조.

---

## 6. 자체 식당 DB 구축 (카카오 크롤링 시드)

### 6.1 목적

지도뷰가 **외부 API 실시간 호출 없이** DB 단일 쿼리로 동작하도록, 전국 식당 데이터를 `restaurants` 테이블에 사전 구축한다.

- 기대: 지도뷰 응답 2~4초 → ~100~200ms, 점수순 정렬(ORDER BY) 정확도 확보, 카카오 rate limit 영향 제거.
- 근거: `_archive/개념문서_원본/자체_식당DB_구축_및_지도뷰_전환.md`.

### 6.2 크롤링 인프라

- 스크립트: `DB/카카오_크롤링/crawl_kakao.py` (Python, 비동기 aiohttp).
  - 격자 분할 + 카카오 카테고리 검색 API(`CATEGORY_CODES`) + progress.json 체크포인트 + `--resume` 지원.
  - 일일 API 한도(`DAILY_LIMIT`) 관리, `REQUEST_DELAY` 간격, `MAX_CONCURRENT` 동시성 제어.
- 입력 설정: `DB/카카오_크롤링/config.py` (SEOUL_BOUNDS, SEOUL_DISTRICTS, CELL_RADIUS, KAKAO_TO_GENRE 매핑 등).
- 로그: `DB/카카오_크롤링/data/crawl_*.log`, progress는 `data/progress.json`.
- 실행 예:
  ```
  python crawl_kakao.py --resume                  # 이어서
  python crawl_kakao.py --district 강남구         # 특정 구
  python crawl_kakao.py --dry-run                 # DB 저장 없이
  ```

### 6.3 식별/보존 컬럼 (`restaurants` 확장)

`DATA_MODEL.md`에 정의된 다음 컬럼들이 크롤링 관련:

- `data_source TEXT` — 현재 운영상 실제 값은 `'user_created'` / `'crawled'` 두 가지만 사용. `056_restaurants_crawl_columns.sql`의 CHECK 제약(`data_source IN ('user_created', 'crawled')`)으로 강제되며, 크롤링 스크립트(`DB/카카오_크롤링/crawl_kakao.py` L410)는 `'crawled'` 리터럴만 INSERT한다. (크롤링 소스별 세분화는 Roadmap으로 이연 — 도입 시 CHECK 제약·본 문서 동시 갱신 필요.)
- `last_crawled_at TIMESTAMPTZ` — 마지막 크롤링/검증 시각.
- `is_closed BOOLEAN` — 폐업 여부 (지도뷰 제외 대상).
- `external_id_kakao` / `external_id_google` / `external_id_naver` — UNIQUE partial 인덱스.
- `cached_at` / `next_refresh_at` — 유저 트리거 재검증 시 사용.

### 6.4 UPSERT RPC

- 함수: `upsert_crawled_restaurants(items JSONB)` (초기 정의: `056_restaurants_crawl_columns.sql`).
- 동작 (현재 운영 기준):
  - `jsonb_array_elements(items)`로 배열 언팩.
  - **ON CONFLICT 키**: `external_id_kakao` 컬럼 (partial UNIQUE, WHERE NOT NULL).
    - 056 초기 정의는 JSONB 경로(`external_ids->>'kakao'`) 기반이었으나, 이후 `restaurants.external_id_kakao` 개별 컬럼으로 전환됨 (DATA_MODEL.md §2 `restaurants` 테이블의 `external_id_kakao TEXT` 컬럼 정의, §11.5 인덱스 목록의 UNIQUE partial 인덱스 참조 — 라인 번호는 문서 편집 시 변동되므로 섹션 기준으로 확인).
    - 크롤링 스크립트(`DB/카카오_크롤링/crawl_kakao.py` L409, L480, L486)와 API/리포지토리(`src/app/api/restaurants/route.ts`, `src/infrastructure/repositories/supabase-restaurant-repository.ts`) 모두 `external_id_kakao` 컬럼을 직접 사용.
    - 주의: 컬럼 전환 마이그레이션은 별도 파일로 커밋되어 있지 않고 DATA_MODEL.md 스키마 SSOT로만 반영됨. `upsert_crawled_restaurants` RPC 재정의도 동일 상태 — 향후 마이그레이션 파일로 정식 이관 필요.
  - `WHERE restaurants.data_source = 'crawled'` — user_created 보호.
- `area` 자동 매칭은 크롤링 스크립트 레벨에서 수행 (haversine으로 `area_zones` 조회하여 `area` 배열 채움).

### 6.5 업데이트 전략 (3단)

| 전략 | 트리거 | 용도 |
|------|-------|------|
| 유저 트리거 | 식당 선택/기록/검색 시점 | 관심 있는 식당만 최신화 (가장 효율적) |
| 주간 배치 크론 | Edge Function (미구현, Phase 3로 이연) | `last_crawled_at` 오래된 순 재검증 |
| 폐업 감지 | 카카오 검색 안 됨 → `is_closed = true` | 지도뷰 제외, 기존 기록은 유지 |

- 현재 상태: Phase 0(크롤링 인프라) + Phase 1(서울 데이터 구축) 진행 중. Phase 2(지도뷰 완전 전환), Phase 3(배치 크론, 폐업 감지)은 미착수.
- `MEMORY.md::project_kakao_crawl_restaurants`에 현황 기록 (2026-04-10 시점: "시드 데이터 구축 중").

---

## 7. 와인 산지 Cascade

### 7.1 WSET 4단계 구조

- 컬럼: `wines.country` → `wines.region` → `wines.sub_region` → `wines.appellation` (4단계 cascade).
- 스키마/인덱스 정의는 `DATA_MODEL.md` §`wines` 참조 (`idx_wines_region` = btree(country, region, sub_region, appellation)).
- 출처: WSET Level 3 Award in Wines Specification, Issue 2 (2022) (DATA_MODEL.md §와인 산지 Cascade와 동일 표기).
- 본 문서는 **로직/드릴다운 UI 측면**만 다룬다.

### 7.2 캐스케이드 규칙

- **모든 와인**은 `country` + `region` 필수 보유를 목표로 함.
- **대부분 와인**은 3단계(country/region/sub_region)까지만 해당.
- **4단계(`appellation`)는 일부에만 적용**: 현재 4단계(appellation)는 Burgundy, California, South Australia, Cape South Coast **4곳만** 적용. 총 15개국, 73 region, 198 sub_region 중 4단계 세분화는 한정적 (RECORD_SYSTEM §4 와인 산지 섹션 수치와 일치).
  - Burgundy village AOC (Gevrey-Chambertin, Chambolle-Musigny 등)
  - Napa AVA (Rutherford, Oakville 등) — California
  - Barossa GI sub-zone — South Australia
  - South Africa Ward — Cape South Coast
- 프론트엔드 드롭다운 및 Gemini 프롬프트에서 이 cascade 목록 기준으로 값을 제한한다 (`DATA_MODEL.md` 원문 참조).

### 7.3 드릴다운 지도

**현재 구현 상태 (2026-04-20)**: 2단계 드릴다운(country → region)만 완료. 3단계(sub_region)·4단계(appellation)는 미착수. CLAUDE.md 스프린트 표상 S10은 "완료" 상태로 표기되어 있으나, 와인 산지 드릴다운 기능은 부분 구현 상태이며 3단계 확장은 잔여 과제로 남아 있다.

**현재 구현**:
- 홈 통계: `src/presentation/components/home/wine-region-map.tsx`
  - Level 0 (세계): 국가 마커를 경도/위도 기반 SVG에 배치. 방문 횟수 + 와인 타입 도트(red/white/rose/sparkling) 주변 배치. 미탐험 국가는 점선 물음표로 표시.
  - Level 1 (국가): 선택한 국가의 타입별 병 수 + `regions` 리스트(region 버튼).
  - Level 2 (지역): 선택한 region의 타입 브레이크다운만 표시. **sub_region 리스트는 없음** — 즉 Level 2는 region 종착 화면이지 sub_region 드릴다운이 아니다.
  - 데이터 모델: `CountryData.regions?: RegionData[]` (2단계 중첩). `sub_region` 필드/배열은 타입에도 없음.
- 프로필 통계: `src/presentation/components/profile/wine-region-map-simple.tsx` — 국가별 바 리스트 + 타입 도트의 간이 버전. 드릴다운 없음. 파일 상단 주석에 "S10에서 3단계 드릴다운으로 고도화 예정"이 남아 있어 계획 잔재를 반영.

**잔여 과제 (3단계 확장 시)**:
- 데이터 모델에 `RegionData.subRegions?: SubRegionData[]` 추가, Level 2 UI에 sub_region 리스트 + Level 3 상세 뷰 추가.
- 지도 레벨에서 실제 지리 SVG 패스(프랑스/이탈리아 region boundary 등) 도입 검토 — 현재 Level 0만 대륙 실루엣 SVG이고 Level 1/2는 리스트 뷰.
- 4단계 `appellation`은 드릴다운 지도에서 취급하지 않고 와인 상세 페이지(L1~L8) 레벨에서 표시한다는 원칙은 유지.
- 도트 색상 기준(`WINE_TYPE_COLORS`): `red #722F37`, `white #D4C98A`, `rose #E8A0B0`, `sparkling #C8D8A0` — 홈/프로필 컴포넌트 모두 동일 팔레트 사용 중.

### 7.4 집계 쿼리

- 프로필용 산지 집계: `DATA_MODEL.md`에 정의된 함수 (country, region, sub_region, vintage 반환) 사용.
- 세부 SQL/RPC는 `DATA_MODEL.md` + `QUERY_OPTIMIZATION.md` 위임.
- wine_region XP 축 적립 시 동일 cascade 값 사용. 상세: XP_SYSTEM §3 세부 축 참조.

---

## 8. 관련 RPC 요약

| RPC | 정의 마이그레이션 | 용도 |
|-----|------------------|------|
| `search_restaurants_bounds_simple` | 062 → 064 → 072 | 비로그인 지도뷰 |
| `search_restaurants_bounds_auth` | 062 → 064 → 072 | 로그인 지도뷰, satisfaction 평균 |
| `search_restaurants_bounds_source` | 062 → 064 → 072 | source 필터 (mine/following/bubble) 지도뷰 |
| `upsert_crawled_restaurants(items JSONB)` | 056 | 카카오 크롤링 배치 UPSERT |
| `sync_restaurant_geom()` (트리거) | 062 | lat/lng 변경 시 `geom` 자동 갱신 |
| `search_restaurants_in_bounds` (deprecated) | 057 | 062에서 3-way 분리로 대체 |

---

## 9. 관련 마이그레이션

| 마이그레이션 | 내용 |
|-------------|------|
| `029_area_zones.sql` | area_zones 테이블 + 서울 32개 시드 |
| `036_area_zones_radius_fix.sql` | 반경 보정 + 다중 원 (강남 3원, 여의도 2원) 전환 |
| `045_record_photos_exif_columns.sql` | EXIF `exif_lat`, `exif_lng`, `captured_at` |
| `056_restaurants_crawl_columns.sql` | `data_source`, `last_crawled_at`, `is_closed` + `upsert_crawled_restaurants` |
| `057_map_bounds_rpc.sql` | 초기 bounds RPC, pg_trgm, GiST expression index |
| `062_geom_column_and_rpc_split.sql` | `geom` stored column + 트리거 + RPC 3-way 분리 (290ms→1.7ms) |
| `064_bounds_rpc_add_scores.sql` | `my_score` + `score_high` 정렬 + bookmarks 참조 제거 |
| `072_bounds_rpc_distance_sort.sql` | `p_user_lat`/`p_user_lng` + 거리순 정렬 |

---

## 10. 근거 파일 요약

| 영역 | 파일 |
|------|------|
| 좌표 엔티티 | `src/domain/entities/restaurant.ts` (lat, lng, area, district) |
| 거리 유틸 | `src/domain/services/distance.ts` (haversineDistance, haversineDistanceMeters) |
| EXIF 파서 | `src/shared/utils/exif-parser.ts` |
| EXIF 검증 | `src/domain/services/exif-validator.ts` |
| 위치 해석 API | `src/app/api/location/resolve/route.ts` |
| 현 위치 훅 | `src/application/hooks/use-current-location.ts` |
| 지도 뷰 훅 | `src/application/hooks/use-map-discovery.ts` |
| bounds API | `src/app/api/restaurants/bounds/route.ts` |
| 검색 API + dedup | `src/app/api/restaurants/search/route.ts` |
| 카카오 Local API | `src/infrastructure/api/kakao-local.ts` |
| 지도 컴포넌트 | `src/presentation/components/home/map-view.tsx`, `map-pin.tsx`, `map-compact-item.tsx` |
| 와인 산지 지도 | `src/presentation/components/home/wine-region-map.tsx`, `profile/wine-region-map-simple.tsx` |
| 카카오 크롤링 | `DB/카카오_크롤링/crawl_kakao.py`, `config.py` |
| 개념문서 원본 | `_archive/개념문서_원본/{생활권로직,위치필터_생활권,자체_식당DB_구축_및_지도뷰_전환,검색 dedup 로직,식당등록검색로직}.md` |

※ `src/shared/types/kakao-maps.d.ts` 타입 선언 파일은 과거 잔존이며 실제 사용 여부 재확인 필요.
