-- 032_cleanup_legacy_tables.sql
-- Phase 5 정리: 마이그레이션 완료 후 구 테이블 삭제
-- 참조: development_docs/refactoring/SCHEMA_REFACTORING.md
-- 전제: lists + records(새 구조)가 정상 동작 확인 완료

-- 1. 구 records 백업 테이블 삭제
DROP TABLE IF EXISTS records_old CASCADE;

-- 2. wishlists 테이블 삭제 (lists.status='wishlist'로 대체됨)
DROP TABLE IF EXISTS wishlists CASCADE;

-- 3. records에서 마이그레이션 추적용 컬럼 제거
ALTER TABLE records DROP COLUMN IF EXISTS legacy_record_id;
