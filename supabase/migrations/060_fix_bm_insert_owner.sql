-- ============================================================
-- Fix: bubble_members INSERT RLS — 버블 생성자의 owner INSERT 허용
-- 034에서 role IN ('member','follower','pending')으로 제한했으나,
-- create() 직후 addMember(role='owner') 호출 시 RLS 거부됨.
-- 수정: 본인이 created_by인 버블에 한해 owner INSERT 허용.
-- ============================================================

DROP POLICY IF EXISTS bm_insert_self ON bubble_members;
CREATE POLICY bm_insert_self ON bubble_members FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    role IN ('member', 'follower', 'pending')
    OR (
      role IN ('owner', 'admin')
      AND bubble_id IN (
        SELECT id FROM bubbles WHERE created_by = auth.uid()
      )
    )
  )
);
