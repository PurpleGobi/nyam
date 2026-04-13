-- 065: 버블 오너/admin이 자기 버블의 초대 알림을 조회할 수 있도록 RLS 추가
-- 용도: 설정 페이지 멤버 관리에서 "초대 수락 대기" 목록 표시
-- 보안: bubble_members에서 owner/admin + active 상태인지 확인

CREATE POLICY notif_read_bubble_invites ON notifications
  FOR SELECT
  USING (
    notification_type = 'bubble_invite'
    AND action_status = 'pending'
    AND bubble_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM bubble_members bm
      WHERE bm.bubble_id = notifications.bubble_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'admin')
        AND bm.status = 'active'
    )
  );
