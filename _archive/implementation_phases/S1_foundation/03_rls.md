# 1.3: RLS 정책 설정

> AUTH.md의 모든 RLS 정책을 SQL로 구현한다. 모든 테이블에 RLS를 활성화하고, 인증 없이는 데이터 접근이 불가하도록 한다.

---

## SSOT 출처

| 문서 | 참조 섹션 |
|------|----------|
| `systems/AUTH.md` | 4 RLS 정책 전체 |
| `systems/AUTH.md` | 3 프라이버시 계층 |
| `systems/AUTH.md` | 6 보안 원칙 |
| `systems/DATA_MODEL.md` | 2 테이블 정의 (프라이버시 필드), 9 CHECK 제약 |

## 정책 분류

### AUTH.md §4에 정의된 정책 (SSOT)
- users: users_own, users_public, users_bubble
- records: records_own, records_public, records_bubble_all, records_bubble_shared
- bubbles: bubble_public, bubble_private
- bubble_shares: bubble_share_read, bubble_share_insert
- comments: comments_bubble
- reactions: reactions_own
- notifications: notif_own

### 보충 정책 (AUTH.md에 미정의, 보안 필수)
나머지 테이블(record_photos, wishlists, follows, user_experiences 등)은 AUTH.md §4에 정책이 정의되어 있지 않으나, RLS 활성화 시 정책 없이는 접근 불가하므로 기본 정책을 추가한다. 이 정책들은 DECISIONS_LOG.md에 기록한다.

## 선행 조건

- [ ] 1.2 전체 DB 스키마 생성 완료 (25개 테이블 존재)
- [ ] 모든 트리거 생성 완료 (011_triggers.sql 적용 완료)

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 역할 |
|----------|------|
| `supabase/migrations/012_rls.sql` | 모든 테이블 RLS 활성화 + 정책 정의 |

### 생성하지 않는 것

- Supabase Auth 설정 (1.4에서)
- 애플리케이션 레이어 가시성 필드 필터링 (`visibility_public`, `visibility_bubble`, `visibility_override`는 application 레이어에서 처리)
- 버블 역할 기반 세밀한 접근 제어 (S7에서 필요 시 확장)

---

## 보안 원칙

1. **모든 테이블 RLS 활성화**: 예외 없음. 25개 테이블 전부 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
2. **SECURITY DEFINER 함수 사용 금지**: 모든 함수는 SECURITY INVOKER (기본값)
3. **auth.uid() 기반 행 수준 보안**: Supabase Auth JWT에서 사용자 ID 추출
4. **버블 멤버십 확인**: `bubble_members` 테이블 JOIN으로 검증
5. **프라이버시 설정 존중**: `privacy_profile`, `privacy_records` 필드 CHECK
6. **companions 필드 항상 비공개**: RLS에서 차단 + 애플리케이션 레이어 이중 보호
7. **읽기 전용 참조 테이블**: `level_thresholds`, `milestones`, `grape_variety_profiles`는 모든 인증 사용자에게 읽기 허용

---

## 상세 구현 지침

### 012_rls.sql

```sql
-- 012_rls.sql
-- Nyam v2: 모든 테이블 RLS 정책
-- SSOT: AUTH.md §4, §3, §6
-- SECURITY DEFINER 함수 사용 금지

------------------------------------------------------------
-- 0. 모든 테이블 RLS 활성화 (25개)
------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE wines ENABLE ROW LEVEL SECURITY;
ALTER TABLE grape_variety_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bubbles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bubble_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bubble_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bubble_share_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE bubble_ranking_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudge_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudge_fatigue ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- 1. users
-- AUTH.md §4: users_own, users_public, users_bubble
------------------------------------------------------------

-- 자기 자신: 전체 CRUD
CREATE POLICY users_own ON users
  FOR ALL USING (id = auth.uid());

-- 타인 프로필: public 설정 사용자는 누구나 SELECT 가능
CREATE POLICY users_public ON users
  FOR SELECT USING (
    privacy_profile = 'public'
  );

-- 타인 프로필: bubble_only 설정 사용자는 같은 버블 멤버만 SELECT 가능
CREATE POLICY users_bubble ON users
  FOR SELECT USING (
    privacy_profile = 'bubble_only'
    AND id IN (
      SELECT bm2.user_id FROM bubble_members bm1
      JOIN bubble_members bm2 ON bm1.bubble_id = bm2.bubble_id
      WHERE bm1.user_id = auth.uid()
        AND bm1.status = 'active' AND bm2.status = 'active'
    )
  );

------------------------------------------------------------
-- 2. restaurants
-- 모든 인증 사용자가 읽기 가능. 쓰기는 인증 사용자만.
------------------------------------------------------------

CREATE POLICY restaurants_select ON restaurants
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY restaurants_insert ON restaurants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY restaurants_update ON restaurants
  FOR UPDATE USING (auth.uid() IS NOT NULL);

------------------------------------------------------------
-- 3. wines
-- 모든 인증 사용자가 읽기 가능. 쓰기는 인증 사용자만.
------------------------------------------------------------

CREATE POLICY wines_select ON wines
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY wines_insert ON wines
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY wines_update ON wines
  FOR UPDATE USING (auth.uid() IS NOT NULL);

------------------------------------------------------------
-- 4. grape_variety_profiles
-- 읽기 전용 참조 테이블. 모든 인증 사용자 읽기 가능.
------------------------------------------------------------

CREATE POLICY gvp_select ON grape_variety_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

------------------------------------------------------------
-- 5. records
-- AUTH.md §4: records_own, records_public, records_bubble_all, records_bubble_shared
------------------------------------------------------------

-- 자기 기록: 전체 CRUD
CREATE POLICY records_own ON records
  FOR ALL USING (user_id = auth.uid());

-- 타인 기록 (all + public): privacy_records='all' AND privacy_profile='public'인 사용자의 기록
CREATE POLICY records_public ON records
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users
      WHERE privacy_records = 'all' AND privacy_profile = 'public'
    )
  );

-- 타인 기록 (all + bubble_only/public): 같은 버블 멤버가 모든 기록 열람
CREATE POLICY records_bubble_all ON records
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users
      WHERE privacy_records = 'all' AND privacy_profile != 'private'
    )
    AND user_id IN (
      SELECT bm2.user_id FROM bubble_members bm1
      JOIN bubble_members bm2 ON bm1.bubble_id = bm2.bubble_id
      WHERE bm1.user_id = auth.uid()
        AND bm1.status = 'active' AND bm2.status = 'active'
    )
  );

-- 타인 기록 (shared_only): 같은 버블에 공유된 기록만
CREATE POLICY records_bubble_shared ON records
  FOR SELECT USING (
    user_id NOT IN (
      SELECT id FROM users WHERE privacy_profile = 'private'
    )
    AND id IN (
      SELECT bs.record_id FROM bubble_shares bs
      JOIN bubble_members bm ON bs.bubble_id = bm.bubble_id
      WHERE bm.user_id = auth.uid() AND bm.status = 'active'
    )
  );

------------------------------------------------------------
-- 6. record_photos
-- records에서 파생. 자기 기록의 사진만 CRUD.
-- 타인 기록 사진은 records RLS를 통과한 경우에만 열람.
------------------------------------------------------------

-- 자기 사진: 전체 CRUD
CREATE POLICY record_photos_own ON record_photos
  FOR ALL USING (
    record_id IN (SELECT id FROM records WHERE user_id = auth.uid())
  );

-- 타인 사진: records RLS 통과한 기록의 사진만 SELECT
CREATE POLICY record_photos_read ON record_photos
  FOR SELECT USING (
    record_id IN (SELECT id FROM records)
  );

------------------------------------------------------------
-- 7. bubbles
-- AUTH.md §4: bubble_public, bubble_private
------------------------------------------------------------

-- public 버블: 누구나 기본 정보 읽기
CREATE POLICY bubble_public ON bubbles
  FOR SELECT USING (visibility = 'public');

-- private 버블: 멤버만 읽기
CREATE POLICY bubble_private ON bubbles
  FOR SELECT USING (
    visibility = 'private'
    AND id IN (
      SELECT bubble_id FROM bubble_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- 버블 생성: 인증 사용자
CREATE POLICY bubble_insert ON bubbles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- 버블 수정: owner만
CREATE POLICY bubble_update ON bubbles
  FOR UPDATE USING (
    id IN (
      SELECT bubble_id FROM bubble_members
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- 버블 삭제: owner만
CREATE POLICY bubble_delete ON bubbles
  FOR DELETE USING (
    id IN (
      SELECT bubble_id FROM bubble_members
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

------------------------------------------------------------
-- 8. bubble_members
-- 멤버 목록 조회: 해당 버블 멤버만 (public 버블은 누구나)
-- 자기 멤버십 관리: 본인
------------------------------------------------------------

-- 멤버 목록 조회: 같은 버블 활성 멤버
CREATE POLICY bm_read_member ON bubble_members
  FOR SELECT USING (
    bubble_id IN (
      SELECT bubble_id FROM bubble_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- public 버블 멤버 목록: 누구나 읽기
CREATE POLICY bm_read_public ON bubble_members
  FOR SELECT USING (
    bubble_id IN (
      SELECT id FROM bubbles WHERE visibility = 'public'
    )
  );

-- 자기 멤버십 INSERT (가입 신청)
CREATE POLICY bm_insert_self ON bubble_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 자기 멤버십 UPDATE (탈퇴 등)
CREATE POLICY bm_update_self ON bubble_members
  FOR UPDATE USING (user_id = auth.uid());

-- 관리자/오너 멤버 관리 (승인/거절/제거)
CREATE POLICY bm_update_admin ON bubble_members
  FOR UPDATE USING (
    bubble_id IN (
      SELECT bubble_id FROM bubble_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
    )
  );

-- 자기 멤버십 삭제 (탈퇴)
CREATE POLICY bm_delete_self ON bubble_members
  FOR DELETE USING (user_id = auth.uid());

-- 관리자/오너 멤버 제거
CREATE POLICY bm_delete_admin ON bubble_members
  FOR DELETE USING (
    bubble_id IN (
      SELECT bubble_id FROM bubble_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 9. bubble_shares
-- AUTH.md §4: bubble_share_read, bubble_share_insert
------------------------------------------------------------

-- 버블 멤버만 공유 기록 읽기
CREATE POLICY bubble_share_read ON bubble_shares
  FOR SELECT USING (
    bubble_id IN (
      SELECT bubble_id FROM bubble_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- 자기 기록만 공유 가능 + 해당 버블 멤버 + privacy_profile='private'면 차단
CREATE POLICY bubble_share_insert ON bubble_shares
  FOR INSERT WITH CHECK (
    shared_by = auth.uid()
    AND record_id IN (SELECT id FROM records WHERE user_id = auth.uid())
    AND bubble_id IN (
      SELECT bubble_id FROM bubble_members
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('owner', 'admin', 'member')
    )
    AND (SELECT privacy_profile FROM users WHERE id = auth.uid()) != 'private'
  );

-- 자기 공유 삭제 (공유 취소)
CREATE POLICY bubble_share_delete ON bubble_shares
  FOR DELETE USING (shared_by = auth.uid());

------------------------------------------------------------
-- 10. comments
-- AUTH.md §4: comments_bubble
-- 버블 멤버만 댓글 CRUD (follower 제외)
------------------------------------------------------------

CREATE POLICY comments_bubble ON comments
  FOR ALL USING (
    bubble_id IN (
      SELECT bm.bubble_id FROM bubble_members bm
      WHERE bm.user_id = auth.uid() AND bm.status = 'active'
        AND bm.role IN ('owner', 'admin', 'member')
    )
  );

------------------------------------------------------------
-- 11. reactions
-- AUTH.md §4: reactions_own
-- 버블 멤버십 검증은 애플리케이션 레이어에서 처리
------------------------------------------------------------

CREATE POLICY reactions_own ON reactions
  FOR ALL USING (user_id = auth.uid());

-- 리액션 조회: 인증 사용자 (타인 리액션 카운트 표시용)
CREATE POLICY reactions_read ON reactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

------------------------------------------------------------
-- 12. bubble_share_reads
-- 자기 읽음 기록만
------------------------------------------------------------

CREATE POLICY bsr_own ON bubble_share_reads
  FOR ALL USING (user_id = auth.uid());

-- 같은 버블 멤버의 읽음 조회 ("외 4명이 봤어요" 표시용)
CREATE POLICY bsr_read_member ON bubble_share_reads
  FOR SELECT USING (
    share_id IN (
      SELECT bs.id FROM bubble_shares bs
      JOIN bubble_members bm ON bs.bubble_id = bm.bubble_id
      WHERE bm.user_id = auth.uid() AND bm.status = 'active'
    )
  );

------------------------------------------------------------
-- 13. bubble_ranking_snapshots
-- 버블 멤버만 랭킹 조회
------------------------------------------------------------

CREATE POLICY brs_read_member ON bubble_ranking_snapshots
  FOR SELECT USING (
    bubble_id IN (
      SELECT bubble_id FROM bubble_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- public 버블 랭킹: 누구나 읽기
CREATE POLICY brs_read_public ON bubble_ranking_snapshots
  FOR SELECT USING (
    bubble_id IN (
      SELECT id FROM bubbles WHERE visibility = 'public'
    )
  );

------------------------------------------------------------
-- 14. follows
-- 자기 팔로우 관계만 CRUD
------------------------------------------------------------

-- 자기가 팔로우한 관계: 전체
CREATE POLICY follows_follower ON follows
  FOR ALL USING (follower_id = auth.uid());

-- 자기를 팔로우한 관계: 읽기 + 상태 변경 (수락/거절)
CREATE POLICY follows_following_read ON follows
  FOR SELECT USING (following_id = auth.uid());

CREATE POLICY follows_following_update ON follows
  FOR UPDATE USING (following_id = auth.uid());

------------------------------------------------------------
-- 15. user_experiences
-- 자기 경험치만 CRUD
------------------------------------------------------------

CREATE POLICY ue_own ON user_experiences
  FOR ALL USING (user_id = auth.uid());

-- 타인 경험치 조회: 프로필 공개 사용자 (레벨 뱃지 표시용)
CREATE POLICY ue_read_public ON user_experiences
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE privacy_profile = 'public'
    )
  );

-- 타인 경험치 조회: 같은 버블 멤버
CREATE POLICY ue_read_bubble ON user_experiences
  FOR SELECT USING (
    user_id IN (
      SELECT bm2.user_id FROM bubble_members bm1
      JOIN bubble_members bm2 ON bm1.bubble_id = bm2.bubble_id
      WHERE bm1.user_id = auth.uid()
        AND bm1.status = 'active' AND bm2.status = 'active'
    )
  );

------------------------------------------------------------
-- 16. xp_histories
-- 자기 XP 이력만
------------------------------------------------------------

CREATE POLICY xp_own ON xp_histories
  FOR ALL USING (user_id = auth.uid());

------------------------------------------------------------
-- 17. level_thresholds
-- 읽기 전용 참조 테이블. 모든 인증 사용자 읽기.
------------------------------------------------------------

CREATE POLICY lt_select ON level_thresholds
  FOR SELECT USING (auth.uid() IS NOT NULL);

------------------------------------------------------------
-- 18. milestones
-- 읽기 전용 참조 테이블. 모든 인증 사용자 읽기.
------------------------------------------------------------

CREATE POLICY milestones_select ON milestones
  FOR SELECT USING (auth.uid() IS NOT NULL);

------------------------------------------------------------
-- 19. user_milestones
-- 자기 마일스톤만
------------------------------------------------------------

CREATE POLICY um_own ON user_milestones
  FOR ALL USING (user_id = auth.uid());

-- 타인 마일스톤 조회 (프로필 레벨 디테일 표시용): 프로필 공개 사용자
CREATE POLICY um_read_public ON user_milestones
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE privacy_profile = 'public'
    )
  );

------------------------------------------------------------
-- 20. notifications
-- AUTH.md §4: notif_own
-- 자기 알림만
------------------------------------------------------------

CREATE POLICY notif_own ON notifications
  FOR ALL USING (user_id = auth.uid());

------------------------------------------------------------
-- 21. nudge_history
-- 자기 넛지 이력만
------------------------------------------------------------

CREATE POLICY nudge_history_own ON nudge_history
  FOR ALL USING (user_id = auth.uid());

------------------------------------------------------------
-- 22. nudge_fatigue
-- 자기 넛지 피로도만
------------------------------------------------------------

CREATE POLICY nudge_fatigue_own ON nudge_fatigue
  FOR ALL USING (user_id = auth.uid());

------------------------------------------------------------
-- 23. wishlists
-- 자기 찜만
------------------------------------------------------------

CREATE POLICY wishlists_own ON wishlists
  FOR ALL USING (user_id = auth.uid());

------------------------------------------------------------
-- 24. saved_filters
-- 자기 저장 필터만
------------------------------------------------------------

CREATE POLICY saved_filters_own ON saved_filters
  FOR ALL USING (user_id = auth.uid());

------------------------------------------------------------
-- 25. ai_recommendations
-- 자기 추천만
------------------------------------------------------------

CREATE POLICY ai_rec_own ON ai_recommendations
  FOR ALL USING (user_id = auth.uid());
```

---

## 정책 요약 매트릭스

| 테이블 | 정책명 | 동작 | 조건 |
|--------|--------|------|------|
| **users** | `users_own` | ALL | `id = auth.uid()` |
| | `users_public` | SELECT | `privacy_profile = 'public'` |
| | `users_bubble` | SELECT | `privacy_profile = 'bubble_only'` AND 같은 버블 활성 멤버 |
| **restaurants** | `restaurants_select` | SELECT | 인증 사용자 |
| | `restaurants_insert` | INSERT | 인증 사용자 |
| | `restaurants_update` | UPDATE | 인증 사용자 |
| **wines** | `wines_select` | SELECT | 인증 사용자 |
| | `wines_insert` | INSERT | 인증 사용자 |
| | `wines_update` | UPDATE | 인증 사용자 |
| **grape_variety_profiles** | `gvp_select` | SELECT | 인증 사용자 |
| **records** | `records_own` | ALL | `user_id = auth.uid()` |
| | `records_public` | SELECT | `privacy_records='all'` AND `privacy_profile='public'` |
| | `records_bubble_all` | SELECT | `privacy_records='all'` AND `privacy_profile!='private'` AND 같은 버블 |
| | `records_bubble_shared` | SELECT | `privacy_profile!='private'` AND bubble_shares 경유 같은 버블 |
| **record_photos** | `record_photos_own` | ALL | 자기 기록의 사진 |
| | `record_photos_read` | SELECT | records RLS 통과한 기록 |
| **bubbles** | `bubble_public` | SELECT | `visibility = 'public'` |
| | `bubble_private` | SELECT | `visibility = 'private'` AND 활성 멤버 |
| | `bubble_insert` | INSERT | 인증 사용자 AND `created_by = auth.uid()` |
| | `bubble_update` | UPDATE | owner |
| | `bubble_delete` | DELETE | owner |
| **bubble_members** | `bm_read_member` | SELECT | 같은 버블 활성 멤버 |
| | `bm_read_public` | SELECT | public 버블 |
| | `bm_insert_self` | INSERT | `user_id = auth.uid()` |
| | `bm_update_self` | UPDATE | `user_id = auth.uid()` |
| | `bm_update_admin` | UPDATE | owner/admin |
| | `bm_delete_self` | DELETE | `user_id = auth.uid()` |
| | `bm_delete_admin` | DELETE | owner/admin |
| **bubble_shares** | `bubble_share_read` | SELECT | 버블 활성 멤버 |
| | `bubble_share_insert` | INSERT | 자기 기록 AND 멤버(owner/admin/member) AND `privacy_profile!='private'` |
| | `bubble_share_delete` | DELETE | `shared_by = auth.uid()` |
| **comments** | `comments_bubble` | ALL | 버블 멤버(owner/admin/member) |
| **reactions** | `reactions_own` | ALL | `user_id = auth.uid()` |
| | `reactions_read` | SELECT | 인증 사용자 |
| **bubble_share_reads** | `bsr_own` | ALL | `user_id = auth.uid()` |
| | `bsr_read_member` | SELECT | 같은 버블 멤버의 share |
| **bubble_ranking_snapshots** | `brs_read_member` | SELECT | 버블 활성 멤버 |
| | `brs_read_public` | SELECT | public 버블 |
| **follows** | `follows_follower` | ALL | `follower_id = auth.uid()` |
| | `follows_following_read` | SELECT | `following_id = auth.uid()` |
| | `follows_following_update` | UPDATE | `following_id = auth.uid()` |
| **user_experiences** | `ue_own` | ALL | `user_id = auth.uid()` |
| | `ue_read_public` | SELECT | `privacy_profile = 'public'` |
| | `ue_read_bubble` | SELECT | 같은 버블 활성 멤버 |
| **xp_histories** | `xp_own` | ALL | `user_id = auth.uid()` |
| **level_thresholds** | `lt_select` | SELECT | 인증 사용자 |
| **milestones** | `milestones_select` | SELECT | 인증 사용자 |
| **user_milestones** | `um_own` | ALL | `user_id = auth.uid()` |
| | `um_read_public` | SELECT | `privacy_profile = 'public'` |
| **notifications** | `notif_own` | ALL | `user_id = auth.uid()` |
| **nudge_history** | `nudge_history_own` | ALL | `user_id = auth.uid()` |
| **nudge_fatigue** | `nudge_fatigue_own` | ALL | `user_id = auth.uid()` |
| **wishlists** | `wishlists_own` | ALL | `user_id = auth.uid()` |
| **saved_filters** | `saved_filters_own` | ALL | `user_id = auth.uid()` |
| **ai_recommendations** | `ai_rec_own` | ALL | `user_id = auth.uid()` |

---

## 마이그레이션 실행

```bash
supabase migration new 012_rls
# 위 SQL을 supabase/migrations/012_rls.sql에 작성
supabase db push --linked
```

### 이후 추가된 RLS 마이그레이션

S1 이후 스프린트에서 추가된 RLS 관련 마이그레이션:

| 파일 | 역할 |
|------|------|
| `025_bubble_owner_read_policy.sql` | 버블 오너 읽기 정책 추가 |
| `033_bubble_member_read_rls.sql` | 버블 멤버 읽기 RLS 수정 |
| `034_rls_security_fixes.sql` | RLS 보안 수정 |

---

## 검증 체크리스트

### RLS 활성화 확인

- [ ] 모든 25개 테이블 RLS 활성화:
  ```sql
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
  ```
  결과: 모든 행의 `rowsecurity` = `true`

### SECURITY DEFINER 부재 확인

- [ ] SECURITY DEFINER 함수 없음:
  ```sql
  SELECT proname, prosecdef
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace AND prosecdef = true;
  ```
  결과: 0행

### 인증 없이 접근 차단 확인

- [ ] 비인증 요청으로 `users` SELECT 시 빈 결과 반환
- [ ] 비인증 요청으로 `records` SELECT 시 빈 결과 반환
- [ ] 비인증 요청으로 `restaurants` SELECT 시 빈 결과 반환

### 자기 데이터 CRUD 확인

- [ ] 인증 사용자가 자기 `users` 행 SELECT 가능
- [ ] 인증 사용자가 자기 `users` 행 UPDATE 가능
- [ ] 인증 사용자가 `records` INSERT 가능 (`user_id = auth.uid()`)
- [ ] 인증 사용자가 자기 `records` UPDATE 가능
- [ ] 인증 사용자가 자기 `records` DELETE 가능

### 타인 데이터 접근 제한 확인

- [ ] 타인의 `users` 행 UPDATE 시도 시 영향 0행
- [ ] 타인의 `records` DELETE 시도 시 영향 0행
- [ ] `privacy_profile = 'private'` 사용자의 프로필 SELECT 시 빈 결과
- [ ] `privacy_profile = 'bubble_only'` 사용자의 프로필: 같은 버블 아닌 사용자가 SELECT 시 빈 결과
- [ ] `privacy_records = 'shared_only'` 사용자의 비공유 기록: 버블 멤버가 SELECT 시 빈 결과

### 버블 접근 제어 확인

- [ ] `visibility = 'private'` 버블: 비멤버 SELECT 시 빈 결과
- [ ] `visibility = 'public'` 버블: 비멤버도 SELECT 가능
- [ ] 비멤버가 `bubble_shares` SELECT 시 빈 결과
- [ ] 멤버(owner/admin/member)만 `comments` INSERT 가능
- [ ] follower는 `comments` INSERT 불가

### 읽기 전용 테이블 확인

- [ ] `level_thresholds`: 인증 사용자 SELECT 가능, INSERT/UPDATE/DELETE 불가
- [ ] `milestones`: 인증 사용자 SELECT 가능, INSERT/UPDATE/DELETE 불가
- [ ] `grape_variety_profiles`: 인증 사용자 SELECT 가능, INSERT/UPDATE/DELETE 불가

### 정책 개수 확인

- [ ] 총 RLS 정책 수 확인:
  ```sql
  SELECT COUNT(*)
  FROM pg_policies
  WHERE schemaname = 'public';
  ```
  결과: 49개 (위 매트릭스의 정책 합계)
