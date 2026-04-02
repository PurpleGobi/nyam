-- 042: 인증된 사용자가 다른 유저를 닉네임/이메일/핸들로 검색 가능하도록 허용
-- 용도: 버블 멤버 초대 시 유저 검색 (privacy_profile 무관)
-- 보안: auth.uid() IS NOT NULL 조건으로 비인증 접근 차단
-- 노출 필드: id, nickname, handle, email, avatar_url, avatar_color만 select에서 사용

CREATE POLICY users_authenticated_search ON users
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
