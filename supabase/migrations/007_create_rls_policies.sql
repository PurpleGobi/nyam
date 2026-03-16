-- 007_create_rls_policies.sql
-- Row Level Security policies for all tables

-- =============================================================================
-- Enable RLS on all tables
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE taste_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE taste_dna_wine ENABLE ROW LEVEL SECURITY;
ALTER TABLE taste_dna_homecook ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_atlas_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_atlas_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_atlas_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_stats ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- users
-- =============================================================================

-- Anyone authenticated can view any profile
CREATE POLICY users_select ON users
  FOR SELECT TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY users_update ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can insert their own profile row
CREATE POLICY users_insert ON users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- =============================================================================
-- restaurants
-- =============================================================================

-- Anyone authenticated can view restaurants
CREATE POLICY restaurants_select ON restaurants
  FOR SELECT TO authenticated
  USING (true);

-- Anyone authenticated can insert restaurants
CREATE POLICY restaurants_insert ON restaurants
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Anyone authenticated can update restaurants (source data sync)
CREATE POLICY restaurants_update ON restaurants
  FOR UPDATE TO authenticated
  USING (true);

-- =============================================================================
-- records
-- =============================================================================

-- Users can see: own records, public records, or records shared to their groups
CREATE POLICY records_select ON records
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR EXISTS (
      SELECT 1 FROM record_shares rs
      JOIN group_memberships gm ON gm.group_id = rs.group_id
      WHERE rs.record_id = records.id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
  );

-- Users can insert their own records
CREATE POLICY records_insert ON records
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own records
CREATE POLICY records_update ON records
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own records
CREATE POLICY records_delete ON records
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- record_photos (follows parent record access)
-- =============================================================================

CREATE POLICY record_photos_select ON record_photos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM records r
      WHERE r.id = record_photos.record_id
        AND (
          r.user_id = auth.uid()
          OR r.visibility = 'public'
          OR EXISTS (
            SELECT 1 FROM record_shares rs
            JOIN group_memberships gm ON gm.group_id = rs.group_id
            WHERE rs.record_id = r.id
              AND gm.user_id = auth.uid()
              AND gm.status = 'active'
          )
        )
    )
  );

CREATE POLICY record_photos_insert ON record_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM records r
      WHERE r.id = record_photos.record_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY record_photos_update ON record_photos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM records r
      WHERE r.id = record_photos.record_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY record_photos_delete ON record_photos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM records r
      WHERE r.id = record_photos.record_id AND r.user_id = auth.uid()
    )
  );

-- =============================================================================
-- record_journals (follows parent record access)
-- =============================================================================

CREATE POLICY record_journals_select ON record_journals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM records r
      WHERE r.id = record_journals.record_id
        AND (
          r.user_id = auth.uid()
          OR r.visibility = 'public'
          OR EXISTS (
            SELECT 1 FROM record_shares rs
            JOIN group_memberships gm ON gm.group_id = rs.group_id
            WHERE rs.record_id = r.id
              AND gm.user_id = auth.uid()
              AND gm.status = 'active'
          )
        )
    )
  );

CREATE POLICY record_journals_insert ON record_journals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM records r
      WHERE r.id = record_journals.record_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY record_journals_update ON record_journals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM records r
      WHERE r.id = record_journals.record_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY record_journals_delete ON record_journals
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM records r
      WHERE r.id = record_journals.record_id AND r.user_id = auth.uid()
    )
  );

-- =============================================================================
-- groups
-- =============================================================================

-- View public/viewonly groups or groups user is a member of
CREATE POLICY groups_select ON groups
  FOR SELECT TO authenticated
  USING (
    type IN ('public', 'viewonly')
    OR owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = groups.id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
  );

-- Any authenticated user can create a group
CREATE POLICY groups_insert ON groups
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Only owner can update
CREATE POLICY groups_update ON groups
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Only owner can delete
CREATE POLICY groups_delete ON groups
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- =============================================================================
-- group_memberships
-- =============================================================================

-- Members can see memberships of groups they belong to
CREATE POLICY group_memberships_select ON group_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_memberships gm2
      WHERE gm2.group_id = group_memberships.group_id
        AND gm2.user_id = auth.uid()
        AND gm2.status = 'active'
    )
  );

-- Owner or moderator can manage memberships
CREATE POLICY group_memberships_insert ON group_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Self-join (request to join)
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('owner', 'moderator')
        AND gm.status = 'active'
    )
  );

CREATE POLICY group_memberships_update ON group_memberships
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('owner', 'moderator')
        AND gm.status = 'active'
    )
  );

CREATE POLICY group_memberships_delete ON group_memberships
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('owner', 'moderator')
        AND gm.status = 'active'
    )
  );

-- =============================================================================
-- record_shares
-- =============================================================================

-- Group members can see shares in their groups
CREATE POLICY record_shares_select ON record_shares
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = record_shares.group_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
  );

-- Record owner can share to groups they belong to
CREATE POLICY record_shares_insert ON record_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM records r
      WHERE r.id = record_shares.record_id AND r.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = record_shares.group_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
  );

-- Record owner can unshare
CREATE POLICY record_shares_delete ON record_shares
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM records r
      WHERE r.id = record_shares.record_id AND r.user_id = auth.uid()
    )
  );

-- =============================================================================
-- bookmarks (own only)
-- =============================================================================

CREATE POLICY bookmarks_select ON bookmarks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY bookmarks_insert ON bookmarks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY bookmarks_delete ON bookmarks
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- reactions
-- =============================================================================

-- Can see reactions on records you can see
CREATE POLICY reactions_select ON reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM records r
      WHERE r.id = reactions.record_id
        AND (
          r.user_id = auth.uid()
          OR r.visibility = 'public'
          OR EXISTS (
            SELECT 1 FROM record_shares rs
            JOIN group_memberships gm ON gm.group_id = rs.group_id
            WHERE rs.record_id = r.id
              AND gm.user_id = auth.uid()
              AND gm.status = 'active'
          )
        )
    )
  );

CREATE POLICY reactions_insert ON reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY reactions_delete ON reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- taste_dna tables (own only)
-- =============================================================================

CREATE POLICY taste_dna_select ON taste_dna
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY taste_dna_update ON taste_dna
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY taste_dna_wine_select ON taste_dna_wine
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY taste_dna_wine_update ON taste_dna_wine
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY taste_dna_homecook_select ON taste_dna_homecook
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY taste_dna_homecook_update ON taste_dna_homecook
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- experience_atlas tables (select any, update own)
-- =============================================================================

CREATE POLICY experience_atlas_regions_select ON experience_atlas_regions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY experience_atlas_regions_update ON experience_atlas_regions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY experience_atlas_genres_select ON experience_atlas_genres
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY experience_atlas_genres_update ON experience_atlas_genres
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY experience_atlas_scenes_select ON experience_atlas_scenes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY experience_atlas_scenes_update ON experience_atlas_scenes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- stats tables (select any, no manual insert/update - system managed)
-- =============================================================================

CREATE POLICY user_stats_select ON user_stats
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY group_stats_select ON group_stats
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY restaurant_stats_select ON restaurant_stats
  FOR SELECT TO authenticated
  USING (true);
