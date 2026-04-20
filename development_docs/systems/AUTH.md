<!-- updated: 2026-04-20 -->
<!-- migration baseline: 083 -->
<!-- depends_on: DATA_MODEL -->
<!-- affects: BUBBLE_SYSTEM, SOCIAL_SYSTEM, RECORD_SYSTEM -->

# AUTH — 인증 & 권한

> 모든 인증 · 권한 · 프라이버시 · RLS의 SSOT. 다른 시스템 문서에서 참조하는 절번호(§1~§6)를 유지한다.
> affects: ONBOARDING, BUBBLE, PROFILE, SETTINGS, 모든 API
> depends_on: `DATA_MODEL.md` (테이블 · 컬럼 · CHECK · FK)
> referenced by: `BUBBLE_SYSTEM.md §2-3, §3, §4, §6, §8` / `SOCIAL_SYSTEM.md §2, §3, §4, §6` / `RECORD_SYSTEM.md §1, §4-5 (인용)`

---

## 1. 인증

### 1-1. 소셜 로그인

- **Google** (Primary)
- **카카오**
- **네이버**
- **Apple** (iOS 필수)

### 1-2. Supabase Auth 설정

- Provider: Google, Kakao, Naver, Apple
- 가입 시 `users` 테이블에 자동 row 생성 (trigger + callback 이중 안전장치)
- 닉네임: 소셜 계정 이름 자동 설정 (최대 20자, 나중에 변경 가능)
- 기본 닉네임 폴백: `name` → `full_name` → `preferred_username` → `'냠유저'`
- Google은 `access_type: 'offline'`, `prompt: 'consent'` 옵션 적용

### 1-3. 인증 흐름 (OAuth PKCE)

```
1. LoginButtons에서 provider 선택
2. signInWithProvider() → Supabase OAuth redirect
3. 소셜 로그인 완료 → /auth/callback?code=... 리다이렉트
4. 서버: exchangeCodeForSession(code) → 세션 생성
5. 프로필 존재 확인 → 없으면 users 테이블에 INSERT (트리거 미작동 시 안전장치)
6. 홈(/)으로 리다이렉트
```

### 1-4. 세션 관리

- **Middleware** (`src/middleware.ts`): 모든 요청에서 Supabase SSR 클라이언트로 세션 유지
- **AuthProvider** (`src/presentation/providers/auth-provider.tsx`): 클라이언트 React Context
  - `getUser()` + `getSession()`으로 초기화
  - `onAuthStateChange()` 구독으로 실시간 상태 동기화
  - 제공: `user`, `session`, `isLoading`, `signOut()`
- **AuthGuard** (`src/presentation/guards/auth-guard.tsx`): **`(main)` 레이아웃에서만** 인증 보호. `auth/`, `onboarding/`, `design-system/`, `bubbles/invite/` 등 `(main)` 외 라우트 그룹은 AuthGuard가 걸리지 않으므로 각 페이지/레이아웃에서 개별 처리한다.

### 1-5. 공개 라우트 (인증 불필요)

- `/auth/login`
- `/auth/callback`
- `/design-system`
- `/bubbles/invite/[code]`

> `/onboarding`은 **인증은 필수**(로그인 완료 후 진입)이지만 `(main)` 그룹 밖이라 AuthGuard가 걸리지 않는다. 온보딩 완료 여부는 `users.onboarding_completed_at`/관련 필드로 라우트 내부에서 판별하며, 미로그인 상태로 직접 접근 시에는 페이지/컨테이너 레벨에서 `/auth/login`으로 리다이렉트한다. 따라서 엄밀한 의미의 "공개 라우트"에는 포함하지 않는다.

### 1-6. 구현 파일

| 컴포넌트 | 파일 |
|----------|------|
| Supabase 브라우저 클라이언트 | `src/infrastructure/supabase/client.ts` |
| Supabase 서버 클라이언트 | `src/infrastructure/supabase/server.ts` |
| Auth 서비스 (signIn/signOut) | `src/infrastructure/supabase/auth-service.ts` |
| Auth 매퍼 (Supabase→Domain) | `src/infrastructure/supabase/auth-mapper.ts` |
| Domain 엔티티 | `src/domain/entities/auth.ts` (`AuthUser`, `AuthSession`, `AuthProvider`) |
| User 엔티티 | `src/domain/entities/user.ts` (`User`, `PrivacyProfile`, `VisibilityConfig`) |
| Settings 엔티티 | `src/domain/entities/settings.ts` (`UserSettings`, `DeleteMode`) |
| Auth Provider (React Context) | `src/presentation/providers/auth-provider.tsx` |
| Auth Guard | `src/presentation/guards/auth-guard.tsx` |
| Login Buttons UI | `src/presentation/components/auth/login-buttons.tsx` |
| useAuthActions Hook | `src/application/hooks/use-auth-actions.ts` |
| DI Container (auth 재수출) | `src/shared/di/container.ts`, `src/shared/di/auth-mappers.ts` |
| 미들웨어 | `src/middleware.ts` |
| 로그인 페이지 | `src/app/auth/login/page.tsx` |
| OAuth 콜백 | `src/app/auth/callback/route.ts` |
| Auth 트리거 | `supabase/migrations/013_auth_trigger.sql` |

---

## 2. 권한 모델

### 2-1. 버블 역할

> DB: `bubble_members.role` — `'owner' | 'admin' | 'member' | 'follower'` (CHECK `chk_bm_role`)
> DB: `bubble_members.status` — `'pending' | 'active' | 'rejected'` (CHECK `chk_bm_status`)

| 역할 | 기록 공유 | 댓글 | 리액션 | 피드 열람 | 멤버 관리 | 초대 | 버블 설정 | 버블 삭제 |
|------|----------|------|--------|----------|----------|------|----------|----------|
| owner | O | O | O | 전체 | 승인/거절/제거 | O | 전체 | O |
| admin | O | O | O | 전체 | 승인/거절 | O | X | X |
| member | O | 조건부* | O | 전체 | X | X | X | X |
| follower | X | X | X | 제한적** | X | X | X | X |

> \* member의 댓글 권한은 `bubbles.allow_comments` 설정에 따라 결정. 토글 정의는 `BUBBLE_SYSTEM.md §4-3`, 행위 RLS는 `§4-9` 참조.
> \*\* follower는 피드 읽기만 가능 (`canReadFeed: true`, `canReadFullFeed: false`).
> `closed` 정책 버블에서는 이름+점수만 열람 가능.

구현: `src/domain/services/bubble-permission-service.ts` — `calculatePermissions()`, `canChangeRole()`

### 2-2. owner 전용 설정 항목

> prototype: `development_docs/prototype/04_bubbles_detail.html` (screen-bubble-settings)

| 그룹 | 항목 | DB 필드 |
|------|------|---------|
| 기본 정보 | 버블 이름, 설명, 집중 유형(전체/식당/와인), 지역, 공개 범위(공개/비공개) | `name`, `description`, `focus_type`, `area`, `visibility` |
| 외관 | 아이콘, 아이콘 배경색 | `icon`, `icon_bg_color` |
| 콘텐츠 | 유형(일방향/양방향), 댓글 허용, 외부 공유 허용, 버블 규칙 | `content_visibility`, `allow_comments`, `allow_external_share`, `rules` |
| 가입 조건 | 가입 정책, 최소 기록 수, 최소 레벨, 최대 인원 | `join_policy`, `min_records`, `min_level`, `max_members` |
| 검색 노출 | 탐색 노출 여부, 검색 키워드 | `is_searchable`, `search_keywords` |
| 초대 | 초대 코드, 초대 만료일 | `invite_code`, `invite_expires_at` |
| 멤버 관리 | 대기 중 승인/거절, 멤버 제거 | `bubble_members.status`, `bubble_members.role` |
| 버블 통계 | 팔로워 수, 멤버 수, 총 기록, 평균 만족도, 주간 기록수, 전주 기록수, 고유 대상 수, 최근 활동일 | 읽기 전용 (`follower_count`, `member_count`, `record_count`, `avg_satisfaction`, `weekly_record_count`, `prev_weekly_record_count`, `unique_target_count`, `last_activity_at`) |
| 위험 영역 | 버블 삭제 | 전체 데이터 영구 삭제 |

### 2-3. 버블 가입 정책

> DB: `bubbles.join_policy` — 상세 플로우는 `BUBBLE_SYSTEM.md §3`

| 정책 | 공개 | 가입 방식 |
|------|------|----------|
| `invite_only` | 비공개 | 초대 링크/직접 초대만 |
| `closed` | 공개 | 팔로우만 (가입 안 받음). follower 열람 범위 상세는 `BUBBLE_SYSTEM.md §2-3` 참조 |
| `manual_approve` | 공개 | 가입 신청 → 관리자 승인/거절. **버블 `manual_approve`는 정상 구현** (가입 신청/승인/거절 플로우 — `BUBBLE_SYSTEM.md §2-2` 참조). 팔로우의 `users.follow_policy = 'manual_approve'`와는 별개이며, 팔로우 쪽은 UI 미구현(`SOCIAL_SYSTEM.md §2.2` 참조) |
| `auto_approve` | 공개 | 기준 충족 시 자동 가입 (`min_records`, `min_level`) |
| `open` | 공개 | 누구나 즉시 가입 |

---

## 3. 프라이버시 계층

> 상세 매트릭스 → `_archive/pages/11_SETTINGS.md §2~§6`

### 3-0. 검색 & 팔로우 정책

| 항목 | 정책 | 근거 |
|------|------|------|
| **유저 검색** | 자유 (인증 사용자 누구나) | 버블 초대, 팔로우에 필수. `is_public`과 무관하게 검색 가능 (RLS: `users_authenticated_search`) |
| **팔로우** | `follow_policy`에 따라 차단/자동승인/승인제/조건부 | §3-2 참조 |
| **프로필 열람** | `is_public` + 팔로우 관계에 따라 제한 | §3-1 참조 |
| **기록 열람** | `is_public` + 팔로우 관계 + 버블 멤버십에 따라 제한 | §3-1, §4-5 참조 |

> **설계 원칙**: "기본은 비공개, 허용한 관계에만 열린다". 검색은 자유, 콘텐츠 접근은 관계 기반.

### 3-1. 공개 범위

> DB: `users.is_public` (BOOLEAN, 기본 false) — `047_privacy_redesign.sql`

| 값 | 의미 |
|----|------|
| `true` | 모든 사용자에게 프로필/기록 공개, 누구나 팔로우 가능 |
| `false` (기본값) | 비공개. 팔로우 정책(`follow_policy`)에 따라 허용된 팔로워 + 같은 버블 멤버만 접근 |

> **참고**: `is_public = false`여도 같은 버블 멤버에게는 기록이 열린다(`records_bubble_member_read`, §4-5). 버블 가입 자체가 공유 허용 의사 표현이므로.

### 3-2. 팔로우 허용 정책

> DB: `users.follow_policy` (VARCHAR(20), 기본 'blocked') — CHECK `chk_follow_policy`

| 값 | 의미 |
|----|------|
| `blocked` | 팔로우 불가 (비공개 + 팔로우 차단) |
| `auto_approve` | 팔로우 요청 즉시 수락 |
| `manual_approve` | 팔로우 요청 대기 → 유저가 승인/거절 |
| `conditional` | 조건 충족 시 자동 수락, 미충족 시 대기 |

> `is_public = true`이면 `follow_policy` 무시 (누구나 자유 팔로우).
> `conditional`일 때 조건: `follow_min_records` (최소 기록 수), `follow_min_level` (최소 레벨). NULL이면 해당 조건 없음.
> `blocked`로 변경하면 기존 팔로워에게도 기록 비공개 (`records_followers`에서 `follow_policy != 'blocked'` 필터).
> **구현 상태**: `conditional`의 조건 필드(`follow_min_records`, `follow_min_level`) 체크는 **미구현**. 현재는 조건과 무관하게 무조건 `pending` 처리 — 상세는 `SOCIAL_SYSTEM.md §2.2` 참조.
> **알림/XP 연계**: 팔로우 승인 시 발행되는 `follow_accepted` 알림과 관련 XP 이벤트 처리 상세는 `SOCIAL_SYSTEM.md §2.7`(알림), `§6.2`(XP) 참조.

### 3-3. 가시성 토글 3계층

```
우선순위: 버블별 커스텀 > 버블 기본 토글 > 전체 공개 토글
```

| 계층 | DB 필드 | 적용 대상 |
|------|---------|----------|
| 전체 공개 | `users.visibility_public` (JSONB) | 모든 사용자 (public 시) |
| 버블 기본 | `users.visibility_bubble` (JSONB) | 모든 버블 멤버 기본값 |
| 버블별 커스텀 | `bubble_members.visibility_override` (JSONB) | 특정 버블에서만 적용 |

토글 대상 7개 키: `score`, `comment`, `photos`, `level`, `quadrant`, `bubbles`, `price`

> RLS(row-level)는 컬럼 단위 제한이 불가하므로, 가시성 토글은 **application layer**에서 필드 필터링으로 적용한다. SELECT 자체는 §4-1/§4-5 RLS로 막는다.
> **구현 상태**: 현재 가시성 필터링은 application layer의 `follow-access` 서비스에서 수행한다. DB RPC `get_visible_fields`는 스펙만 존재하며 **미구현** — 세 계층(`visibility_public` / `visibility_bubble` / `visibility_override`)의 병합 우선순위를 서비스 레벨에서 해석하고 있다.

### 3-4. 버블 콘텐츠 노출

> DB: `bubbles.content_visibility`

| 값 | 멤버 | 비멤버 (상세 L9) |
|----|------|-----------------|
| `rating_only` (UI: 일방향) | 전체 (점수+한줄평+사진+메뉴) | 점수만 |
| `rating_and_comment` (UI: 양방향) | 전체 | 점수 + 한줄평 |

### 3-5. 핵심 원칙

- 비공개(`is_public = false`)여도 같은 버블 멤버에게는 기록 열람 허용 (버블 가입 자체가 공유 의사)
- `follow_policy = 'blocked'`이면 팔로우 불가, 기존 팔로워에게도 기록 비공개 (RLS `records_followers`에서 차단)
- 동반자 정보(`records.companions`)는 **무조건 비공개** (나만 열람, 토글 없음) — application layer 필터링
- `private_note`, `companions` 필드는 SELECT 통과 시 컬럼이 노출될 수 있으므로 **application layer**에서 제거 필수
- 추천 알고리즘은 설정과 무관하게 **내 모든 기록을 내부적으로 사용**
- 식당/와인 상세 **익명 집계**(평균 점수, 사분면 분포)에는 항상 포함

---

## 4. RLS 정책

> 전체 RLS 활성 테이블에 대한 정책 목록. **기준 스냅샷: migration 083 적용 후**.
> 기본 구현: `012_rls.sql` · 이후 증분: `025, 033, 034, 042, 043, 047, 048, 053, 060, 063, 065, 066, 067, 068, 071, 076, 078, 080, 082, 083`

> **Storage RLS 정책 정리 (082)**: `storage.objects`의 LIST 정책 3개(`Public read access for avatars`, `Public read access for record photos`, `Anyone can view record photos`)가 `082_security_hardening.sql`에서 제거되었다. 버킷은 public을 유지하므로 공개 URL(`getPublicUrl`) 직접 접근은 계속 동작하고, 익명 LIST(`storage.objects` SELECT)만 차단된다. 업로드/삭제는 기존 소유자 정책을 따른다.

> **삭제된 테이블** (더 이상 RLS 관리 대상 아님):
> - `bubble_shares` — `068_drop_bubble_shares.sql`로 제거. 큐레이션은 `bubble_items`로 이관
> - `bubble_share_reads` — 068에서 CASCADE 제거
> - `bookmarks` — `063_drop_bookmarks.sql`로 제거. 찜 기능은 버블 큐레이션으로 대체

### 4-1. users (4 정책)
| 정책 | 동작 | 조건 | 구현 |
|------|------|------|------|
| `users_own` | ALL | `id = auth.uid()` | 012 |
| `users_public` | SELECT | `is_public = true` | 047 |
| `users_bubble` | SELECT | `NOT is_public` + 같은 버블 active 멤버 | 047 |
| `users_authenticated_search` | SELECT | 인증된 사용자 (`auth.uid() IS NOT NULL`) — 버블 멤버 초대 시 유저 검색용 | 042 |

> **주의**: `users_authenticated_search`(042)는 `is_public` 무관하게 모든 인증 사용자에게 SELECT 허용. 이로 인해 `users_public`/`users_bubble`의 프라이버시 필터링은 RLS 레벨에서 사실상 무력화됨. 프로필 공개 범위 제한은 **application layer**에서 쿼리 조건 또는 SELECT 컬럼 제한으로 구현 필요.
> **구현 위치**: `src/domain/services/follow-access.ts` (공개 범위·팔로우 관계 기반 필드/행 필터링 — `SOCIAL_SYSTEM.md §9` 매핑).

### 4-2. restaurants (3 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `restaurants_select` | SELECT | 인증된 사용자 |
| `restaurants_insert` | INSERT | 인증된 사용자 |
| `restaurants_update` | UPDATE | 인증된 사용자 |
> 공개 데이터 — 인증만 되면 읽기/쓰기 가능.

### 4-3. wines (3 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `wines_select` | SELECT | 인증된 사용자 |
| `wines_insert` | INSERT | 인증된 사용자 |
| `wines_update` | UPDATE | 인증된 사용자 |

### 4-4. grape_variety_profiles (1 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `gvp_select` | SELECT | 인증된 사용자 (읽기 전용 참조) |

### 4-5. records (4 정책)
| 정책 | 동작 | 조건 | 구현 |
|------|------|------|------|
| `records_own` | ALL | `user_id = auth.uid()` | 012 |
| `records_public` | SELECT | 작성자 `is_public = true` | 047 → 082 재작성 |
| `records_followers` | SELECT | 팔로워(`follows.status='accepted'`) + 작성자 `follow_policy != 'blocked'` | 047 → 082 재작성 |
| `records_bubble_member_read` | SELECT | 같은 버블 active 멤버의 기록 열람 | 033 → 082 재작성 |

> **이력 1 — `records_authenticated_read` 제거 (082)**: 과거 존재했던 `records_authenticated_read` (qual=true, 인증 사용자 전원 SELECT 허용) 정책은 `private_note`/`purchase_price` 등 민감 컬럼이 전 사용자에게 노출되는 이슈로 `082_security_hardening.sql`에서 제거되었다. 이후 SELECT는 위 4개 정책(`records_own` + public/followers/bubble_member_read) 조합으로만 허용된다.
> **이력 2 — `records_bubble_shared` 제거 (082)**: `068_drop_bubble_shares.sql`에서 `bubble_items.record_id` 기반으로 재작성된 뒤 `077`에서 `record_id` 컬럼이 사라져 dead policy였던 `records_bubble_shared`는 082에서 `DROP POLICY`로 정리되었다. 같은 버블 멤버의 기록 열람은 `records_bubble_member_read`가 커버한다.
> **주의**: `companions`, `private_note` 필드는 RLS로 컬럼 단위 제한이 불가하여, SELECT 통과 시 다른 사용자에게도 노출될 수 있음. 비공개 처리는 **application layer**에서 구현 필요 (§3-5 원칙).

### 4-6. record_photos (5 정책)
| 정책 | 동작 | 조건 | 구현 |
|------|------|------|------|
| `record_photos_own` | ALL | 소유 record의 사진 | 012 |
| `record_photos_read` | SELECT | records RLS 통과한 기록의 사진 | 012 |
| `record_photos_bubble_member_read` | SELECT | 같은 버블 active 멤버의 기록 사진 열람 | 033 |
| `record_photos_public_read` | SELECT | `is_public = true`인 유저의 기록 사진 | 048 |
| `record_photos_followers_read` | SELECT | 팔로워 기록 사진 + `follow_policy != 'blocked'` | 048 |

### 4-7. bubbles (6 정책)
| 정책 | 동작 | 조건 | 구현 |
|------|------|------|------|
| `bubble_public` | SELECT | `visibility = 'public'` | 012 |
| `bubble_private` | SELECT | `visibility = 'private'` + active 멤버 | 012 |
| `bubble_owner_read` | SELECT | `created_by = auth.uid()` (생성 직후 INSERT→SELECT 허용) | 025 |
| `bubble_insert` | INSERT | 인증 + `created_by = auth.uid()` | 012 |
| `bubble_update` | UPDATE | owner만 | 012 |
| `bubble_delete` | DELETE | owner만 | 012 |

### 4-8. bubble_members (7 정책)
| 정책 | 동작 | 조건 | 구현 |
|------|------|------|------|
| `bm_read_member` | SELECT | 같은 버블 active 멤버 | 012 |
| `bm_read_public` | SELECT | public 버블의 멤버 목록 | 012 |
| `bm_insert_self` | INSERT | 본인 가입 + role 제한(§6-3 참조) | 060 (034 → 060 교체) |
| `bm_update_self` | UPDATE | 본인 상태 변경 | 012 |
| `bm_update_admin` | UPDATE | owner/admin이 멤버 관리 | 012 |
| `bm_delete_self` | DELETE | 본인 탈퇴 | 012 |
| `bm_delete_admin` | DELETE | owner/admin이 멤버 제거 | 012 |

> `bm_insert_self`는 `034_rls_security_fixes.sql`에서 `role IN ('member','follower','pending')`로 제한했으나, 버블 생성 직후 owner가 자기 자신을 `addMember(role='owner')`로 등록해야 하는 플로우가 RLS에 막혔다. `060_fix_bm_insert_owner.sql`이 "본인이 `created_by`인 버블에 한해 owner/admin INSERT 허용"하는 특례를 추가하여 해결. 자세한 CHECK는 §6-3 참조.

### 4-9. comments (4 정책)
| 정책 | 동작 | 조건 | 구현 |
|------|------|------|------|
| `comments_bubble` | ALL | `bubble_id`가 본인 active 버블에 속함 (owner/admin/member) | 012 |
| `comments_non_bubble_read` | SELECT | `bubble_id IS NULL` + 인증 사용자 | 080 |
| `comments_non_bubble_insert` | INSERT | `bubble_id IS NULL` + `user_id = auth.uid()` | 080 |
| `comments_non_bubble_delete` | DELETE | `bubble_id IS NULL` + 본인 댓글 | 080 |

> `080_comments_allow_non_bubble.sql`: 식당/와인 상세페이지 등 **버블 외 맥락**에서 댓글을 허용. `bubble_id IS NULL` 행은 누구나 읽기/본인 생성/본인 삭제.
> `081_comments_parent_id.sql`: 대댓글 thread용 `parent_id UUID REFERENCES comments(id) ON DELETE CASCADE` 컬럼 추가. RLS 영향 없음 (부모가 삭제되면 FK CASCADE로 자식도 삭제).

### 4-10. reactions (2 정책)
| 정책 | 동작 | 조건 | 구현 |
|------|------|------|------|
| `reactions_own` | ALL | `user_id = auth.uid()` | 012 |
| `reactions_read` | SELECT | 인증된 사용자 (카운트 표시용) | 012 |

> `079_reaction_type_good_bad.sql`: `chk_reactions_type`가 `('like','bookmark','want','check','fire')` → `('good','bad')`로 교체되고 기존 데이터는 삭제됨.
> RLS 자체는 변경 없음. good/bad 상호배타(한쪽 누르면 다른 쪽 해제)는 **application layer**에서 강제한다 — DB의 `UNIQUE(target_type, target_id, reaction_type, user_id)`는 같은 유저가 good과 bad를 동시에 가지는 것을 막지 않는다.
> INSERT 시 버블 멤버십 검증은 application layer에서 처리 (`useReactions`).

### 4-11. bubble_ranking_snapshots (2 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `brs_read_member` | SELECT | active 멤버 |
| `brs_read_public` | SELECT | public 버블 |

### 4-12. bubble_items (5 정책)

> `053_bubble_items.sql`에서 도입, `068`에서 `bubble_shares` 대체, `071/074/076/077/078`에서 컬럼·트리거 단순화. 현재 스키마: `(id, bubble_id, target_id, target_type, added_at)`.

| 정책 | 동작 | 조건 | 구현 |
|------|------|------|------|
| `bubble_items_select_members` | SELECT | 같은 버블 active 멤버 | 053 |
| `bubble_items_select_followers` | SELECT | public 버블의 follower | 053 |
| `bubble_items_insert_members` | INSERT | active 멤버 (owner/admin/member) | 053 |
| `bubble_items_update_members` | UPDATE | active 멤버 (owner/admin/member) — upsert 지원 | 071 |
| `bubble_items_delete` | DELETE | active 멤버 (owner/admin/member) | 078 (053 → 076 → 078 교체) |

> `078_drop_bubble_items_added_by.sql`에서 `added_by` 컬럼이 제거되면서 개인 소유 개념이 사라지고, DELETE는 "활성 멤버(member 이상)면 삭제 가능"으로 단순화되었다. 보안 수준 변경 인지 필요: 기존 "본인이 추가한 항목만 삭제" → "활성 멤버면 삭제 가능".

### 4-13. bubble_photos (3 정책)

> `067_bubble_photos.sql`

| 정책 | 동작 | 조건 |
|------|------|------|
| `bubble_photos_select` | SELECT | 버블 active 멤버 또는 public 버블 |
| `bubble_photos_insert` | INSERT | `uploaded_by = auth.uid()` + 버블 active 멤버 |
| `bubble_photos_delete` | DELETE | 업로더 본인 또는 owner |

### 4-14. follows (3 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `follows_follower` | ALL | `follower_id = auth.uid()` (팔로우/취소) |
| `follows_following_read` | SELECT | `following_id = auth.uid()` (내게 온 팔로우 확인) |
| `follows_following_update` | UPDATE | `following_id = auth.uid()` (승인/거절) |

> `follow_policy`에 따른 자동/수동/조건 처리는 application layer(`useFollow`, `follows.status`).
> `070_follows_realtime.sql`에서 Supabase Realtime publication 등록 (RLS 변경 없음).

### 4-15. xp_totals (3 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `ue_own` | ALL | 본인 |
| `ue_read_public` | SELECT | `is_public = true` 사용자의 XP |
| `ue_read_bubble` | SELECT | 같은 버블 멤버의 XP |

> 구 테이블명 `user_experiences` → `xp_totals`로 리네이밍 (DATA_MODEL §12-3, XP_SYSTEM §12-3). 정책명은 과거 접두사(`ue_`) 유지.

### 4-16. xp_log_changes (1 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `xp_own` | ALL | 본인만 |

> 구 테이블명 `xp_histories` → `xp_log_changes` (DATA_MODEL §12-4, XP_SYSTEM §12-4).

### 4-17. 읽기 전용 참조 테이블 (2 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `lt_select` | SELECT (xp_seed_levels) | 인증된 사용자 |
| `milestones_select` | SELECT (xp_seed_milestones) | 인증된 사용자 |

> 구 테이블명 `level_thresholds` → `xp_seed_levels` (XP_SYSTEM §12-5), `milestones` → `xp_seed_milestones` (XP_SYSTEM §12-6).

### 4-18. xp_log_milestones (2 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `um_own` | ALL | 본인 |
| `um_read_public` | SELECT | `is_public = true` 사용자 |

> 구 테이블명 `user_milestones` → `xp_log_milestones` (XP_SYSTEM §12-7).

### 4-19. notifications (4 정책)
| 정책 | 동작 | 조건 | 구현 |
|------|------|------|------|
| `notif_own` | ALL | 본인만 | 012 |
| `notif_create_for_others` | INSERT | 인증 + `actor_id = auth.uid()` (버블 초대/가입 요청 등 타인에게 알림 생성) | 043 |
| `notif_read_bubble_invites` | SELECT | 버블 owner/admin active 멤버가 자기 버블의 `bubble_invite` pending 알림 조회 | 065 |
| `notif_delete_bubble_invites` | DELETE | 본인이 보낸(`actor_id = auth.uid()`) `bubble_invite` pending을 owner/admin이 취소 | 066 |

### 4-20. nudge (2 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `nudge_history_own` | ALL (nudge_history) | 본인만 |
| `nudge_fatigue_own` | ALL (nudge_fatigue) | 본인만 |

### 4-21. saved_filters (1 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `saved_filters_own` | ALL | 본인만 |

### 4-22. ai_recommendations (1 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `ai_rec_own` | ALL | 본인만 |

### 4-23. restaurant_enrichment (1 정책)

> `083_restaurant_enrichment.sql` — 회원 리뷰 없는 식당용 외부 정보 AI 요약 + 사진 캐시 테이블. 공개 참조 데이터.

| 정책 | 동작 | 조건 | 구현 |
|------|------|------|------|
| `restaurant_enrichment_read_all` | SELECT | `USING (true)` — anon/authenticated 모두 허용 | 083 |

> INSERT/UPDATE/DELETE는 별도 정책을 두지 않아 authenticated/anon에 대해 기본 DENY. Edge Function의 `service_role`은 RLS를 bypass하므로 쓰기 전담.
> 원문 저장 금지(저작권) 및 TTL 30일 정책은 `083_restaurant_enrichment.sql` 헤더 주석 참조.

### 4-24. RLS 정책 요약

| 테이블 | 정책 수 | 핵심 규칙 |
|--------|---------|----------|
| users | 4 | 본인 전체, public/bubble_only SELECT, 인증 사용자 검색 |
| restaurants | 3 | 인증된 사용자 읽기/쓰기 |
| wines | 3 | 인증된 사용자 읽기/쓰기 |
| grape_variety_profiles | 1 | 읽기 전용 참조 |
| records | 4 | 본인 전체, public/팔로워/버블 멤버 SELECT (082에서 `records_authenticated_read`, `records_bubble_shared` 제거) |
| record_photos | 5 | 본인 전체, records RLS 경유, 버블 멤버/public/팔로워 읽기 |
| bubbles | 6 | public/private/owner SELECT, owner 수정/삭제 |
| bubble_members | 7 | 멤버/public 읽기, 본인 가입(role 제한 + owner 특례), admin 관리 |
| comments | 4 | 버블 맥락 + 비버블 맥락(bubble_id NULL) |
| reactions | 2 | 본인 전체, 인증 사용자 읽기 |
| bubble_ranking_snapshots | 2 | 멤버/public 읽기 |
| bubble_items | 5 | 멤버 SELECT/INSERT/UPDATE/DELETE + public follower SELECT |
| bubble_photos | 3 | 멤버 또는 public SELECT, 본인 INSERT, 본인/owner DELETE |
| follows | 3 | 팔로워 전체, 팔로잉 읽기/승인 |
| xp_totals | 3 | 본인 전체, public/bubble 읽기 |
| xp_log_changes | 1 | 본인만 |
| xp_seed_levels | 1 | 읽기 전용 |
| xp_seed_milestones | 1 | 읽기 전용 |
| xp_log_milestones | 2 | 본인 전체, public 읽기 |
| notifications | 4 | 본인 전체, 타인 INSERT, 버블 초대 읽기/삭제 |
| nudge_history | 1 | 본인만 |
| nudge_fatigue | 1 | 본인만 |
| saved_filters | 1 | 본인만 |
| ai_recommendations | 1 | 본인만 |
| restaurant_enrichment | 1 | 전체 SELECT (공개 참조), 쓰기는 service_role 전용 |
| **합계** | **69** | — |

> 과거 `060` 이전 스냅샷(정책 60개)과 비교해 증가한 주요 원인: `record_photos`(+2, 048), `bubble_items`(+5, 053~078), `bubble_photos`(+3, 067), `notifications`(+2, 065/066), `comments`(+3, 080). 082에서 `records`가 5→4로 감소(authenticated_read, bubble_shared 제거). 083에서 `restaurant_enrichment`(+1) 신규.

---

## 5. 계정 삭제

> prototype: `development_docs/prototype/05_settings.html` (DeleteAccountSheet)
> 구현: `supabase/functions/process-account-deletion/index.ts`

### 5-1. DB 필드
| 필드 | 설명 |
|------|------|
| `users.deleted_at` | 삭제 요청 시점 (NULL이면 활성 계정) |
| `users.delete_mode` | `'anonymize'` / `'hard_delete'` |
| `users.delete_scheduled_at` | 영구 삭제 예정 시점 (`deleted_at + 30일`) |

### 5-2. 삭제 모드
| 모드 | 동작 |
|------|------|
| 기록 익명화 (기본) | 닉네임 → "탈퇴한 사용자", 개인정보 삭제. 기록은 익명으로 집계에 유지 |
| 기록 완전 삭제 | 모든 기록, 관련 데이터, Auth 계정 삭제. 복구 불가 |

### 5-3. 삭제 시 처리

**공통 (모든 모드)**:
1. `users.deleted_at = NOW()`, `delete_scheduled_at = NOW() + 30일`
2. 30일 유예 (복구 가능 — `cancelAccountDeletion()`)
3. 30일 후 Edge Function이 크론(매일 00:30 UTC)으로 자동 처리

**Anonymize (기록 익명화)**:
| 처리 대상 | 동작 |
|----------|------|
| users 테이블 | `nickname` → "탈퇴한 사용자", `email`/`bio`/`avatar_url`/`avatar_color`/`taste_summary`/`taste_tags` → NULL |
| follows | 양방향 삭제 (`follower_id`, `following_id`) |
| bubble_members | 삭제 (모든 버블에서 탈퇴) |
| notifications | 삭제 |
| records | **유지** (익명화된 user에 연결, 집계에 포함) |
| delete_mode/delete_scheduled_at | NULL로 초기화 |

**Hard Delete (완전 삭제)** — 아래 순서로 삭제:
| 삭제 순서 | 테이블 |
|----------|--------|
| 1 | notifications |
| 2 | xp_histories |
| 3 | user_experiences |
| 4 | user_milestones |
| 5 | reactions |
| 6 | comments |
| 7 | follows (양방향) |
| 8 | bubble_members |
| 9 | records |
| 10 | nudge_history |
| 11 | nudge_fatigue |
| 12 | users |
| 13 | `auth.admin.deleteUser()` — Supabase Auth 계정 삭제 |

> **FK Cascade**: `record_photos`는 `records(id) ON DELETE CASCADE`로 함께 삭제. `comments.parent_id`도 CASCADE.
> **`comments.user_id` FK 동작**: `006_social.sql` 기준 `user_id UUID REFERENCES users(id)`로 선언되어 ON DELETE 절이 **명시되지 않음**(Postgres 기본값 = `NO ACTION`). 즉 users를 먼저 삭제하려 하면 FK violation이 나므로, Hard Delete 순서(§5-3)에서 반드시 `comments`(6단계) → `users`(12단계) 순으로 선삭제해야 한다. CASCADE/SET NULL이 필요하다면 별도 마이그레이션으로 명시적으로 바꿀 것.
> **미삭제**: `saved_filters`, `ai_recommendations`가 `users(id)` FK를 참조하지만 hard_delete에서 삭제하지 않음 (잠재적 FK violation).
> **미구현**: owner인 버블의 다음 admin 이전 (현재 bubble_members 삭제 시 owner 없는 버블이 남을 수 있음).
> **반영**: `bubble_shares`, `bookmarks`는 테이블 자체가 제거되어 삭제 대상에서 빠짐 (기존 목록에서 제외).

---

## 6. 보안 원칙 & 트리거

### 6-1. 전역 원칙

- SECURITY DEFINER 함수는 트리거 전용(`trg_*`)에만 사용. RLS 우회용 RPC는 금지 — auth trigger도 `SECURITY INVOKER`
- API 키/토큰 클라이언트 노출 금지 (클라이언트 허용: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_KAKAO_JS_KEY`)
- 외부 API 키는 Edge Function 환경변수로만 관리 (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` 등)
- 사용자 위치 데이터는 서버에 저장하지 않음 (클라이언트에서만 사용)
- 가시성 필드 필터링(`visibility_public`, `visibility_bubble`, `visibility_override`)은 application layer에서 처리
- 미들웨어에서 모든 비공개 라우트 인증 확인 (`src/middleware.ts`)

### 6-2. 역할 자기 승격 방지

> `034_rls_security_fixes.sql`

- BEFORE UPDATE 트리거 `prevent_role_self_promotion()` on `bubble_members`
- 자기 자신(`OLD.user_id = auth.uid()`)의 `role` 변경 시도는 예외 발생 (`Cannot change your own role`)
- admin/owner가 **타인의 role** 변경은 허용 (`OLD.user_id != auth.uid()`)
- `service_role`(Edge Function, `auth.uid() IS NULL`)도 허용
- 이 트리거는 RLS가 컬럼 단위 제한을 할 수 없는 한계를 보완한다 (`BUBBLE_SYSTEM.md §2-3, §8`에서 참조)

### 6-3. 역할 자기 부여 방지 (INSERT)

> `034_rls_security_fixes.sql` → `060_fix_bm_insert_owner.sql`

`bm_insert_self` RLS 정책의 `WITH CHECK` 조건:

```sql
user_id = auth.uid()
AND (
  role IN ('member', 'follower', 'pending')      -- 일반 가입
  OR (
    role IN ('owner', 'admin')                   -- owner 특례
    AND bubble_id IN (SELECT id FROM bubbles WHERE created_by = auth.uid())
  )
)
```

- 일반 유저: `member`/`follower`만 본인 INSERT 가능 (`pending`은 RLS에는 포함되나 DB CHECK `chk_bm_role`가 차단하므로 실효 없음)
- **owner 특례 (060)**: 본인이 `created_by`인 버블에 한해 owner/admin 역할로 본인을 INSERT 허용 — 버블 생성 직후 `createBubble` → `addMember(role='owner')` 플로우를 위한 것
- 이 특례가 없으면 owner가 자기 버블에 가입할 수 없어 RLS 거부됨 (034의 부작용을 060이 수정)

### 6-4. XP 조작 방지

> `034_rls_security_fixes.sql`

`increment_user_total_xp(p_user_id, p_xp_delta)`:
- 클라이언트(`auth.uid() IS NOT NULL`): `p_xp_delta`를 0~500으로 제한. 범위 벗어나면 `RAISE EXCEPTION`.
- `service_role`(Edge Function): 제한 없음 (크론 보정, 대량 이벤트 대응)

### 6-5. 트리거 SECURITY DEFINER & search_path 잠금

> `074_fix_bubble_item_trigger_security.sql`, `078_cf_trigger_with_pg_net.sql`, `082_security_hardening.sql`

- `trg_update_bubble_item_stats`, `trg_update_bubble_member_item_stats`, `trg_cleanup_bubble_items_on_record_delete`, `trg_cleanup_bubble_items_on_member_leave`: RLS가 활성화된 `bubbles`/`bubble_members` 테이블을 통계 집계 목적으로 UPDATE해야 하므로 `SECURITY DEFINER` + `SET search_path = public`
- `trg_notify_cf_update` (최초 `078_cf_trigger_with_pg_net.sql`, **082에서 재작성**): `records` INSERT/UPDATE/DELETE 시 `extensions.http_post`로 `compute-similarity` Edge Function을 비동기 호출. 하드코딩 JWT 대신 `current_setting('app.service_role_key', true)` + `current_setting('app.supabase_url', true)` GUC 패턴으로 변경. **GUC 미설정 시 트리거가 무음 종료**(`RETURN COALESCE(NEW, OLD)`)하여 INSERT/UPDATE 자체는 막지 않지만 CF 동기화가 유실되므로 주의. 키 회전 후 `ALTER DATABASE postgres SET app.service_role_key TO '<new key>'` 재실행 필요. `SECURITY DEFINER` + `SET search_path = public, pg_temp, extensions`
- 이 트리거는 사용자 호출이 아닌 시스템 트리거에 한정되므로 RLS 우회가 아닌 집계 캐시 유지/외부 이벤트 전파 용도 — `SECURITY DEFINER` 전역 금지 원칙의 예외 (§6-1)
- 트리거별 상세 동작은 `BUBBLE_SYSTEM.md §6, §8` 참조

#### 6-5-1. search_path 잠금 (082)

> `082_security_hardening.sql` — Supabase advisor의 "Function Search Path Mutable" 권고 대응. 19개 함수에 `SET search_path = public, pg_temp` (`trg_notify_cf_update`은 `public, pg_temp, extensions`)를 일괄 적용하여 public 스키마 hijacking 벡터를 차단.

대상 함수 (SECURITY DEFINER 포함 혼재):

| 분류 | 함수 |
|------|------|
| XP / 경험치 | `refresh_active_xp()`, `increment_user_total_xp(uuid, integer)`, `upsert_user_experience(uuid, varchar, varchar, integer, integer)`, `trg_update_user_record_count_v2()` |
| 버블 / 권한 트리거 | `prevent_role_self_promotion()`, `trg_notify_cf_update()` (SECURITY DEFINER) |
| 팔로우 | `trg_update_follow_counts()`, `is_mutual_follow(uuid, uuid)`, `follow_counts(uuid)` |
| 식당 / 지오 | `sync_restaurant_geom()`, `sync_restaurant_prestige_cache()`, `normalize_restaurant_name(text)`, `upsert_crawled_restaurants(jsonb)`, `restaurants_within_radius(double precision, double precision, integer)` |
| 홈 필터 RPC | `filter_home_restaurants(...)`, `filter_home_wines(...)` |
| 지도 bounds 검색 RPC | `search_restaurants_in_bounds(...)`, `search_restaurants_bounds_simple(...)`, `search_restaurants_bounds_auth(...)`, `search_restaurants_bounds_source(...)` |

- SECURITY INVOKER 함수(기본)는 호출자 권한으로 실행되므로 search_path 잠금이 컬럼·테이블 참조 무결성 보장에 집중됨
- SECURITY DEFINER 함수(트리거 `trg_notify_cf_update` 등)는 owner 권한으로 실행되므로 search_path 잠금이 **권한 상승 벡터 차단**에 직접 기여

### 6-6. 뷰 SECURITY INVOKER 전환 (082)

- `bubble_expertise` 뷰: `SECURITY DEFINER` → `WITH (security_invoker = true)`로 재생성. 뷰 참조 시 호출자의 RLS(`bubble_members`, `xp_totals`)가 적용되도록 보장하여, 비멤버가 다른 버블의 전문성 집계를 역추적하지 못하게 한다. 정의는 `082_security_hardening.sql` 참조.
