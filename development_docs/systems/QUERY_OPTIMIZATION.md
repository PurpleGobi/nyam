<!-- updated: 2026-04-13 -->
# QUERY_OPTIMIZATION — 쿼리 최적화 원칙

> affects: 모든 infrastructure/repositories, supabase/migrations, application/hooks

---

## 원칙 요약

기능은 절대 축소/삭제하지 않는다. 동일한 결과를 더 빠르게 반환하는 것만이 최적화다.

---

## 5대 원칙

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
| 지리적 범위 (ST_DWithin) | GiST(geom) |
| 특정 조건만 (status='active') | Partial WHERE status='active' |

**미사용 인덱스 정리**: 분기마다 `pg_stat_user_indexes`에서 `idx_scan = 0`인 인덱스를 검토·삭제.

---

## 레이어별 역할

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

---

## 현재 인덱스 전략 (2026-04-13)

### 핵심 테이블별 쿼리-인덱스 매핑

#### records (가장 빈번한 조회)
| 쿼리 패턴 | 인덱스 | 커버 |
|----------|--------|------|
| `user_id + target_type + visit_date DESC` | `idx_records_user_type_date` | O |
| `target_id + target_type` | `idx_records_target` | O |
| `user_id + target_id + target_type` | `idx_records_user_target` | O |
| `in(user_id, [...]) + target_type + in(target_id, [...])` | 위 인덱스 조합 | O |

#### restaurants
| 쿼리 패턴 | 인덱스 | 커버 |
|----------|--------|------|
| `name ILIKE '%x%'` | `idx_restaurants_name_trgm` (GIN) | O |
| `genre + name 정렬` | `idx_restaurants_genre_name` | O |
| `ST_DWithin(geom, ...)` | `idx_restaurants_geom` (GiST) | O |
| `prestige JSONB 필터` | `idx_restaurants_prestige` (GIN) | O |
| `area ANY(...)` | `idx_restaurants_area_gin` (GIN) | O |

#### follows
| 쿼리 패턴 | 인덱스 | 커버 |
|----------|--------|------|
| `follower_id + status='accepted'` | `idx_follows_follower_accepted` (Partial) | O |
| `following_id + status='accepted'` | `idx_follows_following_accepted` (Partial) | O |

#### bubble_members
| 쿼리 패턴 | 인덱스 | 커버 |
|----------|--------|------|
| `user_id + status='active'` | `idx_bubble_members_user` (Partial) | O |
| `bubble_id + status='active'` | `idx_bubble_members_active` (Partial) | O |

---

## 변경 시 체크리스트

새 쿼리를 추가하거나 기존 쿼리를 변경할 때:

```
□ P1: 같은 함수 내에서 동일 테이블+조건 쿼리가 2회 이상 없는가?
□ P2: 독립 쿼리를 Promise.all로 병렬화했는가?
□ P3: 리스트/배치 조회에서 select('*') 대신 필요 컬럼만 선택했는가?
□ P4: 루프 내 쿼리가 없는가? (있으면 .in() 배치로 전환)
□ P5: 새 WHERE/ORDER 패턴에 대응하는 인덱스가 있는가?
□ 기능 보존: 최적화 전후 반환 데이터가 동일한가?
```

---

## RPC 함수 설계 원칙

1. **단순 필터**: Supabase 클라이언트 `.eq().in().order()`로 충분하면 RPC 불필요
2. **복합 필터 + 정렬 + 페이지네이션**: RPC로 DB에서 처리 (네트워크 왕복 1회)
3. **분기별 별도 함수**: 조건부 로직이 많으면 시나리오별 분리 (PL/pgSQL 분기 비용 제거)
4. **SQL > PL/pgSQL**: 가능하면 순수 SQL 함수로 (planner 최적화 이점)
