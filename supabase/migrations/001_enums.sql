-- 001_enums.sql
-- Nyam v2: 확장 및 커스텀 타입
-- ENUM 대신 VARCHAR + CHECK/애플리케이션 검증 사용

-- PostGIS 확장 (restaurants 위치 인덱스용)
CREATE EXTENSION IF NOT EXISTS postgis;

-- UUID 생성 함수 (Supabase 기본 포함이지만 명시)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
