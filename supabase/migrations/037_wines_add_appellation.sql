-- 와인 산지 4단계 cascade 확장: country → region → sub_region → appellation
-- Burgundy village AOC, Napa AVA, Barossa GI, South Africa Ward 등

ALTER TABLE wines ADD COLUMN appellation VARCHAR(100);

-- 기존 3단계 인덱스 → 4단계 확장
DROP INDEX IF EXISTS idx_wines_region;
CREATE INDEX idx_wines_region ON wines(country, region, sub_region, appellation);
