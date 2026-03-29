-- 버블 생성자가 자기 버블을 항상 읽을 수 있도록 SELECT 정책 추가
-- INSERT → .select() 시 bubble_members에 아직 owner가 없어도 읽기 가능
CREATE POLICY bubble_owner_read ON bubbles FOR SELECT USING (created_by = auth.uid());
