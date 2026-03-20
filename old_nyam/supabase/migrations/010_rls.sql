-- 010: Row Level Security 정책
-- TECH_SPEC Section 7-2

-- ═══════════════════════════════════════
-- RLS 활성화
-- ═══════════════════════════════════════

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_taste_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE taste_dna_restaurant ENABLE ROW LEVEL SECURITY;
ALTER TABLE taste_dna_wine ENABLE ROW LEVEL SECURITY;
ALTER TABLE taste_dna_cooking ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_dna_restaurant_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_dna_restaurant_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_dna_restaurant_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_dna_wine_varieties ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_dna_wine_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_dna_wine_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_dna_wine_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_dna_cooking_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_dna_cooking_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_deletions ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════
-- users
-- ═══════════════════════════════════════

CREATE POLICY "users_select_self_and_group_members" ON users
  FOR SELECT USING (
    id = auth.uid()
    OR id IN (
      SELECT gm2.user_id FROM group_memberships gm1
      JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() AND gm1.status = 'active' AND gm2.status = 'active'
    )
  );

CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (id = auth.uid());

-- ═══════════════════════════════════════
-- records
-- ═══════════════════════════════════════

CREATE POLICY "records_select" ON records
  FOR SELECT USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR (visibility = 'group' AND id IN (
      SELECT rs.record_id FROM record_shares rs
      JOIN group_memberships gm ON rs.group_id = gm.group_id
      WHERE gm.user_id = auth.uid() AND gm.status = 'active'
    ))
  );

CREATE POLICY "records_insert" ON records
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "records_update" ON records
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "records_delete" ON records
  FOR DELETE USING (user_id = auth.uid());

-- ═══════════════════════════════════════
-- record_photos (records와 동일 접근 범위)
-- ═══════════════════════════════════════

CREATE POLICY "record_photos_select" ON record_photos
  FOR SELECT USING (
    record_id IN (SELECT id FROM records WHERE
      user_id = auth.uid()
      OR visibility = 'public'
      OR (visibility = 'group' AND id IN (
        SELECT rs.record_id FROM record_shares rs
        JOIN group_memberships gm ON rs.group_id = gm.group_id
        WHERE gm.user_id = auth.uid() AND gm.status = 'active'
      ))
    )
  );

CREATE POLICY "record_photos_insert" ON record_photos
  FOR INSERT WITH CHECK (
    record_id IN (SELECT id FROM records WHERE user_id = auth.uid())
  );

CREATE POLICY "record_photos_update" ON record_photos
  FOR UPDATE USING (
    record_id IN (SELECT id FROM records WHERE user_id = auth.uid())
  );

CREATE POLICY "record_photos_delete" ON record_photos
  FOR DELETE USING (
    record_id IN (SELECT id FROM records WHERE user_id = auth.uid())
  );

-- ═══════════════════════════════════════
-- record_journals (records와 동일)
-- ═══════════════════════════════════════

CREATE POLICY "record_journals_select" ON record_journals
  FOR SELECT USING (
    record_id IN (SELECT id FROM records WHERE
      user_id = auth.uid() OR visibility = 'public'
      OR (visibility = 'group' AND id IN (
        SELECT rs.record_id FROM record_shares rs
        JOIN group_memberships gm ON rs.group_id = gm.group_id
        WHERE gm.user_id = auth.uid() AND gm.status = 'active'
      ))
    )
  );

CREATE POLICY "record_journals_insert" ON record_journals
  FOR INSERT WITH CHECK (record_id IN (SELECT id FROM records WHERE user_id = auth.uid()));

CREATE POLICY "record_journals_update" ON record_journals
  FOR UPDATE USING (record_id IN (SELECT id FROM records WHERE user_id = auth.uid()));

CREATE POLICY "record_journals_delete" ON record_journals
  FOR DELETE USING (record_id IN (SELECT id FROM records WHERE user_id = auth.uid()));

-- ═══════════════════════════════════════
-- record_ai_analyses (본인 기록 읽기, service_role 쓰기)
-- ═══════════════════════════════════════

CREATE POLICY "record_ai_analyses_select" ON record_ai_analyses
  FOR SELECT USING (record_id IN (SELECT id FROM records WHERE user_id = auth.uid()));

-- INSERT는 service_role만 (RLS bypass)

-- ═══════════════════════════════════════
-- record_taste_profiles (본인 읽기, service_role/본인 쓰기)
-- ═══════════════════════════════════════

CREATE POLICY "record_taste_profiles_select" ON record_taste_profiles
  FOR SELECT USING (record_id IN (SELECT id FROM records WHERE user_id = auth.uid()));

CREATE POLICY "record_taste_profiles_insert" ON record_taste_profiles
  FOR INSERT WITH CHECK (record_id IN (SELECT id FROM records WHERE user_id = auth.uid()));

-- UPDATE는 service_role만 (AI 병합)

-- ═══════════════════════════════════════
-- record_shares
-- ═══════════════════════════════════════

CREATE POLICY "record_shares_select" ON record_shares
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_memberships WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "record_shares_insert" ON record_shares
  FOR INSERT WITH CHECK (record_id IN (SELECT id FROM records WHERE user_id = auth.uid()));

CREATE POLICY "record_shares_delete" ON record_shares
  FOR DELETE USING (record_id IN (SELECT id FROM records WHERE user_id = auth.uid()));

-- ═══════════════════════════════════════
-- bookmarks
-- ═══════════════════════════════════════

CREATE POLICY "bookmarks_select" ON bookmarks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "bookmarks_insert" ON bookmarks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bookmarks_delete" ON bookmarks FOR DELETE USING (user_id = auth.uid());

-- ═══════════════════════════════════════
-- reactions
-- ═══════════════════════════════════════

CREATE POLICY "reactions_select" ON reactions
  FOR SELECT USING (
    record_id IN (SELECT id FROM records WHERE
      user_id = auth.uid() OR visibility = 'public'
      OR (visibility = 'group' AND id IN (
        SELECT rs.record_id FROM record_shares rs
        JOIN group_memberships gm ON rs.group_id = gm.group_id
        WHERE gm.user_id = auth.uid() AND gm.status = 'active'
      ))
    )
  );

CREATE POLICY "reactions_insert" ON reactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "reactions_update" ON reactions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "reactions_delete" ON reactions
  FOR DELETE USING (user_id = auth.uid());

-- ═══════════════════════════════════════
-- groups
-- ═══════════════════════════════════════

CREATE POLICY "groups_select" ON groups
  FOR SELECT USING (
    access_type = 'public'
    OR id IN (SELECT group_id FROM group_memberships WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "groups_insert" ON groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "groups_update" ON groups
  FOR UPDATE USING (owner_id = auth.uid());

-- ═══════════════════════════════════════
-- group_memberships
-- ═══════════════════════════════════════

CREATE POLICY "group_memberships_select" ON group_memberships
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_memberships WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "group_memberships_insert" ON group_memberships
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "group_memberships_update" ON group_memberships
  FOR UPDATE USING (
    user_id = auth.uid()
    OR group_id IN (SELECT group_id FROM group_memberships WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "group_memberships_delete" ON group_memberships
  FOR DELETE USING (
    user_id = auth.uid()
    OR group_id IN (SELECT group_id FROM group_memberships WHERE user_id = auth.uid() AND role = 'owner')
  );

-- ═══════════════════════════════════════
-- group_stats (멤버 읽기, service_role 쓰기)
-- ═══════════════════════════════════════

CREATE POLICY "group_stats_select" ON group_stats
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_memberships WHERE user_id = auth.uid() AND status = 'active')
  );

-- ═══════════════════════════════════════
-- taste_dna (본인만)
-- ═══════════════════════════════════════

CREATE POLICY "taste_dna_restaurant_all" ON taste_dna_restaurant
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "taste_dna_wine_all" ON taste_dna_wine
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "taste_dna_cooking_all" ON taste_dna_cooking
  FOR ALL USING (user_id = auth.uid());

-- ═══════════════════════════════════════
-- style_dna (본인 읽기, service_role 쓰기)
-- ═══════════════════════════════════════

CREATE POLICY "style_dna_restaurant_genres_select" ON style_dna_restaurant_genres FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "style_dna_restaurant_areas_select" ON style_dna_restaurant_areas FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "style_dna_restaurant_scenes_select" ON style_dna_restaurant_scenes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "style_dna_wine_varieties_select" ON style_dna_wine_varieties FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "style_dna_wine_regions_select" ON style_dna_wine_regions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "style_dna_wine_types_select" ON style_dna_wine_types FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "style_dna_wine_scenes_select" ON style_dna_wine_scenes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "style_dna_cooking_genres_select" ON style_dna_cooking_genres FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "style_dna_cooking_scenes_select" ON style_dna_cooking_scenes FOR SELECT USING (user_id = auth.uid());

-- ═══════════════════════════════════════
-- user_stats (본인 읽기/쓰기)
-- ═══════════════════════════════════════

CREATE POLICY "user_stats_select" ON user_stats FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_stats_insert" ON user_stats FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_stats_update" ON user_stats FOR UPDATE USING (user_id = auth.uid());

-- ═══════════════════════════════════════
-- restaurants (모두 읽기, service_role 쓰기)
-- ═══════════════════════════════════════

CREATE POLICY "restaurants_select" ON restaurants FOR SELECT USING (true);
CREATE POLICY "restaurant_stats_select" ON restaurant_stats FOR SELECT USING (true);

-- ═══════════════════════════════════════
-- phase_completions
-- ═══════════════════════════════════════

CREATE POLICY "phase_completions_select" ON phase_completions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "phase_completions_insert" ON phase_completions FOR INSERT WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════
-- comparisons
-- ═══════════════════════════════════════

CREATE POLICY "comparisons_all" ON comparisons FOR ALL USING (user_id = auth.uid());

CREATE POLICY "comparison_matchups_select" ON comparison_matchups
  FOR SELECT USING (comparison_id IN (SELECT id FROM comparisons WHERE user_id = auth.uid()));

CREATE POLICY "comparison_matchups_insert" ON comparison_matchups
  FOR INSERT WITH CHECK (comparison_id IN (SELECT id FROM comparisons WHERE user_id = auth.uid()));

CREATE POLICY "comparison_matchups_update" ON comparison_matchups
  FOR UPDATE USING (comparison_id IN (SELECT id FROM comparisons WHERE user_id = auth.uid()));

-- ═══════════════════════════════════════
-- notifications
-- ═══════════════════════════════════════

CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_delete" ON notifications FOR DELETE USING (user_id = auth.uid());

-- ═══════════════════════════════════════
-- account_deletions
-- ═══════════════════════════════════════

CREATE POLICY "account_deletions_select" ON account_deletions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "account_deletions_insert" ON account_deletions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "account_deletions_update" ON account_deletions FOR UPDATE USING (user_id = auth.uid());
