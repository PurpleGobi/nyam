# 자체 식당 DB 구축 및 지도뷰 전환

> 작성: 2026-04-10
> 상태: 방향성 확정, 구현 미착수

---

## 1. 배경과 문제

### 현재 상태
- 지도뷰에서 주변 식당을 **카카오 카테고리 검색 API**로 실시간 호출
- 카카오 API 제약: 페이지당 15건, 최대 45페이지(675건), 거리순 정렬만 지원
- 점수순 정렬 불가 — 카카오가 가까운 순으로 반환한 결과를 클라이언트에서 재정렬하는 구조
- Google Places API로 별점 enrichment — 미매칭 식당마다 API 호출 (느림, 비용 발생)
- **결과**: 지도뷰 응답 2~4초, 점수순 정렬이 거리순에 종속

### 근본 원인
- Nyam의 `restaurants` 테이블에는 **유저가 기록한 식당만** 존재
- 지도에 보여줄 식당 데이터를 매번 외부 API에서 실시간으로 가져옴
- 외부 API의 정렬/필터 기능이 Nyam의 요구사항(점수순, 명성 필터 등)과 불일치

---

## 2. 목표

**전국 식당 데이터를 Nyam의 `restaurants` 테이블에 사전 구축하여, 지도뷰가 단일 DB 쿼리만으로 동작하도록 전환한다.**

### 기대 효과
| 항목 | 현재 (카카오 API) | 전환 후 (자체 DB) |
|------|------------------|------------------|
| 지도뷰 응답 | 2~4초 | ~100~200ms |
| 점수순 정렬 | 클라이언트 재정렬 (제한적) | DB ORDER BY (정확) |
| 필터링 | 클라이언트 필터 (제한적) | DB WHERE (빠름, 복합 가능) |
| 외부 API 의존 | 카카오 + 구글 매 요청 | 없음 (크롤링 시점만) |
| 데이터 독립성 | 카카오 정책 변경에 취약 | 자체 보유 |
| 검색/추천 확장 | API 제약에 묶임 | 자유로운 쿼리 |

---

## 3. 데이터 구축 전략

### 3-1. 데이터 소스

| 소스 | 수집 데이터 | 용도 |
|------|-----------|------|
| **카카오 카테고리 검색** | 이름, 주소, 좌표, 장르, 전화번호, 카카오 ID | 기본 식당 정보 |
| **구글 Places API** | 별점(rating), 리뷰 수, 구글 place ID | 초기 점수 (nyam_score 계산) |
| **자체 RP 데이터** | 미슐랭/블루리본/TV 매칭 | 명성 정보 (이미 restaurant_rp 테이블에 존재) |

### 3-2. 크롤링 범위

**Phase 1: 서울** (~10만건 예상)
- 25개 구별 크롤링 (카카오 카테고리 검색, 구 중심 좌표 + 반경 조합)
- 카카오 API 제한: 675건/검색. 구별 + 동별 세분화로 커버

**Phase 2: 수도권 + 주요 도시** (~30만건)
- 경기, 부산, 제주 등

**Phase 3: 전국** (~50만건+)

### 3-3. 크롤링 방법

```
1. 지역을 격자로 분할 (예: 500m x 500m 셀)
2. 각 셀 중심 좌표로 카카오 카테고리 검색 (반경 500m, 최대 45페이지)
3. 결과를 restaurants 테이블에 upsert (external_ids.kakao 기준 중복 방지)
4. 구글 Places API로 rating enrichment (배치, 일일 quota 관리)
5. nyam_score 계산 (기존 calcNyamScore 로직 적용)
```

### 3-4. 기존 테이블 활용

현재 `restaurants` 테이블 스키마가 이미 필요한 필드를 대부분 보유:

```
restaurants
├── id (UUID)
├── name, address, lat, lng
├── country, city, district, area[]
├── genre (RestaurantGenre)
├── price_range
├── phone, hours, menus
├── external_ids (JSONB: { kakao, naver, google })
├── google_rating, kakao_rating, naver_rating
├── nyam_score, nyam_score_updated_at
├── rp (JSONB: RestaurantRp[])
├── created_at, updated_at
```

**추가 필요 필드:**
- `data_source`: 'user_created' | 'crawled' — 유저 기록 vs 크롤링으로 생성된 식당 구분
- `last_crawled_at`: 마지막 크롤링/검증 시각
- `is_closed`: 폐업 여부

---

## 4. 업데이트 전략

### 4-1. 유저 트리거 (실시간)
- 유저가 식당을 클릭/기록/검색할 때, 해당 식당의 카카오 정보를 최신 확인
- 변경 사항(폐업, 주소 이전 등) 감지 시 DB 즉시 갱신
- **가장 효율적** — 유저가 관심 있는 식당만 업데이트

### 4-2. 주간 배치 크론 (백그라운드)
- 매주 Supabase Edge Function으로:
  - `last_crawled_at`이 오래된 순으로 N건 재검증
  - 인기 지역(기록 많은 구역) 우선 갱신
  - 구글 별점 갱신 (변동폭 큰 식당 우선)
- nyam_score 재계산 (구글 별점 변동 반영)

### 4-3. 폐업 감지
- 카카오 API에서 검색 안 되면 `is_closed = true`
- 유저 신고 기능 (향후)
- 폐업 식당은 지도뷰에서 제외, 기존 기록은 유지

---

## 5. 지도뷰 전환 설계

### 5-1. 현재 → 전환 후 데이터 흐름

**현재:**
```
지도 idle → fetchNearby(center, radius)
  → 카카오 API (실시간)
  → Google Places enrichment (실시간)
  → 클라이언트 소팅/필터 → 표시
```

**전환 후:**
```
지도 idle → DB 쿼리 (bounds + 필터 + 소팅 + LIMIT 15)
  → 즉시 표시
```

### 5-2. DB 쿼리 예시

```sql
SELECT id, name, lat, lng, genre, district,
       nyam_score, google_rating, rp,
       -- 유저 개인 점수 (있으면)
       (SELECT AVG(satisfaction) FROM records 
        WHERE restaurant_id = r.id AND user_id = $userId) AS my_score
FROM restaurants r
WHERE lat BETWEEN $south AND $north
  AND lng BETWEEN $west AND $east
  AND is_closed = false
  AND ($genre IS NULL OR genre = $genre)
  AND ($prestige IS NULL OR rp @> $prestige::jsonb)
ORDER BY 
  COALESCE(my_score, nyam_score, google_rating * 20) DESC NULLS LAST
LIMIT 15 OFFSET $offset
```

### 5-3. API 변경

`/api/restaurants/nearby` route를 DB 쿼리 기반으로 전환:

```
GET /api/restaurants/map?north=...&south=...&east=...&west=...
  &sort=score_high|name|distance
  &genre=한식
  &prestige=michelin
  &page=1
```

- 카카오 API 호출 제거
- Google Places API 호출 제거
- Supabase 단일 쿼리

### 5-4. 프론트엔드 변경 (최소)

`useMapDiscovery` hook에서:
- `fetchNearby` → `fetchMapRestaurants(bounds, filters, sort, page)`
- 나머지 로직(bounds 필터, 소팅, 페이지네이션) 대부분 서버로 이동
- 클라이언트는 결과를 받아서 렌더링만

---

## 6. 구현 순서

### Phase 0: 크롤링 인프라
1. 크롤링 스크립트 (Python, `DB/` 폴더) — 지역 격자 + 카카오 API + 구글 enrichment
2. `restaurants` 테이블 스키마 확장 (`data_source`, `last_crawled_at`, `is_closed`)
3. upsert 마이그레이션

### Phase 1: 서울 데이터 구축
4. 서울 25구 크롤링 실행
5. 구글 별점 배치 enrichment
6. nyam_score 배치 계산
7. 데이터 검증 (건수, 분포, 좌표 정확도)

### Phase 2: 지도뷰 전환
8. `/api/restaurants/map` 신규 API (DB 쿼리 기반)
9. `useMapDiscovery` hook 수정 (API 전환)
10. 기존 `/api/restaurants/nearby` (카카오 기반) deprecate

### Phase 3: 업데이트 체계
11. 유저 트리거 업데이트 로직
12. 주간 배치 크론 (Edge Function)
13. 폐업 감지 로직

### Phase 4: 확장
14. 수도권 + 주요 도시 크롤링
15. 검색 기능 DB 전환 (현재 카카오 검색 → DB full-text search)

---

## 7. 리스크 및 고려사항

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 카카오 API rate limit | 크롤링 속도 제한 | 분산 크롤링, 일일 quota 관리 |
| 구글 Places API 비용 | 대량 enrichment 비용 | 배치 처리, 주요 지역 우선 |
| 폐업 식당 누적 | 잘못된 데이터 노출 | 유저 트리거 + 주간 크론 검증 |
| Supabase 스토리지 | 50만건 이상 시 성능 | lat/lng 인덱스, 파티셔닝 |
| 초기 구축 시간 | 서울만 수일 소요 | Phase별 점진적 구축 |

---

## 8. 경쟁력

- **속도**: 실시간 API 의존 앱 대비 10~20배 빠른 지도뷰
- **데이터 소유**: 외부 API 정책 변경에 독립적
- **점수 시스템 통합**: 유저 점수 + 소셜 점수 + 외부 별점을 하나의 DB에서 통합 쿼리
- **확장 가능**: 추천 알고리즘, CF, 지역 트렌드 분석 등에 자체 데이터 활용
- **진입 장벽**: 데이터 구축 자체가 후발 주자의 진입 장벽
