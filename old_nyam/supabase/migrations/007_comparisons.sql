-- 007: 비교 게임 (Phase 3)
-- TECH_SPEC Section 3-4 (comparisons, comparison_matchups)

CREATE TABLE comparisons (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  genre             VARCHAR NULL,
  wine_comparison_criteria JSONB NULL,
  bracket_size      SMALLINT NOT NULL,
  status            VARCHAR DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  winner_record_id  UUID NULL REFERENCES records(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE comparison_matchups (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id  UUID NOT NULL REFERENCES comparisons(id) ON DELETE CASCADE,
  round          SMALLINT NOT NULL,
  match_index    SMALLINT NOT NULL,
  record_a_id    UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  record_b_id    UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  winner_id      UUID NULL REFERENCES records(id) ON DELETE SET NULL
);

CREATE INDEX idx_comparison_matchups_comparison_id ON comparison_matchups(comparison_id);
