-- 043: 인증된 사용자가 다른 유저에게 알림을 보낼 수 있도록 허용
-- 용도: 버블 초대(bubble_invite), 가입 요청(bubble_join_request) 등
-- 보안: actor_id = auth.uid() 조건으로 본인이 발신자인 알림만 생성 가능

CREATE POLICY notif_create_for_others ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND actor_id = auth.uid());
