-- CF 시스템 Phase 1: 적합도 캐시 + 평균 점수 캐시

-- 1. user_similarities: 유저 쌍별 적합도 캐시
CREATE TABLE user_similarities (
  user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('restaurant', 'wine')),

  similarity REAL NOT NULL DEFAULT 0,
  confidence REAL NOT NULL DEFAULT 0,
  n_overlap INT NOT NULL DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_a, user_b, category),
  CHECK (user_a < user_b)
);

CREATE INDEX idx_sim_user_a ON user_similarities(user_a, category);
CREATE INDEX idx_sim_user_b ON user_similarities(user_b, category);

-- 2. user_score_means: 유저별 평균 점수 캐시
CREATE TABLE user_score_means (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('restaurant', 'wine')),

  mean_x REAL NOT NULL DEFAULT 50,
  mean_y REAL NOT NULL DEFAULT 50,
  record_count INT NOT NULL DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, category)
);

-- 3. RLS 활성화
ALTER TABLE user_similarities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_score_means ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책
-- user_similarities: 본인 포함 쌍만 SELECT
CREATE POLICY "own_similarities" ON user_similarities
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

-- user_score_means: 모두 SELECT 가능 (예측에 필요)
CREATE POLICY "read_means" ON user_score_means
  FOR SELECT USING (true);

-- 쓰기는 service role만 (Edge Function에서 service_role key 사용)
-- 별도 INSERT/UPDATE/DELETE 정책 없음 = RLS가 차단
