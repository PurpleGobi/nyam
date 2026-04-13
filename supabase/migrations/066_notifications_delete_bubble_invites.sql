-- 066: 버블 오너/admin이 자기가 보낸 버블 초대 알림을 삭제(취소)할 수 있도록 RLS 추가
-- 보안: actor_id = auth.uid() (본인이 보낸 초대만) + bubble owner/admin 확인

CREATE POLICY notif_delete_bubble_invites ON notifications
  FOR DELETE
  USING (
    notification_type = 'bubble_invite'
    AND action_status = 'pending'
    AND actor_id = auth.uid()
    AND bubble_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM bubble_members bm
      WHERE bm.bubble_id = notifications.bubble_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'admin')
        AND bm.status = 'active'
    )
  );
