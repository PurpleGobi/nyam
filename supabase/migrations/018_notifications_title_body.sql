-- 018_notifications_title_body.sql
-- 알림 테이블에 title, body 컬럼 추가
-- SSOT: pages/09_NOTIFICATIONS.md, S6_xp_profile/04_notifications.md

ALTER TABLE notifications
  ADD COLUMN title TEXT,
  ADD COLUMN body TEXT;
