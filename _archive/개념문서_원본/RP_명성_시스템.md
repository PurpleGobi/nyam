# Nyam RP (Reputation/명성) 시스템

> 작성: 2026-04-09
> 관련: DATA_MODEL.md, 055_restaurant_rp.sql, prestige-badges.tsx

---

## 1. 개요

### 명성이란

미슐랭 가이드, 블루리본 서베이, TV 맛집 프로그램 출연 등 **외부 권위 기관이 인정한 식당 정보**를 "명성(Reputation, RP)"이라 부른다. 유저가 직접 평가한 점수와는 별개로, 식당의 공신력을 나타내는 시드 데이터다.

### 왜 별도 시스템인가

- 명성 데이터는 **유저가 생성하지 않는다** -- 크롤링/엑셀로 외부에서 주입
- **비정기 업데이트** -- 미슐랭은 연 1회, TV는 방영 시, 블루리본은 연 1회
- 식당과의 매칭이 필요 -- 외부 데이터의 식당 이름과 DB의 식당이 다를 수 있음
- UI 7곳에 뱃지로 표시 -- 별도 API 호출 없이 빠르게 렌더링해야 함

---

## 2. 테이블 구조

### 2.1 restaurant_rp (시드 테이블)

크롤링/엑셀에서 들어온 원본 명성 데이터. **이 테이블이 명성 데이터의 유일한 입력 지점**이다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| restaurant_id | UUID FK (nullable) | restaurants 테이블과 매칭되면 채워짐 |
| restaurant_name | TEXT | 원본 식당 이름 |
| restaurant_name_norm | TEXT | 정규화 이름 (레거시, 현재 미사용) |
| **rp_type** | TEXT | `'michelin'` \| `'blue_ribbon'` \| `'tv'` |
| **rp_year** | INT | 선정/방영 연도 |
| **rp_grade** | TEXT | 등급 또는 프로그램명 (아래 표 참조) |
| lat, lng | DOUBLE | 좌표 (매칭 보조) |
| kakao_id | TEXT | 카카오맵 ID (매칭 후 저장) |
| verified | BOOLEAN | 검증 여부 |

**rp_grade 값 규칙:**

| rp_type | rp_grade 예시 |
|---------|--------------|
| michelin | `3_star`, `2_star`, `1_star`, `bib` |
| blue_ribbon | `3_ribbon`, `2_ribbon`, `1_ribbon` |
| tv | 프로그램명 그대로: `흑백요리사`, `줄서는식당`, `생활의달인` 등 |

### 2.2 restaurants.rp (캐시 컬럼)

restaurants 테이블의 JSONB 컬럼. **restaurant_rp에서 자동 동기화**되며, UI에서 JOIN 없이 바로 읽는다.

```jsonc
// restaurants.rp 예시
[
  { "type": "michelin", "grade": "2_star" },
  { "type": "blue_ribbon", "grade": "3_ribbon" },
  { "type": "tv", "grade": "흑백요리사" }
]
```

- year는 포함하지 않음 (뱃지 표시에 불필요)
- GIN 인덱스 적용 (`idx_restaurants_rp`)

---

## 3. 데이터 흐름

```
크롤링/엑셀
    │
    ▼
┌─────────────────┐
│  restaurant_rp   │  ← 시드 데이터 INSERT/UPDATE
│  (원본 테이블)     │
└────────┬────────┘
         │
         │  매칭 프로세스 (API 또는 Edge Function)
         │  1. 기존 restaurants에서 이름/좌표로 검색
         │  2. 없으면 카카오 API로 검색 → 신규 생성
         │  3. restaurant_id 연결
         │
         ▼
┌─────────────────┐     트리거 (자동)     ┌─────────────────┐
│  restaurant_rp   │ ─────────────────→  │  restaurants.rp   │
│  restaurant_id   │   INSERT/UPDATE/    │  JSONB 캐시       │
│  = 매칭됨        │   DELETE 시 자동     └────────┬────────┘
└─────────────────┘   sync_restaurant_    │
                      rp_cache()          │  SELECT (JOIN 불필요)
                                          ▼
                                    ┌───────────┐
                                    │  UI 7곳    │
                                    │  뱃지 표시  │
                                    └───────────┘
```

### 3.1 캐시 트리거

`restaurant_rp` 테이블에 INSERT/UPDATE/DELETE가 발생하면 `sync_restaurant_rp_cache()` 트리거가 자동으로 해당 식당의 `restaurants.rp` JSONB를 재계산한다.

- INSERT: 새 명성 추가 → 해당 식당의 rp 배열에 반영
- UPDATE: restaurant_id 변경 시 이전/새 식당 모두 갱신
- DELETE: 명성 제거 → 해당 식당의 rp 배열에서 제거 (빈 배열이면 `[]`)

**수동 갱신이 필요 없다** -- 트리거가 모든 경우를 처리한다.

---

## 4. 매칭 프로세스

### 4.1 현재: API Route (수동)

`POST /api/restaurants/rp/match`

1. `restaurant_rp`에서 `restaurant_id = NULL`인 행 200건 조회
2. 각 행에 대해:
   - **Step A**: restaurants 테이블에서 이름으로 검색 → 정규화 이름 완전 일치 + 좌표 50m 이내면 매칭
   - **Step B**: 카카오 API로 검색 → 이름 포함 매치 + 좌표 50m 이내면, 기존 restaurant 있으면 매칭 / 없으면 신규 생성 후 매칭
   - **Step C**: 둘 다 실패 → `restaurant_id = NULL` 유지
3. 매칭된 식당의 `restaurants.rp` 캐시 bulk 갱신

**현재 실적**: 1,121건 중 1,076건 매칭 (96%), 45건 미매칭

### 4.2 향후: Edge Function + DB Trigger (자동)

`restaurant_rp`에 INSERT 시 DB trigger가 Edge Function을 호출하여 자동 매칭. 크롤링 데이터만 넣으면 매칭까지 전부 자동화.

---

## 5. 시드 데이터 업데이트 방법

### 5.1 미슐랭/블루리본 (연 1회)

1. 크롤링 스크립트 실행 (`DB/미슐랭_크롤링/`, `DB/블루리본_크롤링/`)
2. CSV 결과를 `restaurant_rp` 테이블에 UPSERT
3. 매칭 API 호출: `POST /api/restaurants/rp/match`
4. 트리거가 `restaurants.rp` 자동 갱신 → UI 즉시 반영

### 5.2 TV 프로그램 (비정기)

1. 엑셀에서 프로그램명/식당명/연도 정리
2. `restaurant_rp`에 INSERT (rp_type='tv', rp_grade=프로그램명)
3. 매칭 API 호출
4. 자동 반영

### 5.3 연도 갱신 (미슐랭 등급 변동)

미슐랭은 매년 등급이 바뀔 수 있다. 같은 식당의 새 연도 데이터를 추가하면 된다:

```
기존: { rp_type: 'michelin', rp_year: 2025, rp_grade: '2_star' }
추가: { rp_type: 'michelin', rp_year: 2026, rp_grade: '3_star' }
```

`restaurants.rp` 캐시에는 두 행 모두 반영되지만, UI(PrestigeBadges)는 **타입별 중복을 제거**하므로 미슐랭 아이콘은 1개만 표시된다.

---

## 6. UI 표시

### 6.1 PrestigeBadges 컴포넌트

`src/presentation/components/ui/prestige-badges.tsx`

| rp_type | 아이콘 | 색상 (CSS 변수) |
|---------|--------|----------------|
| michelin | Award | `var(--accent-food)` |
| blue_ribbon | Ribbon | `var(--info)` |
| tv | Tv | `var(--accent-wine)` |

- size: `sm` (11px, 목록용) / `md` (14px, 상세페이지용)
- 같은 타입이 여러 개여도 **1개만 표시** (중복 제거)

### 6.2 표시 위치 7곳

| # | 위치 | 컴포넌트 | 데이터 경로 |
|---|------|---------|-----------|
| 1 | 홈 카드뷰 | RecordCard | homeTargets.rp → RecordCard.rp |
| 2 | 홈 리스트뷰 | CompactListItem | homeTargets.rp → CompactListItem.rp |
| 3 | 식당 상세 헤더 | PrestigeBadges (md) | restaurant.rp |
| 4 | 검색 결과 | SearchResultItem | searchResults.rp |
| 5 | 근처 식당 | NearbyList | nearbyRestaurants.rp |
| 6 | 지도뷰 하단 | MapList → CompactListItem | mapRecords.rp |
| 7 | 지도 핀 | createNearbyPinHtml | nearbyPlaces.rp → SVG 아이콘 |

모든 경로에서 `restaurants.rp` JSONB를 직접 읽으므로 **별도 API 호출이 필요 없다**.

---

## 7. 명성 필터

홈 화면의 "명성" 필터에서 사용:

```
// PostgREST JSONB contains 연산자
미슐랭 있음:   rp=cs.[{"type":"michelin"}]
블루리본 있음: rp=cs.[{"type":"blue_ribbon"}]
TV 있음:      rp=cs.[{"type":"tv"}]
명성 없음:     rp=eq.[]
```

GIN 인덱스(`idx_restaurants_rp`)가 있으므로 필터 성능에 문제 없음.

---

## 8. 관련 파일 맵

| 역할 | 경로 |
|------|------|
| 마이그레이션 | `supabase/migrations/055_restaurant_rp.sql` |
| 도메인 타입 | `src/domain/entities/restaurant.ts` → `RestaurantRp` |
| 뱃지 컴포넌트 | `src/presentation/components/ui/prestige-badges.tsx` |
| 매칭 API | `src/app/api/restaurants/rp/match/route.ts` |
| 캐시 트리거 | `sync_restaurant_rp_cache()` (055 마이그레이션 내) |
| 필터 빌더 | `src/domain/services/filter-query-builder.ts` → `prestigeFilter()` |
| 필터 매처 | `src/domain/services/filter-matcher.ts` → `matchPrestige()` |
| 점수 계산 | `src/domain/services/nyam-score.ts` → prestige 보너스 |
| 크롤링 | `DB/미슐랭_크롤링/`, `DB/블루리본_크롤링/` |
