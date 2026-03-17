-- 001_clean_slate.sql
-- Clean slate: drop all old v1 tables and types from public schema
-- This migration ensures a fresh start for the v2 schema

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all tables in public schema
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- Drop old enum types that may exist from v1
DROP TYPE IF EXISTS cuisine_category CASCADE;
DROP TYPE IF EXISTS verification_status CASCADE;
DROP TYPE IF EXISTS verification_method CASCADE;
DROP TYPE IF EXISTS prompt_type CASCADE;
DROP TYPE IF EXISTS badge_type CASCADE;
DROP TYPE IF EXISTS badge_tier CASCADE;
DROP TYPE IF EXISTS collection_type CASCADE;
DROP TYPE IF EXISTS interaction_type CASCADE;
DROP TYPE IF EXISTS taste_style_type CASCADE;
