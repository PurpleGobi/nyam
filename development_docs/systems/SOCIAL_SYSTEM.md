<!-- updated: 2026-04-20 -->

# SOCIAL_SYSTEM — 소셜 시스템

> **역할**: 팔로우, 프로필 공개 범위, 댓글, 리액션, 알림의 규칙을 통합 정의하는 SSOT.
> **depends_on**: DATA_MODEL, AUTH, XP_SYSTEM
> **affects**: BUBBLE_SYSTEM, RECOMMENDATION

> 버블 자체의 생애주기(생성/가입/역할/랭킹/자동 공유)는 `BUBBLE_SYSTEM.md`에 위임한다. 이 문서는 버블 **안에서** 동작하는 댓글/리액션/초대 알림만 다룬다.
> XP 획득 공식(기록 96%+, 소셜 ~4%)과 일일 상한은 `XP_SYSTEM.md`에 위임한다. 이 문서는 "어떤 소셜 이벤트가 XP 트리거인지"만 열거한다.

---

## 1. 소셜 네트워크 순환 고리

```
기록 활동 ──→ XP/Level (신뢰 축적)
                │
         ┌──────┴──────┐
         ▼             ▼
      Follow         Bubble
    (1:1 관계)     (N:N 커뮤니티)
         │             │
         └──────┬──────┘
                ▼
         더 풍부한 기록
```

| 시스템 | 핵심 질문 | 단위 |
|--------|----------|------|
| **XP/Level** | "이 사람이 얼마나 진짜 활동하는가?" | 개인 |
| **Follow** | "이 사람의 기록을 신뢰하고 보고 싶은가?" | 1:1 |
| **Bubble** | "이 그룹과 기록을 공유하고 싶은가?" | N:N |

Follow와 Bubble은 **독립된 접근 경로**이다. 팔로우가 없어도 같은 버블이면 기록을 볼 수 있고, 버블이 없어도 팔로우하면 볼 수 있다(§3.3 RLS 다중 경로).

> 근거: `_archive/개념문서_원본/Nyam Network System.md` §1, §2

---

## 2. 팔로우 시스템

### 2.1 테이블 구조

```
follows (006_social.sql)
├── follower_id    UUID  (요청자)
├── following_id   UUID  (대상)
├── status         VARCHAR(10)  'pending' | 'accepted' | 'rejected'  (chk_follows_status)
├── created_at     TIMESTAMPTZ
├── PRIMARY KEY (follower_id, following_id)
└── CHECK (follower_id != following_id)  -- 자기 자신 팔로우 금지
```

보조 인덱스 `idx_follows_reverse (following_id, follower_id)` — 역방향 조회 최적화.

### 2.2 팔로우 정책 (users.follow_policy)

> DB: `users.follow_policy VARCHAR(20) DEFAULT 'blocked'` (migration 047)

| 값 | 의미 | 구현 상태 |
|----|------|-----------|
| `blocked` | 팔로우 불가. 기존 팔로워에게도 기록 비공개 | RLS 반영됨 |
| `auto_approve` | 즉시 `accepted` | 반영됨 |
| `manual_approve` | `pending` → 유저 수동 승인 | 스펙 (UI 미구현) |
| `conditional` | `follow_min_records` / `follow_min_level` 충족 시 자동, 아니면 `pending` | 미구현 (현재 무조건 pending) |

예외 규칙:
- `is_public = true`이면 `follow_policy` 무시 → 누구나 자유 팔로우
- 역팔로우 자동 허용 (개념): A→B 팔로우가 `accepted`면 B→A 역팔로우는 B의 정책 무시. (미구현)

> 상세: `AUTH.md §3-2`
> 근거: `_archive/개념문서_원본/Nyam Network System.md` §2.1

### 2.3 엔티티 현황 (코드 구현)

현재 `domain/entities/follow.ts`의 도메인 모델은 **단순화된 형태**이다:

```ts
export type FollowStatus = 'accepted'            // 코드상 accepted만 사용
export type AccessLevel = 'none' | 'following'   // mutual은 별도 RPC 경로
```

- DB CHECK는 `pending | accepted | rejected` 3종을 지원하지만, 현재 클라이언트 코드는 `accepted` 단일 흐름(요청 즉시 수락)만 구현한다.
- "맞팔"은 엔티티 타입이 아니라 `isMutualFollow` RPC 결과로 별도 판정한다.

### 2.4 맞팔 판정 — `is_mutual_follow` RPC

> migration `061_query_optimization_functions.sql` §4

```sql
CREATE OR REPLACE FUNCTION is_mutual_follow(p_user_id UUID, p_target_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM follows f1
    INNER JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
    WHERE f1.follower_id = p_user_id AND f1.following_id = p_target_id
      AND f1.status = 'accepted' AND f2.status = 'accepted'
  );
$$ LANGUAGE sql STABLE;
```

- 단일 JOIN으로 양방향 `accepted` 여부를 1회 조회.
- `SupabaseFollowRepository.isMutualFollow`가 이 RPC를 호출한다.

### 2.5 팔로우 카운트 — `follow_counts` RPC

> migration `069_follow_counts_rpc.sql`

```sql
CREATE OR REPLACE FUNCTION follow_counts(p_user_id UUID)
RETURNS TABLE(followers BIGINT, following BIGINT, mutual BIGINT)
```

`followers / following / mutual` 3개 카운트를 1회 쿼리로 반환. `FollowRepository.getCounts`가 사용.

### 2.6 Realtime 구독

> migration `070_follows_realtime.sql` — `ALTER PUBLICATION supabase_realtime ADD TABLE follows`

`FollowRepository.subscribeToChanges(userId, onChange)` 인터페이스를 통해 `follower_id = userId` 또는 `following_id = userId` 변경을 실시간 수신한다. 팔로워/팔로잉 화면의 즉시 갱신용.

### 2.7 팔로우 이벤트 → XP / 알림

| 이벤트 | 알림 (수신자) | XP |
|--------|--------------|-----|
| 팔로우 요청 생성 (`follow()`) | `follow_request` → 대상 (단, `manual_approve` 정책 전용 — 아래 주석) | 요청자 +1 (일방 팔로우) — 상한 `XP_SYSTEM §4-3` |
| 맞팔 성립 | `follow_accepted` → 양쪽 (스펙) | 양쪽 +2 (스펙) / 현재 요청자만 (미구현 이슈) |
| 언팔로우 (`unfollow()`) | 없음 | 회수 없음 |

> ※ `follow_request` 알림은 `manual_approve` 정책 전용 알림이다. 현재 코드는 `auto_approve` 단일 흐름(요청 즉시 `accepted`)만 구현되어 있어 `follow_request` 발송은 이루어지지 않는다. `manual_approve` UI/수락 처리 미구현 — §11 구현 상태 테이블 참조.

> XP 상한 및 공식은 `XP_SYSTEM.md`에 위임.
> 알림 발송은 `application/helpers/send-notification.ts` → `NotificationRepository.createNotification`.

### 2.8 접근 레벨 (AccessLevel)

현재 코드(`follow.ts`): `'none' | 'following'` — 일방 팔로우 여부만 표현.
Nyam Network System 개념 스펙: `none | follow | mutual`. **맞팔 권한 분기는 UI 레이어에서 `isMutualFollow` 조회로 처리**한다.

`BubblerHero` 등 프로필 UI는 accessLevel=`none`일 때 닉네임/핸들/아바타/취향 태그를 마스킹한다(`Lv.N 유저`로 대체).

### 2.9 /followers 목록 페이지

- 컨테이너: `presentation/containers/followers-container.tsx`
- 훅: `application/hooks/use-follow-list-with-similarity.ts` (카운트 + 적합도 enrich)
- 탭: 팔로워 / 팔로잉 (`?tab=following` 쿼리로 초기 탭 제어)
- 기능: 목록 내 검색 + 전체 유저 DB 검색(2글자 이상) + `MiniProfilePopup` + `FollowButton` + `SimilarityIndicator`
- 정렬: `sortedBy` — 기본 최신, CF 적합도 정렬 옵션.

---

## 3. 프로필 공개 범위

> 이 섹션은 `AUTH.md §3`의 **SSOT를 교차 참조만** 한다. 정책의 원본 정의는 `AUTH.md` 우선.

### 3.1 공개 범위 (users.is_public)

- `true`: 모든 사용자에게 프로필/기록 공개, 누구나 팔로우 가능
- `false` (기본값): 비공개. 팔로우 관계 또는 같은 버블 멤버십으로만 접근

> 비공개(`is_public=false`)여도 버블 공유는 허용 — 버블 가입 자체가 공유 의사 표현. (AUTH.md §3-1)

### 3.2 가시성 토글 3계층 (JSONB)

> 우선순위: `bubble_members.visibility_override` > `users.visibility_bubble` > `users.visibility_public`

| 계층 | DB 필드 | 적용 대상 |
|------|---------|----------|
| 전체 공개 | `users.visibility_public` (JSONB) | `is_public=true`일 때 모든 조회자 |
| 버블 기본 | `users.visibility_bubble` (JSONB) | 모든 버블 멤버 기본값 |
| 버블별 커스텀 | `bubble_members.visibility_override` (JSONB) | 특정 버블에서만 덮어쓰기 |

7개 토글 키: `score`, `comment`, `photos`, `level`, `quadrant`, `bubbles`, `price`

기본값 (migration `002_users.sql` — `users` 테이블 최초 생성 시 JSONB 컬럼으로 정의):
- `visibility_public`: bubbles=false, price=false, 나머지 true
- `visibility_bubble`: 모두 true

> 주의: 047(`privacy_redesign`)은 `privacy_profile`/`privacy_records`를 제거하고 `is_public`/`follow_policy`를 도입하는 프라이버시 모델 재설계이며, `visibility_public`/`visibility_bubble` JSONB 컬럼 자체는 002에서 정의된 이후 스키마 변경 없이 유지된다(047에서 신규 도입이 아님).

### 3.3 기록 공개 범위 (RLS 기반)

records 테이블의 SELECT 권한은 아래 4개 RLS를 OR로 결합(§AUTH.md §4-5, migration 047 + 082):

| 정책 | 조건 |
|------|------|
| `records_own` | `user_id = auth.uid()` |
| `records_public` | 작성자 `is_public = true` |
| `records_bubble_member_read` | 같은 활성 버블 멤버의 기록 (033에서 도입, 082에서 스펙 정렬 재확인) |
| `records_followers` | `follows.status='accepted'` + 작성자 `follow_policy != 'blocked'` |

> ※ `082_security_hardening`에서 `records_bubble_shared` + `records_authenticated_read`를 정식 DROP. 현재 records SELECT는 위 4개 정책(`records_own`, `records_public`, `records_followers`, `records_bubble_member_read`)로 확정.
> `follow_policy` 변경(→ `blocked`) 시 기존 팔로워도 즉시 기록 접근 차단. (047의 의도)

### 3.4 버블러 프로필 — `/users/[id]`

- 컨테이너: `presentation/containers/bubbler-profile-container.tsx`
- 훅: `useBubblerProfile(authUserId, targetUserId, bubbleId)` + `useFollow` + `useFollowList` + `useSimilarity(currentUserId, targetUserId, category)` (category: `SimilarityCategory` = `'restaurant' | 'wine'`)
- 렌더 컴포넌트: `bubbler-hero`, `bubble-context-card`, `taste-profile`, `picks-grid`, `recent-records`, `activity-section`
- accessLevel 마스킹: `none`일 때 닉네임/핸들/아바타/태그 숨김
- 식당/와인 탭 분리 + CF 적합도 인디케이터

---

## 4. 댓글 시스템

### 4.1 테이블 구조

```
comments (006_social.sql + 080 + 081)
├── id              UUID PRIMARY KEY
├── target_type     VARCHAR(10)  CHECK (target_type IN ('record'))
├── target_id       UUID          -- record id
├── bubble_id       UUID NULL     -- 080: NULL 허용 (비버블 맥락)
├── parent_id       UUID NULL REFERENCES comments(id) ON DELETE CASCADE   -- 081: 대댓글
├── user_id         UUID
├── content         VARCHAR(300)
├── is_anonymous    BOOLEAN
└── created_at      TIMESTAMPTZ
```

인덱스:
- `idx_comments_target (target_type, target_id, bubble_id)` — 006
- `idx_comments_parent (parent_id)` — 081

### 4.2 타겟 유형

현재 도메인 엔티티는 `'record'` 단일 타겟만 지원(`domain/entities/comment.ts`, CHECK 제약 동일).
`Reaction`은 `'record' | 'comment'`이지만, Comment 타겟은 record로 한정.

### 4.3 비버블 댓글 — migration 080

식당/와인 상세페이지 등 버블 컨텍스트가 없는 곳에서 댓글을 허용한다. 전용 RLS 3종 추가:

| 정책 | 동작 | 조건 |
|------|------|------|
| `comments_non_bubble_read` | SELECT | `bubble_id IS NULL` + 인증된 사용자 |
| `comments_non_bubble_insert` | INSERT | `bubble_id IS NULL` + `user_id = auth.uid()` |
| `comments_non_bubble_delete` | DELETE | `bubble_id IS NULL` + 본인 댓글만 |

> 기존 `comments_bubble` 정책(버블 멤버 전용)과 `bubble_id` NULL 여부로 분기.

### 4.4 대댓글 thread — migration 081

- `parent_id` 컬럼 추가 (UUID, self-reference, `ON DELETE CASCADE`)
- 부모 삭제 시 자식 댓글도 자동 삭제
- `CommentRepository.create({ parentId? })`로 생성
- UI 훅(`use-comments.ts`): 부모 삭제 시 `parentId === commentId` 자식도 로컬 상태에서 제거 (CASCADE와 동기화)

대댓글 알림(`comment_reply`) 분기:
- `parentId` 있음 → 부모 댓글 작성자에게 알림
- `parentId` 없음 → 기록 작성자(`targetOwnerId`)에게 알림

> ※ `src/infrastructure/supabase/types.ts`는 081 이전 버전. `pnpm supabase:gen` 실행 후 `parent_id` 컬럼이 반영되어야 함.

### 4.5 작성자 표시 (닉네임 / 핸들)

`domain/entities/comment.ts`가 JOIN 결과를 포함한다:

```ts
authorNickname: string | null
authorHandle: string | null
authorAvatarColor: string | null
```

`is_anonymous = true`일 때 UI가 "익명" 표시로 마스킹.

### 4.6 댓글 시트 — `CommentSheetContainer`

- 경로: `presentation/containers/comment-sheet-container.tsx`
- 구성: 기록 리액션(good/bad, §5) + 댓글 목록(`CommentList`) + 답글 타겟팅(`replyTarget`) + 입력(`CommentInput`)
- 댓글별 좋아요: **로컬 토글만 구현** (DB 연동 미구현 — WORKLOG #53, #54 미완료)
- 콜백: `onCommentCountChange(delta)` / `onReactionChange(type, added)` — 호출자(기록 카드, 드릴다운)와 실시간 동기화

### 4.7 글자 수 제약

- DB: `VARCHAR(300)`
- 훅(`use-comments.ts`): `MAX_COMMENT_LENGTH = 300`, 초과 시 생성 거부

### 4.8 `bubbles.allow_comments` 토글 연동

버블 댓글 작성 가능 조건 = `bubbles.allow_comments = true` AND active 멤버. `bubbles.allow_comments = false`인 버블은 댓글 입력 UI를 비활성화한다.

- 읽기(SELECT)는 `allow_comments`와 무관하게 기존 RLS(버블 멤버 또는 비버블 NULL 경로)를 따른다.
- 쓰기(INSERT) 차단은 UI 레이어와 훅에서 선제 검증하고, DB RLS/트리거에서 동일 조건을 강제한다.
- 비버블 댓글(`bubble_id IS NULL`, §4.3)은 이 토글의 영향을 받지 않는다.

> 교차 참조: `AUTH.md §2-1`의 member 댓글 조건부 주석(`allow_comments` 게이팅).

---

## 5. 리액션 시스템

### 5.1 테이블 구조

```
reactions (006_social.sql + 079)
├── id              UUID
├── target_type     VARCHAR(10)  CHECK ('record' | 'comment')
├── target_id       UUID
├── reaction_type   VARCHAR(10)  CHECK ('good' | 'bad')          -- 079 변경
├── user_id         UUID
├── created_at      TIMESTAMPTZ
└── UNIQUE (target_type, target_id, reaction_type, user_id)
```

인덱스: `idx_reactions_target (target_type, target_id, reaction_type)` — 006.

### 5.2 good / bad 2종 (migration 079)

```sql
DELETE FROM reactions WHERE reaction_type NOT IN ('good', 'bad');
ALTER TABLE reactions ADD CONSTRAINT chk_reactions_type CHECK (reaction_type IN ('good', 'bad'));
```

아이콘/색상 매핑(`domain/entities/reaction.ts`):

| 타입 | icon | color |
|------|------|-------|
| `good` | thumbs-up | `var(--positive)` |
| `bad` | thumbs-down | `var(--negative)` |

### 5.3 상호 배타 & 자기 글 비활성화

`application/hooks/use-reactions.ts` `toggle()`:
- `good` 추가 시 기존 `bad`가 있으면 자동 해제 (반대 동일)
- 낙관적 업데이트 + 실패 시 롤백
- `targetOwnerId === userId`이면 비활성 (자기 글에 리액션 불가)
- 자기 글 판정은 `targetOwnerId` prop으로 호출자가 주입

### 5.4 실시간 동기화 (카드 ↔ 드릴다운)

- `CommentSheetContainer`의 `onReactionChange` 콜백을 호출자가 수신
- `restaurant-detail-container` / `wine-detail-container` / `all-record-card` 측에서 `syncReaction` 헬퍼로 카드 상태와 드릴다운 상태를 동기화
- 댓글 수도 `onCommentCountChange(+1/-1)`로 즉시 반영

### 5.5 리액션 → XP / 알림

| 이벤트 | 알림 | XP |
|--------|------|-----|
| `good` 추가 (본인 제외) | `reaction_like` → 기록 작성자 | 작성자 소셜 XP (일일 상한 §XP_SYSTEM) |
| `bad` / `good` 해제 | 알림/XP 없음 | — |

구현: `use-reactions.ts`에서 `awardSocialXp(targetOwnerId, 'good')` + `sendNotification({ type: 'reaction_like' })`.

### 5.6 구 5종(want/check/fire/like/bookmark) 이력

- 원본 CHECK: `'like', 'bookmark', 'want', 'check', 'fire'` (006 원본)
- 079 이전 데이터는 마이그레이션에서 전부 DELETE됨
- 북마크는 별도 `bookmarks` 테이블(`reactions`에서 분리)로 분리됨 — migration 049(분리), 063(`bookmarks` 유지, `lists` 제거)
- 관련 이력: 리액션 2종 교체(079) / 상세페이지 동기화(`syncReaction`)

> ※ `xp_log_changes.reason = 'social_like'`는 079 이후에도 하위호환 유지 (good 리액션 보상). 제거 금지.

---

## 6. 알림 시스템

### 6.1 테이블 구조

```
notifications (008_notifications.sql)
├── id                    UUID
├── user_id               UUID          -- 수신자
├── notification_type     VARCHAR(30)   -- 10종 CHECK
├── actor_id              UUID NULL     -- 행위자 (리액션 준 사람 등)
├── target_type           VARCHAR(20)   -- 'user' | 'record' | 'bubble' 등
├── target_id             UUID
├── bubble_id             UUID NULL     -- ON DELETE SET NULL
├── metadata              JSONB
├── is_read               BOOLEAN DEFAULT false
├── action_status         VARCHAR(10)   -- NULL | 'pending' | 'accepted' | 'rejected'
└── created_at            TIMESTAMPTZ
```

인덱스: `idx_notifications_user (user_id, is_read, created_at DESC)` — 008.

### 6.2 알림 유형 10종 (CHECK)

| 타입 | 수신자 | actor | hasAction | navigationTarget |
|------|--------|-------|-----------|------------------|
| `level_up` | 본인 | 시스템 | false | profile |
| `follow_request` | 팔로우 대상 | 요청자 | true | actor_profile |
| `follow_accepted` | 양쪽(스펙) | 수락자 | false | actor_profile |
| `bubble_invite` | 초대받은 유저 | 초대자 (owner/admin) | true | bubble_detail |
| `bubble_join_request` | 버블 owner | 신청자 | true | bubble_detail |
| `bubble_join_approved` | 신청자 | owner/admin | false | bubble_detail |
| `bubble_new_record` | 버블 멤버 | 기록자 | false | bubble_detail |
| `bubble_member_joined` | 버블 owner | 신규 멤버 | false | bubble_detail |
| `reaction_like` | 기록 작성자 | 리액션 유저 | false | record_detail |
| `comment_reply` | parentId 유무에 따라 택일 — parentId 있음: 부모 댓글 작성자 / parentId 없음: 기록 작성자 (§4.4 참조) | 댓글 유저 | false | record_detail |

> 매핑: `domain/entities/notification.ts` `NOTIFICATION_TYPE_CONFIG`
> DB CHECK: `008_notifications.sql` `chk_notif_type`

### 6.3 수신자 설정 매핑

`getNotifySettingField(type)` → `NotifySettingField`:

| 타입 | 설정 필드 |
|------|----------|
| `level_up` | `notifyLevelUp` |
| `bubble_*` (5종) | `notifyBubbleJoin` |
| `follow_*` (2종) | `notifyFollow` |
| `reaction_like`, `comment_reply` | `null` (마스터 `notifyPush`만 적용) |

### 6.4 버블 초대 관련 RLS (migration 065, 066)

버블 owner/admin이 자기 버블의 **대기 중인 초대 알림**을 관리할 수 있도록 RLS 추가.

| 정책 | 동작 | 조건 |
|------|------|------|
| `notif_read_bubble_invites` (065) | SELECT | `type='bubble_invite'` + `action_status='pending'` + owner/admin + active |
| `notif_delete_bubble_invites` (066) | DELETE | `actor_id=auth.uid()` + owner/admin + active (본인이 보낸 초대만 취소) |

용도: 버블 설정 페이지 "초대 수락 대기" 목록 표시 및 취소. `NotificationRepository.getPendingBubbleInvites(bubbleId)` 인터페이스가 이를 활용.

### 6.5 홈 헤더 드롭다운 UI

**별도 알림 페이지 없음.** 홈 헤더(AppHeader)의 알림 아이콘 클릭 시 드롭다운으로 최대 20개 표시 (`MAX_NOTIFICATIONS = 20`).

훅(`use-notifications.ts`) 제공 기능:
- `notifications` 목록 + `unreadCount`
- Realtime 구독 → 신규 알림 도착 시 자동 갱신 (`NotificationRepository.subscribeToNotifications`)
- `markAsRead(id)` / `markAllAsRead()`
- 선택 모드: `toggleSelectMode` / `toggleSelect` / `selectAll` / `deleteSelected`
- 수락/거절: `handleAction(id, 'accepted' | 'rejected')` → 알림 유형별 사이드 이펙트 자동 실행

### 6.6 수락/거절 사이드 이펙트

`executeNotificationSideEffect(notification, action, currentUserId)` — `use-notifications.ts`:

| 타입 | `accepted` | `rejected` |
|------|-----------|-----------|
| `bubble_join_request` | `bubble_members.status='active'` + 기본 share_rule + 신청자에게 `bubble_join_approved` | `bubble_members.status='rejected'` |
| `bubble_invite` | `bubble_members` 추가 (role=member, active) + 기본 share_rule + 초대자에게 `bubble_member_joined` | 아무 작업 없음 |

> `follow_request`의 수락/거절 사이드 이펙트(`follows.status` 변경)는 현재 미구현.

### 6.7 Realtime 구독

`NotificationRepository.subscribeToNotifications(userId, onNew)` — Supabase Realtime 기반으로 신규 알림 `INSERT` 이벤트를 수신. `use-notifications.ts`는 이 이벤트로 SWR 캐시(`['notifications', userId]`, `['unread-count', userId]`)를 mutate한다.

### 6.8 알림 생성 공통 진입점

모든 소셜 이벤트는 `application/helpers/send-notification.ts`의 `sendNotification()`을 통해 생성된다(fire-and-forget). 수신자의 `NotifyPreferences` 확인 후 `NotificationRepository.createNotification`을 호출.

---

## 7. 관련 테이블 요약 (DATA_MODEL 교차 참조)

| 테이블 | 생성 마이그레이션 | 이후 변경 |
|--------|------------------|----------|
| `follows` | 006_social.sql | 070(Realtime), 069(follow_counts RPC), 061(is_mutual_follow RPC) |
| `comments` | 006_social.sql | 080(비버블 허용), 081(parent_id 대댓글) |
| `reactions` | 006_social.sql | 079(good/bad 2종 교체) |
| `notifications` | 008_notifications.sql | 018(title/body), 043(insert policy), 065(invite read RLS), 066(invite delete RLS) |
| `records` (RLS만) | 003_records.sql | 047(is_public/follow_policy 기반 재설계), 082(security hardening — `records_bubble_shared`/`records_authenticated_read` DROP, `records_public`/`records_followers`/`records_bubble_member_read` 스펙 정렬) |

> 컬럼 상세는 `DATA_MODEL.md` 해당 절에 위임. 본 문서는 규칙/흐름만.

---

## 8. 관련 RPC / Edge Functions

| 이름 | 파일 | 역할 |
|------|------|------|
| `is_mutual_follow(p_user_id, p_target_id)` | 061 §4 | 맞팔 여부 단일 JOIN 판정 |
| `follow_counts(p_user_id)` | 069 | followers/following/mutual 3종 카운트 1회 쿼리 |
| Realtime: `follows` PUBLICATION | 070 | 팔로우 변경 실시간 브로드캐스트 |
| Realtime: `notifications` | (Supabase 기본) | `NotificationRepository.subscribeToNotifications` 경유 |

> Edge Functions(`supabase/functions/`) 중 소셜 전용은 없음. 계정 삭제(`process-account-deletion`)가 follows/bubble_members를 정리.

---

## 9. 도메인/레포지토리/훅 매핑

| 레이어 | 파일 | 역할 |
|--------|------|------|
| domain/entities | `follow.ts`, `comment.ts`, `reaction.ts`, `notification.ts` | R1 순수 타입 |
| domain/repositories | `follow-repository.ts`, `comment-repository.ts`, `reaction-repository.ts`, `notification-repository.ts` | 인터페이스 |
| infrastructure/repositories | `supabase-follow-repository.ts`, `supabase-comment-repository.ts`, `supabase-reaction-repository.ts`, `supabase-notification-repository.ts` | Supabase 구현체 (implements) |
| shared/di/container | `followRepo`, `commentRepo`, `reactionRepo`, `notificationRepo` | DI 조합 루트 |
| application/hooks | `use-follow`, `use-follow-list`, `use-follow-list-with-similarity`, `use-following-feed`, `use-comments`, `use-reactions`, `use-record-reactions`, `use-record-comment-counts`, `use-notifications` | 비즈니스 로직 |
| presentation/containers | `followers-container.tsx`, `bubbler-profile-container.tsx`, `comment-sheet-container.tsx` | UI 조합 |
| presentation/components | `follow/` (follow-button, mini-profile-popup), `bubble/` (comment-list, comment-input, reaction-buttons), `notification/` | 순수 UI |

---

## 10. RLS 정책 교차 참조

본 문서는 RLS **전체 정의를 복제하지 않는다**. AUTH.md의 해당 절을 우선 참조:

| 주제 | AUTH.md 절 |
|------|-----------|
| `users` (is_public, bubble 멤버) | §4-1 |
| `records` (own/public/bubble_shared/followers) | §4-5 |
| `follows` | §4-14 |
| `bubble_members` | §4-8 |
| `notifications` + bubble invite 예외 | §4-19 (008 + 043 + 065 + 066) |
| `comments` + 비버블 예외 | §4-9 (006 + 080) |

프라이버시 설계 원칙 전문은 `AUTH.md §3` 참조.

---

## 11. 구현 상태/설계 이슈

| 항목 | 상태 | 근거 |
|------|------|------|
| `conditional` 팔로우 자동 판정 | 미구현 | 초기 스펙, Nyam Network §9 |
| 역팔로우 자동 허용 | 미구현 (개념만 존재) | Nyam Network §2.1 |
| AccessLevel 3단계(`none`/`follow`/`mutual`) | 미구현 (현재 2단계 `'none' \| 'following'` + `isMutualFollow` RPC로 대체) | `domain/entities/follow.ts`, §2.8 |
| 맞팔 XP 양쪽 부여 | 미구현 (현재 요청자만) | `use-follow`, `use-social-xp` |
| `follows_following_update` RLS | manual_approve RLS는 존재하나 UI 미구현 (dead RLS 후보) | AUTH.md §4-14 |
| `follow_request` 수락/거절 사이드 이펙트 | 미구현 | `use-notifications.ts`에 분기 없음 |
| 댓글별 좋아요 DB 연동 | 미구현 (로컬 토글만) | WORKLOG #54 "미완료" |
| 팔로워/팔로잉 페이지 | 구현 완료 | `followers-container.tsx` |
| 상세 페이지 "모든 기록" 섹션 통합 | 구현 완료 | WORKLOG #54 |
| 리액션 good/bad 2종 교체 | 구현 완료 | migration 079, WORKLOG #53 |
| 대댓글 thread | 구현 완료 | migration 081, WORKLOG #54 |
| 비버블 댓글 RLS | 구현 완료 | migration 080, WORKLOG #54 |
| 리액션 카드↔드릴다운 실시간 동기화 | 구현 완료 | `syncReaction`, WORKLOG #54 |
| 맞팔 전용 탭/리스트 | 미구현 (`follow_counts.mutual` 카운트 및 `isMutualFollow` RPC만 존재, 전용 화면 없음) | §2.4, §2.5 |
| `supabase/types.ts` 재생성 필요 | 081 이후 (`parent_id` 미반영) — `pnpm supabase:gen` 실행 대기 | §4.4 |

---

## 12. 관련 시스템 문서

| 문서 | 관계 |
|------|------|
| `AUTH.md` | 팔로우 정책 원본, RLS 정의, 프라이버시 계층 3 |
| `DATA_MODEL.md` | 테이블 컬럼 상세 (§4 social) |
| `XP_SYSTEM.md` | 소셜 XP 공식, 일일 상한, 어뷰징 방지 |
| `BUBBLE_SYSTEM.md` | 버블 생애주기, 자동 공유, 랭킹, 역할 |
| `RECOMMENDATION.md` | 팔로잉/버블 기반 추천, CF 적합도 |

---

## 13. 개념문서 흡수 이력

- `_archive/개념문서_원본/Nyam Network System.md` — 본 문서 §1, §2.2, §2.7, §2.8, §3, §11 전반에 흡수. 3-시스템 순환 고리, 접근 레벨(AccessLevel), 미구현 이슈 테이블.
- 기타 팔로우/댓글/리액션 전용 개념문서는 `_archive/` 내 미식별.
