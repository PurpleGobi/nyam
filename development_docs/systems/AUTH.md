# AUTH — 인증 & 권한

> affects: ONBOARDING, BUBBLE, PROFILE, SETTINGS, 모든 API

---

## 1. 인증

### 소셜 로그인
- **Google** (Primary)
- **카카오**
- **네이버**
- **Apple** (iOS 필수)

### Supabase Auth 설정
- Provider: Google, Kakao, Naver, Apple
- 가입 시 `users` 테이블에 자동 row 생성 (trigger + callback 이중 안전장치)
- 닉네임: 소셜 계정 이름 자동 설정 (최대 20자, 나중에 변경 가능)
- 기본 닉네임 폴백: `name` → `full_name` → `preferred_username` → `'냠유저'`
- Google은 `access_type: 'offline'`, `prompt: 'consent'` 옵션 적용

### 인증 흐름 (OAuth PKCE)

```
1. LoginButtons에서 provider 선택
2. signInWithProvider() → Supabase OAuth redirect
3. 소셜 로그인 완료 → /auth/callback?code=... 리다이렉트
4. 서버: exchangeCodeForSession(code) → 세션 생성
5. 프로필 존재 확인 → 없으면 users 테이블에 INSERT (트리거 미작동 시 안전장치)
6. 홈(/)으로 리다이렉트
```

### 세션 관리

- **Middleware** (`src/middleware.ts`): 모든 요청에서 Supabase SSR 클라이언트로 세션 유지
- **AuthProvider** (`src/presentation/providers/auth-provider.tsx`): 클라이언트 React Context
  - `getUser()` + `getSession()`으로 초기화
  - `onAuthStateChange()` 구독으로 실시간 상태 동기화
  - 제공: `user`, `session`, `isLoading`, `signOut()`
- **AuthGuard** (`src/presentation/guards/auth-guard.tsx`): `(main)` 레이아웃에서 인증 보호

### 공개 라우트 (인증 불필요)

- `/auth/login`
- `/auth/callback`
- `/onboarding`
- `/design-system`
- `/bubbles/invite`

### 구현 파일

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

> DB: `bubble_members.role` — `'owner' | 'admin' | 'member' | 'follower'`
> DB: `bubble_members.status` — `'pending' | 'active' | 'rejected'`

| 역할 | 기록 공유 | 댓글 | 리액션 | 피드 열람 | 멤버 관리 | 초대 | 버블 설정 | 버블 삭제 |
|------|----------|------|--------|----------|----------|------|----------|----------|
| owner | O | O | O | 전체 | 승인/거절/제거 | O | 전체 | O |
| admin | O | O | O | 전체 | 승인/거절 | O | X | X |
| member | O | 조건부* | O | 전체 | X | X | X | X |
| follower | X | X | X | 제한적** | X | X | X | X |

> \* member의 댓글 권한은 `bubbles.allow_comments` 설정에 따라 결정.
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

> DB: `bubbles.join_policy`

| 정책 | 공개 | 가입 방식 |
|------|------|----------|
| `invite_only` | 비공개 | 초대 링크/직접 초대만 |
| `closed` | 공개 | 팔로우만 (가입 안 받음, 이름+점수만 열람) |
| `manual_approve` | 공개 | 가입 신청 → 관리자 승인/거절 |
| `auto_approve` | 공개 | 기준 충족 시 자동 가입 (`min_records`, `min_level`) |
| `open` | 공개 | 누구나 즉시 가입 |

---

## 3. 프라이버시 계층

> 상세 매트릭스 → `pages/11_SETTINGS.md` §2~§6

### 3-0. 검색 & 팔로우 정책

| 항목 | 정책 | 근거 |
|------|------|------|
| **유저 검색** | 자유 (인증 사용자 누구나) | 버블 초대, 팔로우에 필수. `is_public`과 무관하게 검색 가능 (RLS: `users_authenticated_search`) |
| **팔로우** | `follow_policy`에 따라 차단/자동승인/승인제/조건부 | §3-2 참조 |
| **프로필 열람** | `is_public` + 팔로우 관계에 따라 제한 | §3-1 참조 |
| **기록 열람** | `is_public` + 팔로우 관계 + 버블 공유에 따라 제한 | §3-1 참조 |

> **설계 원칙**: "기본은 비공개, 허용한 관계에만 열린다". 검색은 자유, 콘텐츠 접근은 관계 기반.

### 3-1. 공개 범위

> DB: `users.is_public` (BOOLEAN, 기본 false)

| 값 | 의미 |
|----|------|
| `true` | 모든 사용자에게 프로필/기록 공개, 누구나 팔로우 가능 |
| `false` (기본값) | 비공개. 팔로우 정책(`follow_policy`)에 따라 허용된 팔로워 + 버블 공유만 접근 |

> **참고**: `is_public = false`여도 버블 공유는 허용. 버블 가입 자체가 공유 허용 의사 표현이므로.

### 3-2. 팔로우 허용 정책

> DB: `users.follow_policy` (VARCHAR(20), 기본 'blocked')

| 값 | 의미 |
|----|------|
| `blocked` | 팔로우 불가 (비공개 + 팔로우 차단) |
| `auto_approve` | 팔로우 요청 즉시 수락 |
| `manual_approve` | 팔로우 요청 대기 → 유저가 승인/거절 |
| `conditional` | 조건 충족 시 자동 수락, 미충족 시 대기 |

> `is_public = true`이면 `follow_policy` 무시 (누구나 자유 팔로우).
> `conditional`일 때 조건: `follow_min_records` (최소 기록 수), `follow_min_level` (최소 레벨). NULL이면 해당 조건 없음.

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

### 3-4. 버블 콘텐츠 노출

> DB: `bubbles.content_visibility`

| 값 | 멤버 | 비멤버 (상세 L9) |
|----|------|-----------------|
| `rating_only` (UI: 일방향) | 전체 (점수+한줄평+사진+메뉴) | 점수만 |
| `rating_and_comment` (UI: 양방향) | 전체 | 점수 + 한줄평 |

### 3-5. 핵심 원칙

- 비공개(`is_public = false`)여도 버블 공유는 허용 (버블 가입 자체가 허용 의사)
- `follow_policy = 'blocked'`이면 팔로우 불가, 기존 팔로워에게도 기록 비공개 (RLS `records_followers`에서 차단)
- 동반자 정보(`records.companions`)는 **무조건 비공개** (나만 열람, 토글 없음)
- 추천 알고리즘은 설정과 무관하게 **내 모든 기록을 내부적으로 사용**
- 식당/와인 상세 **익명 집계**(평균 점수, 사분면 분포)에는 항상 포함

---

## 4. RLS 정책

> 전체 25개 테이블에 RLS 활성화. **총 60개 정책**.
> 기본 구현: `supabase/migrations/012_rls.sql` (55개)
> 추가: `025_bubble_owner_read_policy.sql` (+1), `033_bubble_member_read_rls.sql` (+2), `042_users_search_policy.sql` (+1), `043_notifications_insert_policy.sql` (+1)
> 수정: `034_rls_security_fixes.sql` (bm_insert_self 교체 + 보안 트리거)

### 4-1. users (4 정책)
| 정책 | 동작 | 조건 | 구현 |
|------|------|------|------|
| `users_own` | ALL | `id = auth.uid()` | 012 |
| `users_public` | SELECT | `is_public = true` | 047 |
| `users_bubble` | SELECT | `NOT is_public` + 같은 버블 active 멤버 | 047 |
| `users_authenticated_search` | SELECT | 인증된 사용자 (`auth.uid() IS NOT NULL`) — 버블 멤버 초대 시 유저 검색용 | 042 |

> **주의**: `users_authenticated_search`(042)는 `is_public` 무관하게 모든 인증 사용자에게 SELECT 허용. 이로 인해 `users_public`/`users_bubble`의 프라이버시 필터링은 RLS 레벨에서 사실상 무력화됨. 프로필 공개 범위 제한은 **application layer**에서 쿼리 조건 또는 SELECT 컬럼 제한으로 구현 필요.

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

### 4-5. records (5 정책)
| 정책 | 동작 | 조건 | 구현 |
|------|------|------|------|
| `records_own` | ALL | `user_id = auth.uid()` | 012 |
| `records_public` | SELECT | 작성자 `is_public = true` | 047 |
| `records_bubble_shared` | SELECT | `bubble_shares` 경유 공유된 기록 (privacy 조건 없음) | 047 |
| `records_followers` | SELECT | 팔로워(`follows.status='accepted'`) + 작성자 `follow_policy != 'blocked'` | 047 |
| `records_bubble_member_read` | SELECT | 같은 버블 active 멤버의 기록 열람 | 033 |

> **주의**: `companions`, `private_note` 필드는 RLS(row-level)로는 컬럼 단위 제한이 불가하여, SELECT 통과 시 다른 사용자에게도 노출될 수 있음. 비공개 처리는 **application layer**에서 구현 필요 (§3-5 "동반자 정보 무조건 비공개" 원칙).

### 4-6. record_photos (3 정책)
| 정책 | 동작 | 조건 | 구현 |
|------|------|------|------|
| `record_photos_own` | ALL | 소유 record의 사진 | 012 |
| `record_photos_read` | SELECT | records RLS 통과한 기록의 사진 | 012 |
| `record_photos_bubble_member_read` | SELECT | 같은 버블 active 멤버의 기록 사진 열람 | 033 |

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
| `bm_insert_self` | INSERT | 본인 가입 + **role은 member/follower만** (RLS에 `pending` 포함이나 DB CHECK `chk_bm_role`가 차단) | 034 (012 교체) |
| `bm_update_self` | UPDATE | 본인 상태 변경 | 012 |
| `bm_update_admin` | UPDATE | owner/admin이 멤버 관리 | 012 |
| `bm_delete_self` | DELETE | 본인 탈퇴 | 012 |
| `bm_delete_admin` | DELETE | owner/admin이 멤버 제거 | 012 |

### 4-9. bubble_shares (3 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `bubble_share_read` | SELECT | active 멤버 |
| `bubble_share_insert` | INSERT | 본인 기록 + active 멤버(owner/admin/member) (privacy 조건 없음) |
| `bubble_share_delete` | DELETE | 공유자 본인만 |

### 4-10. comments (1 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `comments_bubble` | ALL | active 멤버 (owner/admin/member) |

### 4-11. reactions (2 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `reactions_own` | ALL | `user_id = auth.uid()` |
| `reactions_read` | SELECT | 인증된 사용자 (카운트 표시용) |
> INSERT 시 버블 멤버십 검증은 application layer에서 처리.

### 4-12. bubble_share_reads (2 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `bsr_own` | ALL | 본인 읽음 기록 |
| `bsr_read_member` | SELECT | 같은 버블 active 멤버 |

### 4-13. bubble_ranking_snapshots (2 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `brs_read_member` | SELECT | active 멤버 |
| `brs_read_public` | SELECT | public 버블 |

### 4-14. follows (3 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `follows_follower` | ALL | `follower_id = auth.uid()` (팔로우/취소) |
| `follows_following_read` | SELECT | `following_id = auth.uid()` (내게 온 팔로우 확인) |
| `follows_following_update` | UPDATE | `following_id = auth.uid()` (승인/거절) |

### 4-15. user_experiences (3 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `ue_own` | ALL | 본인 |
| `ue_read_public` | SELECT | public 프로필 사용자의 XP |
| `ue_read_bubble` | SELECT | 같은 버블 멤버의 XP |

### 4-16. xp_histories (1 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `xp_own` | ALL | 본인만 |

### 4-17. 읽기 전용 참조 테이블 (2 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `lt_select` | SELECT (level_thresholds) | 인증된 사용자 |
| `milestones_select` | SELECT (milestones) | 인증된 사용자 |

### 4-18. user_milestones (2 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `um_own` | ALL | 본인 |
| `um_read_public` | SELECT | public 프로필 사용자 |

### 4-19. notifications (2 정책)
| 정책 | 동작 | 조건 | 구현 |
|------|------|------|------|
| `notif_own` | ALL | 본인만 | 012 |
| `notif_create_for_others` | INSERT | 인증 + `actor_id = auth.uid()` (버블 초대/가입 요청 등 타인에게 알림 생성) | 043 |

### 4-20. nudge (2 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `nudge_history_own` | ALL (nudge_history) | 본인만 |
| `nudge_fatigue_own` | ALL (nudge_fatigue) | 본인만 |

### 4-21. wishlists (1 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `wishlists_own` | ALL | 본인만 |

### 4-22. saved_filters (1 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `saved_filters_own` | ALL | 본인만 |

### 4-23. ai_recommendations (1 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `ai_rec_own` | ALL | 본인만 |

### 4-24. 보안 트리거 & 함수 (034_rls_security_fixes.sql)

| 보안 조치 | 유형 | 설명 |
|----------|------|------|
| `bm_insert_self` 교체 | RLS 정책 | INSERT 시 role을 `member`, `follower`로 제한 (owner/admin 자기 부여 방지). RLS에 `pending` 포함이나 DB CHECK `chk_bm_role`에 의해 무효 |
| `prevent_role_self_promotion()` | BEFORE UPDATE 트리거 | 자기 자신의 role 변경 차단 (admin/owner가 타인 변경은 허용, service_role도 허용) |
| `increment_user_total_xp()` | 함수 | 클라이언트(auth.uid() != NULL): delta 0~500 제한. service_role(Edge Function): 제한 없음 |

### RLS 정책 요약

| 테이블 | 정책 수 | 핵심 규칙 |
|--------|---------|----------|
| users | 4 | 본인 전체, public/bubble_only SELECT, 인증 사용자 검색 |
| restaurants | 3 | 인증된 사용자 읽기/쓰기 |
| wines | 3 | 인증된 사용자 읽기/쓰기 |
| grape_variety_profiles | 1 | 읽기 전용 참조 |
| records | 5 | 본인 전체, privacy 기반 타인 열람, 버블 멤버 열람 |
| record_photos | 3 | 본인 전체, records RLS 경유, 버블 멤버 열람 |
| bubbles | 6 | public/private/owner SELECT, owner 수정/삭제 |
| bubble_members | 7 | 멤버/public 읽기, 본인 가입(role 제한), admin 관리 |
| bubble_shares | 3 | 멤버 읽기, 본인 공유/삭제 |
| comments | 1 | 버블 멤버(owner/admin/member) |
| reactions | 2 | 본인 전체, 인증 사용자 읽기 |
| bubble_share_reads | 2 | 본인 전체, 멤버 읽기 |
| bubble_ranking_snapshots | 2 | 멤버/public 읽기 |
| follows | 3 | 팔로워 전체, 팔로잉 읽기/승인 |
| user_experiences | 3 | 본인 전체, public/bubble 읽기 |
| xp_histories | 1 | 본인만 |
| level_thresholds | 1 | 읽기 전용 |
| milestones | 1 | 읽기 전용 |
| user_milestones | 2 | 본인 전체, public 읽기 |
| notifications | 2 | 본인 전체, 인증 사용자 알림 생성(actor=self) |
| nudge_history | 1 | 본인만 |
| nudge_fatigue | 1 | 본인만 |
| wishlists | 1 | 본인만 |
| saved_filters | 1 | 본인만 |
| ai_recommendations | 1 | 본인만 |
| **합계** | **60** | |

---

## 5. 계정 삭제

> prototype: `development_docs/prototype/05_settings.html` (DeleteAccountSheet)
> 구현: `supabase/functions/process-account-deletion/index.ts`

### DB 필드
| 필드 | 설명 |
|------|------|
| `users.deleted_at` | 삭제 요청 시점 (NULL이면 활성 계정) |
| `users.delete_mode` | `'anonymize'` / `'hard_delete'` |
| `users.delete_scheduled_at` | 영구 삭제 예정 시점 (`deleted_at + 30일`) |

### 삭제 모드
| 모드 | 동작 |
|------|------|
| 기록 익명화 (기본) | 닉네임 → "탈퇴한 사용자", 개인정보 삭제. 기록은 익명으로 집계에 유지 |
| 기록 완전 삭제 | 모든 기록, 관련 데이터, Auth 계정 삭제. 복구 불가 |

### 삭제 시 처리

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

**Hard Delete (완전 삭제)**:
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
| 9 | wishlists |
| 10 | records |
| 11 | nudge_history |
| 12 | nudge_fatigue |
| 13 | users |
| 14 | `auth.admin.deleteUser()` — Supabase Auth 계정 삭제 |

> **FK Cascade**: `record_photos`, `bubble_shares`는 `records(id) ON DELETE CASCADE`로 함께 삭제. `bubble_share_reads`는 `bubble_shares(id) ON DELETE CASCADE`로 연쇄 삭제.
> **미삭제**: `saved_filters`, `ai_recommendations`가 `users(id)` FK를 참조하지만 hard_delete에서 삭제하지 않음 (잠재적 FK violation).
> **미구현**: owner인 버블의 다음 admin 이전 (현재 bubble_members 삭제 시 owner 없는 버블이 남을 수 있음).

---

## 6. 보안 원칙

- SECURITY DEFINER 함수 사용 금지 (RLS 우회 방지) — auth trigger도 `SECURITY INVOKER`
- API 키/토큰 클라이언트 노출 금지 (클라이언트 허용: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_KAKAO_JS_KEY`)
- 외부 API 키는 Edge Function 환경변수로만 관리 (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` 등)
- 사용자 위치 데이터는 서버에 저장하지 않음 (클라이언트에서만 사용)
- 가시성 필드 필터링(`visibility_public`, `visibility_bubble`, `visibility_override`)은 application layer에서 처리
- 역할 자기 승격 방지: BEFORE UPDATE 트리거 (`prevent_role_self_promotion()`)
- 역할 자기 부여 방지: INSERT RLS에서 role을 `member`/`follower`로 제한 (DB CHECK가 `pending` role 차단)
- XP 조작 방지: 클라이언트 delta 0~500 제한 (`increment_user_total_xp()`)
- 미들웨어에서 모든 비공개 라우트 인증 확인 (`src/middleware.ts`)
