-- 005: 소셜 (버블, 공유, 북마크, 리액션)
-- TECH_SPEC Section 3-4 + record_shares, bookmarks, reactions

-- 버블
CREATE TABLE groups (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR NOT NULL,
  description         TEXT NULL,
  owner_id            UUID NOT NULL REFERENCES auth.users(id),
  access_type         VARCHAR DEFAULT 'private' CHECK (access_type IN ('private', 'public')),
  sharing_type        VARCHAR DEFAULT 'interactive' CHECK (sharing_type IN ('interactive', 'view_only')),
  is_paid             BOOLEAN DEFAULT false,
  price_monthly       NUMERIC NULL,
  trial_days          INTEGER NULL,
  entry_requirements  JSONB NULL,
  invite_code         VARCHAR UNIQUE NULL,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE group_memberships (
  group_id            UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                group_role DEFAULT 'member',
  status              membership_status DEFAULT 'active',
  joined_at           TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE group_stats (
  group_id            UUID PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
  member_count        INTEGER DEFAULT 0,
  record_count        INTEGER DEFAULT 0,
  records_this_week   INTEGER DEFAULT 0,
  activity_score      NUMERIC DEFAULT 0,
  quality_score       NUMERIC DEFAULT 0,
  diversity_score     NUMERIC DEFAULT 0,
  external_citation   NUMERIC DEFAULT 0,
  growth_rate         NUMERIC DEFAULT 0,
  overall_score       NUMERIC DEFAULT 0,
  top_restaurants     JSONB NULL,
  top_genres          JSONB NULL,
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- 기록 공유
CREATE TABLE record_shares (
  record_id         UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  group_id          UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  shared_at         TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (record_id, group_id)
);

-- 북마크
CREATE TABLE bookmarks (
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_id         UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, record_id)
);

-- 리액션
CREATE TABLE reactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_id         UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  type              reaction_type NOT NULL,
  comment_text      TEXT NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reactions_record_id ON reactions(record_id);
