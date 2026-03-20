# AUTH — 인증 & 권한

> affects: ONBOARDING, BUBBLE, PROFILE, SETTINGS, 모든 API

---

## 1. 인증

### 소셜 로그인
- **카카오** (Primary — 한국 사용자 메인)
- **Google**
- **Apple** (iOS 필수)

### Supabase Auth 설정
- Provider: Kakao, Google, Apple
- 가입 시 `users` 테이블에 자동 row 생성 (trigger)
- 닉네임: 소셜 계정 이름 자동 설정 (나중에 변경 가능)

---

## 2. RLS 정책

### records
```sql
-- 자기 기록만 읽기/쓰기
CREATE POLICY records_own ON records
  FOR ALL USING (user_id = auth.uid());
```

### bubble_shares
```sql
-- 버블 멤버만 공유 기록 읽기
CREATE POLICY bubble_share_read ON bubble_shares
  FOR SELECT USING (
    bubble_id IN (
      SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid()
    )
  );

-- 자기 기록만 공유 가능
CREATE POLICY bubble_share_insert ON bubble_shares
  FOR INSERT WITH CHECK (
    shared_by = auth.uid()
    AND record_id IN (SELECT id FROM records WHERE user_id = auth.uid())
  );
```

### bubbles
```sql
-- 멤버만 버블 정보 읽기
CREATE POLICY bubble_read ON bubbles
  FOR SELECT USING (
    id IN (SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid())
  );
```

---

## 3. 권한 모델

### 버블 역할
| 역할 | 기록 공유 | 댓글 | 멤버 관리 | 버블 삭제 |
|------|----------|------|----------|----------|
| owner | O | O | O | O |
| admin | O | O | O | X |
| member | O | O | X | X |
| subscriber (열람전용) | X | X | X | X |

---

## 4. 보안 원칙

- SECURITY DEFINER 함수 사용 금지 (RLS 우회 방지)
- API 키/토큰 클라이언트 노출 금지
- 외부 API 키는 Edge Function 환경변수로만 관리
- 사용자 위치 데이터는 서버에 저장하지 않음 (클라이언트에서만 사용)
