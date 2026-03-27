-- 007_experience.sql
-- Nyam v2: 경험치 관련 테이블
-- SSOT: DATA_MODEL.md §3, XP_SYSTEM.md §5

-- user_experiences
CREATE TABLE user_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  axis_type VARCHAR(20) NOT NULL,
  axis_value VARCHAR(50) NOT NULL,
  total_xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, axis_type, axis_value),

  CONSTRAINT chk_ue_axis_type CHECK (axis_type IN ('category', 'area', 'genre', 'wine_variety', 'wine_region'))
);

CREATE INDEX idx_user_experiences_axis ON user_experiences(axis_type, axis_value);

-- xp_histories
CREATE TABLE xp_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  record_id UUID REFERENCES records(id) ON DELETE SET NULL,
  axis_type VARCHAR(20),
  axis_value VARCHAR(50),
  xp_amount INT,
  reason VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_xp_reason CHECK (reason IN (
    'record_name', 'record_score', 'record_photo', 'record_full',
    'category', 'social_share', 'social_like', 'social_follow', 'social_mutual',
    'bonus_onboard', 'bonus_first_record', 'bonus_first_bubble', 'bonus_first_share',
    'milestone', 'revisit'
  ))
);

CREATE INDEX idx_xp_histories_user_created ON xp_histories(user_id, created_at DESC);
CREATE INDEX idx_xp_histories_axis ON xp_histories(user_id, axis_type, axis_value);

-- level_thresholds
CREATE TABLE level_thresholds (
  level INT PRIMARY KEY,
  required_xp INT NOT NULL,
  title VARCHAR(20),
  color VARCHAR(10)
);

-- 시드 데이터: Lv.1~99 (XP_SYSTEM.md §5 앵커 포인트 선형 보간)
INSERT INTO level_thresholds (level, required_xp, title, color) VALUES
  (1, 0, '입문자', '#7EAE8B'),
  (2, 3, '입문자', '#7EAE8B'),
  (3, 8, '입문자', '#7EAE8B'),
  (4, 14, '초보 미식가', '#7A9BAE'),
  (5, 19, '초보 미식가', '#7A9BAE'),
  (6, 25, '탐식가', '#8B7396'),
  (7, 37, '탐식가', '#8B7396'),
  (8, 50, '미식가', '#C17B5E'),
  (9, 62, '미식가', '#C17B5E'),
  (10, 75, '식도락 마스터', '#C9A96E'),
  (11, 87, '식도락 마스터', '#C9A96E'),
  (12, 100, '식도락 마스터', '#C9A96E'),
  (13, 116, '식도락 마스터', '#C9A96E'),
  (14, 133, '식도락 마스터', '#C9A96E'),
  (15, 150, '식도락 마스터', '#C9A96E'),
  (16, 166, '식도락 마스터', '#C9A96E'),
  (17, 183, '식도락 마스터', '#C9A96E'),
  (18, 200, '식도락 마스터', '#C9A96E'),
  (19, 225, '식도락 마스터', '#C9A96E'),
  (20, 250, '식도락 마스터', '#C9A96E'),
  (21, 275, '식도락 마스터', '#C9A96E'),
  (22, 300, '식도락 마스터', '#C9A96E'),
  (23, 325, '식도락 마스터', '#C9A96E'),
  (24, 350, '식도락 마스터', '#C9A96E'),
  (25, 375, '식도락 마스터', '#C9A96E'),
  (26, 400, '식도락 마스터', '#C9A96E'),
  (27, 425, '식도락 마스터', '#C9A96E'),
  (28, 450, '식도락 마스터', '#C9A96E'),
  (29, 475, '식도락 마스터', '#C9A96E'),
  (30, 500, '식도락 마스터', '#C9A96E'),
  (31, 600, '식도락 마스터', '#C9A96E'),
  (32, 700, '식도락 마스터', '#C9A96E'),
  (33, 800, '식도락 마스터', '#C9A96E'),
  (34, 900, '식도락 마스터', '#C9A96E'),
  (35, 1000, '식도락 마스터', '#C9A96E'),
  (36, 1100, '식도락 마스터', '#C9A96E'),
  (37, 1200, '식도락 마스터', '#C9A96E'),
  (38, 1300, '식도락 마스터', '#C9A96E'),
  (39, 1400, '식도락 마스터', '#C9A96E'),
  (40, 1500, '식도락 마스터', '#C9A96E'),
  (41, 1600, '식도락 마스터', '#C9A96E'),
  (42, 1700, '식도락 마스터', '#C9A96E'),
  (43, 1800, '식도락 마스터', '#C9A96E'),
  (44, 1900, '식도락 마스터', '#C9A96E'),
  (45, 2000, '식도락 마스터', '#C9A96E'),
  (46, 2100, '식도락 마스터', '#C9A96E'),
  (47, 2200, '식도락 마스터', '#C9A96E'),
  (48, 2300, '식도락 마스터', '#C9A96E'),
  (49, 2400, '식도락 마스터', '#C9A96E'),
  (50, 2500, '식도락 마스터', '#C9A96E'),
  (51, 2600, '식도락 마스터', '#C9A96E'),
  (52, 2700, '식도락 마스터', '#C9A96E'),
  (53, 2800, '식도락 마스터', '#C9A96E'),
  (54, 2900, '식도락 마스터', '#C9A96E'),
  (55, 3000, '식도락 마스터', '#C9A96E'),
  (56, 3100, '식도락 마스터', '#C9A96E'),
  (57, 3200, '식도락 마스터', '#C9A96E'),
  (58, 3300, '식도락 마스터', '#C9A96E'),
  (59, 3400, '식도락 마스터', '#C9A96E'),
  (60, 3500, '식도락 마스터', '#C9A96E'),
  (61, 3600, '식도락 마스터', '#C9A96E'),
  (62, 3700, '식도락 마스터', '#C9A96E'),
  (63, 4080, '식도락 마스터', '#C9A96E'),
  (64, 4460, '식도락 마스터', '#C9A96E'),
  (65, 4840, '식도락 마스터', '#C9A96E'),
  (66, 5220, '식도락 마스터', '#C9A96E'),
  (67, 5600, '식도락 마스터', '#C9A96E'),
  (68, 5980, '식도락 마스터', '#C9A96E'),
  (69, 6360, '식도락 마스터', '#C9A96E'),
  (70, 6740, '식도락 마스터', '#C9A96E'),
  (71, 7120, '식도락 마스터', '#C9A96E'),
  (72, 7500, '식도락 마스터', '#C9A96E'),
  (73, 8250, '식도락 마스터', '#C9A96E'),
  (74, 9000, '식도락 마스터', '#C9A96E'),
  (75, 9750, '식도락 마스터', '#C9A96E'),
  (76, 10500, '식도락 마스터', '#C9A96E'),
  (77, 11250, '식도락 마스터', '#C9A96E'),
  (78, 12000, '식도락 마스터', '#C9A96E'),
  (79, 13333, '식도락 마스터', '#C9A96E'),
  (80, 14666, '식도락 마스터', '#C9A96E'),
  (81, 16000, '식도락 마스터', '#C9A96E'),
  (82, 18250, '식도락 마스터', '#C9A96E'),
  (83, 20500, '식도락 마스터', '#C9A96E'),
  (84, 22750, '식도락 마스터', '#C9A96E'),
  (85, 25000, '식도락 마스터', '#C9A96E'),
  (86, 28571, '식도락 마스터', '#C9A96E'),
  (87, 32142, '식도락 마스터', '#C9A96E'),
  (88, 35714, '식도락 마스터', '#C9A96E'),
  (89, 39285, '식도락 마스터', '#C9A96E'),
  (90, 42857, '식도락 마스터', '#C9A96E'),
  (91, 46428, '식도락 마스터', '#C9A96E'),
  (92, 50000, '식도락 마스터', '#C9A96E'),
  (93, 57142, '식도락 마스터', '#C9A96E'),
  (94, 64285, '식도락 마스터', '#C9A96E'),
  (95, 71428, '식도락 마스터', '#C9A96E'),
  (96, 78571, '식도락 마스터', '#C9A96E'),
  (97, 85714, '식도락 마스터', '#C9A96E'),
  (98, 92857, '식도락 마스터', '#C9A96E'),
  (99, 100000, '식도락 마스터', '#C9A96E');

-- milestones
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  axis_type VARCHAR(20) NOT NULL,
  metric VARCHAR(30) NOT NULL,
  threshold INT NOT NULL,
  xp_reward INT NOT NULL,
  label VARCHAR(50) NOT NULL,

  CONSTRAINT chk_milestones_axis_type CHECK (axis_type IN ('category', 'area', 'genre', 'wine_variety', 'wine_region', 'global'))
);

CREATE INDEX idx_milestones_axis_threshold ON milestones(axis_type, metric, threshold);

-- user_milestones
CREATE TABLE user_milestones (
  user_id UUID NOT NULL REFERENCES users(id),
  milestone_id UUID NOT NULL REFERENCES milestones(id),
  axis_value VARCHAR(50) NOT NULL DEFAULT '_global',
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id, milestone_id, axis_value)
);
