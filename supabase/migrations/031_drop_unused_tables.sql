-- Phase 1: 불필요 테이블 삭제
-- 참조: development_docs/refactoring/SCHEMA_REFACTORING.md

DROP TABLE IF EXISTS bubble_share_reads CASCADE;
DROP TABLE IF EXISTS nudge_history CASCADE;
DROP TABLE IF EXISTS nudge_fatigue CASCADE;
DROP TABLE IF EXISTS grape_variety_profiles CASCADE;
DROP TABLE IF EXISTS ai_recommendations CASCADE;
