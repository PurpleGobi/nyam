-- record_photos: 공개 기록 사진 + 팔로워 기록 사진 읽기 RLS 정책 추가
-- 기존에 본인 읽기 + 버블 멤버 읽기만 있었음

-- 공개 유저의 기록 사진
CREATE POLICY record_photos_public_read ON record_photos FOR SELECT USING (
  record_id IN (
    SELECT r.id FROM records r
    JOIN users u ON u.id = r.user_id
    WHERE u.is_public = true
  )
);

-- 팔로워의 기록 사진
CREATE POLICY record_photos_followers_read ON record_photos FOR SELECT USING (
  record_id IN (
    SELECT r.id FROM records r
    JOIN follows f ON f.following_id = r.user_id
    JOIN users u ON u.id = r.user_id
    WHERE f.follower_id = auth.uid()
      AND f.status = 'accepted'
      AND u.follow_policy != 'blocked'
  )
);
