-- 버블 전문성 집계 뷰: 버블별 멤버들의 축별(지역/장르/산지/품종) 평균 레벨
CREATE VIEW bubble_expertise AS
SELECT
  bm.bubble_id,
  xt.axis_type,
  xt.axis_value,
  COUNT(DISTINCT bm.user_id) AS member_count,
  AVG(xt.level)::INT AS avg_level,
  MAX(xt.level) AS max_level,
  SUM(xt.total_xp) AS total_xp
FROM bubble_members bm
JOIN xp_totals xt ON xt.user_id = bm.user_id
WHERE bm.status = 'active'
  AND bm.role IN ('owner', 'admin', 'member')
  AND xt.axis_type IN ('area', 'genre', 'wine_variety', 'wine_region')
GROUP BY bm.bubble_id, xt.axis_type, xt.axis_value;
