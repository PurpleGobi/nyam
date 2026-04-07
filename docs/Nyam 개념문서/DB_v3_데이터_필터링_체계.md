<!-- updated: 2026-04-07 -->
# 데이터 필터링 체계 — 스키마 · 필터 · 가시성 · 사분면

---

## 1. 현재 데이터 모델

> 2026-04-07 리팩토링 완료: lists 테이블 삭제, bookmarks 독립 테이블 전환, records가 직접 restaurants/wines 참조.

### 1-1. 테이블 관계

```
restaurants/wines ←── (N) records (직접 참조, list_id FK 없음)
                 ←── (N) bookmarks (찜/셀러 독립 테이블)
                          │
                     UNIQUE(user_id, target_id, target_type, type)
                     type: 'bookmark' | 'cellar'
```

### 1-2. 이전 lists 테이블 문제 (해결됨)

lists 테이블의 `status + is_bookmarked` 이중 구조 문제는 bookmarks 독립 테이블로 전환하여 해결. 찜(bookmark)과 셀러(cellar)는 bookmarks 테이블에서 `type` 필드로 구분. 방문/시음 여부는 records 존재 여부로 판별.

---

## 2. 보기 필터 체계 — 현재

> 2026-04-07 리팩토링 완료. ViewType에 tasted/cellar/unrated 추가, 모든 필터가 독립 서버 쿼리 보유.

### 2-1. 필터 목록

**식당 탭 (6개)**

| # | 필터 | 값 | 의미 |
|---|------|-----|------|
| 1 | 방문 | `visited` | 내가 방문한 곳 (평가 완료 + 미평가 모두) |
| 2 | 찜 | `bookmark` | 내가 하트 누른 곳 (기록 유무 무관) |
| 3 | 미평가 | `unrated` | 기록은 있지만 점수가 없는 곳 |
| 4 | 팔로잉 | `following` | 팔로우하는 사람의 기록 |
| 5 | 버블 | `bubble` | 내 버블에 공유된 기록 |
| 6 | 공개 | `public` | 공개 유저의 기록 |

**와인 탭 (7개)**

| # | 필터 | 값 | 의미 |
|---|------|-----|------|
| 1 | 시음 | `tasted` | 내가 시음한 와인 |
| 2 | 찜 | `bookmark` | 내가 하트 누른 와인 |
| 3 | 셀러 | `cellar` | 보유 중인 와인 (와인 전용) |
| 4 | 미평가 | `unrated` | 기록은 있지만 점수가 없는 와인 |
| 5 | 팔로잉 | `following` | 팔로우하는 사람의 기록 |
| 6 | 버블 | `bubble` | 내 버블에 공유된 기록 |
| 7 | 공개 | `public` | 공개 유저의 기록 |

### 2-2. 서버/클라이언트 분리 현황

| 필터 | 서버 쿼리 | 조회 경로 |
|------|----------|----------|
| **방문/시음** | ✅ `records WHERE user_id=me AND target_type=X` | records 직접 |
| **찜** | ✅ `bookmarks WHERE type='bookmark'` → 해당 target의 records + 기록 없는 가상row | bookmarks → records |
| **미평가** | ✅ `records WHERE user_id=me AND axis_x IS NULL` | records 직접 |
| **셀러** | ✅ `bookmarks WHERE type='cellar'` → 해당 target의 records + 기록 없는 가상row | bookmarks → records |
| **팔로잉** | ✅ `follows → records` | follows → records |
| **버블** | ✅ `bubble_members → bubble_shares → records` | bubble_shares → records |
| **공개** | ✅ `users(is_public) → records` (limit 50) | users → records |

### 2-3. ViewType (해결됨)

`use-home-records.ts`의 `ViewType`은 8종: `visited | tasted | bookmark | cellar | unrated | bubble | following | public`

모든 필터가 독립 서버 쿼리를 가지므로 단독 선택 시에도 정상 동작.

### 2-4. 이전 문제점 (해결됨)

1. ~~미평가/셀러가 단독 선택 시 동작 안 함~~ → ViewType 추가로 해결
2. ~~두 차원이 한 필터에 혼재~~ → UI에서 "내 컬렉션" / "다른 사람" 시각적 구분
3. ~~의미 없는 조합 가능~~ → 멀티셀렉트 합집합 규칙 적용 (섹션 8-1 참조)

---

## 3. 보기 필터 체계 — 이상

### 3-1. 원칙

- **모든 필터가 독립 서버 쿼리를 가짐** (단독 선택 가능)
- **멀티셀렉트 = 단순 합집합** (각 쿼리 결과를 UNION)
- **중복 제거는 우선순위 기반** (같은 record가 여러 소스에 있으면 상위 소스만)

### 3-2. 각 필터별 서버 쿼리 정의 (목표 — bookmarks 테이블 기준)

> 섹션 8 실행 완료 후 기준. lists → bookmarks 전환 전까지는 섹션 2-2가 현재 상태.

| 필터 | 서버 쿼리 | 결과 |
|------|----------|------|
| **방문** (식당) | `records WHERE user_id=me AND target_type='restaurant'` | 내 식당 전체 기록 (미평가 포함) |
| **시음** (와인) | `records WHERE user_id=me AND target_type='wine'` | 내 와인 전체 기록 (미평가 포함) |
| **찜** | `bookmarks WHERE type='bookmark'` → 해당 target의 내 records + 기록 없는 가상 row | 찜한 대상 |
| **미평가** | `records WHERE user_id=me AND axis_x IS NULL` | 점수 없는 내 기록 |
| **셀러** (와인) | `bookmarks WHERE type='cellar'` → 해당 target의 내 records + 기록 없는 가상 row | 셀러 와인 |
| **팔로잉** | `follows(accepted) → records WHERE user_id IN (following_ids)` | 팔로잉 기록 |
| **버블** | `bubble_members(active) → bubble_shares → records` (내 것 제외) | 버블 공유 기록 |
| **공개** | `users(is_public=true) → records` (내 것 제외) | 공개 기록 |

> 방문/시음은 미평가를 포함 (미평가 ⊂ 방문/시음). 섹션 8-1 참조.

### 3-3. 두 차원 혼재 처리

보기 필터에는 두 차원이 섞여있음:
- **내 컬렉션**: 방문/시음, 찜, 미평가, 셀러
- **다른 사람**: 팔로잉, 버블, 공개

**결정: UI에서 두 그룹을 시각적으로 구분 (구분선 또는 라벨) + 합집합 규칙**

- 각 그룹 내에서 multi-select
- 그룹 간에도 multi-select (합집합)
- 기술적으로는 동일한 flat 배열이지만 UI 표현만 분리
- "미평가 + 팔로잉" = "내 할 일 + 추천" → 유효한 조합

→ 조합 규칙은 섹션 8-1에 정의

---

## 4. 소스 우선순위 규칙

### 4-1. 중앙화 완료 (2026-04-07)

> 이전 5곳 분산 → `domain/constants/source-priority.ts` 단일 소스로 통합.

```typescript
// domain/constants/source-priority.ts
export const SOURCE_PRIORITY = ['mine', 'following', 'bubble', 'public', 'bookmark'] as const
export type RecordSource = typeof SOURCE_PRIORITY[number]
```

- `ScoreSource`의 `'my'` → `'mine'`으로 통일 완료
- `ScoreSource`의 `'nyam'` → `'public'`으로 통일 완료 (nyam 점수 = 공개 기록의 평균)
- 모든 코드에서 이 상수 import

### 4-2. 이전 상태 (참고)

이전에 5곳에 분산 하드코딩되어 있었고, `'my'` vs `'mine'`, `'nyam'` vs `'public'` 네이밍 불일치가 있었음. 해결됨.

---

## 5. 사분면 표시 규칙

### 5-1. dot 유형

| 유형 | 크기 | 조건 | 인터랙션 |
|------|------|------|---------|
| **메인 dot** | 20px + glow | 내 기록 선택 시 (selectedSources에 `'my'` 포함) | 드래그 불가, 정보 표시 |
| **micro dot** | 4px | 그 외 모든 소스의 개별 기록 | 없음 |

> 참고: 상세 페이지에서는 `ScoreSource` 타입(`'my'`)을 사용. 홈의 `RecordSource`(`'mine'`)와 다름.

### 5-2. 표시 규칙

```
메인 dot:
  - 'my' 선택 + visits 모드 → focusedRecord의 좌표
  - 'my' 선택 + compare 모드 → 내 기록 전체 평균
  - 'my' 미선택 → 메인 dot 없음 (micro dot만)

micro dot:
  - selectedSources에 'my' 포함 → 내 다른 기록들 (focused 제외)
  - selectedSources에 'following' 포함 → 팔로잉 기록들
  - selectedSources에 'bubble' 포함 → 버블 공유 기록들
  - selectedSources에 'nyam' 포함 → 공개 기록들
  - 최대 30개 (성능)
```

### 5-3. 중복 방지

- 내 기록은 팔로잉/버블/공개 dot에서 **제외** (서버 쿼리에서 `neq user_id`)
- 같은 record가 팔로잉 + 버블에 중복될 수 있음 → **현재 미처리** (개선 필요)
- nyam 선택 시 publicRecords를 micro dot으로 표시 (점수 카드의 nyam 점수는 별도로 평균 집계값)

---

## 6. 뷰 모드별 특수 규칙

### 6-1. 홈 뷰 모드 (4종)

| 모드 | 데이터 범위 | 특수 규칙 |
|------|-----------|----------|
| **카드 뷰** | 보기 필터 적용 → GroupedTarget | 기본 모드. 사진 + 점수 + 기본 정보 |
| **리스트 뷰** | 보기 필터 적용 → GroupedTarget | 컴팩트 1줄 카드 |
| **달력 뷰** | 보기 필터 적용 → `source === 'mine' \|\| 'following'`만 | 당일 기록 갯수만 표시. 클릭 시 당일 기록 리스트 |
| **지도 뷰** | 보기 필터 적용 → GroupedTarget (식당만) | 위치 기반 마커 |

> 달력 뷰는 보기 필터가 적용된 결과에서 추가로 mine/following만 필터링. "보기 필터 무시"가 아님.

### 6-2. 버블 모드 (상세 페이지)

상세 페이지에 `bubbleId`로 진입 시 (버블 피드에서 클릭):

- **사분면**: 해당 버블의 공유 기록(`bubbleRefPoints`)만 표시 (일반 모드의 visitsRefPoints 대신)
- **점수 카드**: 일반 모드와 동일하게 4종(나/팔로잉/버블/nyam) 표시 (`useTargetScores`)
- **타임라인**: 내 기록 + 버블 멤버 기록
- 일반 모드(bubbleId 없음)와 사분면 데이터 소스만 다름

### 6-3. 홈 그루핑 (GroupedTarget)

홈 목록은 개별 records가 아닌 **target별 그룹**으로 표시:

```
records[] → groupRecordsByTarget() → GroupedTarget[]
```

- 같은 target의 여러 기록을 하나의 카드로 합침
- 대표 점수: 소스 우선순위(mine > following > bubble > public > bookmark)에서 가장 상위 소스의 평균
- 대표 정보: 최신 기록 기준 (날짜, 사진)

---

## 7. 프라이버시/가시성 규칙

### 7-1. 2단계 필터링

| 단계 | 위치 | 역할 | 대상 |
|------|------|------|------|
| **1단계: RLS** | DB (Supabase) | Row 접근 제어 | record 행 자체의 열람 가능 여부 |
| **2단계: Visibility** | Application layer | Column 접근 제어 | 열람 가능한 record의 어떤 필드를 보여줄지 |

### 7-2. RLS 정책 (records 테이블, 5개)

| 정책 | 조건 | 설명 |
|------|------|------|
| `records_own` | `user_id = auth.uid()` | 내 기록은 항상 |
| `records_public` | 작성자 `is_public = true` | 공개 유저 기록 |
| `records_followers` | 팔로워 + `follow_policy != 'blocked'` | 승인된 팔로워 |
| `records_bubble_shared` | `bubble_shares` 경유 | 버블 공유 기록 |
| `records_bubble_member_read` | 같은 버블 active 멤버 | 버블 동료 기록 |

### 7-3. Visibility Config (3계층)

```
우선순위: 버블별 커스텀 > 버블 기본 > 전체 공개
```

| 계층 | DB 필드 | 대상 |
|------|---------|------|
| 전체 공개 | `users.visibility_public` | is_public=true일 때 모든 사용자 |
| 버블 기본 | `users.visibility_bubble` | 모든 버블 멤버 |
| 버블별 커스텀 | `bubble_members.visibility_override` | 특정 버블만 |

토글 7개: `score`, `comment`, `photos`, `level`, `quadrant`, `bubbles`, `price`

### 7-4. 무조건 비공개 필드

| 필드 | 규칙 |
|------|------|
| `companions` | 본인만 열람 (토글 없음) |
| `private_note` | 본인만 열람 (토글 없음) |

---

## 8. 전체 개선 계획

### 8-0. 문제 목록

| # | 문제 | 근본 원인 |
|---|------|----------|
| P1 | 미평가/셀러/시음 필터 단독 선택 시 빈 결과 | ViewType에 없어서 서버 쿼리 미발생 |
| P2 | "내 관계"와 "타인 소스" 필터가 한 곳에 혼재 | 차원 분리 안 됨 |
| P3 | "미평가 + 공개" 같은 조합의 의미 불명확 | 멀티셀렉트 조합 규칙 미정의 |
| P4 | lists 테이블의 status + is_bookmarked 이중 구조 | 한 테이블에 두 가지 역할 |
| P5 | source 우선순위 5곳 분산 하드코딩 | 중앙 상수 없음 |
| P6 | `'my'` vs `'mine'`, `'nyam'` vs `'public'` 네이밍 혼재 | 타입 통일 안 됨 |
| P7 | 사분면에서 팔로잉+버블 기록 중복 가능 | 소스 간 dedup 없음 |
| P8 | visibility 필터링 구현 분산/누락 | 중앙 유틸리티 없음 |
| P9 | `users_authenticated_search` RLS가 유저 프라이버시 무력화 | application layer 필터 미적용 |

### 8-1. 핵심 설계 결정

#### 방문/시음 필터의 의미

```
방문/시음 = 내 모든 기록 (평가 완료 + 미평가 모두)
미평가 ⊂ 방문/시음 (부분 집합, 겹침 허용)
```

- "방문" 단독 선택 → 내 전체 기록 (현재 동작 유지)
- "미평가" 단독 선택 → 점수 없는 기록만
- "방문 + 미평가" → "방문"과 동일 (미평가가 부분집합이므로)

#### 보기 필터 차원 분리 (P2 해결)

```
현재: [방문] [찜] [미평가] [셀러] [팔로잉] [버블] [공개]  ← 한 줄, 혼재

변경: 
  내 컬렉션:  [방문] [찜] [미평가] [셀러]
  다른 사람:  [팔로잉] [버블] [공개]
```

- UI에서 두 그룹을 시각적으로 구분 (구분선 또는 라벨)
- 각 그룹 내에서 multi-select
- 그룹 간에도 multi-select (합집합)
- 기술적으로는 동일한 flat 배열이지만 UI 표현만 분리

#### 멀티셀렉트 조합 규칙 (P3 해결)

```
규칙: 모든 선택 = 합집합 (UNION)
중복 제거: mine (0) > following (1) > bubble (2) > public (3) > bookmark (4)
```

| 조합 예시 | 결과 | 의미 |
|----------|------|------|
| 방문 | 내 전체 기록 | 기본 뷰 |
| 방문 + 찜 | 내 전체 기록 ∪ 찜한 대상 | 내 컬렉션 전체 |
| 미평가 + 팔로잉 | 내 미평가 ∪ 팔로잉 기록 | 할 일 + 추천 |
| 찜 + 버블 | 내 찜 ∪ 버블 기록 | 관심 + 소셜 |

### 8-2. 목표 구조

```
현재:
  restaurants/wines (1) → (N) lists (1) → (N) records
                               status + is_bookmarked (이중)

목표:
  restaurants/wines ← records (직접 참조, list_id FK 제거)
  bookmarks (독립 테이블)
```

```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  target_id UUID NOT NULL,
  target_type VARCHAR(10) NOT NULL,  -- 'restaurant' | 'wine'
  type VARCHAR(10) NOT NULL DEFAULT 'bookmark',  -- 'bookmark' | 'cellar'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, target_id, target_type, type)  -- 같은 대상에 bookmark + cellar 동시 가능
);
```

**이 구조에서 각 필터의 데이터 소스:**

| 필터 | 테이블 | 쿼리 |
|------|--------|------|
| 방문/시음 | `records` | `WHERE user_id=me` (전체, 미평가 포함) |
| 찜 | `bookmarks` + `records` | `bookmarks WHERE type='bookmark'` → 해당 target의 records(있으면) + 가상row(없으면) |
| 미평가 | `records` | `WHERE user_id=me AND axis_x IS NULL` |
| 셀러 | `bookmarks` + `records` | `bookmarks WHERE type='cellar'` → 해당 target의 records(있으면) + 가상row(없으면) |
| 팔로잉 | `follows` → `records` | 팔로잉 유저의 records (내 것 제외) |
| 버블 | `bubble_shares` → `records` | 내 버블 공유 records (내 것 제외) |
| 공개 | `users` → `records` | 공개 유저의 records (내 것 제외) |

### 8-3. 실행 계획 (단일 Phase)

> Phase 분리 없이 한 번에 실행. lists→bookmarks 전환과 필터 개선을 동시에 처리하여 중복 작업 방지.

#### 마이그레이션

| 순서 | 작업 | 내용 |
|------|------|------|
| **M-1** | bookmarks 테이블 생성 | 위 스키마 + RLS (본인만 CRUD) |
| **M-2** | lists → bookmarks 데이터 이관 | `is_bookmarked=true` → `type='bookmark'`, `status='cellar'` → `type='cellar'` |
| **M-3** | records.list_id FK 제거 | `DROP COLUMN list_id` |
| **M-4** | users.record_count 트리거 교체 | lists 트리거 삭제 → records INSERT/DELETE 트리거로 교체 |
| **M-5** | lists 테이블 삭제 | `DROP TABLE lists` (트리거, RLS 자동 삭제) |

```sql
-- M-2: 데이터 이관
INSERT INTO bookmarks (user_id, target_id, target_type, type, created_at)
SELECT user_id, target_id, target_type,
  CASE WHEN status = 'cellar' THEN 'cellar' ELSE 'bookmark' END,
  created_at
FROM lists WHERE is_bookmarked = true OR status = 'cellar';

-- M-4: record_count 트리거 교체
DROP TRIGGER IF EXISTS after_list_record_count ON lists;
DROP FUNCTION IF EXISTS trg_update_user_record_count();

CREATE OR REPLACE FUNCTION trg_update_user_record_count_v2()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET record_count = record_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET record_count = record_count - 1 WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_record_count
  AFTER INSERT OR DELETE ON records
  FOR EACH ROW EXECUTE FUNCTION trg_update_user_record_count_v2();

-- 기존 데이터 보정
UPDATE users SET record_count = (
  SELECT COUNT(*) FROM records WHERE records.user_id = users.id
);
```

#### 코드 변경

| 순서 | 작업 | 파일 | 내용 | 해결 |
|------|------|------|------|------|
| **C-1** | 소스 상수 중앙화 | `domain/constants/source-priority.ts` (신규) | `SOURCE_PRIORITY` 상수 정의 | P5 |
| **C-2** | 5곳 하드코딩 제거 | score-fallback, record-grouper, findHomeRecords, restaurant/wine-detail-container | 중앙 상수 import | P5 |
| **C-3** | 네이밍 통일 | `domain/entities/score.ts`, 상세 컨테이너 외 | `'my'`→`'mine'`, `'nyam'`→`'public'` | P6 |
| **C-4** | Bookmark 엔티티/리포지토리 | `domain/entities/bookmark.ts`, `domain/repositories/bookmark-repository.ts` (신규) | Bookmark 타입 + CRUD 인터페이스 | P4 |
| **C-5** | Bookmark infrastructure | `supabase-bookmark-repository.ts` (신규) | bookmarks 테이블 CRUD | P4 |
| **C-6** | DI 등록 | `shared/di/container.ts` | BookmarkRepository 등록 | P4 |
| **C-7** | record-repository 정리 | `supabase-record-repository.ts` | lists JOIN 제거, findOrCreateList 삭제, list 관련 메서드 삭제, `listId` 필드 제거 | P4 |
| **C-8** | 기록 생성 플로우 | `supabase-record-repository.ts`, `use-create-record.ts` | `findOrCreateList → records INSERT` → `records INSERT`만 | P4 |
| **C-9** | use-bookmark 전환 | `use-bookmark.ts` | BookmarkRepository 사용 | P4 |
| **C-10** | ViewType 확장 | `use-home-records.ts`, `home-container.tsx` | `'unrated'`/`'cellar'`/`'tasted'` 추가 | P1 |
| **C-11** | findHomeRecords 서버 쿼리 | `supabase-record-repository.ts` | unrated/cellar/tasted case 추가 (bookmarks 테이블 기반) | P1 |
| **C-12** | filter-matcher 정리 | `filter-matcher.ts` | `listStatus` 매칭 제거, `source` 기반 통일 | P4 |
| **C-13** | 보기 필터 UI 차원 분리 | `filter-config.ts`, `condition-filter-bar.tsx` | 내 컬렉션 / 다른 사람 시각적 구분 | P2 |
| **C-14** | 타입 정리 | `record.ts`, `record-card.tsx`, `wine-card.tsx`, `settings-container.tsx` | `listId`, `ListItem`, `ListStatus` 제거, listStatus prop 제거 | P4 |
| **C-15** | 사분면 dedup | restaurant/wine-detail-container | 팔로잉/버블/공개 기록 수집 시 상위 소스 중복 제외 | P7 |
| **C-16** | visibility 중앙화 | `domain/services/visibility-filter.ts` (신규) | `filterByVisibility()` 함수, 홈/상세/버블 피드 공통 적용 | P8 |
| **C-17** | 프로필 프라이버시 | application layer | 비공개 유저 조회 시 제한 필드만 반환 | P9 |
| **C-18** | 계정 삭제 플로우 | `supabase/functions/process-account-deletion/index.ts` | lists 삭제 로직 제거, bookmarks 삭제 추가 | P4 |

#### 문서 업데이트

| 문서 | 내용 |
|------|------|
| `development_docs/systems/DATA_MODEL.md` | lists 테이블 정의 삭제, bookmarks 테이블 추가, records.list_id 제거 |
| `development_docs/systems/AUTH.md` | lists RLS 제거, bookmarks RLS 추가 |
| `CODEBASE.md` | DI 등록 현황 갱신 (BookmarkRepository 추가) |
| `supabase/types.ts` | `supabase gen types` 재생성 |
| 이 문서 (DB_v3) | 섹션 1~7을 목표 구조 기준으로 갱신 |

### 8-4. P → 해결 매핑

| 문제 | 해결 작업 | 방법 |
|------|----------|------|
| P1 미평가/셀러/시음 서버 쿼리 | C-10, C-11 | ViewType 확장 + findHomeRecords case 추가 |
| P2 두 차원 혼재 | C-13 | 보기 필터 UI에서 "내 컬렉션 / 다른 사람" 시각적 분리 |
| P3 조합 의미 | 8-1 규칙 정의 | 합집합 규칙 명문화, 방문 = 전체(미평가 포함) |
| P4 lists 이중 구조 | M-1~M-5, C-4~C-9, C-12, C-14, C-18 | lists 제거 + bookmarks 독립 |
| P5 우선순위 분산 | C-1, C-2 | 중앙 상수 |
| P6 네이밍 혼재 | C-3 | `'mine'`/`'public'` 통일 |
| P7 사분면 중복 | C-15 | 소스 우선순위 dedup |
| P8 visibility 분산 | C-16 | 중앙 유틸리티 |
| P9 프라이버시 | C-17 | application layer 필터 |

### 8-5. 실행 순서 및 의존성

```
Step 1: 마이그레이션 (M-1 → M-2 → M-3 → M-4 → M-5)

Step 2: 코드 변경 (M 완료 후)
  ├── 독립 작업 (병렬 가능)
  │   ├── C-1, C-2, C-3: 소스 상수 + 네이밍
  │   ├── C-4, C-5, C-6: Bookmark 엔티티/리포지토리
  │   └── C-13: 보기 필터 UI 차원 분리
  │
  ├── 의존 작업 (순차)
  │   ├── C-7: record-repository 정리 (C-4 후)
  │   ├── C-8: 기록 생성 플로우 (C-7 후)
  │   ├── C-9: use-bookmark 전환 (C-5 후)
  │   ├── C-10, C-11: ViewType + 서버 쿼리 (C-7 후)
  │   ├── C-12: filter-matcher (C-7 후)
  │   └── C-14: 타입 정리 (C-7 후)
  │
  ├── 부수 작업
  │   └── C-18: 계정 삭제 플로우 (C-7 후)
  │
  └── 품질 개선 (마지막)
      ├── C-15: 사분면 dedup
      ├── C-16: visibility 중앙화
      └── C-17: 프로필 프라이버시

Step 3: 문서 업데이트 (코드 완료 후)
```

### 8-6. 검증 체크리스트

```
마이그레이션 후:
  □ bookmarks 테이블 생성 확인
  □ lists 데이터 → bookmarks 이관 확인
  □ records.list_id 컬럼 없음 확인
  □ users.record_count 정합 (records COUNT와 일치)
  □ lists 테이블 DROP 확인

코드 완료 후:
  □ 모든 보기 필터 단독/조합 동작
  □ 방문 필터 = 내 전체 기록 (미평가 포함)
  □ 미평가 필터 = 점수 없는 기록만
  □ 시음 필터 단독 선택 → 와인 기록 표시
  □ 셀러 필터 단독 선택 → 셀러 와인 표시
  □ 찜 토글 정상 (bookmarks 테이블)
  □ 같은 대상에 bookmark + cellar 동시 가능
  □ 기록 생성 정상 (list 없이 records만 INSERT)
  □ 보기 필터 UI에서 "내 컬렉션 / 다른 사람" 구분 표시
  □ 사분면에서 같은 record가 두 소스에 중복 안 됨
  □ 타인 기록에 companions/private_note 미노출
  □ 비공개 유저 프로필 조회 시 제한 필드만 반환
  □ ScoreSource에 'my'/'nyam' 없음 (grep)
  □ SOURCE_PRIORITY 정의 1곳만 (grep)
  □ 'list_id' / 'ListItem' / 'ListStatus' 0건 (grep, 마이그레이션 제외)
  □ 계정 삭제 정상 동작 (bookmarks 삭제 포함, lists 참조 없음)
  □ pnpm build 에러 없음

문서 완료 후:
  □ DATA_MODEL.md에 lists 없음, bookmarks 있음
  □ AUTH.md에 bookmarks RLS 있음
  □ CODEBASE.md DI 등록 현황 반영
  □ supabase/types.ts 재생성 완료
```

---

## 9. 완성된 구조 (2026-04-07 리팩토링 완료)

### 9-1. 데이터 모델

```
restaurants (1) ←── (N) records ──→ (N) wines
                        │
                   user_id + target_id + target_type (직접 참조)
                   axis_x/axis_y/satisfaction (nullable — 미평가 허용)

bookmarks (독립)
  user_id + target_id + target_type + type('bookmark'|'cellar')
  UNIQUE(user_id, target_id, target_type, type) — 같은 대상에 찜+셀러 동시 가능
```

- **lists 테이블 삭제됨** — records가 restaurants/wines를 직접 참조
- **records.list_id 제거됨** — FK 없이 user_id + target_id + target_type으로 관계 표현
- **bookmarks**: 찜/셀러 전용 독립 테이블. records와 무관하게 존재 가능

### 9-2. 보기 필터 체계

**식당 탭 (6개) / 와인 탭 (7개)** — 모든 필터가 독립 서버 쿼리를 가짐

```
내 컬렉션:  [방문/시음] [찜] [미평가] [셀러(와인만)]
─────────────────────────────────────────────────
다른 사람:  [팔로잉] [버블] [공개]
```

- UI에서 두 그룹을 구분선/라벨로 시각 분리 (`filter-config.ts`의 `group` 필드)
- 멀티셀렉트 = 합집합 (UNION)
- 방문/시음 = 내 전체 기록 (미평가 포함). 미평가 ⊂ 방문/시음

| 필터 | ViewType | 서버 쿼리 | source 태깅 |
|------|----------|----------|------------|
| 방문 | `visited` | `records WHERE user_id=me AND target_type` | `mine` |
| 시음 | `tasted` | `records WHERE user_id=me AND target_type='wine'` | `mine` |
| 찜 | `bookmark` | `bookmarks WHERE type='bookmark'` → records + 가상row | `bookmark` |
| 셀러 | `cellar` | `bookmarks WHERE type='cellar'` → records + 가상row | `bookmark` |
| 미평가 | `unrated` | `records WHERE user_id=me AND axis_x IS NULL` | `mine` |
| 팔로잉 | `following` | `follows(accepted) → records` (내 것 제외) | `following` |
| 버블 | `bubble` | `bubble_shares → records` (내 것 제외) | `bubble` |
| 공개 | `public` | `users(is_public) → records` (내 것 제외) | `public` |

**중복 제거**: `mine(0) > following(1) > bubble(2) > public(3) > bookmark(4)`

### 9-3. 소스 우선순위

**중앙 정의**: `domain/constants/source-priority.ts`

```typescript
export const SOURCE_PRIORITY = ['mine', 'following', 'bubble', 'public', 'bookmark'] as const
export type SourceType = typeof SOURCE_PRIORITY[number]
export const SOURCE_PRIORITY_MAP = { mine: 0, following: 1, bubble: 2, public: 3, bookmark: 4 }
```

사용처 (모두 중앙 상수 import):
- `score-fallback.ts` — 상세 페이지 점수 폴백
- `record-grouper.ts` — 홈 목록 그루핑 + 대표 점수
- `findHomeRecords` — 중복 제거
- `restaurant/wine-detail-container` — 사분면 섹션 제목

**네이밍 통일**: `ScoreSource`와 `RecordSource` 모두 `'mine'`/`'public'` 사용. `'my'`/`'nyam'` 제거됨.

### 9-4. 사분면

| dot | 크기 | 조건 |
|-----|------|------|
| 메인 | 20px + glow | `selectedSources`에 `'mine'` 포함 시만 |
| micro | 4px | 그 외 모든 소스의 개별 기록 |

- 메인 dot 없으면(mine 미선택) micro dot만 표시
- **소스 간 dedup**: `seenRecordIds` Set으로 상위 소스에 이미 포함된 record를 하위에서 제외
  - mine → following → bubble → public 순서
  - bubble dots는 record ID가 없어 좌표 기반 dedup 불가 (구조적 한계)

### 9-5. 프라이버시

**2단계 필터링**:

| 단계 | 위치 | 적용 |
|------|------|------|
| RLS (row) | DB | records 5정책, bookmarks 1정책 (본인만) |
| Visibility (column) | Application | `enrichRecordsWithTarget`에서 타인 기록의 companions/privateNote 자동 null 처리 |

**visibility 서비스** (`domain/services/visibility-filter.ts`):
- `applyVisibility()` — 본인 기록은 패스, 타인 기록은 무조건 비공개 필드 제거 + 7개 토글 기반 필터링
- `enrichRecordsWithTarget`에서 타인 기록에 즉시 적용 (companions/privateNote null)

**프로필 프라이버시** (`domain/services/profile-visibility.ts`):
- `filterProfileForViewer()` — 비공개+비팔로워 → 최소 필드(id, nickname, handle, avatar)만 반환
- `use-bubbler-profile`에서 적용

### 9-6. 기록 생성 플로우

```
이전: findOrCreateList() → lists INSERT → records INSERT (list_id FK)
현재: records INSERT (직접, list_id 없음)
```

- 기록 생성 시 lists 테이블 불필요
- 찜/셀러는 bookmarks 테이블로 독립 관리 (기록과 무관)
- `users.record_count`는 records INSERT/DELETE 트리거로 자동 갱신

### 9-7. 찜(bookmark) 시스템

```
이전: lists.status='bookmark' + lists.is_bookmarked=true (이중 구조)
현재: bookmarks 테이블 INSERT/DELETE (단일 구조)
```

- 하트 토글 → `bookmarkRepo.toggle()` → bookmarks에 INSERT 또는 DELETE
- 같은 대상에 `type='bookmark'`(찜) + `type='cellar'`(셀러) 동시 가능 (UNIQUE 제약에 type 포함)
- 기록 유무와 무관하게 독립 존재

### 9-8. 계정 삭제

`process-account-deletion` Edge Function에서:
- `wishlists`/`lists` → `bookmarks` DELETE로 교체
- FK 의존성 순서: bubble_members → bookmarks → records

### 9-9. 파일 구조 변경 요약

**신규 6개**:
```
domain/constants/source-priority.ts     — 소스 우선순위 중앙 상수
domain/entities/bookmark.ts             — Bookmark 엔티티
domain/repositories/bookmark-repository.ts — BookmarkRepository 인터페이스
domain/services/visibility-filter.ts    — 가시성 필터 서비스
domain/services/profile-visibility.ts   — 프로필 프라이버시 서비스
infrastructure/repositories/supabase-bookmark-repository.ts — Supabase 구현체
```

**제거된 개념**:
```
ListItem, ListStatus, listId          — record.ts에서 삭제
findOrCreateList, toggleBookmark 등   — record-repository에서 삭제
lists 테이블 JOIN                      — 모든 쿼리에서 제거
wishlist 용어                          — bookmark으로 통일 완료
```

---

## 10. 소셜 필터 설계 (미구현)

### 10-1. 개념

현재 "팔로잉"/"버블" 필터는 **전체** 팔로잉/버블 기록을 보여줌. 소셜 필터는 **특정 사람** 또는 **특정 버블**로 좁히는 기능.

```
현재: "팔로잉" 선택 → 내가 팔로우하는 모든 사람의 기록
소셜: "팔로잉" 선택 + "춘삼이jk@" 선택 → 춘삼이jk@의 기록만
```

### 10-2. 적용 범위

| 위치 | 적용 |
|------|------|
| 홈 카드 뷰 | ✅ |
| 홈 리스트 뷰 | ✅ |
| 홈 지도 뷰 | ✅ |
| 홈 달력 뷰 | ❌ (내 기록 전용) |
| 상세 페이지 | ❌ |

### 10-3. UX

```
다른 사람:  [팔로잉 ▾] [버블 ▾] [공개]
                │          │
            ┌───▼────┐  ┌───▼────┐
            │ ● 전체   │  │ ● 전체   │
            │ ○ 춘삼이  │  │ ○ 우리가족│
            │ ○ jksung │  │ ○ 광화문  │
            └─────────┘  └─────────┘
```

- **칩 탭**: ON/OFF (기존 동작 유지)
- **칩 ▾ 또는 길게 누르기**: 하위 목록 드롭다운
- **"전체"** (기본): 현재 동작 = 모든 팔로잉/버블
- **특정 항목 선택**: 해당 사람/버블만 필터링 (단일 선택)
- 팔로잉/버블이 OFF 상태면 하위 목록 비활성

### 10-4. 데이터 모델

스키마 변경 없음. 기존 테이블로 충분:

| 소셜 필터 | 동적 옵션 소스 | 쿼리 |
|----------|-------------|------|
| 팔로잉 사람 | `follows WHERE follower_id=me AND status='accepted'` → users(nickname, avatar) | `records WHERE user_id = 선택된 user_id` |
| 버블 | `bubble_members WHERE user_id=me AND status='active'` → bubbles(name, icon) | `bubble_shares WHERE bubble_id = 선택된 bubble_id → records` |

### 10-5. 서버 쿼리 변경

```typescript
// findHomeRecords 시그니처 확장
findHomeRecords(
  userId: string,
  targetType: RecordTargetType,
  views: string[],
  socialFilter?: {
    followingUserIds?: string[]  // null/undefined = 전체
    bubbleIds?: string[]         // null/undefined = 전체
  }
)
```

**`case 'following'` 변경**:
```
현재: follows → ALL following_ids → records
변경: follows → (socialFilter.followingUserIds ?? ALL following_ids) → records
```

**`case 'bubble'` 변경**:
```
현재: bubble_members → ALL bubble_ids → bubble_shares → records
변경: bubble_members → (socialFilter.bubbleIds ?? ALL bubble_ids) → bubble_shares → records
```

### 10-6. 동적 옵션 로딩

새 hook 필요: `use-social-filter-options.ts`

```typescript
interface SocialFilterOptions {
  followingUsers: Array<{ id: string; nickname: string; avatarUrl: string | null }>
  myBubbles: Array<{ id: string; name: string; icon: string | null; iconBgColor: string | null }>
  isLoading: boolean
}

function useSocialFilterOptions(userId: string | null): SocialFilterOptions
```

- 홈 컨테이너에서 1회 로드, 캐시
- 팔로잉/버블 칩이 활성화될 때만 드롭다운에 표시

### 10-7. 상태 영속화

기존 필터 영속화 메커니즘(Write-Behind Cache)에 소셜 필터 상태 추가:

```typescript
// 기존 PersistedFilterState에 추가
interface PersistedFilterState {
  // ... 기존 필드
  socialFilter?: {
    followingUserId?: string | null  // null = 전체
    bubbleId?: string | null         // null = 전체
  }
}
```

- localStorage 즉시 저장 + debounce 1500ms Supabase
- 앱 재시작 시 복원
- 팔로잉/버블 필터 OFF 시 소셜 필터도 자동 초기화

### 10-8. 영향 파일

| 파일 | 변경 |
|------|------|
| `domain/repositories/record-repository.ts` | `findHomeRecords` 시그니처에 `socialFilter` 추가 |
| `infrastructure/supabase-record-repository.ts` | following/bubble case에 socialFilter 조건 추가 |
| `application/hooks/use-home-records.ts` | socialFilter 파라미터 전달 |
| `application/hooks/use-social-filter-options.ts` | **신규** — 동적 옵션 로딩 |
| `application/hooks/use-persisted-filter-state.ts` | socialFilter 필드 추가 |
| `presentation/containers/home-container.tsx` | socialFilter 상태 관리 + 드롭다운 연결 |
| `presentation/components/home/condition-filter-bar.tsx` | 팔로잉/버블 칩에 ▾ 드롭다운 UI 추가 |
| `domain/entities/filter-config.ts` | FilterAttributeOption에 `expandable` 플래그 추가 (선택적) |

### 10-9. 구현 순서

```
1. use-social-filter-options hook (동적 옵션 로딩)
2. findHomeRecords socialFilter 파라미터 추가 (서버)
3. use-home-records에서 socialFilter 전달
4. condition-filter-bar에 ▾ 드롭다운 UI
5. home-container에서 소셜 필터 상태 관리
6. use-persisted-filter-state에 영속화
```
