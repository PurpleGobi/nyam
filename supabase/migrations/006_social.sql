-- 006_social.sql
-- Nyam v2: 소셜 관련 테이블
-- SSOT: DATA_MODEL.md §4

-- bubbles
CREATE TABLE bubbles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(20) NOT NULL,
  description VARCHAR(100),
  focus_type VARCHAR(20) NOT NULL DEFAULT 'all',
  area VARCHAR(50),
  visibility VARCHAR(20) NOT NULL DEFAULT 'private',
  content_visibility VARCHAR(20) NOT NULL DEFAULT 'rating_only',
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  allow_external_share BOOLEAN NOT NULL DEFAULT false,

  -- 가입 정책
  join_policy VARCHAR(20) NOT NULL DEFAULT 'invite_only',
  min_records INT NOT NULL DEFAULT 0,
  min_level INT NOT NULL DEFAULT 0,
  max_members INT,
  rules TEXT[],

  -- 검색/탐색
  is_searchable BOOLEAN NOT NULL DEFAULT true,
  search_keywords TEXT[],

  -- 비정규화 카운트 (트리거 실시간 갱신)
  follower_count INT NOT NULL DEFAULT 0,
  member_count INT NOT NULL DEFAULT 0,
  record_count INT NOT NULL DEFAULT 0,
  avg_satisfaction DECIMAL(4,1),
  last_activity_at TIMESTAMPTZ,

  -- 비정규화 통계 캐시 (크론 일/주간 갱신)
  unique_target_count INT NOT NULL DEFAULT 0,
  weekly_record_count INT NOT NULL DEFAULT 0,
  prev_weekly_record_count INT NOT NULL DEFAULT 0,

  -- 아이콘
  icon TEXT,
  icon_bg_color VARCHAR(10),

  created_by UUID REFERENCES users(id),
  invite_code VARCHAR(20) UNIQUE,
  invite_expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- CHECK 제약
  CONSTRAINT chk_bubbles_focus_type CHECK (focus_type IN ('all', 'restaurant', 'wine')),
  CONSTRAINT chk_bubbles_visibility CHECK (visibility IN ('private', 'public')),
  CONSTRAINT chk_bubbles_content_visibility CHECK (content_visibility IN ('rating_only', 'rating_and_comment')),
  CONSTRAINT chk_bubbles_join_policy CHECK (join_policy IN ('invite_only', 'closed', 'manual_approve', 'auto_approve', 'open'))
);

-- bubble_members
CREATE TABLE bubble_members (
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  status VARCHAR(10) NOT NULL DEFAULT 'active',
  visibility_override JSONB,

  -- 멤버 활동 캐시 (크론 일/주간 갱신)
  taste_match_pct DECIMAL(4,1),
  common_target_count INT NOT NULL DEFAULT 0,
  avg_satisfaction DECIMAL(4,1),
  member_unique_target_count INT NOT NULL DEFAULT 0,
  weekly_share_count INT NOT NULL DEFAULT 0,
  badge_label VARCHAR(30),

  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(bubble_id, user_id),

  -- CHECK 제약
  CONSTRAINT chk_bm_role CHECK (role IN ('owner', 'admin', 'member', 'follower')),
  CONSTRAINT chk_bm_status CHECK (status IN ('pending', 'active', 'rejected'))
);

CREATE INDEX idx_bubble_members_active ON bubble_members(bubble_id, role, status) WHERE status = 'active';
CREATE INDEX idx_bubble_members_user ON bubble_members(user_id, bubble_id) WHERE status = 'active';

-- bubble_shares
CREATE TABLE bubble_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id),
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(record_id, bubble_id)
);

CREATE INDEX idx_bubble_shares_bubble ON bubble_shares(bubble_id, shared_at DESC);
CREATE INDEX idx_bubble_shares_record ON bubble_shares(record_id);
CREATE INDEX idx_bubble_shares_user ON bubble_shares(shared_by);

-- comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(10) NOT NULL,
  target_id UUID NOT NULL,
  bubble_id UUID REFERENCES bubbles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content VARCHAR(300) NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_comments_target_type CHECK (target_type IN ('record'))
);

CREATE INDEX idx_comments_target ON comments(target_type, target_id, bubble_id);

-- reactions
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(10) NOT NULL,
  target_id UUID NOT NULL,
  reaction_type VARCHAR(10) NOT NULL,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(target_type, target_id, reaction_type, user_id),

  CONSTRAINT chk_reactions_target_type CHECK (target_type IN ('record', 'comment')),
  CONSTRAINT chk_reactions_type CHECK (reaction_type IN ('like', 'bookmark', 'want', 'check', 'fire'))
);

CREATE INDEX idx_reactions_target ON reactions(target_type, target_id, reaction_type);

-- bubble_share_reads (피드 읽음 확인)
CREATE TABLE bubble_share_reads (
  share_id UUID NOT NULL REFERENCES bubble_shares(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(share_id, user_id)
);

-- bubble_ranking_snapshots (랭킹 탭 등락 표시용)
CREATE TABLE bubble_ranking_snapshots (
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type VARCHAR(10) NOT NULL,
  period_start DATE NOT NULL,
  rank_position INT NOT NULL,
  avg_satisfaction DECIMAL(4,1),
  record_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY(bubble_id, target_id, target_type, period_start),

  CONSTRAINT chk_brs_target_type CHECK (target_type IN ('restaurant', 'wine'))
);

CREATE INDEX idx_ranking_snapshots_bubble_period ON bubble_ranking_snapshots(bubble_id, target_type, period_start DESC);

-- follows
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES users(id),
  following_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(10) NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(follower_id, following_id),

  CONSTRAINT chk_follows_status CHECK (status IN ('pending', 'accepted', 'rejected')),
  CONSTRAINT chk_follows_no_self CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_reverse ON follows(following_id, follower_id);
