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
- 가입 시 `users` 테이블에 자동 row 생성 (trigger)
- 닉네임: 소셜 계정 이름 자동 설정 (나중에 변경 가능)

---

## 2. 권한 모델

### 2-1. 버블 역할

> DB: `bubble_members.role` — `'owner' | 'admin' | 'member' | 'follower'`

| 역할 | 기록 공유 | 댓글/리액션 | 멤버 관리 | 버블 설정 | 버블 삭제 |
|------|----------|------------|----------|----------|----------|
| owner | O | O | 승인/거절/제거 | 전체 (기본정보, 가입조건, 검색노출) | O |
| admin | O | O | 승인/거절 | X | X |
| member | O | O | X | X | X |
| follower | X (읽기만) | X | X | X | X |

> `follower`는 public 버블에 가입하지 않고 팔로우만 한 상태.
> `closed` 정책 버블에서는 이름+점수만 열람 가능.

### 2-2. owner 전용 설정 항목

> prototype: `prototype/bubbles_detail.html` (screen-bubble-settings)

| 그룹 | 항목 | 비고 |
|------|------|------|
| 기본 정보 | 버블 이름, 설명, 유형(양방향/일방향) | `bubbles.content_visibility` |
| 가입 조건 | 가입 승인 필요, 최소 기록 수, 최소 레벨, 최대 인원 | `join_policy`, `min_records`, `min_level`, `max_members` |
| 검색 노출 | 탐색 노출 여부, 검색 키워드 | `is_searchable`, `search_keywords` |
| 멤버 관리 | 대기 중 승인/거절, 멤버 제거 | `bubble_members.status` |
| 버블 통계 | 총 기록, 멤버 수, 주간 활성도, 평균 만족도, 주간 추이 차트 | 읽기 전용 (트리거/크론 갱신) |
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

> 상세 매트릭스 → `pages/SETTINGS.md` §2~§6

### 3-1. 프로필 공개 범위

> DB: `users.privacy_profile`

| 값 | 의미 |
|----|------|
| `public` | 모든 사용자에게 프로필 공개, 팔로우 가능 |
| `bubble_only` (기본값) | 같은 버블 멤버만 프로필 열람 |
| `private` | 나만 열람, 버블 공유 불가 |

### 3-2. 기록 공개 범위

> DB: `users.privacy_records`

| 값 | 의미 |
|----|------|
| `all` | 프로필 방문자에게 전체 기록 공개 |
| `shared_only` (기본값) | 버블에 공유한 기록만 해당 멤버에게 노출 |

> `privacy_profile = 'private'`이면 프로필 자체가 비공개이므로 기록도 접근 불가.
> `privacy_records`에 별도 `'private'` 값은 없음 (DATA_MODEL 참조).

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

- `privacy_profile = 'private'` → 어떤 버블이든 **공유 자체 차단** (프로필 비공개 = 공유 불가)
- 동반자 정보(`records.companions`)는 **무조건 비공개** (나만 열람, 토글 없음)
- 추천 알고리즘은 설정과 무관하게 **내 모든 기록을 내부적으로 사용**
- 식당/와인 상세 **익명 집계**(평균 점수, 사분면 분포)에는 항상 포함

---

## 4. RLS 정책

> 전체 25개 테이블에 RLS 활성화. **총 48개 정책**.
> 구현: `supabase/migrations/012_rls.sql`

### 4-1. users (3 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `users_own` | ALL | `id = auth.uid()` |
| `users_public` | SELECT | `privacy_profile = 'public'` |
| `users_bubble` | SELECT | `privacy_profile = 'bubble_only'` + 같은 버블 active 멤버 |

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
| 정책 | 동작 | 조건 |
|------|------|------|
| `records_own` | ALL | `user_id = auth.uid()` |
| `records_public` | SELECT | 작성자 `privacy_records='all'` + `privacy_profile='public'` |
| `records_bubble_all` | SELECT | 작성자 `privacy_records='all'` + `privacy_profile!='private'` + 같은 버블 |
| `records_bubble_shared` | SELECT | 작성자 `privacy_profile!='private'` + `bubble_shares` 경유 공유된 기록 |

> `companions` 필드는 `records_own` 정책에 의해 **본인만 열람 가능** (무조건 비공개).

### 4-6. record_photos (2 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `record_photos_own` | ALL | 소유 record의 사진 |
| `record_photos_read` | SELECT | records RLS 통과한 기록의 사진 |

### 4-7. bubbles (5 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `bubble_public` | SELECT | `visibility = 'public'` |
| `bubble_private` | SELECT | `visibility = 'private'` + active 멤버 |
| `bubble_insert` | INSERT | 인증 + `created_by = auth.uid()` |
| `bubble_update` | UPDATE | owner만 |
| `bubble_delete` | DELETE | owner만 |

### 4-8. bubble_members (7 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `bm_read_member` | SELECT | 같은 버블 active 멤버 |
| `bm_read_public` | SELECT | public 버블의 멤버 목록 |
| `bm_insert_self` | INSERT | 본인 가입 |
| `bm_update_self` | UPDATE | 본인 상태 변경 |
| `bm_update_admin` | UPDATE | owner/admin이 멤버 관리 |
| `bm_delete_self` | DELETE | 본인 탈퇴 |
| `bm_delete_admin` | DELETE | owner/admin이 멤버 제거 |

### 4-9. bubble_shares (3 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `bubble_share_read` | SELECT | active 멤버 |
| `bubble_share_insert` | INSERT | 본인 기록 + active 멤버(owner/admin/member) + `privacy_profile != 'private'` |
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

### 4-19. notifications (1 정책)
| 정책 | 동작 | 조건 |
|------|------|------|
| `notif_own` | ALL | 본인만 |

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

### RLS 정책 요약

| 테이블 | 정책 수 | 핵심 규칙 |
|--------|---------|----------|
| users | 3 | 본인 전체, public/bubble_only SELECT |
| restaurants | 3 | 인증된 사용자 읽기/쓰기 |
| wines | 3 | 인증된 사용자 읽기/쓰기 |
| grape_variety_profiles | 1 | 읽기 전용 참조 |
| records | 4 | 본인 전체, privacy 기반 타인 열람 |
| record_photos | 2 | 본인 전체, records RLS 경유 |
| bubbles | 5 | public/private SELECT, owner 수정/삭제 |
| bubble_members | 7 | 멤버/public 읽기, 본인 가입/탈퇴, admin 관리 |
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
| notifications | 1 | 본인만 |
| nudge_history | 1 | 본인만 |
| nudge_fatigue | 1 | 본인만 |
| wishlists | 1 | 본인만 |
| saved_filters | 1 | 본인만 |
| ai_recommendations | 1 | 본인만 |
| **합계** | **48** | |

---

## 5. 계정 삭제

> prototype: `prototype/settings.html` (DeleteAccountSheet)

### DB 필드
| 필드 | 설명 |
|------|------|
| `users.deleted_at` | 삭제 요청 시점 (NULL이면 활성 계정) |
| `users.delete_mode` | `'anonymize'` / `'hard_delete'` |
| `users.delete_scheduled_at` | 영구 삭제 예정 시점 (`deleted_at + 30일`) |

### 삭제 모드
| 모드 | 동작 |
|------|------|
| 기록 익명화 (기본) | 닉네임 → "탈퇴한 사용자", 아바타 삭제. 기록은 익명으로 집계에 유지 |
| 기록 완전 삭제 | 모든 기록, 사진, 버블 공유, 댓글 삭제. 복구 불가 |

### 삭제 시 처리

**공통 (모든 모드)**:
1. `users.deleted_at = NOW()`, `delete_scheduled_at = NOW() + 30일`
2. 소속 버블 자동 탈퇴 (`bubble_members` 처리)
3. owner인 버블 → 다음 admin에게 이전, admin 없으면 버블 삭제
4. `follows` 양방향 삭제
5. `reactions`, `notifications` 삭제
6. 소셜 로그인 연결 해제
7. 30일 유예 (복구 가능) → 30일 후 hard delete (Cron)

**모드별 차이**:
| 대상 | `anonymize` | `hard_delete` |
|------|------------|---------------|
| records | 유지 (user 익명화 후 집계에 포함) | 삭제 |
| record_photos | 유지 | 삭제 |
| bubble_shares | 유지 | 삭제 |
| comments | 익명화 (`user_id = null`, `is_anonymous = true`) | 삭제 |

---

## 6. 보안 원칙

- SECURITY DEFINER 함수 사용 금지 (RLS 우회 방지)
- API 키/토큰 클라이언트 노출 금지
- 외부 API 키는 Edge Function 환경변수로만 관리
- 사용자 위치 데이터는 서버에 저장하지 않음 (클라이언트에서만 사용)
- 가시성 필드 필터링(`visibility_public`, `visibility_bubble`, `visibility_override`)은 application layer에서 처리
