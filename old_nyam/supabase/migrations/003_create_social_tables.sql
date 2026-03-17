-- 003_create_social_tables.sql
-- Social features: groups, memberships, shares, bookmarks, reactions

-- =============================================================================
-- groups
-- =============================================================================

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'private'
    CHECK (type IN ('private', 'public', 'viewonly', 'paid')),
  entry_requirements JSONB DEFAULT '{}',
  price_monthly INTEGER,       -- Phase 2: paid groups
  trial_days SMALLINT,         -- Phase 2: trial period
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE groups IS 'User-created groups for sharing records';

CREATE INDEX idx_groups_owner ON groups (owner_id);
CREATE INDEX idx_groups_type ON groups (type) WHERE is_active = true;

-- =============================================================================
-- group_memberships
-- =============================================================================

CREATE TABLE IF NOT EXISTS group_memberships (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'moderator', 'member')),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'banned')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (group_id, user_id)
);

COMMENT ON TABLE group_memberships IS 'Group membership with roles';

CREATE INDEX idx_group_memberships_user ON group_memberships (user_id);

-- =============================================================================
-- record_shares (share a record to a group)
-- =============================================================================

CREATE TABLE IF NOT EXISTS record_shares (
  record_id UUID REFERENCES records(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (record_id, group_id)
);

COMMENT ON TABLE record_shares IS 'Records shared to groups';

-- =============================================================================
-- bookmarks
-- =============================================================================

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  record_id UUID REFERENCES records(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, record_id)
);

COMMENT ON TABLE bookmarks IS 'User bookmarks on records';

-- =============================================================================
-- reactions (likes and comments)
-- =============================================================================

CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('like', 'comment')),
  comment_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE reactions IS 'Likes and comments on records';

CREATE INDEX idx_reactions_record ON reactions (record_id);
CREATE INDEX idx_reactions_user ON reactions (user_id);

-- Partial unique index: one like per user per record
CREATE UNIQUE INDEX idx_reactions_unique_like
  ON reactions (user_id, record_id)
  WHERE type = 'like';
