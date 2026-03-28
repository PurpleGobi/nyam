-- 020_milestone_seeds.sql
-- 마일스톤 시드 데이터 (XP_SYSTEM.md §4-5)
-- 세부 축 고유 장소/병 수, 종합 기록 수, 재방문 횟수

-- ── 세부 축: 고유 장소/병 수 (area, genre, wine_variety, wine_region) ──
-- 각 축에서 고유 방문/시음 수 기준 마일스톤

INSERT INTO milestones (axis_type, metric, threshold, xp_reward, label) VALUES
  -- 지역별 고유 장소
  ('area', 'unique_places', 10, 25, '10번째 고유 장소'),
  ('area', 'unique_places', 20, 30, '20번째 고유 장소'),
  ('area', 'unique_places', 30, 35, '30번째 고유 장소'),
  ('area', 'unique_places', 50, 40, '50번째 고유 장소'),
  ('area', 'unique_places', 100, 50, '100번째 고유 장소'),

  -- 장르별 고유 장소
  ('genre', 'unique_places', 10, 25, '10번째 고유 장소'),
  ('genre', 'unique_places', 20, 30, '20번째 고유 장소'),
  ('genre', 'unique_places', 30, 35, '30번째 고유 장소'),
  ('genre', 'unique_places', 50, 40, '50번째 고유 장소'),
  ('genre', 'unique_places', 100, 50, '100번째 고유 장소'),

  -- 와인 산지별 고유 와인
  ('wine_region', 'unique_wines', 10, 25, '10번째 고유 와인'),
  ('wine_region', 'unique_wines', 20, 30, '20번째 고유 와인'),
  ('wine_region', 'unique_wines', 30, 35, '30번째 고유 와인'),
  ('wine_region', 'unique_wines', 50, 40, '50번째 고유 와인'),
  ('wine_region', 'unique_wines', 100, 50, '100번째 고유 와인'),

  -- 와인 품종별 고유 와인
  ('wine_variety', 'unique_wines', 10, 25, '10번째 고유 와인'),
  ('wine_variety', 'unique_wines', 20, 30, '20번째 고유 와인'),
  ('wine_variety', 'unique_wines', 30, 35, '30번째 고유 와인'),
  ('wine_variety', 'unique_wines', 50, 40, '50번째 고유 와인'),
  ('wine_variety', 'unique_wines', 100, 50, '100번째 고유 와인'),

  -- ── 종합 기록 수 (global) ──
  ('global', 'total_records', 50, 30, '50번째 기록'),
  ('global', 'total_records', 100, 40, '100번째 기록'),
  ('global', 'total_records', 200, 40, '200번째 기록'),
  ('global', 'total_records', 500, 50, '500번째 기록'),
  ('global', 'total_records', 1000, 50, '1000번째 기록'),

  -- ── 재방문 횟수 (같은 곳 N회 재방문) ──
  ('area', 'revisits', 5, 25, '같은 곳 5회 재방문'),
  ('area', 'revisits', 10, 30, '같은 곳 10회 재방문'),
  ('area', 'revisits', 20, 35, '같은 곳 20회 재방문'),
  ('area', 'revisits', 50, 40, '같은 곳 50회 재방문');
