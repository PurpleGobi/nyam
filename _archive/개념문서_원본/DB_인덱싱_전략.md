# DB 쿼리 최적화 & 인덱싱 전략

> 작성일: 2026-04-11 | 검토: 2026-04-11
> 대상: restaurants, wines, records, users, follows, bubbles 등 전체 테이블

---

## 1. 배경

restaurants 테이블이 13만 건으로 성장하면서 검색/필터링 응답이 느려졌다. Supabase compute 업그레이드(기껏 2배 개선)보다 **인덱스 최적화(100배 개선) + 아키텍처 개선**이 정답.

### 핵심 발견

Nyam의 검색/필터링은 **3개의 완전히 다른 경로**로 동작하며, 각각 병목 원인이 다르다:

| 경로 | 필터 위치 | 병목 원인 |
|------|----------|----------|
| **텍스트 검색** | DB (SQL WHERE) | 인덱스 부재 |
| **지도뷰** | DB (RPC 함수) | 인덱스 부재 + 비효율 ILIKE |
| **홈 피드** | **프론트엔드 (JS)** | 아키텍처 문제 — DB 전체 fetch 후 JS 필터 |

---

## 2. 인덱스 기초 개념

### B-Tree (기본)

컬럼 값을 **정렬된 트리 구조**로 저장. `WHERE genre = '한식'` 같은 정확 매칭이나 범위 조건(`>=`, `<=`)에서 트리를 3~4단계만 타면 결과를 찾는다.

```
                [일식]
               /      \
         [기타]        [중식]
        /    \        /    \
   [기타] [베트남]  [카페]  [한식]
     ↓      ↓       ↓      ↓
    행3   행7,12   행5    행1,2,4,8,9...
```

- 적합: `=`, `>`, `<`, `BETWEEN`, `ORDER BY`
- 부적합: `LIKE '%중간%'` (앞에 %가 붙는 패턴)

### GIN Trigram (텍스트 부분 매칭)

텍스트를 **3글자 조각(trigram)**으로 쪼개서 역색인. `%강남%` 같은 중간 매칭도 처리.

```
"스시코우지" → [스시코, 시코우, 코우지]

역색인:
  "스시코" → 행 45, 892
  "코우지" → 행 45, 1203
```

- 적합: `ILIKE '%어디든%'`
- 대가: 인덱스 크기 크고, 쓰기 시 갱신 비용 높음

### GiST (공간/지도)

좌표를 **지리적 격자(R-Tree)**로 분할. "이 범위 안의 것" 쿼리에서 해당 격자만 탐색.

### GIN JSONB (JSON 내부 검색)

JSONB 내부의 키/값을 인덱스화. `prestige @> '[{"type":"michelin"}]'` 같은 포함 검색.

### 왜 모든 컬럼에 안 거나?

인덱스 = 읽기 ↑ 쓰기 ↓. **실제 WHERE/ORDER BY에 쓰이는 컬럼에만** 건다.

---

## 3. 컬럼 카디널리티 (인덱스 효율 판단 근거)

```
genre:       14종  — 한식 71k, 기타 20k, 바/주점 16k, 일식 8k ...
district:   150종  — 강남구 8.5k, 마포구 6.2k, 송파구 6k ...
city:        17종  — 서울, 성남, 부천 ...
price_range:  0건  — 데이터 없음 (인덱스 의미 없음)
prestige:   992건  — 전체의 0.7%만 보유
```

- `genre` (14종): 카디널리티 낮음 → btree 단독은 선택도 낮지만, **복합 인덱스의 첫 컬럼**이나 **GiST 후 서브필터** 용도로 유효
- `district` (150종): 중간 카디널리티 → btree 적합
- `price_range`: 데이터 0건 → **인덱스 불필요** (데이터 채워진 후 재검토)

---

## 4. 쿼리 패턴 카탈로그

### 4.1 READ — 10가지 패턴

| # | 사용처 | WHERE 조건 | ORDER BY | 빈도 | 코드 위치 |
|---|--------|-----------|----------|------|----------|
| **Q1** | 텍스트 검색 | `name ILIKE '%q%' OR address ILIKE '%q%'` | 없음 | 매우 높음 | `api/restaurants/search/route.ts` |
| **Q2** | 지도 범위 | `공간범위 AND (name ILIKE OR genre ILIKE) AND prestige JSONB AND id=ANY(ids)` | `name ASC` | 매우 높음 | RPC `search_restaurants_in_bounds` |
| **Q3** | 근처 식당 | `ST_DistanceSphere(좌표) <= radius` | `distance` | 높음 | RPC `restaurants_within_radius` |
| **Q4** | 상세 조회 | `id = ?` | 없음 | 높음 | `findById()` |
| **Q5** | 배치 메타 | `id IN (uuid[])` | 없음 | 높음 | home/record/bubble repo |
| **Q6** | nearby 매칭 | `external_id_kakao IN (text[])` | 없음 | 높음 | `api/restaurants/nearby/` |
| **Q7** | 온보딩 시드 | `area = ? [AND name ILIKE '%q%']` | 없음 | 낮음 | `supabase-onboarding-repository.ts` |
| **Q8** | 등록 중복체크 | `name ILIKE 'exact'` | 없음 | 중간 | `create()`, settings repo |
| **Q9** | prestige 매칭 | `name ILIKE '%name%'` | 없음 | 낮음 | `api/restaurants/prestige/match/` |
| **Q10** | prestige kakao | `external_id_kakao = ? OR kakao_map_url = ?` | 없음 | 낮음 | 같은 파일 |

### 4.2 WRITE — 4가지 패턴

| # | 사용처 | 빈도 |
|---|--------|------|
| **W1** | 식당 등록 (INSERT) | 중간 |
| **W2** | 크롤링 upsert (배치) | 낮음 |
| **W3** | prestige 캐시 갱신 (UPDATE WHERE id) | 낮음 |
| **W4** | 식당 정보 업데이트 (UPDATE WHERE id) | 낮음 |

### 4.3 홈 피드 — 별도 분석 필요

홈 피드는 restaurants 테이블을 **직접 필터링하지 않는다.** 현재 흐름:

```
[useHomeTargets] → homeRepo.findHomeTargets()
  ├── Step 1: view별 target_id 수집 (records/bookmarks/follows/bubble_items 테이블)
  ├── Step 2: .from('restaurants').select(...).in('id', targetIds)  ← Q5 패턴
  ├── Step 3: records/bookmarks 배치 조회
  └── Step 4: HomeTarget[] 조립 후 반환

[home-container.tsx] — 프론트엔드
  ├── matchesAllRules() → genre, district, prestige, satisfaction 등 JS 필터
  ├── sortHomeTargets() → latest, score, name, distance 등 JS 소팅
  └── slice() → 5~10개씩 페이지네이션
```

**결론: 홈 필터는 restaurants 인덱스와 무관.** 프론트에서 JS로 처리 중이며, 유저 데이터(수십~수백 건)에 대해 동작하므로 현재는 충분히 빠르다. 단, `public`/`following` 뷰에서 데이터가 커지면 병목 가능.

---

## 5. 현재 인덱스 현황

| 인덱스 | 타입 | 커버 쿼리 | 판정 |
|--------|------|----------|------|
| `restaurants_pkey` (id) | btree UNIQUE | Q4, Q5, W3, W4 | ✅ 유지 |
| `idx_restaurants_name_trgm` | GIN trgm | Q1(name), Q8, Q9 | ✅ 유지 |
| `idx_restaurants_location` | GiST | Q2(bounds), Q3 | ✅ 유지 |
| `idx_restaurants_prestige` | GIN JSONB | Q2(prestige) | ✅ 유지 |
| `idx_restaurants_external_id_kakao` | UNIQUE partial | Q6, Q10 | ✅ 유지 |
| `idx_restaurants_external_id_google` | UNIQUE partial | 무결성 보장 | ✅ 유지 |
| `idx_restaurants_external_id_naver` | UNIQUE partial | 무결성 보장 | ✅ 유지 |
| `idx_restaurants_area` | btree | Q7 | ✅ 유지 |
| `idx_restaurants_last_crawled` | btree | 크롤러 관리 | ✅ 유지 |
| `idx_restaurants_country_city` | btree | **코드에서 미사용** | ❌ 삭제 |
| `idx_restaurants_data_source` | btree | **코드에서 미사용** | ❌ 삭제 |
| `idx_restaurants_is_closed` | btree partial | **코드에서 미사용** | ❌ 삭제 |

---

## 6. 병목 측정 결과 (EXPLAIN ANALYZE, 2026-04-11)

| 쿼리 | 검색어 | 실행 시간 | 스캔 | 원인 |
|------|--------|----------|------|------|
| Q1 텍스트 검색 | "트라토리아" | **643ms** | Seq Scan 13만건 전체 | `address` trgm 없음, OR로 인해 name trgm도 무시됨 |
| Q1 텍스트 검색 | "강남" (흔한) | 8ms | Seq Scan 이지만 일찍 종료 | LIMIT 20 + 앞쪽에서 발견 (운 좋은 경우) |
| Q2 지도+키워드 | "이탈리안" | **713ms** | GiST → 6만건 name/genre ILIKE | `genre` 인덱스 없음 |
| Q2 지도+prestige | "michelin" | 104ms | GiST → 6만건 JSONB sub-scan | GIN 있으나 planner가 GiST 후 필터 선택 |
| Q2 genre+district | 이탈리안+강남구 | 34ms | Seq Scan 13만건 | `genre`, `district` 인덱스 없음 |

---

## 7. 인덱싱 전략

### Tier 1 — 즉시 체감 (검색/지도 병목 해소)

| 인덱스 | 타입 | 대상 | 예상 개선 |
|--------|------|------|----------|
| `idx_restaurants_address_trgm` | GIN trgm | Q1 address ILIKE | 643ms → ~5ms |
| `idx_restaurants_genre` | btree | Q2 genre 필터, 지도 키워드 | 713ms → ~10ms |
| `idx_restaurants_district` | btree | 지도/홈 district 필터 | 34ms → ~1ms |

```sql
-- 마이그레이션: Tier 1 인덱스 추가
CREATE INDEX idx_restaurants_address_trgm
  ON restaurants USING GIN (address gin_trgm_ops);

CREATE INDEX idx_restaurants_genre
  ON restaurants USING btree (genre);

CREATE INDEX idx_restaurants_district
  ON restaurants USING btree (district);
```

### Tier 2 — 복합 인덱스 (필터+소팅 한방 처리)

| 인덱스 | 타입 | 대상 | 효과 |
|--------|------|------|------|
| `idx_restaurants_genre_name` | btree (genre, name) | Q2 genre 필터 + name 정렬 | 필터+소트 동시 처리 |

```sql
CREATE INDEX idx_restaurants_genre_name
  ON restaurants USING btree (genre, name);
```

> **참고**: Tier 1의 `idx_restaurants_genre` (단일)과 Tier 2의 `idx_restaurants_genre_name` (복합)은 공존 가능.
> 복합 인덱스는 `WHERE genre = X ORDER BY name` 패턴에만 효율적이고,
> 단일 인덱스는 `WHERE genre = X` 단독 필터에 더 가벼움. 둘 다 유지.

### Tier 3 — 엣지 케이스 (배치/저빈도)

| 인덱스 | 타입 | 대상 | 효과 |
|--------|------|------|------|
| `idx_restaurants_kakao_map_url` | btree partial | Q10 OR 조건 | 배치 prestige 매칭 가속 |

```sql
CREATE INDEX idx_restaurants_kakao_map_url
  ON restaurants USING btree (kakao_map_url)
  WHERE kakao_map_url IS NOT NULL;
```

> **price_range 인덱스: 보류.** 현재 데이터 0건. 크롤링으로 데이터 채워진 후 재검토.

### 삭제 — 미사용 인덱스 정리

```sql
DROP INDEX IF EXISTS idx_restaurants_country_city;
DROP INDEX IF EXISTS idx_restaurants_data_source;
DROP INDEX IF EXISTS idx_restaurants_is_closed;
```

### 인덱스 변경 총괄

| 변경 | 인덱스 수 | 쓰기 영향 |
|------|----------|----------|
| 현재 | 12개 | 기준점 |
| Tier 1 추가 (+3), 미사용 삭제 (-3) | **12개** | **동일** |
| Tier 2 추가 (+1) | 13개 | 미미 |
| Tier 3 추가 (+1) | 14개 | 미미 |

---

## 8. 코드 리팩토링 계획

인덱스만으로 해결 안 되는 **3가지 코드 변경**:

### 8.1 search_restaurants_in_bounds: genre ILIKE → EQ 전환

**현재 문제**: 지도 키워드 검색에서 `genre ILIKE '%이탈리안%'` 사용. genre는 SSOT 14종 고정값인데 ILIKE로 부분 매칭할 이유가 없다. GiST 후 6만건에 대해 문자열 비교 발생.

**변경**:
```sql
-- 변경 전 (search_restaurants_in_bounds 함수 내부)
AND (p_keyword = '' OR rst.name ILIKE '%' || p_keyword || '%'
                    OR rst.genre ILIKE '%' || p_keyword || '%')

-- 변경 후: keyword를 name 검색과 genre 정확매칭으로 분리
AND (p_keyword = '' OR rst.name ILIKE '%' || p_keyword || '%')
AND (p_genre IS NULL OR rst.genre = p_genre)
```

**영향 범위**:
- DB 함수 `search_restaurants_in_bounds` — 파라미터 `p_genre TEXT` 추가
- `src/app/api/restaurants/bounds/route.ts` — `genre` 쿼리파라미터 추가
- `src/application/hooks/use-map-discovery.ts` — genre 파라미터 전달

**예상 효과**: 713ms → ~15ms (GiST + btree genre 인덱스 활용)

### 8.2 텍스트 검색: OR 쿼리 최적화

**현재 문제**: `name ILIKE OR address ILIKE`에서 OR 때문에 PostgreSQL이 양쪽 인덱스를 모두 무시하고 Seq Scan 선택.

**Tier 1 인덱스 추가 후 예상**: PostgreSQL planner가 Bitmap OR scan (name trgm + address trgm)을 선택할 가능성이 높다. 그래도 안 되면:

**Plan B — UNION으로 분리**:
```sql
-- 변경 전
SELECT ... FROM restaurants
WHERE name ILIKE '%q%' OR address ILIKE '%q%' LIMIT 20

-- 변경 후: 각 인덱스를 확실히 타게
(SELECT ... FROM restaurants WHERE name ILIKE '%q%' LIMIT 20)
UNION
(SELECT ... FROM restaurants WHERE address ILIKE '%q%' LIMIT 20)
LIMIT 20
```

**영향 범위**:
- `src/app/api/restaurants/search/route.ts` — Supabase 쿼리를 RPC 또는 raw SQL로 변경
- `supabase-restaurant-repository.ts` → `search()` 메서드

**예상 효과**: 643ms → ~5ms

### 8.3 홈 피드 필터: 현재 유지, 조건부 DB 이관

**현재 구조 분석**:
```
DB에서 가져오는 것: 유저의 모든 target (records/bookmarks/follows 기반)
프론트에서 하는 것: genre, district, prestige, satisfaction 등 JS 필터 + 소팅 + 페이지네이션
```

**왜 당장 리팩토링하지 않는가**:
- 홈 피드의 데이터 크기는 **유저의 기록 수에 비례** (13만건 전체가 아님)
- 일반 유저: 수십~수백 건 → JS 필터 < 1ms로 충분
- 필터 속성이 **2개 테이블에 분산** (restaurants: genre/district/prestige, records: satisfaction/visit_date/scene) → DB 이관 시 복잡한 JOIN 필요
- `filter-matcher.ts`의 특수 속성 로직 (satisfaction 범위, visit_date 기간, companion_count 범위, prestige JSONB 복합 매칭)을 SQL로 옮기면 RPC 함수가 매우 복잡해짐

**DB 이관이 필요해지는 시점** (아래 조건 중 하나라도 해당 시):
- `public` 뷰에서 공개 유저가 많아져 target 수가 1,000건 초과
- `following` 뷰에서 팔로잉 수가 많은 유저가 10,000건+ target 로딩
- 프론트 필터링 체감 지연 200ms 초과

**이관 시 방향**:
```sql
-- restaurants 메타 필터만 DB로 (genre, district, area, prestige)
-- records 기반 필터 (satisfaction, visit_date, scene 등)는 프론트 유지
-- 이유: records JOIN이 불가피하면 쿼리 복잡도 대비 이득이 적음

CREATE FUNCTION filter_home_targets(
  p_target_ids UUID[],
  p_genre TEXT DEFAULT NULL,
  p_district TEXT DEFAULT NULL,
  p_prestige_type TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'name',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE(...) AS $$
  SELECT ... FROM restaurants
  WHERE id = ANY(p_target_ids)
    AND (p_genre IS NULL OR genre = p_genre)
    AND (p_district IS NULL OR district = p_district)
    AND (p_prestige_type IS NULL OR prestige @> ...)
  ORDER BY ...
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql;
```

---

## 9. Dead Code 정리

| 파일 | 내용 | 판정 |
|------|------|------|
| `src/domain/services/filter-query-builder.ts` | PostgREST 필터 문자열 생성 | **미사용** — 호출처 0개. 삭제 대상 |

`buildFilterQuery()`는 원래 DB 레벨 필터링용으로 만들었으나, 실제로는 `filter-matcher.ts`의 프론트엔드 필터만 사용 중. 홈 피드를 DB로 이관할 때 RPC 함수로 대체되므로 이 파일은 필요 없다.

---

## 10. 실행 로드맵

### Phase 1: 인덱스 (코드 변경 없음, 즉시 효과)

```
1-1. 마이그레이션 작성 — Tier 1 인덱스 3개 추가 + 미사용 3개 삭제
1-2. 적용 후 EXPLAIN ANALYZE로 Q1, Q2 검증
1-3. 효과 확인 후 Tier 2 복합 인덱스 추가
```

**예상 소요**: 마이그레이션 1개, 검증 30분
**위험도**: 낮음 (읽기 전용 변경, 롤백 = DROP INDEX)

### Phase 2: 지도 함수 개선 (search_restaurants_in_bounds)

```
2-1. RPC 함수에 p_genre 파라미터 추가, genre ILIKE → EQ 전환
2-2. bounds/route.ts에 genre 쿼리파라미터 추가
2-3. use-map-discovery.ts에서 genre 전달
2-4. EXPLAIN ANALYZE 검증
```

**영향 파일**: 3개
**예상 소요**: 마이그레이션 1개 + 코드 3파일 수정
**위험도**: 낮음 (기존 동작 유지, genre 파라미터 optional)

### Phase 3: 텍스트 검색 최적화

```
3-1. Tier 1 인덱스(address trgm) 적용 후 EXPLAIN ANALYZE 재측정
3-2. Bitmap OR scan이 동작하면 → 완료
3-3. 여전히 Seq Scan이면 → UNION 분리 방식으로 전환
```

**영향 파일**: 1~2개
**예상 소요**: 측정 후 판단
**위험도**: 낮음

### Phase 4: 홈 피드 DB 이관 (조건부)

```
4-1. public/following 뷰의 target 수 모니터링
4-2. 1,000건 초과 시 filter_home_targets RPC 함수 작성
4-3. supabase-home-repository.ts에서 restaurants 메타 필터를 RPC로 위임
4-4. filter-matcher.ts는 records 기반 필터만 담당하도록 축소
```

**영향 파일**: 3~5개
**예상 소요**: RPC 함수 + repository 수정 + 테스트
**위험도**: 중간 (필터 로직 이중화 주의)

### Phase 5: 정리

```
5-1. filter-query-builder.ts 삭제 (dead code)
5-2. Tier 3 인덱스 필요 시 추가
5-3. price_range 데이터 채워진 후 인덱스 재검토
```

---
---

# Part 2: 전체 시스템 쿼리 리팩토링

> restaurants뿐 아니라 wines, users, records, follows, bubbles 등
> 검색/필터가 일어나는 **모든 페이지**를 대상으로 한 통합 최적화.

---

## 11. 테이블별 현황 총괄

| 테이블 | 현재 행 수 | 예상 규모 (1년) | 인덱스 수 | 비고 |
|--------|-----------|---------------|----------|------|
| restaurants | 133,000 | 50만+ | 12 | 크롤링으로 급증 중 |
| wines | 0 | 1만~10만 | 4 | AI 검색으로 자동 생성 |
| records | 2 | 10만~100만 | 4 | 유저 성장 시 폭증 |
| users | 4 | 1천~1만 | 4 | |
| follows | 0 | 1만~10만 | 2 | 유저 간 소셜 |
| bookmarks | 0 | 1만~10만 | 4 | |
| bubbles | 0 | 100~1,000 | 2 | |
| bubble_members | 0 | 1천~1만 | 3 | |
| bubble_items | 0 | 1만~10만 | 4 | |
| record_photos | 0 | 10만~100만 | 2 | |

---

## 12. 페이지별 쿼리 패턴 & 문제점

### 12.1 식당 검색 (텍스트)

```
현재: .or(`name.ilike.%q%,address.ilike.%q%`).limit(20)
문제: OR + ILIKE → Seq Scan 13만건 (최악 643ms)
```

**규칙 R-SEARCH**: 텍스트 검색은 **대상 컬럼 모두에 GIN trgm 인덱스** 필수. OR이 Bitmap scan을 안 타면 UNION으로 분리.

### 12.2 와인 검색 (텍스트)

```
현재: .or(`name.ilike.%q%,producer.ilike.%q%`).order('name').limit(20)
문제: name, producer 모두 trgm 인덱스 없음 → 와인 수만건 시 동일 병목
```

**동일 규칙 R-SEARCH 적용**: wines.name, wines.producer에 GIN trgm 추가.

### 12.3 사용자 검색 (버블 초대, 팔로우)

```
현재: .or(`nickname.ilike.%q%,handle.ilike.%q%,email.ilike.%q%`).limit(10)
문제: nickname, handle, email 모두 trgm 없음 → 유저 1만명 시 느려짐
```

**동일 규칙 R-SEARCH 적용**: users.nickname에 GIN trgm 추가. handle은 UNIQUE btree로 prefix 매칭 가능, email은 내부 검색이므로 우선순위 낮음.

### 12.4 식당 지도뷰

```
현재: search_restaurants_in_bounds RPC
  - GiST 공간 필터 ✅
  - name ILIKE → trgm ✅
  - genre ILIKE → 인덱스 없음 ❌ (6만건 문자열 비교)
  - prestige JSONB → GIN ✅
  - source 필터 (records/bookmarks/follows/bubble_items JOIN) → 서브쿼리
문제: genre ILIKE가 SSOT 고정값인데 부분매칭 사용
```

**규칙 R-ENUM**: SSOT 고정값 컬럼(genre, wine_type 등)은 **반드시 EQ 매칭**. ILIKE 금지. btree 인덱스만으로 충분.

### 12.5 식당/와인 홈뷰

```
현재 흐름:
  1. view별 target_id 수집 (records/bookmarks/follows/bubble_items 쿼리)
  2. .from('restaurants').in('id', targetIds) — 메타 batch fetch
  3. JS로 필터 (genre, district, prestige, satisfaction...)
  4. JS로 소팅 (latest, score, name, distance)
  5. JS로 slice (페이지네이션)

문제: Step 2에서 모든 메타를 가져온 후 프론트에서 필터/소팅/페이지네이션.
  유저 데이터 적으면 OK, public/following 뷰에서 수천건이면 병목.
```

**규칙 R-FILTER**: DB 컬럼 기반 필터(genre, district, wine_type, country 등)는 **WHERE 절로 DB에서 처리**. JS 필터는 records 파생 값(satisfaction 범위, visit_date 기간)에만 허용.

**규칙 R-PAGINATE**: 20건 이상 반환하는 목록은 반드시 **DB LIMIT+OFFSET**. 프론트 slice 금지.

### 12.6 버블 홈뷰

```
현재: bubbles 목록 조회 → 프론트 필터/소팅
문제: 버블 수는 적으므로 (100~1,000) 당장은 OK.
  but bubble_items가 수만건으로 커지면 JOIN 병목.
```

**규칙 R-COUNT**: 집계(member_count, item_count)는 **DB 캐시 컬럼 + 트리거**로. 매번 COUNT(*) 금지.

### 12.7 팔로워/팔로잉

```
현재: follows 테이블 PK(follower_id, following_id) + reverse 인덱스
문제: 인덱스는 OK. 다만 getMutualFollows()가 2번 쿼리 + IN 조합 → 비효율.
```

**규칙 R-MUTUAL**: 맞팔 확인은 **단일 self-JOIN 쿼리**로. 왕복 2회 금지.

---

## 13. 쿼리 코딩 규칙 (Query Convention)

모든 검색/필터/목록 쿼리에 적용하는 **7가지 규칙**:

| 규칙 | 이름 | 내용 |
|------|------|------|
| **R-SEARCH** | 텍스트 검색 | ILIKE 사용 컬럼은 **반드시 GIN trgm 인덱스**. OR 2개 이상이면 EXPLAIN으로 Bitmap scan 확인, 안 되면 UNION 분리 |
| **R-ENUM** | 고정값 필터 | SSOT 고정값(genre, wine_type, scene, status 등)은 **EQ 매칭만**. ILIKE 금지. btree 인덱스 |
| **R-FILTER** | DB 필터 우선 | 테이블 컬럼 기반 필터는 **SQL WHERE**로 처리. JS 필터는 파생값(범위 변환, 기간 계산)에만 허용 |
| **R-PAGINATE** | DB 페이지네이션 | 20건 초과 가능한 목록은 **LIMIT+OFFSET을 DB에서**. 전체 fetch 후 JS slice 금지 |
| **R-SELECT** | 필요 컬럼만 | `SELECT *` 금지. 필요한 컬럼만 명시. 특히 JSONB/TEXT[]/photos 같은 큰 컬럼은 필요 시만 |
| **R-COUNT** | 집계 캐싱 | 자주 쓰는 COUNT는 **캐시 컬럼 + 트리거/함수로 유지**. 매번 COUNT(*) 금지 |
| **R-MUTUAL** | N+1 방지 | 관계 확인은 **단일 JOIN 쿼리**. 왕복 여러 번 금지. batch IN 필수 |

---

## 14. 전체 인덱스 마이그레이션

### 14.1 추가할 인덱스

#### restaurants (Tier 1~2)

```sql
-- R-SEARCH: 텍스트 검색 address trgm
CREATE INDEX idx_restaurants_address_trgm
  ON restaurants USING GIN (address gin_trgm_ops);

-- R-ENUM: genre 정확 매칭 + 필터
CREATE INDEX idx_restaurants_genre
  ON restaurants USING btree (genre);

-- R-FILTER: district 필터
CREATE INDEX idx_restaurants_district
  ON restaurants USING btree (district);

-- R-FILTER + R-PAGINATE: genre 필터 + name 정렬 복합
CREATE INDEX idx_restaurants_genre_name
  ON restaurants USING btree (genre, name);
```

#### wines

```sql
-- R-SEARCH: 와인 이름 trgm (와인 수만건 대비)
CREATE INDEX idx_wines_name_trgm
  ON wines USING GIN (name gin_trgm_ops);

-- R-SEARCH: 생산자 trgm
CREATE INDEX idx_wines_producer_trgm
  ON wines USING GIN (producer gin_trgm_ops);

-- R-ENUM + R-FILTER: wine_type + name 복합 (홈뷰 필터+소팅)
CREATE INDEX idx_wines_type_name
  ON wines USING btree (wine_type, name);

-- R-FILTER: variety 필터 (홈뷰)
CREATE INDEX idx_wines_variety
  ON wines USING btree (variety);
```

#### users

```sql
-- R-SEARCH: 사용자 닉네임 trgm (버블 초대, 팔로우 검색)
CREATE INDEX idx_users_nickname_trgm
  ON users USING GIN (nickname gin_trgm_ops);

-- R-FILTER: 공개 유저 필터 (public 뷰에서 사용)
CREATE INDEX idx_users_is_public
  ON users USING btree (is_public)
  WHERE is_public = true;
```

#### records (스케일 대비)

```sql
-- R-FILTER: target별 기록 조회 + 날짜 정렬 (상세 페이지)
-- 이미 idx_records_target(target_id, target_type) 있지만 visit_date 정렬 포함 복합 필요
CREATE INDEX idx_records_target_date
  ON records USING btree (target_id, target_type, visit_date DESC);

-- R-FILTER: user의 target_type별 target_id 수집 (홈뷰 Step 1)
-- 이미 idx_records_user_type(user_id, target_type, visit_date DESC) 있으므로 충분
-- 추가 불필요
```

#### follows

```sql
-- 현재 PK(follower_id, following_id) + reverse(following_id, follower_id)
-- R-MUTUAL: status 포함 인덱스 (accepted 필터가 항상 붙으므로)
CREATE INDEX idx_follows_follower_accepted
  ON follows USING btree (follower_id, status, following_id)
  WHERE status = 'accepted';

CREATE INDEX idx_follows_following_accepted
  ON follows USING btree (following_id, status, follower_id)
  WHERE status = 'accepted';
```

### 14.2 삭제할 인덱스

```sql
-- restaurants: 코드에서 미사용
DROP INDEX IF EXISTS idx_restaurants_country_city;
DROP INDEX IF EXISTS idx_restaurants_data_source;
DROP INDEX IF EXISTS idx_restaurants_is_closed;
```

### 14.3 인덱스 변경 총괄

| 테이블 | 현재 | 추가 | 삭제 | 최종 |
|--------|------|------|------|------|
| restaurants | 12 | +4 | -3 | **13** |
| wines | 4 | +4 | 0 | **8** |
| users | 4 | +2 | 0 | **6** |
| records | 4 | +1 | 0 | **5** |
| follows | 2 | +2 | 0 | **4** |
| **합계** | **26** | **+13** | **-3** | **36** |

---

## 15. 코드 리팩토링 상세

### 15.1 search_restaurants_in_bounds 함수 개선

**현재**: `genre ILIKE '%keyword%'`
**변경**: `p_genre TEXT` 파라미터 분리, EQ 매칭

```sql
-- 변경 전
AND (p_keyword = '' OR rst.name ILIKE '%' || p_keyword || '%'
                    OR rst.genre ILIKE '%' || p_keyword || '%')

-- 변경 후
AND (p_keyword = '' OR rst.name ILIKE '%' || p_keyword || '%')
AND (p_genre IS NULL OR rst.genre = p_genre)
AND (p_district IS NULL OR rst.district = p_district)
```

**영향 파일**:
| 파일 | 변경 |
|------|------|
| DB 함수 `search_restaurants_in_bounds` | p_genre, p_district 파라미터 추가 |
| `src/app/api/restaurants/bounds/route.ts` | genre, district 쿼리파라미터 파싱 → RPC 전달 |
| `src/application/hooks/use-map-discovery.ts` | genre, district 전달 |

### 15.2 텍스트 검색 통합 패턴

식당, 와인, 사용자 검색 모두 동일한 패턴으로 통일:

```typescript
// ❌ 기존: OR로 Seq Scan 유발
.or(`name.ilike.%${q}%,address.ilike.%${q}%`)

// ✅ 변경: 인덱스 추가 후 유지 (Bitmap OR scan 기대)
// trgm 인덱스가 있으면 PostgreSQL이 자동으로 Bitmap OR 선택
.or(`name.ilike.%${q}%,address.ilike.%${q}%`)
.limit(20)

// ✅ Bitmap OR 안 될 경우 Plan B: RPC로 UNION 쿼리
// CREATE FUNCTION search_restaurants(p_query TEXT, p_limit INT)
// RETURNS TABLE(...) AS $$
//   (SELECT ... WHERE name ILIKE '%' || p_query || '%' LIMIT p_limit)
//   UNION
//   (SELECT ... WHERE address ILIKE '%' || p_query || '%' LIMIT p_limit)
//   LIMIT p_limit
// $$ LANGUAGE sql;
```

**적용 대상**:
| 검색 | 현재 | trgm 인덱스 추가 |
|------|------|---------|
| 식당 | `name.ilike OR address.ilike` | `idx_restaurants_name_trgm` ✅ + `idx_restaurants_address_trgm` **추가** |
| 와인 | `name.ilike OR producer.ilike` | `idx_wines_name_trgm` **추가** + `idx_wines_producer_trgm` **추가** |
| 사용자 | `nickname.ilike OR handle.ilike OR email.ilike` | `idx_users_nickname_trgm` **추가** |

### 15.3 홈뷰 필터: restaurants 메타 필터를 DB로 이관

**현재 (프론트 필터)**:
```
DB: .in('id', targetIds) → 전체 메타 fetch
JS: matchesAllRules(genre='한식', district='강남구', ...) → 프론트 필터
JS: sortHomeTargets('name') → 프론트 소팅
JS: slice(0, 10) → 프론트 페이지네이션
```

**변경 (하이브리드)**:
```
DB: filter_home_targets(targetIds, genre='한식', district='강남구', sort='name', limit=20)
  → WHERE + ORDER BY + LIMIT 처리
JS: records 파생 필터(satisfaction 범위, visit_date 기간)만 프론트 유지
```

**DB 함수**:
```sql
CREATE OR REPLACE FUNCTION filter_home_restaurants(
  p_ids UUID[],
  p_genre TEXT DEFAULT NULL,
  p_district TEXT DEFAULT NULL,
  p_area TEXT DEFAULT NULL,
  p_prestige_type TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'name',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
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
    AND (p_prestige_type IS NULL OR r.prestige @> ('[{"type":"' || p_prestige_type || '"}]')::jsonb)
  ORDER BY
    CASE WHEN p_sort = 'name' THEN r.name END ASC,
    CASE WHEN p_sort = 'latest' THEN r.name END ASC  -- 날짜는 records에서 → 프론트
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;
```

동일하게 `filter_home_wines`:
```sql
CREATE OR REPLACE FUNCTION filter_home_wines(
  p_ids UUID[],
  p_wine_type TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_variety TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'name',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE(
  id UUID, name TEXT, wine_type TEXT, variety TEXT,
  country TEXT, region TEXT, vintage INT, photos TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.name::TEXT, w.wine_type::TEXT, w.variety::TEXT,
         w.country::TEXT, w.region::TEXT, w.vintage, w.photos
  FROM wines w
  WHERE w.id = ANY(p_ids)
    AND (p_wine_type IS NULL OR w.wine_type = p_wine_type)
    AND (p_country IS NULL OR w.country = p_country)
    AND (p_variety IS NULL OR w.variety = p_variety)
  ORDER BY
    CASE WHEN p_sort = 'name' THEN w.name END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;
```

**영향 파일**:
| 파일 | 변경 |
|------|------|
| `supabase-home-repository.ts` → `fetchTargetMeta()` | `.in('id', ids)` → RPC `filter_home_restaurants/wines` 호출 |
| `home-container.tsx` | DB 필터 파라미터 전달 구조 추가. JS 필터에서 genre/district/wine_type 등 제거 |
| `filter-matcher.ts` | restaurants/wines 메타 필터 로직 제거, records 파생 필터만 유지 |
| `use-home-targets.ts` | filter/sort 파라미터를 homeRepo에 전달 |

### 15.4 맞팔 확인 최적화

**현재** (2회 왕복):
```typescript
const [{ data: a }, { data: b }] = await Promise.all([
  supabase.from('follows').select('status').eq('follower_id', userId)...
  supabase.from('follows').select('status').eq('follower_id', targetUserId)...
])
return !!a && !!b
```

**변경** (단일 쿼리):
```sql
SELECT EXISTS(
  SELECT 1 FROM follows f1
  INNER JOIN follows f2
    ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
  WHERE f1.follower_id = $1 AND f1.following_id = $2
    AND f1.status = 'accepted' AND f2.status = 'accepted'
) AS is_mutual;
```

**영향 파일**: `supabase-follow-repository.ts` → `isMutualFollow()`, `getMutualFollows()`

### 15.5 Dead Code 삭제

| 파일 | 이유 |
|------|------|
| `src/domain/services/filter-query-builder.ts` | 호출처 0개. DB 필터는 RPC 함수로 대체 |

---

## 16. 마이그레이션 파일

### 파일: `supabase/migrations/20260411_query_optimization_indexes.sql`

```sql
-- ============================================================
-- Nyam 쿼리 최적화: 인덱스 추가/삭제
-- 목적: 검색/필터링 전반의 시간 단축
-- 영향: 읽기 전용 변경, 코드 수정 없이 즉시 효과
-- 롤백: 각 CREATE INDEX의 역은 DROP INDEX
-- ============================================================

-- ── restaurants ──

-- 텍스트 검색: address trgm (Q1: 643ms → ~5ms)
CREATE INDEX IF NOT EXISTS idx_restaurants_address_trgm
  ON restaurants USING GIN (address gin_trgm_ops);

-- 필터: genre btree (Q2 지도, 홈 필터)
CREATE INDEX IF NOT EXISTS idx_restaurants_genre
  ON restaurants USING btree (genre);

-- 필터: district btree (홈 필터)
CREATE INDEX IF NOT EXISTS idx_restaurants_district
  ON restaurants USING btree (district);

-- 복합: genre 필터 + name 정렬 (지도뷰, 홈뷰)
CREATE INDEX IF NOT EXISTS idx_restaurants_genre_name
  ON restaurants USING btree (genre, name);

-- 미사용 인덱스 삭제
DROP INDEX IF EXISTS idx_restaurants_country_city;
DROP INDEX IF EXISTS idx_restaurants_data_source;
DROP INDEX IF EXISTS idx_restaurants_is_closed;

-- ── wines ──

-- 텍스트 검색: name trgm
CREATE INDEX IF NOT EXISTS idx_wines_name_trgm
  ON wines USING GIN (name gin_trgm_ops);

-- 텍스트 검색: producer trgm
CREATE INDEX IF NOT EXISTS idx_wines_producer_trgm
  ON wines USING GIN (producer gin_trgm_ops);

-- 복합: wine_type 필터 + name 정렬 (홈뷰)
CREATE INDEX IF NOT EXISTS idx_wines_type_name
  ON wines USING btree (wine_type, name);

-- 필터: variety (홈뷰 포도품종 필터)
CREATE INDEX IF NOT EXISTS idx_wines_variety
  ON wines USING btree (variety);

-- ── users ──

-- 텍스트 검색: nickname trgm (버블 초대, 사용자 검색)
CREATE INDEX IF NOT EXISTS idx_users_nickname_trgm
  ON users USING GIN (nickname gin_trgm_ops);

-- 필터: 공개 유저 (public 뷰)
CREATE INDEX IF NOT EXISTS idx_users_is_public
  ON users USING btree (is_public) WHERE is_public = true;

-- ── records ──

-- 상세 페이지: target별 기록 + 날짜 정렬
CREATE INDEX IF NOT EXISTS idx_records_target_date
  ON records USING btree (target_id, target_type, visit_date DESC);

-- ── follows ──

-- accepted 팔로잉 조회 (홈뷰 following 소스, 맞팔 확인)
CREATE INDEX IF NOT EXISTS idx_follows_follower_accepted
  ON follows USING btree (follower_id, following_id)
  WHERE status = 'accepted';

-- accepted 팔로워 조회 (프로필, 팔로워 목록)
CREATE INDEX IF NOT EXISTS idx_follows_following_accepted
  ON follows USING btree (following_id, follower_id)
  WHERE status = 'accepted';
```

---

## 17. 최종 실행 로드맵 (통합)

### Phase 1: 인덱스 적용 (코드 변경 없음)

```
1-1. 위 마이그레이션 파일 적용
1-2. EXPLAIN ANALYZE로 restaurants Q1, Q2 검증
1-3. wines, users 검색도 측정 (현재 데이터 적지만 기준점 확보)
```

**위험도**: 낮음 | **코드 변경**: 0

### Phase 2: search_restaurants_in_bounds 개선

```
2-1. RPC 함수에 p_genre, p_district 파라미터 추가 (마이그레이션)
2-2. bounds/route.ts에서 파라미터 파싱/전달
2-3. use-map-discovery.ts에서 전달
2-4. EXPLAIN ANALYZE 검증
```

**위험도**: 낮음 | **코드 변경**: 3파일

### Phase 3: 텍스트 검색 검증

```
3-1. Phase 1 인덱스 후 EXPLAIN ANALYZE 재측정
3-2. Bitmap OR scan 동작 확인 → OK면 코드 변경 불필요
3-3. 안 되면 RPC UNION 쿼리로 전환 (식당/와인/사용자 모두)
```

**위험도**: 낮음 | **코드 변경**: 0~3파일

### Phase 4: 홈뷰 DB 필터 이관

```
4-1. filter_home_restaurants, filter_home_wines RPC 함수 생성 (마이그레이션)
4-2. supabase-home-repository.ts의 fetchTargetMeta를 RPC로 전환
4-3. use-home-targets.ts에 filter/sort 파라미터 전달 구조 추가
4-4. home-container.tsx에서 DB 필터 vs JS 필터 분리
4-5. filter-matcher.ts에서 메타 필터 로직 제거
```

**위험도**: 중간 | **코드 변경**: 4~5파일 + 마이그레이션 1개

### Phase 5: 팔로우/맞팔 최적화 + 정리

```
5-1. isMutualFollow를 단일 JOIN 쿼리로 전환
5-2. getMutualFollows를 단일 self-JOIN으로 전환
5-3. filter-query-builder.ts 삭제
5-4. price_range/region 인덱스는 데이터 축적 후 재검토
```

**위험도**: 낮음 | **코드 변경**: 2파일
