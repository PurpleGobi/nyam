-- 012_rls.sql
-- Nyam v2: 모든 테이블 RLS 정책
-- SSOT: AUTH.md §4, §3, §6
-- SECURITY DEFINER 함수 사용 금지

------------------------------------------------------------
-- 0. 모든 테이블 RLS 활성화 (25개)
------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE wines ENABLE ROW LEVEL SECURITY;
ALTER TABLE grape_variety_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bubbles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bubble_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bubble_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bubble_share_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE bubble_ranking_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudge_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudge_fatigue ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- 1. users
------------------------------------------------------------
CREATE POLICY users_own ON users FOR ALL USING (id = auth.uid());
CREATE POLICY users_public ON users FOR SELECT USING (privacy_profile = 'public');
CREATE POLICY users_bubble ON users FOR SELECT USING (
  privacy_profile = 'bubble_only'
  AND id IN (
    SELECT bm2.user_id FROM bubble_members bm1
    JOIN bubble_members bm2 ON bm1.bubble_id = bm2.bubble_id
    WHERE bm1.user_id = auth.uid()
      AND bm1.status = 'active' AND bm2.status = 'active'
  )
);

------------------------------------------------------------
-- 2. restaurants
------------------------------------------------------------
CREATE POLICY restaurants_select ON restaurants FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY restaurants_insert ON restaurants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY restaurants_update ON restaurants FOR UPDATE USING (auth.uid() IS NOT NULL);

------------------------------------------------------------
-- 3. wines
------------------------------------------------------------
CREATE POLICY wines_select ON wines FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY wines_insert ON wines FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY wines_update ON wines FOR UPDATE USING (auth.uid() IS NOT NULL);

------------------------------------------------------------
-- 4. grape_variety_profiles
------------------------------------------------------------
CREATE POLICY gvp_select ON grape_variety_profiles FOR SELECT USING (auth.uid() IS NOT NULL);

------------------------------------------------------------
-- 5. records
------------------------------------------------------------
CREATE POLICY records_own ON records FOR ALL USING (user_id = auth.uid());
CREATE POLICY records_public ON records FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE privacy_records = 'all' AND privacy_profile = 'public')
);
CREATE POLICY records_bubble_all ON records FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE privacy_records = 'all' AND privacy_profile != 'private')
  AND user_id IN (
    SELECT bm2.user_id FROM bubble_members bm1
    JOIN bubble_members bm2 ON bm1.bubble_id = bm2.bubble_id
    WHERE bm1.user_id = auth.uid()
      AND bm1.status = 'active' AND bm2.status = 'active'
  )
);
CREATE POLICY records_bubble_shared ON records FOR SELECT USING (
  user_id NOT IN (SELECT id FROM users WHERE privacy_profile = 'private')
  AND id IN (
    SELECT bs.record_id FROM bubble_shares bs
    JOIN bubble_members bm ON bs.bubble_id = bm.bubble_id
    WHERE bm.user_id = auth.uid() AND bm.status = 'active'
  )
);

------------------------------------------------------------
-- 6. record_photos
------------------------------------------------------------
CREATE POLICY record_photos_own ON record_photos FOR ALL USING (
  record_id IN (SELECT id FROM records WHERE user_id = auth.uid())
);
CREATE POLICY record_photos_read ON record_photos FOR SELECT USING (
  record_id IN (SELECT id FROM records)
);

------------------------------------------------------------
-- 7. bubbles
------------------------------------------------------------
CREATE POLICY bubble_public ON bubbles FOR SELECT USING (visibility = 'public');
CREATE POLICY bubble_private ON bubbles FOR SELECT USING (
  visibility = 'private'
  AND id IN (SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY bubble_insert ON bubbles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
CREATE POLICY bubble_update ON bubbles FOR UPDATE USING (
  id IN (SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active')
);
CREATE POLICY bubble_delete ON bubbles FOR DELETE USING (
  id IN (SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active')
);

------------------------------------------------------------
-- 8. bubble_members
------------------------------------------------------------
CREATE POLICY bm_read_member ON bubble_members FOR SELECT USING (
  bubble_id IN (SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY bm_read_public ON bubble_members FOR SELECT USING (
  bubble_id IN (SELECT id FROM bubbles WHERE visibility = 'public')
);
CREATE POLICY bm_insert_self ON bubble_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY bm_update_self ON bubble_members FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY bm_update_admin ON bubble_members FOR UPDATE USING (
  bubble_id IN (SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY bm_delete_self ON bubble_members FOR DELETE USING (user_id = auth.uid());
CREATE POLICY bm_delete_admin ON bubble_members FOR DELETE USING (
  bubble_id IN (SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);

------------------------------------------------------------
-- 9. bubble_shares
------------------------------------------------------------
CREATE POLICY bubble_share_read ON bubble_shares FOR SELECT USING (
  bubble_id IN (SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY bubble_share_insert ON bubble_shares FOR INSERT WITH CHECK (
  shared_by = auth.uid()
  AND record_id IN (SELECT id FROM records WHERE user_id = auth.uid())
  AND bubble_id IN (
    SELECT bubble_id FROM bubble_members
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin', 'member')
  )
  AND (SELECT privacy_profile FROM users WHERE id = auth.uid()) != 'private'
);
CREATE POLICY bubble_share_delete ON bubble_shares FOR DELETE USING (shared_by = auth.uid());

------------------------------------------------------------
-- 10. comments
------------------------------------------------------------
CREATE POLICY comments_bubble ON comments FOR ALL USING (
  bubble_id IN (
    SELECT bm.bubble_id FROM bubble_members bm
    WHERE bm.user_id = auth.uid() AND bm.status = 'active'
      AND bm.role IN ('owner', 'admin', 'member')
  )
);

------------------------------------------------------------
-- 11. reactions
------------------------------------------------------------
CREATE POLICY reactions_own ON reactions FOR ALL USING (user_id = auth.uid());
CREATE POLICY reactions_read ON reactions FOR SELECT USING (auth.uid() IS NOT NULL);

------------------------------------------------------------
-- 12. bubble_share_reads
------------------------------------------------------------
CREATE POLICY bsr_own ON bubble_share_reads FOR ALL USING (user_id = auth.uid());
CREATE POLICY bsr_read_member ON bubble_share_reads FOR SELECT USING (
  share_id IN (
    SELECT bs.id FROM bubble_shares bs
    JOIN bubble_members bm ON bs.bubble_id = bm.bubble_id
    WHERE bm.user_id = auth.uid() AND bm.status = 'active'
  )
);

------------------------------------------------------------
-- 13. bubble_ranking_snapshots
------------------------------------------------------------
CREATE POLICY brs_read_member ON bubble_ranking_snapshots FOR SELECT USING (
  bubble_id IN (SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY brs_read_public ON bubble_ranking_snapshots FOR SELECT USING (
  bubble_id IN (SELECT id FROM bubbles WHERE visibility = 'public')
);

------------------------------------------------------------
-- 14. follows
------------------------------------------------------------
CREATE POLICY follows_follower ON follows FOR ALL USING (follower_id = auth.uid());
CREATE POLICY follows_following_read ON follows FOR SELECT USING (following_id = auth.uid());
CREATE POLICY follows_following_update ON follows FOR UPDATE USING (following_id = auth.uid());

------------------------------------------------------------
-- 15. user_experiences
------------------------------------------------------------
CREATE POLICY ue_own ON user_experiences FOR ALL USING (user_id = auth.uid());
CREATE POLICY ue_read_public ON user_experiences FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE privacy_profile = 'public')
);
CREATE POLICY ue_read_bubble ON user_experiences FOR SELECT USING (
  user_id IN (
    SELECT bm2.user_id FROM bubble_members bm1
    JOIN bubble_members bm2 ON bm1.bubble_id = bm2.bubble_id
    WHERE bm1.user_id = auth.uid()
      AND bm1.status = 'active' AND bm2.status = 'active'
  )
);

------------------------------------------------------------
-- 16. xp_histories
------------------------------------------------------------
CREATE POLICY xp_own ON xp_histories FOR ALL USING (user_id = auth.uid());

------------------------------------------------------------
-- 17~18. 읽기 전용 참조 테이블
------------------------------------------------------------
CREATE POLICY lt_select ON level_thresholds FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY milestones_select ON milestones FOR SELECT USING (auth.uid() IS NOT NULL);

------------------------------------------------------------
-- 19. user_milestones
------------------------------------------------------------
CREATE POLICY um_own ON user_milestones FOR ALL USING (user_id = auth.uid());
CREATE POLICY um_read_public ON user_milestones FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE privacy_profile = 'public')
);

------------------------------------------------------------
-- 20. notifications
------------------------------------------------------------
CREATE POLICY notif_own ON notifications FOR ALL USING (user_id = auth.uid());

------------------------------------------------------------
-- 21~22. nudge
------------------------------------------------------------
CREATE POLICY nudge_history_own ON nudge_history FOR ALL USING (user_id = auth.uid());
CREATE POLICY nudge_fatigue_own ON nudge_fatigue FOR ALL USING (user_id = auth.uid());

------------------------------------------------------------
-- 23. wishlists
------------------------------------------------------------
CREATE POLICY wishlists_own ON wishlists FOR ALL USING (user_id = auth.uid());

------------------------------------------------------------
-- 24. saved_filters
------------------------------------------------------------
CREATE POLICY saved_filters_own ON saved_filters FOR ALL USING (user_id = auth.uid());

------------------------------------------------------------
-- 25. ai_recommendations
------------------------------------------------------------
CREATE POLICY ai_rec_own ON ai_recommendations FOR ALL USING (user_id = auth.uid());
