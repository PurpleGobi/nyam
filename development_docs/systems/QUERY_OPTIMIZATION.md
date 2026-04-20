<!-- updated: 2026-04-20 (082 반영 + 톤 통일 patch) -->
# QUERY_OPTIMIZATION — 쿼리 최적화 원칙 & 인덱스 전략

> depends_on: `systems/DATA_MODEL.md`
> affects: 모든 `systems/*.md` (특히 `MAP_LOCATION`, `RECOMMENDATION`), 모든 `infrastructure/repositories`, `supabase/migrations`, `application/hooks`

---

## 원칙 요약

기능은 절대 축소/삭제하지 않는다. **동일한 결과를 더 빠르게 반환하는 것만이 최적화**다.
모든 최적화는 (1) 측정 → (2) 가설 → (3) 인덱스/쿼리/스키마 개선 → (4) 재측정 순서로 진행한다.

> 인덱스/스키마 정의 자체는 `systems/DATA_MODEL.md`가 SSOT다. 이 문서는 **왜 그 인덱스가 존재하는지, 어떤 쿼리가 그것을 사용하는지**를 다룬다.

---

# §1. 5대 원칙

### P1. 같은 데이터는 한 번만 조회한다 (No Duplicate Fetch)

```
BAD:  Step 1에서 follows 조회 → Step 3에서 follows 다시 조회
GOOD: Step 0에서 follows 1회 조회 → 결과를 Step 1, 3에서 재사용
```

**검증**: 하나의 함수 호출 내에서 동일 테이블+동일 조건 쿼리가 2회 이상 발생하면 위반.

### P2. 독립 쿼리는 항상 병렬 실행한다 (Parallelize Independent Queries)

```
BAD:  const a = await queryA(); const b = await queryB(); // 순차
GOOD: const [a, b] = await Promise.all([queryA(), queryB()]); // 병렬
```

**의존성 판별**: B의 WHERE 조건이 A의 결과에 의존하면 순차, 아니면 병렬.
**단, 의존 관계가 있어도 최소 단위로 분리**: A → B,C 병렬 → D 순서.

### P3. 필요한 컬럼만 SELECT 한다 (Minimal SELECT)

```
BAD:  .select('*')  // 30개 컬럼 중 5개만 사용
GOOD: .select('id, name, genre, district, lat, lng')  // 필요한 것만
```

**예외**: 도메인 엔티티 매핑에 전체 컬럼이 필요한 경우 (e.g., record 상세 페이지).
**적용 기준**: 리스트/배치 조회는 반드시 최소 SELECT. 단건 상세 조회는 `*` 허용.

### P4. N+1은 배치로, 루프 내 쿼리는 금지한다 (Batch Over Loop)

```
BAD:  for (id of ids) { await supabase.from('x').eq('id', id) } // N번
GOOD: await supabase.from('x').in('id', ids)                     // 1번
```

**RPC도 동일**: 단건 RPC를 루프로 호출하면 배열 버전 RPC를 만든다.

### P5. 인덱스는 쿼리 패턴을 따른다 (Index Follows Query)

인덱스를 먼저 만들지 않는다. 쿼리가 확정된 후, 해당 쿼리의 WHERE + ORDER BY를 커버하는 인덱스를 추가한다.

**인덱스 설계 체크리스트**:
| 조건 | 인덱스 타입 |
|------|-----------|
| `eq(col, val)` 단일 | btree(col) |
| `eq(a, v1).eq(b, v2).order(c)` | btree(a, b, c) 복합 |
| `in(col, [...])` 대량 ID | btree(col) — 기본 PK로 충분 |
| `ILIKE '%text%'` 텍스트 검색 | GIN(col gin_trgm_ops) |
| `ANY(array_col)` 배열 포함 | GIN(array_col) |
| 지리적 범위 (ST_DWithin, &&) | GiST(geom) |
| 특정 조건만 (status='active') | Partial WHERE status='active' |

**미사용 인덱스 정리**: 분기마다 `pg_stat_user_indexes`에서 `idx_scan = 0`인 인덱스를 검토·삭제.

---

# §2. 레이어별 역할

```
application/hooks   → 캐시(stale-while-revalidate), race condition 방지, 논블로킹 enrich
infrastructure/repo → P1~P4 적용, 쿼리 조합, 도메인 매핑
supabase/migrations → P5 적용, RPC 함수, 인덱스 관리
```

### infrastructure 쿼리 작성 패턴

```typescript
// 1. 공유 데이터 사전 조회 (P1)
const shared = await this.prefetchShared(userId, ...)

// 2. 의존성 기반 단계 실행 (P2)
//    독립 → Promise.all, 의존 → await 후 다음 단계
const [metaMap, ...] = await Promise.all([
  this.fetchMeta(ids, ...),           // 독립
  this.fetchBookmarks(userId, ids),   // 독립
])

// 3. 최소 SELECT (P3)
.select('id, name, genre, district')  // 리스트용

// 4. 배치 조회 (P4)
.in('id', targetIds)                  // 루프 금지
```

### application hooks 패턴

```typescript
// 1. requestId로 stale 응답 무시
const currentId = ++requestIdRef.current
const result = await repo.find(...)
if (requestIdRef.current !== currentId) return  // stale

// 2. 논블로킹 enrich (메인 데이터 먼저 표시)
setData(result)  // 즉시 렌더
enrichAsync(result).then(enriched => {
  if (requestIdRef.current !== currentId) return
  setData(enriched)
})

// 3. 탭별 캐시 (stale-while-revalidate)
const cached = cacheRef.current.get(key)
if (cached) setData(cached)  // 즉시 렌더, 백그라운드 revalidate
```

### 쿼리 코딩 규칙 (Query Convention)

기존 5대 원칙 위에 얹는 **7가지 세부 규칙**:

| 규칙 | 이름 | 내용 |
|------|------|------|
| **R-SEARCH** | 텍스트 검색 | ILIKE 사용 컬럼은 반드시 GIN trgm 인덱스. OR 2개 이상이면 EXPLAIN으로 Bitmap scan 확인, 안 되면 UNION 분리 |
| **R-ENUM** | 고정값 필터 | SSOT 고정값(genre, wine_type, scene, status 등)은 EQ 매칭만. ILIKE 금지. btree 인덱스 |
| **R-FILTER** | DB 필터 우선 | 테이블 컬럼 기반 필터는 SQL WHERE로 처리. JS 필터는 파생값(범위 변환, 기간 계산)에만 허용 |
| **R-PAGINATE** | DB 페이지네이션 | 20건 초과 가능한 목록은 LIMIT+OFFSET을 DB에서. 전체 fetch 후 JS slice 금지 |
| **R-SELECT** | 필요 컬럼만 | `SELECT *` 금지. 특히 JSONB/TEXT[]/photos 같은 큰 컬럼은 필요 시만 |
| **R-COUNT** | 집계 캐싱 | 자주 쓰는 COUNT는 캐시 컬럼 + 트리거/함수로 유지. 매번 COUNT(*) 금지 |
| **R-MUTUAL** | N+1 방지 | 관계 확인은 단일 JOIN 쿼리. 왕복 여러 번 금지. batch IN 필수 |

---

# §3. 인덱스 전략 상세

## 3-1. 인덱스 타입별 선택 기준

### B-Tree (기본)

컬럼 값을 정렬된 트리 구조로 저장. 등가/범위 매칭에서 3~4단계 탐색으로 결과 도달.

- **적합**: `=`, `>`, `<`, `BETWEEN`, `ORDER BY`, prefix `LIKE 'text%'`
- **부적합**: `LIKE '%중간%'` (앞에 `%`가 붙는 패턴)

### GIN (trigram — 텍스트 부분 매칭)

텍스트를 3글자 조각으로 쪼개 역색인. `%강남%` 같은 중간 매칭도 인덱스로 처리.

- **적합**: `ILIKE '%어디든%'`
- **대가**: 인덱스 크기 크고 쓰기 시 갱신 비용 높음. 카디널리티 높은 TEXT 컬럼에만 선택적 사용

### GIN (JSONB / TEXT[])

JSONB 내부 키/값 또는 배열 원소를 인덱스화.

- **적합**: `prestige @> '[{"type":"michelin"}]'`, `p_area = ANY(area)` (GIN(TEXT[]) 필요)

### GiST (공간)

좌표를 지리적 격자(R-Tree)로 분할. "이 범위 안의 것" 쿼리에서 해당 격자만 탐색.

- **적합**: `geom && ST_MakeEnvelope(...)`, `ST_DWithin`, `ST_Distance` 정렬

### Partial Index

WHERE 조건이 항상 붙는 경우 해당 조건의 행만 포함해 크기 축소.

- **적합**: `follows.status = 'accepted'`, `bubble_members.status = 'active'`, `users.is_public = true`

### 인덱스를 걸지 않는 기준

- 카디널리티 3 이하 (e.g., `acidity_level`, `sweetness_level`) — 선택도 너무 낮아 Seq Scan이 더 빠름
- 데이터 0건 (e.g., 초기 `price_range`) — 데이터 축적 후 재검토
- 코드에서 WHERE절 사용처 0건 — 주기적으로 검토 후 DROP

## 3-2. 복합 인덱스 vs 단일 인덱스 판단

| 쿼리 패턴 | 권장 인덱스 |
|----------|-----------|
| `WHERE a = ?` 단독 | 단일 btree(a) |
| `WHERE a = ? ORDER BY b` | 복합 btree(a, b) — 필터+소트 동시 처리 |
| `WHERE a = ? AND b = ? ORDER BY c` | 복합 btree(a, b, c) |
| `WHERE a = ?` **및** `WHERE a = ? ORDER BY b` 두 쿼리 공존 | 둘 다 유지 가능 (단일은 가벼움, 복합은 정렬 포함) |
| 서로 다른 쿼리에 a, b 각각 단독 사용 | 단일 btree(a) + 단일 btree(b) (복합 부적합) |

**복합 인덱스 컬럼 순서**: 선택도 높은 컬럼(카디널리티 큰 것) → 낮은 컬럼 순. 단, `ORDER BY` 대상은 맨 뒤.

## 3-3. 핵심 테이블별 쿼리-인덱스 매핑

> 인덱스 이름/정의의 실제 SQL은 `supabase/migrations/`와 `systems/DATA_MODEL.md` 참조.
>
> **인덱스 정의 SSOT는 `systems/DATA_MODEL.md` §11.5다.** 이 문서는 쿼리 패턴과 인덱스의 매핑을 설명할 뿐, 보조 인덱스(partial `idx_records_satisfaction`, `idx_follows_reverse`, `idx_comments_target`, `idx_comments_parent`, `idx_reactions_target`, `idx_bubble_photos_bubble` 등)의 전체 목록과 정의는 DATA_MODEL §11.5를 참조한다. 아래 표는 대표 쿼리-인덱스 매핑에 집중한다.

### restaurants (가장 큰 테이블, 13만+ 행 → 50만+ 예상)

| 쿼리 패턴 | 인덱스 | 타입 | 출처 |
|----------|--------|------|------|
| `name ILIKE '%q%'` | `idx_restaurants_name_trgm` | GIN trgm | 초기 |
| `address ILIKE '%q%'` | `idx_restaurants_address_trgm` | GIN trgm | 059 |
| `genre = ?` | `idx_restaurants_genre` | btree | 059 |
| `district = ?` | `idx_restaurants_district` | btree | 059 |
| `genre = ? ORDER BY name` | `idx_restaurants_genre_name` | btree 복합 | 059 |
| `area ANY(?)` | `idx_restaurants_area_gin` | GIN(TEXT[]) | 059 |
| `area = ?` 정확 매칭 | `idx_restaurants_area` | btree | 초기 |
| `prestige @> '[...]'` | `idx_restaurants_prestige` | GIN JSONB | 초기 |
| `geom && ST_MakeEnvelope(...)` | `idx_restaurants_geom` | GiST | 062 |
| `external_id_kakao = ?` | `idx_restaurants_external_id_kakao` | UNIQUE partial | 초기 |
| `external_id_google/naver = ?` | 각 UNIQUE partial | UNIQUE partial | 초기 |
| `last_crawled_at` 범위 | `idx_restaurants_last_crawled` | btree | 초기 |

**삭제된 인덱스** (059): `idx_restaurants_country_city`, `idx_restaurants_data_source`, `idx_restaurants_is_closed` — 코드 전체 검색으로 WHERE절 사용처 0건 확인 후 제거. (컬럼은 유지, 인덱스만 제거)

### wines

| 쿼리 패턴 | 인덱스 | 타입 | 출처 |
|----------|--------|------|------|
| `name ILIKE '%q%'` | `idx_wines_name_trgm` | GIN trgm | 059 |
| `producer ILIKE '%q%'` | `idx_wines_producer_trgm` | GIN trgm | 059 |
| `wine_type = ? ORDER BY name` | `idx_wines_type_name` | btree 복합 | 059 (이전 `idx_wines_type` 대체) |
| `variety = ?` | `idx_wines_variety` | btree | 059 |
| `country = ?` | `idx_wines_country` | btree | 초기 |
| `region = ?` | `idx_wines_region` | btree | 초기 |

**인덱스 미부여**: `acidity_level`, `sweetness_level` (카디널리티 3), `vintage` (EQ/범위 쿼리 빈도 낮음).

### users

| 쿼리 패턴 | 인덱스 | 타입 | 출처 |
|----------|--------|------|------|
| `nickname ILIKE '%q%'` | `idx_users_nickname_trgm` | GIN trgm | 059 |
| `is_public = true` 필터 | `idx_users_is_public` | btree partial | 059 |

### records (유저 성장 시 100만 행 예상)

| 쿼리 패턴 | 인덱스 | 타입 | 비고 |
|----------|--------|------|------|
| `user_id + target_type + visit_date DESC` | `idx_records_user_type_date` | btree 복합 | 홈뷰 Step 1 |
| `target_id + target_type` | `idx_records_target` | btree 복합 | 상세 페이지 |
| `user_id + target_id + target_type` | `idx_records_user_target` | btree 복합 | 찜/방문 확인 |
| `target_id + target_type + visit_date DESC` | `idx_records_target_date` | btree 복합 | 상세 페이지 날짜 정렬 (059) |
| `target_id + target_type + user_id` | `idx_records_target_user` | btree 복합 | bubble_items 트리거 EXISTS 가속 (078) |

### follows

| 쿼리 패턴 | 인덱스 | 타입 | 출처 |
|----------|--------|------|------|
| `follower_id + status='accepted'` | `idx_follows_follower_accepted` | btree partial | 059 |
| `following_id + status='accepted'` | `idx_follows_following_accepted` | btree partial | 059 |

### bubble_members

| 쿼리 패턴 | 인덱스 | 타입 | 출처 |
|----------|--------|------|------|
| `user_id + status='active'` | `idx_bubble_members_user` | btree partial | 초기 |
| `bubble_id + status='active'` | `idx_bubble_members_active` | btree partial | 초기 |
| `bubble_id + status + user_id` | `idx_bubble_members_bubble_status_user` | btree 복합 | 078 (트리거 가속) |

### bubble_items

현재 컬럼 세트가 `(id, bubble_id, target_id, target_type, added_at)`로 축소된 이후 유지되는 인덱스:

| 쿼리 패턴 | 인덱스 | 타입 | 비고 |
|----------|--------|------|------|
| `bubble_id + target_type` | `idx_bubble_items_bubble_target` | btree 복합 | 버블 피드 |
| UNIQUE `(bubble_id, target_id, target_type)` | PK 외 UNIQUE | UNIQUE | 중복 큐레이션 방지 |

**삭제된 인덱스**: `idx_bubble_items_added_by` (078 — 컬럼 자체 제거), `idx_bubble_items_bubble_source` (076 — source 컬럼 제거).

---

# §4. RPC 함수 카탈로그

모든 RPC의 실제 시그니처는 `supabase/migrations/` 참조. 아래는 **왜 존재하는지**와 **어떤 최적화를 목적으로 만들었는지**.

## 4-1. 지도뷰 — `search_restaurants_bounds_{simple|auth|source}`

**분리 이유**: 원래 단일 `search_restaurants_in_bounds` PL/pgSQL 함수였으나 조건부 분기(`IF p_user_id IS NULL ... ELSE ...`, `IF p_sources ... `)가 매 호출마다 planner 재평가를 유발해 290ms 소요. **시나리오별 3개 SQL 함수로 분리**하여 planner가 각 경로에 최적화된 플랜을 캐시 가능하게 만듦 (290ms → 1.7ms, 170배 개선).

> **주의**: `search_restaurants_in_bounds` — 레거시 정의는 DB에 유지(082 `search_path` 잠금 대상에 포함). **호출 시 `has_bookmark` 시그니처 잔존 가능, 3-way 분리 버전 사용 권장** (`_simple`/`_auth`/`_source` 중 하나).

| 함수 | 언어 | 용도 | 시그니처 |
|------|------|------|---------|
| `search_restaurants_bounds_simple` | SQL | 비로그인 사용자, source 필터 없음 | bounds + keyword + prestige + genre/district/area + sort/limit/offset + user_lat/lng |
| `search_restaurants_bounds_auth` | SQL | 로그인 사용자, source 필터 없음. `has_record` + `my_score`(satisfaction 평균) 포함 | + p_user_id |
| `search_restaurants_bounds_source` | PL/pgSQL | source 필터(mine/following/bubble) 포함 — 분기 로직 필요 | + p_sources TEXT[] |

**진화 히스토리** (sort 파라미터 기준):
- 062: `name`만 지원
- 064: `score_high` 추가 (my_score correlated subquery)
- 072: `distance` 추가 (`p_user_lat/lng` + `ST_Distance(geom, geography)`)

## 4-2. 홈뷰 메타 필터 — `filter_home_restaurants`, `filter_home_wines`

**왜 존재하는가**: 홈뷰는 원래 `.in('id', targetIds)`로 전체 메타를 가져온 뒤 JS에서 `matchesAllRules()` + `sortHomeTargets()` + `slice()`를 수행했다. public/following 뷰에서 target이 1,000건 초과할 수 있어 R-FILTER/R-PAGINATE 위반 위험이 컸다. **WHERE + ORDER BY + LIMIT을 DB로 이관**해 네트워크 왕복과 JS 비용 동시 감소.

| RPC | 용도 | 주요 파라미터 |
|-----|------|-------------|
| `filter_home_restaurants` (061) | 홈 식당탭 메타 필터 | `p_ids, p_genre, p_district, p_area, p_prestige, p_price_range, p_sort, p_limit, p_offset` |
| `filter_home_wines` (061) | 홈 와인탭 메타 필터 | `p_ids, p_wine_type, p_variety, p_country, p_vintage(+op), p_acidity, p_sweetness, p_sort, p_limit, p_offset` |

**JS 필터로 남긴 것**: `records` 파생 값(satisfaction 범위, visit_date 기간, scene 등). DB 이관 시 records JOIN이 필요해 쿼리 복잡도 대비 이득이 적음.

## 4-3. 팔로우 — `is_mutual_follow`, `follow_counts`

| RPC | 용도 | 최적화 의도 |
|-----|------|------------|
| `is_mutual_follow(p_user_id, p_target_id)` (061) | 맞팔 여부 | 기존 2회 왕복(Promise.all로 각자 조회) → 단일 self-JOIN 1회. R-MUTUAL 구현 |
| `follow_counts(p_user_id)` (069) | followers / following / mutual 3종 카운트 | 3회 왕복 → 단일 RPC. 프로필 페이지 로드 가속 |

## 4-4. 지도 인근 검색 — `restaurants_within_radius`

기존 `ST_DistanceSphere` 기반 RPC (014). 062에서 `geom` 컬럼 도입 이후에도 유지되며, bounds가 아닌 "중심점+반경" 시나리오에 사용.

## 4-5. RPC 함수 설계 원칙

1. **단순 필터**: Supabase 클라이언트 `.eq().in().order()`로 충분하면 RPC 불필요
2. **복합 필터 + 정렬 + 페이지네이션**: RPC로 DB에서 처리 (네트워크 왕복 1회)
3. **분기별 별도 함수**: 조건부 로직이 많으면 시나리오별 분리 (PL/pgSQL 분기 비용 제거) — `bounds_{simple|auth|source}`가 대표 사례
4. **SQL > PL/pgSQL**: 가능하면 순수 SQL 함수로 (planner 최적화 이점). 배열 누적/조건부 분기가 필요할 때만 PL/pgSQL
5. **`SET search_path = public, pg_temp` 필수**: 모든 RPC/트리거 함수 정의 시 반드시 `SET search_path = public, pg_temp`를 포함한다. Supabase security advisor의 mutable search_path 경고를 해소하고, 악의적 스키마 주입으로 인한 함수 탈취를 차단하며, planner 플랜 캐시 안정성을 높인다. 082에서 기존 19개 함수에 일괄 적용됨 — 신규 함수는 작성 시점에 반드시 잠금
6. **뷰 정의 시 `WITH (security_invoker = true)` 강제**: 현재 적용 선례(`bubble_expertise`, 082 기준). 이후 신규 뷰는 동일 원칙 적용 필수 — `WITH (security_invoker = true)`를 명시해 호출자의 RLS 정책을 상속받게 한다. 미지정 시 뷰 소유자 권한으로 실행되어 RLS 우회 경로가 될 수 있다. 참조: `systems/AUTH.md` §6-6

---

# §5. 최적화 히스토리 (마이그레이션별)

> 각 엔트리는 "**문제 → 조치 → 효과**" 순서. 실제 SQL은 해당 마이그레이션 파일 참조.

### 059 — query_optimization_indexes

- **문제**: restaurants 텍스트 검색 643ms (address trgm 없음, OR로 name trgm도 무시됨), genre/district EQ 필터 34~713ms (Seq Scan), wines/users 검색도 인덱스 부재
- **조치**:
  - restaurants: `address_trgm`, `genre`, `district`, `genre_name`, `area_gin` 추가 / `country_city`, `data_source`, `is_closed` 삭제
  - wines: `name_trgm`, `producer_trgm`, `type_name`, `variety` 추가 / `type` 단일 삭제
  - users: `nickname_trgm`, `is_public` partial 추가
  - records: `target_date` 추가
  - follows: `follower_accepted`, `following_accepted` partial 추가
- **효과**: 텍스트 검색 643ms → ~5ms, genre+district 필터 713ms → ~15ms

### 061 — query_optimization_functions

- **문제**: 홈뷰 메타 필터가 프론트엔드 JS에서 처리되어 target 수 증가 시 병목 위험 / 맞팔 확인 2회 왕복 / 지도 RPC에 genre/district/area 파라미터 없음
- **조치**: `filter_home_restaurants`, `filter_home_wines`, `is_mutual_follow` 신규 + `search_restaurants_in_bounds`에 `p_genre, p_district, p_area` 파라미터 추가 (genre ILIKE → EQ 전환)
- **효과**: 홈뷰 DB 필터 이관 기반 구축, 맞팔 확인 2회 → 1회, 지도뷰 genre 필터 ILIKE 제거

### 062 — geom_column_and_rpc_split (170배 개선)

- **문제**: 지도 bounds 검색 단일 PL/pgSQL 함수가 290ms 소요. 매 호출마다 `ST_SetSRID(ST_MakePoint(...))` 표현식 계산 + `IF p_user_id IS NULL ELSE` 분기 재평가
- **조치**:
  - `restaurants.geom geometry(Point, 4326)` stored 컬럼 추가 + BEFORE INSERT/UPDATE 트리거로 자동 동기화
  - `idx_restaurants_geom` GiST 재생성 (geom 컬럼 기반, expression-based 아닌 stored column 기반)
  - RPC를 시나리오별 3개로 분리: `_simple` (SQL), `_auth` (SQL), `_source` (PL/pgSQL)
- **효과**:
  - **290ms → 1.7ms (약 170배 개선, 062 RPC split 단독 효과)** — 동일 bounds RPC를 `_simple/_auth/_source` 3종으로 분리해 planner 재평가를 제거한 순수 효과. 기준 케이스는 keyword/genre/district 필터 없이 bounds + prestige만 포함한 로그인 미사용 시나리오
  - **713ms → 1.7ms (약 419배 개선, 061 ILIKE→EQ + 062 RPC split 누적 최악 케이스)** — DATA_MODEL §11.5 인덱스 성능 측정 예시와 동일한 측정 기준. 061에서 `p_genre` 파라미터화(ILIKE → EQ, `idx_restaurants_genre` 활용)로 Seq Scan을 제거한 효과와 062 RPC split 효과를 **둘 다 합산한 누적 수치**. 기준 케이스는 genre+district 필터가 걸려 Seq Scan이 발생하던 최악 시나리오
  - 결과적으로 planner가 각 경로에 최적화된 플랜을 캐시 가능

### 064 — bounds_rpc_add_scores

- **문제**: 지도뷰에서 내 기록 평균 점수 표시 불가 / bookmarks 테이블 참조 제거 필요 (063에서 drop)
- **조치**: bounds RPC 3종에 `my_score SMALLINT` 필드 추가 (correlated subquery로 records satisfaction 평균) + `p_sort = 'score_high'` 정렬 지원 / `has_bookmark` 반환 제거
- **효과**: 지도뷰에서 점수 기반 정렬과 점수 표시 한방에

### 069 — follow_counts_rpc

- **문제**: 프로필 페이지에서 followers/following/mutual 3회 왕복
- **조치**: `follow_counts(p_user_id)` RPC 신규 — 3 서브쿼리를 단일 RETURN TABLE로 반환
- **효과**: 3회 → 1회 왕복

### 072 — bounds_rpc_distance_sort

- **문제**: 지도뷰에 "거리순" 정렬 미지원
- **조치**: bounds RPC 3종에 `p_user_lat, p_user_lng DOUBLE PRECISION DEFAULT NULL` 파라미터 추가. `p_sort = 'distance'`일 때 `ST_Distance(geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography)` ASC 정렬. `p_user_lat IS NULL`이면 name 정렬로 폴백
- **효과**: 거리순 정렬을 DB에서 처리 (GiST 인덱스로 bounds 좁힌 후 `ST_Distance` 계산)

### 073~078 — bubble_items 단순화 시리즈 (JOIN 감소)

- **배경**: 기존 bubble_items는 `(id, bubble_id, target_id, target_type, added_by, source, record_id, added_at)`로 개인 단위 소유 개념 + 기록 연결이 뒤섞여 복잡. 버블 피드 쿼리에 `bubble_items + records + users` 3-way JOIN 필요
- **조치** (순차):
  - 073: 기록 삭제 시 bubble_items 정리 트리거 최초 도입
  - 074~075: 트리거 SECURITY 및 cleanup 로직 보정
  - 076: `source` 컬럼 제거 (`manual`/`auto` 구분 불필요 — 자동 필터 기반으로 전환)
  - 077: `record_id` 컬럼 제거 (record와의 직접 FK 불필요 — target 기반 큐레이션)
  - 078: `added_by` 컬럼 제거. "누가 기록했는지"는 `records + bubble_members` JOIN으로 조회. 기록 삭제/멤버 탈퇴 트리거를 활성 멤버 전체 체크로 재작성. `idx_records_target_user`, `idx_bubble_members_bubble_status_user` 추가로 트리거 EXISTS 가속
- **효과**: bubble_items가 순수 큐레이션 테이블로 축소. 컬럼 8→5, 인덱스 감소. 버블 피드 쿼리의 JOIN 패턴이 `bubble_items + records(target_id) + bubble_members`로 명확해짐. `member_item_stats` 트리거는 변경된 타겟에 기록이 있는 멤버만 갱신하도록 최적화 (수백 명 버블에서 전체 UPDATE 방지)

### 082 — security_hardening (search_path 잠금)

- **문제**: Supabase security advisor가 `function_search_path_mutable` 경고를 19개 함수에 대해 보고. 함수 내부에서 `schema.table` 미지정 참조가 호출자의 `search_path` 설정에 따라 바뀔 수 있어, 악성 스키마 주입 시 함수가 의도치 않은 객체를 참조할 위험. 또한 planner가 호출 시점마다 search_path를 고려해 플랜 캐시 재사용률이 낮아질 가능성
- **조치**: 기존 19개 함수에 `SET search_path = public, pg_temp`를 일괄 적용. 대상 함수:
  - 홈뷰 필터: `filter_home_restaurants`, `filter_home_wines`
  - 팔로우: `is_mutual_follow`, `follow_counts`
  - 지도: `restaurants_within_radius`, `search_restaurants_in_bounds` (레거시), `search_restaurants_bounds_simple`, `search_restaurants_bounds_auth`, `search_restaurants_bounds_source`
  - 크롤링/지오: `upsert_crawled_restaurants`, `sync_restaurant_geom`, `normalize_restaurant_name`
  - XP: `increment_user_total_xp`, `refresh_active_xp` 등
- **부수 조치**: `records_bubble_shared` dead policy 정식 DROP (077 이후 broken 상태로 방치되던 잔존 정책 제거)
- **효과**: advisor 권고 해소, 스키마 주입 공격면 제거, planner 플랜 캐시 안정성 향상. §4-5 원칙 5번에 따라 이후 신규 함수는 작성 시점에 반드시 잠금

### 관련 스키마 변경 참고

- **063 (drop_bookmarks)**: bookmarks 테이블 제거 → 찜/셀러 개념이 records 통합으로 전환. bounds RPC 064에서 `has_bookmark` 제거
- **070 (follows_realtime)**: follows 테이블에 Realtime publication 활성화 (쿼리 최적화보다는 실시간 동기화 기능)

---

# §6. 안티패턴 사례

실제 코드/마이그레이션에서 발견되어 고친 케이스. 동일 패턴 재발 방지용 레퍼런스.

### AP-1. OR + ILIKE → Seq Scan 유발

```
BAD:  .or(`name.ilike.%${q}%, address.ilike.%${q}%`)   // OR로 양쪽 인덱스 모두 무시
```

**대응 순서**:
1. 양쪽 컬럼에 GIN trgm 인덱스 추가 → EXPLAIN으로 Bitmap OR scan 동작 확인 (059에서 address_trgm 추가 후 대부분 해결)
2. 여전히 Seq Scan이면 → RPC로 UNION 쿼리 전환

### AP-2. SSOT 고정값에 ILIKE

```
BAD:  rst.genre ILIKE '%' || p_keyword || '%'   -- genre는 14종 고정값
GOOD: rst.genre = p_genre                        -- EQ 매칭 + btree 인덱스
```

**교훈**: 키워드 검색에 genre를 섞지 말고, 별도 파라미터로 분리. (061에서 `search_restaurants_in_bounds`에 `p_genre` 추가)

### AP-3. PL/pgSQL 분기 과다 단일 함수

```
BAD: 하나의 PL/pgSQL 함수에서 IF p_user_id IS NULL / IF p_sources ... 다중 분기
     → planner가 매번 재평가, 290ms
GOOD: 시나리오별 SQL 함수 3개로 분리, planner가 각각 캐시 → 1.7ms
```

**교훈**: 분기 조건이 호출자 측에서 결정되는 값이면, 분기된 함수를 호출자가 선택하게 하는 편이 planner에 유리.

### AP-4. 프론트엔드에서 전체 fetch 후 JS slice

```
BAD: DB에서 1,000건 가져와 matchesAllRules() + slice(0, 20)
GOOD: DB에서 WHERE + ORDER BY + LIMIT 20 처리 (filter_home_restaurants)
```

**교훈**: 20건 초과 가능한 목록은 R-PAGINATE에 따라 반드시 DB에서 페이지네이션.

### AP-5. 루프 내 단건 RPC

```
BAD: for (id of ids) { await supabase.rpc('get_one', { id }) }   // N번 왕복
GOOD: await supabase.rpc('get_batch', { ids })                    // 1번
```

**교훈**: 단건 RPC를 만든 직후, 배열 버전을 같은 마이그레이션에서 같이 만드는 것이 안전.

### AP-6. 트리거에서 전체 멤버 UPDATE

```
BAD: bubble_items 트리거에서 UPDATE bubble_members ... WHERE bubble_id = X
     → 수백 명 버블에서 매 INSERT마다 전체 UPDATE
GOOD: AND EXISTS (SELECT 1 FROM records WHERE user_id = bm.user_id AND target_id = v_target_id)
     → 변경된 타겟에 기록이 있는 멤버만 갱신 (078)
```

**교훈**: 트리거 내 집계 업데이트는 반드시 "변경된 것과 관련 있는 행"으로 WHERE를 좁힐 것.

### AP-7. 미사용 인덱스 방치

**교훈**: 분기마다 `pg_stat_user_indexes`에서 `idx_scan = 0`인 인덱스 검토. 059에서 `country_city`, `data_source`, `is_closed` 3개 제거 사례.

---

# 변경 시 체크리스트

새 쿼리를 추가하거나 기존 쿼리를 변경할 때:

```
□ P1: 같은 함수 내에서 동일 테이블+조건 쿼리가 2회 이상 없는가?
□ P2: 독립 쿼리를 Promise.all로 병렬화했는가?
□ P3: 리스트/배치 조회에서 select('*') 대신 필요 컬럼만 선택했는가?
□ P4: 루프 내 쿼리가 없는가? (있으면 .in() 배치로 전환)
□ P5: 새 WHERE/ORDER 패턴에 대응하는 인덱스가 있는가?
□ R-SEARCH: ILIKE 컬럼에 GIN trgm 인덱스가 있는가?
□ R-ENUM: SSOT 고정값을 EQ로만 매칭하는가? (ILIKE 금지)
□ R-FILTER: 테이블 컬럼 기반 필터를 DB에서 처리하는가?
□ R-PAGINATE: 20건 초과 가능한 목록이 DB LIMIT을 쓰는가?
□ R-COUNT: 반복되는 COUNT(*)를 캐시 컬럼/RPC로 대체했는가?
□ 기능 보존: 최적화 전후 반환 데이터가 동일한가?
□ DATA_MODEL 동기화: 새 인덱스/RPC/컬럼이 DATA_MODEL.md에 반영됐는가?
```
