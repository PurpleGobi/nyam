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
| `private` | 나만 열람 (`privacy_profile = 'private'` 시 자동 적용) |

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
| `rating_only` | 전체 (점수+한줄평+사진+메뉴) | 점수만 |
| `rating_and_comment` | 전체 | 점수 + 한줄평 |

### 3-5. 핵심 원칙

- `privacy_records = 'private'` → 어떤 버블이든 **공유 자체 차단**
- 동반자 정보(`records.companions`)는 **무조건 비공개** (나만 열람, 토글 없음)
- 추천 알고리즘은 설정과 무관하게 **내 모든 기록을 내부적으로 사용**
- 식당/와인 상세 **익명 집계**(평균 점수, 사분면 분포)에는 항상 포함

---

## 4. RLS 정책

### users
```sql
-- 자기 자신: 항상 전체
CREATE POLICY users_own ON users
  FOR ALL USING (id = auth.uid());

-- 타인 프로필: privacy_profile에 따라
CREATE POLICY users_public ON users
  FOR SELECT USING (
    privacy_profile = 'public'
  );

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
```

### records
```sql
-- 자기 기록: 항상 전체
CREATE POLICY records_own ON records
  FOR ALL USING (user_id = auth.uid());

-- 타인 기록 (all): privacy 통과 시 전체
CREATE POLICY records_public ON records
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE privacy_records = 'all' AND privacy_profile = 'public')
  );

-- 타인 기록 (shared_only): 같은 버블 + 공유된 기록만
CREATE POLICY records_bubble_shared ON records
  FOR SELECT USING (
    id IN (
      SELECT bs.record_id FROM bubble_shares bs
      JOIN bubble_members bm ON bs.bubble_id = bm.bubble_id
      WHERE bm.user_id = auth.uid() AND bm.status = 'active'
    )
  );
```

### bubbles
```sql
-- public 버블: 누구나 기본 정보 읽기
CREATE POLICY bubble_public ON bubbles
  FOR SELECT USING (visibility = 'public');

-- private 버블: 멤버만
CREATE POLICY bubble_private ON bubbles
  FOR SELECT USING (
    visibility = 'private'
    AND id IN (SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid() AND status = 'active')
  );
```

### bubble_shares
```sql
-- 버블 멤버만 공유 기록 읽기
CREATE POLICY bubble_share_read ON bubble_shares
  FOR SELECT USING (
    bubble_id IN (
      SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- 자기 기록만 공유 가능
CREATE POLICY bubble_share_insert ON bubble_shares
  FOR INSERT WITH CHECK (
    shared_by = auth.uid()
    AND record_id IN (SELECT id FROM records WHERE user_id = auth.uid())
  );

-- 비멤버 (public 버블): exposure_level에 따라 제한된 읽기
-- → application layer에서 visibility 필드 필터링
```

### comments / reactions
```sql
-- 버블 멤버만 댓글/리액션 (bubble_shares 경유)
CREATE POLICY comments_bubble ON comments
  FOR ALL USING (
    bubble_share_id IN (
      SELECT bs.id FROM bubble_shares bs
      JOIN bubble_members bm ON bs.bubble_id = bm.bubble_id
      WHERE bm.user_id = auth.uid() AND bm.status = 'active'
        AND bm.role IN ('owner', 'admin', 'member')
    )
  );
```

### notifications
```sql
-- 자기 알림만
CREATE POLICY notif_own ON notifications
  FOR ALL USING (user_id = auth.uid());
```

---

## 5. 보안 원칙

- SECURITY DEFINER 함수 사용 금지 (RLS 우회 방지)
- API 키/토큰 클라이언트 노출 금지
- 외부 API 키는 Edge Function 환경변수로만 관리
- 사용자 위치 데이터는 서버에 저장하지 않음 (클라이언트에서만 사용)
- 가시성 필드 필터링(`visibility_public`, `visibility_bubble`, `visibility_override`)은 application layer에서 처리
