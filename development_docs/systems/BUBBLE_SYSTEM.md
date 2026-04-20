<!-- updated: 2026-04-20 -->
<!-- last-edit: 2026-04-20 §3-4 Auto* 메서드명 레거시 네이밍 주석, §10 078 중복 번호(added_by/cf_trigger_with_pg_net) 분리 명시 -->
# BUBBLE_SYSTEM — 버블 시스템

> **depends_on**: DATA_MODEL, AUTH, XP_SYSTEM, SOCIAL_SYSTEM
> **affects**: RECOMMENDATION, RECORD_SYSTEM
> **routes**: `/bubbles`, `/bubbles/create`, `/bubbles/[id]`, `/bubbles/[id]/settings`, `/bubbles/invite/[code]`

---

## 0. 문서 범위

버블(= 큐레이션 리스트) 도메인의 **시스템 규칙 SSOT**. 생애주기, 자동/수동 큐레이션, 피드·랭킹, 초대 플로우, RLS·트리거를 정의한다.

- **담는다**: 버블 자체의 규칙, `bubble_items` 동기화, 멤버·역할, 랭킹, 초대
- **담지 않는다**:
  - 댓글·리액션 **내부 구조** → `SOCIAL_SYSTEM.md` (여기선 "댓글 허용 토글" 관점만)
  - 팔로우 전반 → `SOCIAL_SYSTEM.md`
  - 디자인 토큰·아이콘 팔레트·색상 → `DESIGN_SYSTEM.md`
  - 테이블 컬럼 정의 → `DATA_MODEL.md` (본 문서는 역할·관계만 요약)
  - RLS 정책 전문 → `AUTH.md §2, §4, §6` (본 문서는 버블 관점 요약만)

---

## 1. 핵심 원칙

### 1-1. 경험치 기반 신뢰 계층
- 버블 가입 정책(`manual_approve` / `auto_approve`)은 `min_records`, `min_level` 조건을 가질 수 있다
  - 근거: `src/domain/services/bubble-join-service.ts` `checkJoinEligibility()`
  - 근거 DB: `bubbles.min_records`, `bubbles.min_level`, `bubbles.max_members` — `DATA_MODEL.md` §bubbles
- `auto_approve`는 조건 AND 충족 시에만 즉시 활성, `manual_approve`는 조건 미충족이어도 신청 자체는 가능(오너가 판단)
- 목적: 낮은 기여도 유저의 대량 가입으로 데이터 품질이 희석되지 않도록 방어

### 1-2. 데이터 오염 방지
- 멤버 탈퇴/강퇴 시 **해당 멤버만 기록한 타겟**은 `bubble_items`에서 자동 정리
  - 근거 트리거: `cleanup_bubble_items_on_member_leave` (migration 078)
- 기록 삭제 시 **해당 타겟에 이 버블의 활성 멤버 중 아무도 기록 없으면** `bubble_items` 삭제
  - 근거 트리거: `cleanup_bubble_items_before_record_delete` (migration 078)
- 버블은 가변적 — 오너는 언제든 멤버를 제거하여 오염된 데이터를 정화할 수 있다

### 1-3. 홈 추천 연동
- 버블 멤버 큐레이션은 홈 추천의 신뢰 신호로 활용된다 (→ `RECOMMENDATION.md`)
- CF(Collaborative Filtering)는 **전체 유저** 스코프와 **버블 스코프** 두 층에서 산출
  - 근거 Edge Function: `supabase/functions/compute-similarity/` (migration 078_cf_trigger_with_pg_net.sql로 records INSERT/UPDATE/DELETE 시 자동 트리거)
- 버블 스코프 점수는 "특정 맥락 안에서의 예측"이며, "더 정확한 점수"가 아니라 "**다른 관점의 점수**"다

### 1-4. 무한 생성 + 1인 버블
- 누구나 자유롭게, 무한정 버블을 생성할 수 있다 (단톡방처럼)
- **1인 버블**도 1급 시민 — 개인 큐레이션 채널 (예: "2026 미슐랭") 또는 외부 공개용 리스트로 활용
- 1인 버블은 CF 대상이 아니며, 소유자 개인의 점수만 표시

### 1-5. 리스트 = 맥락(Context)
- 버블의 멘탈 모델은 **동호회가 아닌 Spotify 플레이리스트 + 구독자 + 공동 편집자**
- 리스트의 성격이 멤버를 필터링하고, 멤버 구성이 점수에 맥락을 부여한다
- 같은 식당이 "내추럴와인 버블 91점" vs "가성비 버블 63점"처럼 **다른 관점**으로 평가될 수 있다

---

## 2. 버블 생애주기

### 2-1. 생성
- 경로: `/bubbles/create` → `CreateBubbleContainer` → `useBubbleCreate.createBubble()`
  - 근거: `src/app/(main)/bubbles/create/page.tsx`, `src/application/hooks/use-bubble-create.ts`
- 생성 시 필수: 이름(1~20자), 공개 설정(`visibility`), 아이콘
- `visibility='private'` → `joinPolicy='invite_only'` 자동 매핑
- 생성 직후:
  - `bubble_members`에 `role='owner', status='active'` 행 INSERT (RLS: `bm_insert_self`가 본인이 `created_by`인 버블에 한해 owner INSERT 허용 — migration 060)
  - 초대 코드 자동 생성(기본 3일 만료) — `generateInviteCode()`
  - XP 보너스: `bonus_first_bubble` (+5, 첫 버블 생성 시만) — `useBonusXp`
  - 첫 큐레이션 항목 추가 시 `bonus_first_share` +3 XP (1회 한정) — `XP_SYSTEM.md §4-4, §13` 참조
    - ※ 수동 공유(`use-share-record` 호출 = "리스트에 추가") 경로에서만 적립. 자동 공유(`useBubbleAutoSync`의 필터 기반) 경로에서는 미적립

### 2-2. 가입 정책 5종

| 정책 | 설명 | 가입 시 status |
|------|------|----------------|
| `invite_only` | 초대 코드 필요 (private 버블 고정) | `active` (코드 검증 통과 시) |
| `closed` | 가입 불가. `follower`로만 참여 가능 | — (follower만) |
| `manual_approve` | 신청 → 오너 승인 필요 | `pending` |
| `auto_approve` | `min_records` + `min_level` 충족 시 즉시 가입 | `active` |
| `open` | 누구나 즉시 가입 | `active` |

- ※ `min_records`/`min_level` 조건은 `manual_approve`에서는 오너 승인 시 참고용(차단 아님). `auto_approve`만 조건 미충족 시 `pending`으로 떨어짐
- 근거: `src/domain/entities/bubble.ts` `BubbleJoinPolicy`, `src/domain/services/bubble-join-service.ts` `checkJoinEligibility()`
- 근거 DB: `DATA_MODEL.md` §bubbles `chk_bubbles_join_policy` CHECK 제약
- `closed` 버블은 `follow()`만 허용 — `useBubbleJoin.follow()`가 `role='follower', status='active'`로 `addMember`
- **`closed` follower 가시성 (권위 정의, `AUTH.md §2-3` 요약의 상세판)**: follower는 버블 **이름 + 평균 점수(`avg_satisfaction`) + 지역 수준(`area`)** 만 열람 가능. 피드 본문(기록·한줄평·사진), 멤버 목록, 랭킹, `bubble_items` 전체 리스트는 열람 불가. application layer에서 이 필드 허용 화이트리스트를 강제한다.
- `manual_approve`로 `pending` 생성 시 오너에게 `bubble_join_request` 알림 발송

### 2-3. 멤버 역할

| 역할 | 권한 요약 |
|------|----------|
| `owner` | 전체 설정 변경, 역할 변경, 버블 삭제, 멤버 승인/거절/제거, 초대 |
| `admin` | 멤버 승인/거절, 초대 (설정 일부) |
| `member` | 기록 자동 큐레이션, 댓글, 리액션, 수동 "리스트에 추가" |
| `follower` | public 버블 맛보기 열람 (이름·평균 점수·지역 수준) |

- 근거: `src/domain/entities/bubble.ts` `BubbleMemberRole`, `AUTH.md §2-1` 권한 매트릭스
- 역할 자기 승격 방지: `prevent_role_self_promotion()` BEFORE UPDATE 트리거 (AUTH.md §6)

### 2-4. 탈퇴 / 해체
- 본인 탈퇴: `bubbleRepo.removeMember(bubbleId, userId)` → `bubble_members` row 삭제 OR `status` 변경
- 멤버 강퇴: owner/admin이 `removeMember` 호출 (RLS: `bm_delete_admin` — AUTH.md §4)
- **탈퇴 후속 처리**: `cleanup_bubble_items_on_member_leave` 트리거가 탈퇴 멤버만 기록한 타겟을 `bubble_items`에서 자동 제거 (migration 078)
- 본인 가입 신청 취소(`cancelJoin`): 멤버 row 제거 + 오너에게 보낸 가입 요청 알림 일괄 삭제
- 버블 해체: owner만 `bubbleRepo.delete(id)` 호출 (RLS: `bubble_delete`) → `ON DELETE CASCADE`로 `bubble_members`, `bubble_items`, `bubble_photos`, `bubble_ranking_snapshots` 전부 삭제

---

## 3. 자동 공유 필터 시스템

### 3-1. 진화 과정 (중요)
- **구(舊) 모델**: `bubble_shares` 테이블. 기록(record) 단위로 UPSERT. `record_id` 기반 UNIQUE. 수동 공유 + 자동 공유 혼재 (`auto_synced` 플래그)
- **현(現) 모델**: `bubble_items` 테이블. **타겟(target) 단위** 큐레이션. **순수 필터 기반 자동 동기화**로 통일. `record_id`, `added_by`, `source` 모두 제거되어 **5컬럼 단순화**
  - 근거: `_archive/개념문서_원본/버블_큐레이션_리스트_리팩토링.md`, `_archive/개념문서_원본/버블공유시스템.md`
  - 근거 마이그레이션: 053 생성 → 068 `bubble_shares` DROP → 076~078 컬럼 정리
  - ※ 과거 `bookmarks`(찜) 테이블은 migration 063에서 DROP됨. 찜의 역할은 1인 비공개 버블 + `bubble_items`로 대체

> **정책 정리 완료** (`AUTH.md §4-5 주의 1` 참조): `068`이 `records_bubble_shared` RLS를 `bubble_items.record_id` 경유로 재작성했으나, `077`에서 `record_id` 컬럼이 제거되면서 해당 정책은 실효가 없어졌다. `082_security_hardening`에서 `records_bubble_shared`가 정식 DROP되었으며, 버블 멤버 기록 열람은 `records_bubble_member_read`(migration 033)가 담당한다.

> **핵심 전환**: "수동 공유"는 표면상 존재하지만(= 사용자가 "리스트에 추가" 버튼으로 직접 담기), DB 레벨에서는 **자동/수동을 구분하지 않는다**. 모든 `bubble_items`는 동등한 큐레이션 항목이며, 삭제/정리는 "활성 멤버 중 해당 타겟 기록이 있는지"라는 **타겟 기반 규칙**으로만 판정한다.

### 3-2. `bubble_items` 최종 스키마 (5컬럼)

```
id           UUID PK
bubble_id    UUID FK → bubbles(id) ON DELETE CASCADE
target_id    UUID NOT NULL                     -- restaurants.id 또는 wines.id
target_type  VARCHAR(10) NOT NULL              -- 'restaurant' | 'wine'
added_at     TIMESTAMPTZ NOT NULL DEFAULT now()

UNIQUE(bubble_id, target_id, target_type)
```

- 근거 엔티티: `src/domain/entities/bubble.ts` `BubbleItem`
- 근거 마이그레이션:
  - 053: 초기 생성(added_by, source, record_id 포함)
  - 076: `source` DROP
  - 077: `record_id` DROP
  - 078: `added_by` DROP + NOT NULL 해제 안전망 + 인덱스/FK 정리

**"누가 기록했는지"는 어디에?** → `records` 테이블(+ `bubble_members` JOIN)에서 도출. `bubble_items`는 "이 버블이 어떤 타겟들을 큐레이션하고 있는가"만 표현한다.

### 3-3. 공유 규칙 (BubbleShareRule)
- 저장 위치: `bubble_members.share_rule` JSONB (멤버별)
- 구조: `{ mode: 'all' | 'filtered', rules: FilterRule[], conjunction: 'and' | 'or', enabledDomains?: { restaurant, wine } }`
  - 근거 타입: `src/domain/entities/bubble.ts` `BubbleShareRule`
- `mode='all'`: 내 모든 기록의 타겟을 자동 포함
- `mode='filtered'`: `FilterRule[]` + `conjunction`으로 매칭 평가
- `enabledDomains`: focusType='all'인 버블에서 식당·와인 도메인별 ON/OFF (미지정 시 모두 true, 하위호환)
- `null`(미설정) → 자동 공유 안 함
- 홈 필터 시스템(`FilterRule`, `matchesAllRules`)을 재사용 — 순수 함수 `src/domain/services/filter-matcher.ts`

### 3-4. 동기화 트리거 & 흐름

#### 트리거 1: 기록 생성/수정
```
saveRecord(record)
  → useBubbleAutoSync.syncRecordToAllBubbles(record)
    → 내 active 멤버십 조회 (shareRule 포함)
    → 각 멤버십에 대해 evaluateShareRule([record], shareRule)
       매칭 → bubbleRepo.batchUpsertAutoItems([target], bubbleId)
       불매칭 → (신규 코드 경로는 diff 기반이므로 별도 DELETE 호출)
```
- 근거: `src/application/hooks/use-bubble-auto-sync.ts`
- 근거 서비스: `src/domain/services/bubble-share-sync.ts` `evaluateShareRule()`, `computeShareDiff()`

#### 트리거 2: 공유 규칙 변경 (소급 적용)
```
updateShareRule(bubbleId, newRule)
  → useBubbleAutoSync.syncAllRecordsToBubble(bubbleId, newRule, allRecords)
    1. bubbleRepo.updateShareRule(...) 규칙 저장
    2. evaluateShareRule(allRecords, newRule) → shouldShareTargetIds[]
    3. bubbleRepo.getAutoItemTargetIds(bubbleId) → currentTargetIds[]
    4. computeShareDiff → { toAdd, toRemove }
    5. batchUpsertAutoItems(toAdd) + batchDeleteAutoItems(toRemove) 병렬
```
- 효과: 규칙 변경 시 전체 기록을 재평가하여 **과거 기록도 소급 적용/정리**
- ※ **네이밍 주의**: `getAutoItemTargetIds` / `batchUpsertAutoItems` / `batchDeleteAutoItems`의 `Auto` 수식어는 `bubble_items`가 `source='auto'|'manual'` 컬럼으로 자동/수동을 구분하던 구(舊) 모델의 잔재다. 현재 5컬럼 스키마(§3-2)는 auto/manual을 구분하지 않으며, 이 메서드들은 `bubble_items` 전체를 대상으로 동작한다. 메서드 이름은 리팩토링 부채로 남아 있으되, 의미상으로는 `getBubbleItemTargetIds` / `batchUpsertItems` / `batchDeleteItems`로 읽어야 한다. 근거: `src/infrastructure/repositories/supabase-bubble-repository.ts` (line ~1053~1091)

#### 트리거 3: 기록 삭제 (타겟 기반 정리)
```
DELETE records WHERE id = :id
  → BEFORE DELETE 트리거 cleanup_bubble_items_before_record_delete
    "해당 타겟에 이 버블의 활성 멤버 중 아무도 기록 없으면 bubble_items 삭제"
```
- 근거: `supabase/migrations/078_drop_bubble_items_added_by.sql` §1

#### 트리거 4: 멤버 탈퇴 (타겟 기반 정리)
```
UPDATE bubble_members SET status = 'rejected' 또는 DELETE (AUTH §4-8 bm_delete_self 정책 사용)
  → status CHECK 허용값: pending | active | rejected (inactive 없음)
  → 트리거 조건: WHEN OLD.status='active' AND NEW.status != 'active' (UPDATE 시)
  → AFTER UPDATE OF status 트리거 cleanup_bubble_items_on_member_leave
    탈퇴 멤버 기록 타겟 중 "다른 활성 멤버 기록이 없는 것"만 bubble_items 삭제
```
- 근거: `supabase/migrations/078_drop_bubble_items_added_by.sql` §2

### 3-5. 수동 공유의 위치
- 사용자는 식당/와인 상세, 기록 직후, 리스트 상세에서 "리스트에 추가" 버튼으로 수동 큐레이션 가능
  - 근거 훅: `src/application/hooks/use-bubble-items.ts` — `toggleItem`, `batchAddToBubble`
- DB에서는 자동/수동이 구분되지 않으므로, 수동 추가 후에도 `bubble_items` 행은 트리거 3/4(기록·멤버 정리)의 영향을 동일하게 받는다
- 수동으로 추가한 타겟에 본인 기록이 없으면 → 다른 활성 멤버 기록이 하나라도 있는 동안만 유지

### 3-6. 성능 최적화
- 트리거 성능: `update_bubble_member_item_stats` 트리거(함수 `trg_update_bubble_member_item_stats`)는 "해당 타겟에 기록이 있는 활성 멤버"만 UPDATE (수백 명 버블에서 전체 UPDATE 방지 — migration 078 NFR, `DATA_MODEL.md §트리거` 참조)
- 인덱스:
  - `idx_bubble_items_bubble_target(bubble_id, target_type)` — 리스트 뷰 조회
  - `idx_records_target_user(target_id, target_type, user_id)` — 트리거 EXISTS 서브쿼리 가속
  - `idx_bubble_members_bubble_status_user(bubble_id, status, user_id)`

---

## 4. 피드 & 상호작용

### 4-1. 피드 구조
- 버블 상세(`/bubbles/[id]`)의 피드는 `bubble_items`를 기반으로 시간순 나열
  - 근거 훅: `src/application/hooks/use-bubble-feed.ts`
  - 근거 레포 메서드: `bubbleRepo.getEnrichedShares(bubbleId, { limit })`
- 타겟 카드 클릭 → **드릴다운 BottomSheet**에서 해당 타겟의 개별 기록을 확인
  - 근거 컨테이너: `src/presentation/containers/bubble-detail-container.tsx`

### 4-2. 필터 & 정렬
- 탭 내 필터: `targetType`(식당/와인/전체), `period`(주/월/3개월/전체), `minScore`(70/80/90), `memberId`
- 정렬: `recent` | `score` | `member` | `popular`
- 컨텐츠 가시성(`content_visibility`):
  - `rating_only` → 비멤버에게 한줄평·사진 숨김
  - `rating_and_comment` → 비멤버에게 한줄평 공개, 사진은 여전히 멤버 전용

### 4-3. 댓글 허용 토글
- `bubbles.allow_comments`(BOOLEAN)로 버블 단위 댓글 기능을 ON/OFF
  - 근거 엔티티 필드: `Bubble.allowComments`
  - 근거 세팅 UI: `src/presentation/containers/bubble-settings-container.tsx`
- 토글이 OFF면 해당 버블 내 기록 카드의 댓글 입력 영역을 숨긴다
- **댓글/리액션 내부 구조(parent_id thread, good/bad 상호배타, RLS)는 `SOCIAL_SYSTEM.md` 담당.** 버블 시스템은 "토글 on/off"만 소유
- ※ 댓글별 좋아요는 로컬 토글만 구현, DB 연동 미구현. 상세: `SOCIAL_SYSTEM.md §11`

### 4-4. 외부 공유 토글
- `bubbles.allow_external_share`(BOOLEAN) — 버블 콘텐츠를 앱 외부로 공유 가능 여부
- OFF면 공유 액션 UI 비활성화 (링크 생성/카카오톡 공유 등)

---

## 5. 랭킹 시스템

### 5-1. 테이블
- `bubble_ranking_snapshots`
  - PK: `(bubble_id, target_id, target_type, period_start)`
  - 컬럼: `rank_position`, `avg_satisfaction`, `record_count`
  - 근거: `DATA_MODEL.md` §bubble_ranking_snapshots

### 5-2. 주간 스냅샷 크론
- 실행: 매주 월요일 00:00 UTC (cron)
- Edge Function: `supabase/functions/weekly-ranking-snapshot/index.ts`
- 처리 순서 (active 버블마다):
  1. 지난 주(월~일) `bubble_items` 집계 → 타겟별 records 조회
  2. `(avg_satisfaction DESC, record_count DESC)`로 타겟 순위 매기기
  3. `bubble_ranking_snapshots` UPSERT
  4. `bubbles.weekly_record_count` / `prev_weekly_record_count` 갱신
  5. `bubble_members.weekly_share_count = 0` 리셋

### 5-3. 등락(delta) 계산
- 클라이언트(`useBubbleRanking`)가 이번 주 + 지난 주 스냅샷을 동시 조회해 `RankingDelta`(`up` / `down` / `new` / `same`) 산출
  - 근거: `src/application/hooks/use-bubble-ranking.ts`

### 5-4. 버블 내 신뢰 지표 (멤버별)
- `bubble_members`에 비정규화된 멤버 통계 컬럼:
  - `taste_match_pct`, `common_target_count`, `avg_satisfaction`
  - `member_unique_target_count`, `weekly_share_count`
  - `badge_label`
- 트리거 `update_bubble_member_item_stats` (함수 `trg_update_bubble_member_item_stats`)가 `bubble_items` 변경 시 자동 갱신 (migration 078, SECURITY DEFINER + search_path 격리)

### 5-5. 버블 전문성 집계 (bubble_expertise 뷰)
- `xp_totals`와 `bubble_members` JOIN으로 축별(area / genre / wine_variety / wine_region) 멤버 평균 레벨 산출
  - 근거: migration 050, 엔티티 `BubbleExpertise`
- 활용: 버블 카드의 Top 전문 분야 3개, 버블 탐색 필터("전문 지역 강남 Lv.8+")
- ※ 뷰는 세부 축 4종(area/genre/wine_variety/wine_region)만 집계, category 축은 제외 (근거: `XP_SYSTEM.md §12-3`)

---

## 6. 초대 플로우

### 6-1. 초대 코드 생성
- 경로: 버블 생성 직후 또는 설정에서 `bubbleRepo.generateInviteCode(bubbleId, expiresAt)` 호출
- 코드 형식: `Math.random().toString(36).substring(2, 10).toUpperCase()` (8자, 예: `A3F7B2K9`)
- 저장: `bubbles.invite_code` (UNIQUE) + `bubbles.invite_expires_at`
- 기본 만료: 생성 시 3일, 명시적 생성 시 7일 (override 가능)
- 근거: `src/infrastructure/repositories/supabase-bubble-repository.ts` `generateInviteCode()`

### 6-2. 초대 랜딩
- 경로: `/bubbles/invite/[code]` → `InviteLandingContainer`
- 코드 검증: `bubbleRepo.validateInviteCode(code)` → `{ valid, bubble, expired }`
  - 만료 시 "만료된 초대 링크입니다"
  - 무효 시 "유효하지 않은 초대 링크입니다"
- 검증 통과 후:
  - 미로그인 → 로그인 유도 (code를 referrer로 보존)
  - 로그인 → 가입 CTA → `useBubbleJoin.requestJoin(bubbleId, userId, applicant, inviteCode)`
  - `invite_only` 버블은 초대 코드가 `checkJoinEligibility`의 필수 조건

### 6-3. 멤버 초대 (DM 초대)
- 버블 오너/admin이 기존 멤버가 아닌 유저에게 개별 초대 발송
  - 근거 훅: `src/application/hooks/use-bubble-invite-member.ts`
- 흐름: `searchUsers(query)` → 유저 선택 → `inviteUser()` → `notifications` 테이블에 `type='bubble_invite', actionStatus='pending'` 레코드 생성
- 중복 방지: 세션 내 `invitedIds` Set + DB `pendingInvites` 이중 체크
- 초대 취소: `notificationRepo.deleteNotification(notificationId)`

---

## 7. 버블 사진첩 (bubble_photos)

- 버블 단위 커버/사진첩 테이블 — `record_photos`와 별도
  - 근거: migration 067
- 스키마: `id, bubble_id, uploaded_by, url, order_index, created_at`
- RLS:
  - SELECT: 버블 활성 멤버 OR `visibility='public'` 버블
  - INSERT: 버블 활성 멤버(본인이 uploaded_by)
  - DELETE: 업로더 본인 OR 오너
- `Bubble.coverPhotoUrl`은 `bubble_photos` 첫 번째 사진(카드/리스트 썸네일용)

---

## 8. RLS & 권한 (요약)

> 전체 권한 매트릭스와 정책 상세는 **`AUTH.md §2, §4`** 에 있음. 본 섹션은 버블 도메인 관점 요약.

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `bubbles` | public 누구나 / private 멤버+owner (생성 직후 `bubble_owner_read`) | 본인이 `created_by` | owner | owner |
| `bubble_members` | 멤버 + public 열람 | `bm_insert_self` — 본인 가입 (role: member/follower/pending)<br>`bm_insert_owner_admin` — owner/admin 특례 (migration 060, `AUTH.md §6-3`) | owner/admin (타인만, 자기 승격 차단) | owner/admin |
| `bubble_items` | 활성 member 이상 + public 버블 follower | owner/admin/member (active 상태), follower 제외 | owner/admin/member (active 상태), follower 제외 (migration 071) | owner/admin/member (active 상태), follower 제외 (migration 078) |
| `bubble_photos` | 활성 멤버 또는 public 버블 | 활성 멤버 | — | 업로더 또는 owner |
| `bubble_ranking_snapshots` | 활성 멤버 | Edge Function(service_role)만 | — | — |

**owner 전용 설정 항목** (`AUTH.md §2-2`):
- 버블 정체성(이름·설명·아이콘·focus_type)
- 공개 설정(visibility, content_visibility)
- 가입 정책 및 조건(`join_policy`, `min_records`, `min_level`, `max_members`)
- 권한 토글(`allow_comments`, `allow_external_share`)
- 검색 노출(`is_searchable`, `search_keywords`)
- 역할 변경(admin 승격), 버블 삭제

**SECURITY 관련 주의**:
- `SECURITY DEFINER`는 트리거 함수에서 필요시만 사용 (RLS 활성 테이블 UPDATE를 위해)
- 적용 함수: `trg_update_bubble_item_stats`, `trg_update_bubble_member_item_stats`, `trg_cleanup_bubble_items_on_record_delete`, `trg_cleanup_bubble_items_on_member_leave`, `trg_notify_cf_update` — 모두 `SET search_path = public`으로 격리
- 근거: migration 074, 078

---

## 9. 관련 코드 지도

### Domain
- `src/domain/entities/bubble.ts` — `Bubble`, `BubbleMember`, `BubbleItem`, `BubbleShareRule`, `VisibilityOverride`, `BubbleRankingSnapshot`, `BubbleExpertise`
- `src/domain/repositories/bubble-repository.ts` — 인터페이스 (create/update/delete, 멤버 CRUD, 큐레이션 CRUD, 랭킹, 초대, 전문성, shareRule)
- `src/domain/services/bubble-join-service.ts` — `checkJoinEligibility()` (R1 순수)
- `src/domain/services/bubble-share-sync.ts` — `evaluateShareRule()`, `computeShareDiff()`
- `src/domain/services/filter-matcher.ts` — 규칙 매칭 (홈 필터와 공유)

### Infrastructure
- `src/infrastructure/repositories/supabase-bubble-repository.ts` — 모든 구현체 (~700 LOC), `bubble_items`로 완전 전환 완료

### Application hooks
- `use-bubble-create`, `use-bubble-detail`, `use-bubble-feed`, `use-bubble-join`, `use-bubble-members`, `use-bubble-roles`, `use-bubble-ranking`, `use-bubble-items`, `use-bubble-auto-sync`, `use-bubble-settings`, `use-bubble-invite-member`, `use-bubble-lookup`, `use-bubble-photos`, `use-bubble-discover`, `use-bubble-expertise`, `use-bubble-list`, `use-bubble-similarity`, `use-bubble-icon-upload`, `use-bubble-member`, `use-bubbler-profile`

### Presentation
- `src/presentation/containers/bubble-*` (create, detail, settings, invite-landing 등)
- `src/app/(main)/bubbles/{create,[id],[id]/settings,invite/[code]}/page.tsx`

### Supabase
- **Migrations**:
  - 053 `bubble_items` 생성 (+ RLS + 기존 `bubble_shares` 이관)
  - 054 트리거 (`bubbles` 집계, `bubble_members` 멤버 stats)
  - 060 `bm_insert_self` 오너 INSERT 허용
  - 067 `bubble_photos`
  - 068 `bubble_shares` DROP (완전 폐기) + records RLS `bubble_items` 참조로 교체
  - 071 `bubble_items` UPDATE RLS
  - 073 → 075 기록 삭제 트리거 (source 기반 → target 기반 개선)
  - 076 `source` 컬럼 DROP
  - 077 `record_id` DROP + `added_by`+`target_id` JOIN 기반 stats
  - 078 `drop_bubble_items_added_by` — `added_by` DROP + 멤버 탈퇴 트리거 추가 + member stats 성능 최적화 + RLS 단순화 + 성능 인덱스 2개
  - 078 `cf_trigger_with_pg_net` — records → compute-similarity pg_net 트리거 (※ 같은 078 prefix의 별도 파일. §10 참조)
- **Edge Functions**:
  - `weekly-ranking-snapshot` — 주간 랭킹 크론 (`bubble_items` 기반)
  - `compute-similarity` — CF 증분 갱신 (records INSERT/UPDATE/DELETE 트리거)

---

## 10. 마이그레이션 히스토리 (bubble_items)

```
053 bubble_items (added_by, source, record_id 포함)
054 triggers (bubbles/bubble_members 집계)
      ↓
068 DROP bubble_shares (롤백 안전망 해제)
      ↓
073/075 record delete 트리거 (source='auto' 기반)
      ↓
076 DROP source         ← auto/manual 구분 폐기
077 DROP record_id      ← target_id + user_id JOIN 기반
078 ※ 중복 번호 주의 — 같은 078 prefix로 2개 파일 존재
    ├─ 078_drop_bubble_items_added_by.sql
    │    DROP added_by   ← "활성 멤버 중 기록 있는지"로만 판정
    │    + cleanup_bubble_items_on_member_leave 신설
    │    + RLS 단순화 (added_by 제거 → 활성 member 이상)
    │    + 성능 인덱스 추가
    │    + trg_update_bubble_member_item_stats 성능 최적화
    └─ 078_cf_trigger_with_pg_net.sql
         records INSERT/UPDATE/DELETE → pg_net 경유 compute-similarity
         Edge Function 자동 트리거 (§1-3 CF 연동)
082 security_hardening  ← records RLS 스펙 정렬 + `records_bubble_shared` DROP
    + `bubble_expertise` SECURITY INVOKER
    + 19함수 search_path 잠금
    + `trg_notify_cf_update` GUC 패턴
```

**결과**: `bubble_items`는 `(id, bubble_id, target_id, target_type, added_at)` 5컬럼의 **순수 타겟 큐레이션 테이블**. 소유자/출처/기록 연결은 모두 JOIN으로 도출.

---

## 11. 관련 테이블 목록

> 자세한 스키마는 `DATA_MODEL.md`. 여기선 역할만.

| 테이블 | 역할 |
|--------|------|
| `bubbles` | 버블 메타 (이름·정책·공개설정·통계 캐시) |
| `bubble_members` | 멤버십 (역할·상태·shareRule·visibilityOverride·멤버 통계 캐시) |
| `bubble_items` | 타겟 단위 큐레이션 (자동/수동 통합) |
| `bubble_photos` | 버블 사진첩 |
| `bubble_ranking_snapshots` | 주간 랭킹 스냅샷 |
| `bubble_expertise` (VIEW) | 축별 멤버 평균 레벨 |
| `notifications` | 버블 초대/가입 요청/승인 이벤트 |

---

## 12. 교차 참조

- **DATA_MODEL.md** — 테이블 컬럼 전문
- **AUTH.md §2** — 버블 역할 권한 매트릭스
- **AUTH.md §4** — RLS 정책 전문
- **XP_SYSTEM.md** — 첫 버블 생성 보너스, 큐레이션 XP 정책
- **SOCIAL_SYSTEM.md** — 댓글(parent_id thread) / 리액션(good·bad) 내부 구조
- **RECOMMENDATION.md** — 버블 스코프 CF가 홈 추천에 기여하는 방식
- **RECORD_SYSTEM.md** — 기록 생성/수정/삭제가 `bubble_items` 동기화를 트리거하는 흐름
