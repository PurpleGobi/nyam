# DB 쿼리 리팩토링 구현계획

> 작성일: 2026-04-11
> 목표: 검색/필터링 전반의 쿼리를 체계적으로 최적화. 데이터 0건이든 100만건이든 올바르게 동작하는 구조 확립.

---

## 1. 현재 문제 요약

### 근본 원인: "일단 전부 가져와서 JS로 처리" 패턴

```
현재 홈 피드 흐름:
  DB: 유저의 모든 target_id 수집 → restaurants/wines 전체 메타 fetch
  JS: matchesAllRules()로 필터 → sortHomeTargets()로 소팅 → slice()로 페이지네이션

현재 지도뷰:
  DB: 공간범위 + keyword(name/genre ILIKE) + prestige + source → name 소팅 → LIMIT
  JS: prestige grade 세부 필터만
  ❌ genre, district, area 필터 미지원

현재 텍스트 검색:
  DB: name ILIKE OR address ILIKE → LIMIT 20
  ❌ address에 trgm 인덱스 없음 → 13만건 Seq Scan
```

### 대상 페이지 6개

| 페이지 | 필터 위치 | 문제 |
|--------|----------|------|
| 식당 홈뷰 (card/list/calendar) | JS | 전체 fetch 후 JS 필터/소팅/페이지네이션 |
| 식당 지도뷰 (map) | DB (일부) | genre/district/area 필터 누락 |
| 와인 홈뷰 | JS | 식당과 동일 구조 |
| 버블 홈뷰 | JS | 버블 소규모라 당장 OK, but 일관성 위해 정비 |
| 텍스트 검색 (식당/와인/사용자) | DB | 인덱스 부재 |
| 팔로워/팔로잉 | DB | 맞팔 확인 비효율 (2회 왕복) |

---

## 2. 쿼리 코딩 규칙 7가지

모든 검색/필터/목록 코드에 적용:

| 규칙 | 이름 | 내용 |
|------|------|------|
| **R-SEARCH** | 텍스트 검색 | ILIKE 사용 컬럼은 반드시 GIN trgm 인덱스. OR 2개 이상이면 EXPLAIN 확인, 안 되면 UNION |
| **R-ENUM** | 고정값 필터 | SSOT 고정값(genre, wine_type, scene 등)은 EQ 매칭만. ILIKE 금지. btree 인덱스 |
| **R-FILTER** | DB 필터 우선 | 테이블 컬럼 기반 필터는 SQL WHERE로 처리. JS 필터는 파생값에만 허용 |
| **R-PAGINATE** | DB 페이지네이션 | 20건 초과 가능한 목록은 DB LIMIT+OFFSET. 전체 fetch 후 JS slice 금지 |
| **R-SELECT** | 필요 컬럼만 | SELECT * 금지. 특히 JSONB/TEXT[]/photos 같은 큰 컬럼은 필요 시만 |
| **R-COUNT** | 집계 캐싱 | 자주 쓰는 COUNT는 캐시 컬럼 + 트리거로 유지. 매번 COUNT 금지 |
| **R-MUTUAL** | N+1 방지 | 관계 확인은 단일 JOIN 쿼리. 왕복 여러 번 금지. batch IN 필수 |

---

## 3. 필터 속성 분류 — DB 필터 vs JS 필터

### 핵심 원칙

> **테이블 컬럼에 직접 매핑되는 속성 → DB WHERE**
> **records와 JOIN 후 계산이 필요한 파생값 → JS 필터**

### 3.1 식당 필터 속성 (11개)

| 속성 | DB 컬럼 | 필터 위치 | 이유 |
|------|---------|----------|------|
| view | records/bookmarks/follows | **DB** (현재도 DB) | target_id 수집 자체가 DB |
| **genre** | `restaurants.genre` | **DB → WHERE** | 14종 고정값. btree EQ |
| **location (district)** | `restaurants.district` | **DB → WHERE** | 150종. btree EQ |
| **location (area)** | `restaurants.area` | **DB → WHERE** | TEXT[] ANY 매칭 |
| **prestige** | `restaurants.prestige` | **DB → WHERE** | JSONB @> 연산. GIN 인덱스 |
| **price_range** | `restaurants.price_range` | **DB → WHERE** | 정수 EQ |
| menu_type | (DB 컬럼 미존재) | **무동작** | 칩은 정의되어 있으나 매핑 컬럼 없음. 컬럼 추가 시 재검토 |
| satisfaction | records.axis_x/y 파생 | **JS** | records JOIN + 평균 계산 + 범위 변환 필요 |
| scene | records.scene | **JS** | 최신 기록의 scene 값 → records JOIN 필요 |
| visit_date | records.visit_date | **JS** | 기간 계산 (now - visit_date) → records JOIN 필요 |
| companion_count | records.companion_count | **JS** | 최신 기록 값 → records JOIN 필요 |

### 3.2 와인 필터 속성 (12개)

| 속성 | DB 컬럼 | 필터 위치 | 이유 |
|------|---------|----------|------|
| view | records/bookmarks | **DB** | target_id 수집 |
| **wine_type** | `wines.wine_type` | **DB → WHERE** | 7종 고정값. btree EQ |
| **variety** | `wines.variety` | **DB → WHERE** | 55종. btree EQ |
| **country** | `wines.country` | **DB → WHERE** | 15종. btree EQ |
| **vintage** | `wines.vintage` | **DB → WHERE** | 정수 EQ/범위 |
| **acidity_level** | `wines.acidity_level` | **DB → WHERE** | 정수 EQ |
| **sweetness_level** | `wines.sweetness_level` | **DB → WHERE** | 정수 EQ |
| satisfaction | records 파생 | **JS** | 위와 동일 |
| visit_date | records.visit_date | **JS** | 위와 동일 |
| pairing_categories | records.pairing_categories | **JS** | TEXT[] 매칭, records JOIN 필요 |
| purchase_price | records.purchase_price | **JS** | records JOIN 필요 |
| complexity | records.complexity | **JS** | records JOIN 필요 |

### 3.3 지도뷰 필터 속성

| 속성 | 현재 | 변경 |
|------|------|------|
| 공간 범위 | DB ✅ | 유지 |
| keyword (name) | DB ✅ (ILIKE) | 유지 |
| source (mine/bookmark/following/bubble) | DB ✅ | 유지 |
| prestige type | DB ✅ | 유지 |
| prestige grade | JS | JS 유지 (JSONB 복합 조건) |
| **genre** | ❌ 없음 | **DB → WHERE EQ 추가** |
| **district** | ❌ 없음 | **DB → WHERE EQ 추가** |
| **area** | ❌ 없음 | **DB → WHERE ANY 추가** |

### 3.4 버블 필터

| 속성 | DB 컬럼 | 필터 위치 |
|------|---------|----------|
| role | bubble_members.role | JS (소규모) |
| focus_type | bubbles.focus_type | JS (소규모) |
| join_policy | bubbles.join_policy | JS (소규모) |
| member_count | 집계 | JS (소규모) |
| activity | 집계 | JS (소규모) |

> 버블은 유저당 수십 개 수준이므로 JS 필터 유지. 구조만 일관성 있게 정비.

### 3.5 사용자 검색

| 속성 | DB 컬럼 | 필터 위치 |
|------|---------|----------|
| nickname | users.nickname | **DB ILIKE** (trgm 인덱스 추가) |
| handle | users.handle | **DB ILIKE** (UNIQUE btree 존재) |

---

## 4. RPC 함수 설계

### 4.1 filter_home_restaurants — 홈뷰 식당 메타 필터

```sql
CREATE OR REPLACE FUNCTION filter_home_restaurants(
  p_ids        UUID[],
  p_genre      TEXT     DEFAULT NULL,
  p_district   TEXT     DEFAULT NULL,
  p_area       TEXT     DEFAULT NULL,
  p_prestige   TEXT     DEFAULT NULL,   -- 'michelin', 'blue_ribbon', 'tv', 'none'
  p_price_range INT     DEFAULT NULL,
  p_sort       TEXT     DEFAULT 'name', -- 'name' only (records 파생 소팅은 JS)
  p_limit      INT      DEFAULT 20,
  p_offset     INT      DEFAULT 0
) RETURNS TABLE(
  id UUID, name TEXT, genre TEXT, district TEXT, area TEXT[],
  city TEXT, country TEXT, lat FLOAT8, lng FLOAT8,
  price_range INT, prestige JSONB, photos TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.name::TEXT, r.genre::TEXT, r.district::TEXT, r.area,
         r.city::TEXT, r.country::TEXT, r.lat, r.lng,
         r.price_range, r.prestige, r.photos
  FROM restaurants r
  WHERE r.id = ANY(p_ids)
    AND (p_genre IS NULL OR r.genre = p_genre)
    AND (p_district IS NULL OR r.district = p_district)
    AND (p_area IS NULL OR p_area = ANY(r.area))
    AND (p_price_range IS NULL OR r.price_range = p_price_range)
    AND (
      p_prestige IS NULL
      OR (p_prestige = 'none' AND (r.prestige IS NULL OR r.prestige = '[]'::jsonb))
      OR (p_prestige <> 'none' AND r.prestige @> ('[{"type":"' || p_prestige || '"}]')::jsonb)
    )
  ORDER BY
    CASE WHEN p_sort = 'name' THEN r.name END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 4.2 filter_home_wines — 홈뷰 와인 메타 필터

```sql
CREATE OR REPLACE FUNCTION filter_home_wines(
  p_ids           UUID[],
  p_wine_type     TEXT    DEFAULT NULL,
  p_variety       TEXT    DEFAULT NULL,
  p_country       TEXT    DEFAULT NULL,
  p_vintage       INT     DEFAULT NULL,
  p_vintage_op    TEXT    DEFAULT 'eq',  -- 'eq', 'lte' (before_2018)
  p_acidity       INT     DEFAULT NULL,
  p_sweetness     INT     DEFAULT NULL,
  p_sort          TEXT    DEFAULT 'name',
  p_limit         INT     DEFAULT 20,
  p_offset        INT     DEFAULT 0
) RETURNS TABLE(
  id UUID, name TEXT, wine_type TEXT, variety TEXT,
  country TEXT, region TEXT, sub_region TEXT,
  vintage INT, photos TEXT[], producer TEXT,
  acidity_level INT, sweetness_level INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.name::TEXT, w.wine_type::TEXT, w.variety::TEXT,
         w.country::TEXT, w.region::TEXT, w.sub_region::TEXT,
         w.vintage, w.photos, w.producer::TEXT,
         w.acidity_level, w.sweetness_level
  FROM wines w
  WHERE w.id = ANY(p_ids)
    AND (p_wine_type IS NULL OR w.wine_type = p_wine_type)
    AND (p_variety IS NULL OR w.variety = p_variety)
    AND (p_country IS NULL OR w.country = p_country)
    AND (p_acidity IS NULL OR w.acidity_level = p_acidity)
    AND (p_sweetness IS NULL OR w.sweetness_level = p_sweetness)
    AND (
      p_vintage IS NULL
      OR (p_vintage_op = 'eq' AND w.vintage = p_vintage)
      OR (p_vintage_op = 'lte' AND w.vintage <= p_vintage)
    )
  ORDER BY
    CASE WHEN p_sort = 'name' THEN w.name END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 4.3 search_restaurants_in_bounds 개선

기존 함수에 파라미터 추가:

```sql
-- 추가 파라미터
p_genre    TEXT DEFAULT NULL,
p_district TEXT DEFAULT NULL,
p_area     TEXT DEFAULT NULL

-- 추가 WHERE 절 (기존 조건에 AND)
AND (p_genre IS NULL OR rst.genre = p_genre)
AND (p_district IS NULL OR rst.district = p_district)
AND (p_area IS NULL OR p_area = ANY(rst.area))

-- 기존 genre ILIKE 제거
-- 변경 전: OR rst.genre ILIKE '%' || p_keyword || '%'
-- 변경 후: genre는 p_genre 파라미터로만 필터 (R-ENUM 규칙)
```

### 4.4 is_mutual_follow — 맞팔 확인

```sql
CREATE OR REPLACE FUNCTION is_mutual_follow(
  p_user_id UUID,
  p_target_id UUID
) RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM follows f1
    INNER JOIN follows f2
      ON f1.following_id = f2.follower_id
      AND f1.follower_id = f2.following_id
    WHERE f1.follower_id = p_user_id
      AND f1.following_id = p_target_id
      AND f1.status = 'accepted'
      AND f2.status = 'accepted'
  );
$$ LANGUAGE sql STABLE;
```

---

## 5. 인덱스 마이그레이션

### 5.1 추가

```sql
-- restaurants
CREATE INDEX idx_restaurants_address_trgm ON restaurants USING GIN (address gin_trgm_ops);
CREATE INDEX idx_restaurants_genre ON restaurants USING btree (genre);
CREATE INDEX idx_restaurants_district ON restaurants USING btree (district);
CREATE INDEX idx_restaurants_genre_name ON restaurants USING btree (genre, name);
CREATE INDEX idx_restaurants_area_gin ON restaurants USING GIN (area);  -- ANY() 연산용

-- wines (기존: wines_pkey, idx_wines_country, idx_wines_region, idx_wines_type)
CREATE INDEX idx_wines_name_trgm ON wines USING GIN (name gin_trgm_ops);
CREATE INDEX idx_wines_producer_trgm ON wines USING GIN (producer gin_trgm_ops);
CREATE INDEX idx_wines_type_name ON wines USING btree (wine_type, name);  -- idx_wines_type를 대체
CREATE INDEX idx_wines_variety ON wines USING btree (variety);
-- ※ acidity_level, sweetness_level: 카디널리티 3 (1~3)이므로 인덱스 불필요. RPC WHERE 절만 적용
-- ※ vintage: 카디널리티 중간이나 EQ/범위 쿼리 빈도 낮으므로 보류

-- users
CREATE INDEX idx_users_nickname_trgm ON users USING GIN (nickname gin_trgm_ops);
CREATE INDEX idx_users_is_public ON users USING btree (is_public) WHERE is_public = true;

-- records
CREATE INDEX idx_records_target_date ON records USING btree (target_id, target_type, visit_date DESC);

-- follows
CREATE INDEX idx_follows_follower_accepted ON follows USING btree (follower_id, following_id) WHERE status = 'accepted';
CREATE INDEX idx_follows_following_accepted ON follows USING btree (following_id, follower_id) WHERE status = 'accepted';
```

### 5.2 삭제

```sql
DROP INDEX IF EXISTS idx_restaurants_country_city;   -- 코드에서 미사용
DROP INDEX IF EXISTS idx_restaurants_data_source;     -- 코드에서 미사용
DROP INDEX IF EXISTS idx_restaurants_is_closed;       -- 코드에서 미사용
DROP INDEX IF EXISTS idx_wines_type;                  -- idx_wines_type_name이 대체
```

---

## 6. 파일별 변경 상세

### 6.1 DB 마이그레이션 (2개 파일)

| 파일 | 내용 |
|------|------|
| `059_query_optimization_indexes.sql` | 인덱스 추가/삭제 (섹션 5) |
| `060_query_optimization_functions.sql` | RPC 함수 생성/수정 (섹션 4) |

### 6.2 API Route 변경 (1개 파일 확정 + 1개 조건부)

| 파일 | 변경 | 확정 여부 |
|------|------|----------|
| `src/app/api/restaurants/bounds/route.ts` | genre, district, area 쿼리파라미터 파싱 → RPC에 전달 | **확정** |
| `src/app/api/restaurants/search/route.ts` | 인덱스 추가 후 EXPLAIN 확인 → Bitmap OR scan 동작하면 변경 불필요, 안 되면 UNION 전환 | 조건부 |

### 6.3 Infrastructure 변경 (3개 파일)

| 파일 | 변경 |
|------|------|
| `supabase-home-repository.ts` | `fetchTargetMeta()` → RPC `filter_home_restaurants`/`filter_home_wines` 호출로 전환. filter/sort 파라미터 수신 |
| `supabase-follow-repository.ts` | `isMutualFollow()` → RPC `is_mutual_follow` 호출. `getMutualFollows()` → 단일 self-JOIN 쿼리 |
| `supabase/types.ts` | RPC 함수 타입 추가 (generate-types로 자동 생성) |

### 6.4 Domain 변경 (2개 파일)

| 파일 | 변경 |
|------|------|
| `domain/repositories/home-repository.ts` | `findHomeTargets()` 인터페이스에 filter/sort 파라미터 추가 |
| `domain/services/filter-matcher.ts` | DB 필터 속성(genre, district, area, prestige, price_range, wine_type, variety, country, vintage, acidity, sweetness) 제거. records 파생 필터만 유지 |

### 6.5 Application 변경 (2개 파일)

| 파일 | 변경 |
|------|------|
| `application/hooks/use-home-targets.ts` | filter/sort 파라미터를 homeRepo에 전달 |
| `application/hooks/use-map-discovery.ts` | genre, district, area 파라미터를 bounds API에 전달 |

### 6.6 Presentation 변경 (1개 파일, 2가지 변경)

| 파일 | 변경 |
|------|------|
| `presentation/containers/home-container.tsx` | (1) filterRules를 DB필터/JS필터로 분리. DB필터는 useHomeTargets에 전달, JS필터는 matchesAllRules에 전달. (2) 지도뷰에서 genre/district/area 칩을 bounds API에 전달 |

### 6.7 삭제 (1개 파일)

| 파일 | 이유 |
|------|------|
| `domain/services/filter-query-builder.ts` | 호출처 0개. dead code |

---

## 7. 변경 후 데이터 플로우

### 7.1 홈뷰 (식당/와인) — 변경 후

```
[home-container.tsx]
  conditionChips → filterRules 분리:
    dbFilters: { genre, district, area, prestige, price_range }  ← DB로 전달
    jsFilters: { satisfaction, scene, visit_date, companion_count } ← JS에서 처리

[use-home-targets.ts]
  homeRepo.findHomeTargets(userId, targetType, views, socialFilter, dbFilters, sort, limit, offset)

[supabase-home-repository.ts]
  Step 1: view별 target_id 수집 (기존과 동일)
  Step 2: RPC filter_home_restaurants(target_ids, genre, district, ..., sort, limit, offset)
           → DB에서 WHERE + ORDER BY + LIMIT 처리
  Step 3: records 배치 조회 (기존과 동일)
  Step 4: HomeTarget[] 조립

[home-container.tsx]
  JS 필터: satisfaction, scene, visit_date, companion_count만 처리
  JS 소팅: latest, score_high, score_low, distance, visit_count (records 파생값 기반)
  페이지네이션: DB LIMIT+OFFSET (name 소팅 시) 또는 JS slice (records 파생 소팅 시)
```

### 7.2 지도뷰 — 변경 후

```
[home-container.tsx / use-map-discovery.ts]
  mapChips에서 추출: source, prestige, genre, district, area, keyword

[/api/restaurants/bounds]
  → search_restaurants_in_bounds(
      bounds, keyword, sources, prestige_types,
      genre, district, area,    ← 신규 파라미터
      sort, limit, offset
    )

[DB 함수]
  GiST 공간 필터
  → btree genre EQ (ILIKE 아님)
  → btree district EQ
  → area ANY 매칭
  → GIN prestige @>
  → trgm name ILIKE (keyword)
  → source 서브쿼리
  → ORDER BY name + LIMIT
```

### 7.3 텍스트 검색 — 변경 후

```
식당: .or(`name.ilike.%q%,address.ilike.%q%`).limit(20)
  → address trgm 인덱스 추가로 Bitmap OR scan 활성화
  → 643ms → ~5ms (코드 변경 없이 인덱스만으로 해결 가능성 높음)

와인: .or(`name.ilike.%q%,producer.ilike.%q%`).limit(20)
  → name, producer trgm 인덱스 추가

사용자: .or(`nickname.ilike.%q%,handle.ilike.%q%,email.ilike.%q%`).limit(10)
  → nickname trgm 인덱스 추가
```

---

## 8. 소팅 전략

### DB 소팅이 가능한 것

| 소팅 | DB 가능? | 이유 |
|------|---------|------|
| name | ✅ | restaurants/wines.name 컬럼 직접 |
| distance | ❌ | 실시간 유저 좌표 필요 (지도뷰는 DB에서 가능) |
| latest | ❌ | records.visit_date JOIN 필요 |
| score_high/low | ❌ | records.satisfaction 집계 필요 |
| visit_count | ❌ | records COUNT 집계 필요 |

### 전략

| 조건 | 처리 방식 |
|------|----------|
| name 소팅 + DB필터만 (JS필터 없음) | DB ORDER BY + LIMIT/OFFSET → 완전한 DB 페이지네이션 |
| name 소팅 + JS필터 동시 적용 | DB ORDER BY, **p_limit=NULL** (전체 반환) → JS 필터 → JS slice |
| 나머지 소팅 (latest, score 등) | DB 메타 필터, **p_limit=NULL** (전체 반환) → JS 소팅 → JS slice |

> **핵심**: DB LIMIT/OFFSET은 "name 소팅 + JS필터 없음"일 때만 사용.
> JS필터가 하나라도 있으면 RPC에 **p_limit=NULL, p_offset=0**을 전달 (PostgreSQL `LIMIT NULL` = 무제한).
> 이유: DB LIMIT 후 JS필터를 적용하면 페이지에 20건 미만이 표시되는 문제 발생.
> 단, DB 메타 필터(genre, district 등)는 항상 DB WHERE로 적용하므로 JS가 처리하는 데이터량은 대폭 감소.

---

## 9. 구현 순서

하나의 작업 단위로 전체를 구현. 순서는 의존성 기준:

```
Step 1: DB 마이그레이션
  ├── 059_query_optimization_indexes.sql (인덱스)
  └── 060_query_optimization_functions.sql (RPC 함수 4개)

Step 2: Domain 인터페이스 수정
  ├── domain/repositories/home-repository.ts — filter/sort 파라미터 추가
  └── domain/services/filter-matcher.ts — DB 필터 속성 제거

Step 3: Infrastructure 구현
  ├── supabase-home-repository.ts — RPC 호출로 전환
  ├── supabase-follow-repository.ts — 맞팔 최적화
  └── supabase/types.ts — 타입 재생성

Step 4: Application 훅 수정
  ├── use-home-targets.ts — filter/sort 전달
  └── use-map-discovery.ts — genre/district/area 전달

Step 5: Presentation 수정
  ├── home-container.tsx — DB필터/JS필터 분리 + 지도뷰 필터 전달
  └── (검색은 인덱스만으로 해결 가능하므로 코드 변경 불필요 예상)

Step 6: API Route 수정
  └── api/restaurants/bounds/route.ts — genre/district/area 파라미터 추가

Step 7: 정리
  ├── filter-query-builder.ts 삭제
  └── EXPLAIN ANALYZE로 전체 검증
```

### 변경 파일 총괄

| 구분 | 파일 수 |
|------|---------|
| DB 마이그레이션 | 2 |
| Domain | 2 |
| Infrastructure | 3 |
| Application | 2 |
| Presentation | 1 |
| API Route | 1 (+ 조건부 1) |
| 삭제 | 1 |
| **합계** | **12** (+ 조건부 1) |
