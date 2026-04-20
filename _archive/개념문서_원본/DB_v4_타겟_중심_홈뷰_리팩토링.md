<!-- updated: 2026-04-07 -->
# DB_v4 — 타겟 중심 홈뷰 리팩토링

---

## 1. 문제 진단

### 1-1. 현재 구조: Record 중심

```
findHomeRecords()
  → records 조회 (여러 소스별)
  → enrichRecordsWithTarget() (restaurant/wine 메타 붙이기)
  → groupRecordsByTarget() (targetId별 그룹화 → GroupedTarget[])
  → 홈 뷰 렌더링
```

식당 탭인데 **record가 리스트의 중심**. restaurant는 메타데이터로 "붙여지는" 부속물.

### 1-2. 근본 문제

| # | 문제 | 원인 |
|---|------|------|
| **P1** | 찜/셀러에 record 없는 대상 표시 불가 | record가 없으면 파이프라인 진입 자체가 안 됨 |
| **P2** | 가상 row 해킹 | P1 우회를 위해 `bookmark-xxx` 가짜 record를 생성 |
| **P3** | 가짜 ID가 DB 쿼리 파괴 | UUID 컬럼에 `bookmark-xxx` 문자열 → 사진 쿼리 전체 실패 |
| **P4** | record-grouper 불필요한 복잡성 | record[] → target별 그룹화가 필요한 이유 자체가 record 중심이라서 |
| **P5** | RecordWithTarget 과잉 필드 | record에 restaurant 필드 30개+ 복제 (genre, district, lat, lng...) |

### 1-3. 자연스러운 구조: Target 중심

```
식당탭 → restaurant가 리스트의 단위
와인탭 → wine이 리스트의 단위
```

사용자는 "내 식당 목록"을 보는 것이지 "내 기록 목록"을 보는 게 아님.
기록은 각 식당에 **붙어있는 부가 정보**.

---

## 2. 목표 구조

### 2-1. 데이터 흐름 (After)

```
findHomeTargets()
  → "내가 관계 맺은 restaurant/wine" 조회
     (visited OR bookmarked OR cellared OR followed OR bubbled OR public)
  → 각 target에 records/bookmarks 메타 붙이기
  → HomeTarget[] 반환 (이미 target 중심 — grouping 불필요)
  → 홈 뷰 렌더링
```

### 2-2. HomeTarget 엔티티 (GroupedTarget 대체)

```typescript
// domain/entities/home-target.ts
export interface HomeTarget {
  // ─── Target 본체 (restaurant 또는 wine 테이블에서) ───
  targetId: string
  targetType: RecordTargetType   // 'restaurant' | 'wine'
  name: string
  photoUrl: string | null        // record_photos 우선 → target.photos[0] 폴백

  // 식당 메타 (restaurant 테이블)
  genre: string | null
  district: string | null
  area: string[] | null
  lat: number | null
  lng: number | null
  priceRange: number | null
  michelinStars: number | null
  hasBlueRibbon: boolean | null
  mediaAppearances: string[] | null

  // 와인 메타 (wine 테이블)
  wineType: string | null
  variety: string | null
  country: string | null
  region: string | null
  vintage: number | null

  // ─── 관계 상태 (파생) ───
  isBookmarked: boolean
  isCellar: boolean              // 와인 전용
  visitCount: number             // 내 records 수 (0이면 방문/시음 없음)
  sources: RecordSource[]        // 이 target이 어떤 경로로 내 목록에 들어왔는지

  // ─── 대표 점수 (소스 우선순위 폴백) ───
  satisfaction: number | null
  axisX: number | null
  axisY: number | null
  scoreSource: RecordSource | null

  // ─── 최신 기록 요약 ───
  latestRecordId: string | null  // null = 기록 없음 (찜만)
  latestVisitDate: string | null
  latestScene: string | null
  latestCreatedAt: string | null

  // ─── 전체 records (사분면 등에서 사용) ───
  records: DiningRecord[]
}
```

**핵심 차이**: target이 1급 시민. record가 없어도 target은 존재함 (찜/셀러).

### 2-3. 가상 row 제거

| 현재 (v3) | 목표 (v4) |
|-----------|-----------|
| 찜만 있는 식당 → `bookmark-xxx` 가짜 record row 생성 | 찜만 있는 식당 → `HomeTarget { visitCount: 0, records: [] }` |
| record_photos 쿼리에 가짜 ID 혼입 → 전체 실패 | record가 없으면 사진 쿼리 대상에 포함 안 됨 |
| groupRecordsByTarget()로 record→target 역변환 | 처음부터 target 단위 — grouping 불필요 |

---

## 3. 변경 대상 파일

### 3-1. 신규

| 파일 | 역할 |
|------|------|
| `domain/entities/home-target.ts` | HomeTarget 타입 정의 |
| `domain/repositories/home-repository.ts` | findHomeTargets 인터페이스 |
| `infrastructure/repositories/supabase-home-repository.ts` | Target 중심 쿼리 구현 |
| `application/hooks/use-home-targets.ts` | useHomeRecords 대체 |

### 3-2. 수정

| 파일 | 변경 내용 |
|------|----------|
| `shared/di/container.ts` | HomeRepository DI 등록 |
| `presentation/containers/home-container.tsx` | useHomeTargets 사용, GroupedTarget→HomeTarget |
| `presentation/components/home/record-card.tsx` | props를 HomeTarget 기반으로 (대부분 호환) |
| `presentation/components/home/compact-list-item.tsx` | 동일 |
| `presentation/components/home/wine-card.tsx` | 동일 |
| `domain/services/filter-matcher.ts` | HomeTarget 기반 매칭 (RecordWithTarget 참조 제거) |

### 3-3. 삭제 (또는 비활성)

| 파일 | 이유 |
|------|------|
| `domain/entities/grouped-target.ts` | HomeTarget으로 대체 |
| `domain/services/record-grouper.ts` | target 중심이면 grouping 불필요 |
| `application/hooks/use-home-records.ts` | use-home-targets로 대체 |
| `supabase-record-repository.ts` 내 `findHomeRecords()` | home-repository로 이동 |
| `supabase-record-repository.ts` 내 `isFakeRow()`, 가상 row 생성 코드 | 제거 |

### 3-4. 영향 없음 (유지)

| 파일 | 이유 |
|------|------|
| `domain/entities/record.ts` | DiningRecord, RecordWithTarget은 상세페이지/기록플로우에서 계속 사용 |
| `record-repository.ts` 인터페이스 | findById, create 등은 그대로. findHomeRecords만 제거 |
| 상세 페이지 컨테이너들 | record 단위 조회는 기존 그대로 |
| `use-bookmark.ts` | 찜 토글은 기존 그대로 |

---

## 4. 쿼리 설계: findHomeTargets

### 4-1. 핵심 원칙

**"내가 관계 맺은 target"을 먼저 수집 → 각 target에 records 붙이기**

### 4-2. ViewType별 target 수집

| ViewType | 쿼리 | 결과 |
|----------|------|------|
| `visited` | `records WHERE user_id=me AND target_type=X` → `DISTINCT target_id` | 내가 방문한 target ID 셋 |
| `tasted` | `records WHERE user_id=me AND target_type='wine'` → `DISTINCT target_id` | 내가 시음한 와인 ID 셋 |
| `bookmark` | `bookmarks WHERE user_id=me AND type='bookmark' AND target_type=X` → `target_id` | 내가 찜한 target ID 셋 |
| `cellar` | `bookmarks WHERE user_id=me AND type='cellar' AND target_type='wine'` → `target_id` | 셀러 와인 ID 셋 |
| `unrated` | `records WHERE user_id=me AND axis_x IS NULL AND target_type=X` → `DISTINCT target_id` | 미평가 target ID 셋 |
| `following` | `follows(accepted) → records WHERE target_type=X` → `DISTINCT target_id` | 팔로잉 기록의 target ID 셋 |
| `bubble` | `bubble_members → bubble_shares → records` → `DISTINCT target_id` | 버블 공유의 target ID 셋 |
| `public` | `users(is_public) → records WHERE target_type=X` → `DISTINCT target_id` | 공개 기록의 target ID 셋 |

### 4-3. Target 수집 후 흐름

```
Step 1: 각 view별 target_id 셋 병렬 수집 → UNION (중복 제거)
Step 2: 합쳐진 target_id[]로 restaurants/wines batch 조회 → target 메타
Step 3: 합쳐진 target_id[]로 내 records batch 조회 → 각 target에 붙이기
Step 4: 합쳐진 target_id[]로 bookmarks batch 조회 → isBookmarked/isCellar
Step 5: 합쳐진 target_id[]로 record_photos batch 조회 → photoUrl
Step 6: source 태깅 (어떤 view에서 왔는지)
Step 7: 대표 점수 계산 (소스 우선순위 폴백)
Step 8: HomeTarget[] 조립 + 반환
```

### 4-4. 소스 태깅

한 target이 여러 view에 걸칠 수 있음 (예: 방문 + 찜 + 팔로잉).
→ `sources: RecordSource[]` 배열로 모든 관계를 기록.
→ 대표 점수는 기존과 동일하게 `SOURCE_PRIORITY` 순서로 폴백.

### 4-5. 사진 우선순위

```
1. 내 record_photos (최신 기록의 첫 사진)
2. 팔로잉/버블/공개 record_photos (소스 우선순위)
3. target.photos[0] (restaurant/wine 테이블의 기본 사진)
4. null
```

record_photos 쿼리는 **실제 record ID만 사용** (가상 row 없으므로 UUID 안전).

---

## 5. 실행 계획

### Phase 1: Domain + Infrastructure (기반)

| # | 작업 | 파일 |
|---|------|------|
| 1-1 | `HomeTarget` 타입 정의 | `domain/entities/home-target.ts` (신규) |
| 1-2 | `HomeRepository` 인터페이스 | `domain/repositories/home-repository.ts` (신규) |
| 1-3 | `SupabaseHomeRepository` 구현 | `infrastructure/repositories/supabase-home-repository.ts` (신규) |
| 1-4 | DI 등록 | `shared/di/container.ts` |

### Phase 2: Application (Hook)

| # | 작업 | 파일 |
|---|------|------|
| 2-1 | `useHomeTargets` hook | `application/hooks/use-home-targets.ts` (신규) |
| 2-2 | `filter-matcher` 수정 | `domain/services/filter-matcher.ts` — HomeTarget 기반 매칭 추가 |

### Phase 3: Presentation (연결)

| # | 작업 | 파일 |
|---|------|------|
| 3-1 | `home-container.tsx` 전환 | useHomeTargets 사용, GroupedTarget→HomeTarget, sortGroupedTargets→sortHomeTargets |
| 3-2 | 카드/리스트 컴포넌트 props 조정 | record-card, compact-list-item, wine-card (대부분 rename 수준) |
| 3-3 | 캘린더/지도 뷰 조정 | HomeTarget 기반 데이터 전달 |

### Phase 4: 정리

| # | 작업 | 파일 |
|---|------|------|
| 4-1 | `grouped-target.ts` 삭제 | domain/entities/ |
| 4-2 | `record-grouper.ts` 삭제 | domain/services/ |
| 4-3 | `use-home-records.ts` 삭제 | application/hooks/ |
| 4-4 | `findHomeRecords()` 제거 | supabase-record-repository.ts, record-repository.ts 인터페이스 |
| 4-5 | 가상 row 코드 제거 | supabase-record-repository.ts 내 bookmark/cellar 가상 row + isFakeRow() |
| 4-6 | 문서 갱신 | CODEBASE.md, WORKLOG.md, 이 문서 |

---

## 6. 의존 순서

```
Phase 1 (도메인/인프라)
  │
  ▼
Phase 2 (Hook)
  │
  ▼
Phase 3 (UI 연결)  ← 여기서 빌드 통과 확인
  │
  ▼
Phase 4 (정리/삭제) ← 빌드 통과 후 안전하게 삭제
```

Phase 1~3은 기존 코드와 병행 가능 (새 파일 추가 → home-container에서 import 전환).
Phase 4는 home-container 전환 완료 후에만 실행 (사용처 0 확인).

---

## 7. 검증 체크리스트

```
기능:
  □ 방문 필터 → 내 기록 있는 식당 표시 (사진 정상)
  □ 찜 필터 → 기록 없는 찜 식당도 표시 (가상 row 없이)
  □ 찜 + 방문 조합 → 합집합 표시
  □ 셀러 필터 → 기록 없는 셀러 와인도 표시
  □ 미평가 필터 → 점수 없는 기록의 target 표시
  □ 팔로잉/버블/공개 → 타인 기록의 target 표시
  □ 네이버 가져오기 후 사진 깨짐 없음 (P3 근본 해결)
  □ 카드뷰/리스트뷰/캘린더뷰/지도뷰 모두 정상
  □ 소팅 6종 정상 (latest, score_high, score_low, name, visit_count, distance)
  □ 조건 필터 (장르, 가격대, 미슐랭 등) 정상

품질:
  □ pnpm build 에러 없음
  □ pnpm lint 새 에러 없음
  □ 'bookmark-' / 'cellar-' 가상 row 코드 0건 (grep)
  □ GroupedTarget import 0건 (grep)
  □ groupRecordsByTarget import 0건 (grep)
  □ findHomeRecords import 0건 (grep)
  □ R1~R5 위반 없음
```

---

## 8. v3 대비 변경 요약

| 항목 | v3 (현재) | v4 (목표) |
|------|-----------|-----------|
| 리스트 중심 | record | restaurant/wine (target) |
| 찜 전용 대상 | 가상 record row (`bookmark-xxx`) | `HomeTarget { visitCount: 0 }` |
| 그루핑 | `groupRecordsByTarget()` 필요 | 불필요 (처음부터 target 단위) |
| 사진 쿼리 | 가짜 ID 혼입 → 전체 실패 가능 | 실제 record ID만 사용 |
| 홈 엔티티 | `GroupedTarget` (record에서 파생) | `HomeTarget` (target에서 시작) |
| 홈 Hook | `useHomeRecords` | `useHomeTargets` |
| 홈 Repository | `RecordRepository.findHomeRecords` | `HomeRepository.findHomeTargets` |

---

## 9. 미래 확장 고려

- **카카오맵 가져오기**: 네이버와 동일 패턴 — restaurant 등록 + bookmark. HomeTarget 구조에서 자연스럽게 표시.
- **와인앱 가져오기**: wine 등록 + bookmark/cellar. 동일 구조.
- **버블 추천**: 버블 멤버들이 방문한 target을 추천 → HomeTarget의 sources에 'bubble_recommend' 추가 가능.
- **빈 target 카드 디자인**: visitCount=0인 HomeTarget에 "아직 방문 전" + "기록하기" CTA 표시.
