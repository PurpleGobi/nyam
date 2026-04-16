-- 버블 외 맥락(식당/와인 상세페이지)에서 댓글 허용
-- 기존 정책: comments_bubble → bubble_id가 사용자 활성 버블에 속해야 함
-- 추가 정책: bubble_id가 NULL인 경우 인증된 사용자 허용

-- 읽기: bubble_id IS NULL인 댓글은 인증된 사용자 모두 조회 가능
CREATE POLICY comments_non_bubble_read ON comments
  FOR SELECT
  USING (bubble_id IS NULL AND auth.uid() IS NOT NULL);

-- 생성: 인증된 사용자가 자기 이름으로 댓글 생성
CREATE POLICY comments_non_bubble_insert ON comments
  FOR INSERT
  WITH CHECK (bubble_id IS NULL AND user_id = auth.uid());

-- 삭제: 자기 댓글만 삭제
CREATE POLICY comments_non_bubble_delete ON comments
  FOR DELETE
  USING (bubble_id IS NULL AND user_id = auth.uid());
