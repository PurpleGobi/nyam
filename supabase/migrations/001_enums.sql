-- 001: Enum 타입 정의
-- TECH_SPEC Section 3-0

CREATE TYPE record_type AS ENUM ('restaurant', 'wine', 'cooking');
CREATE TYPE visibility AS ENUM ('private', 'group', 'public');
CREATE TYPE auth_provider AS ENUM ('kakao', 'naver', 'google', 'apple');
CREATE TYPE group_role AS ENUM ('owner', 'moderator', 'member');
CREATE TYPE membership_status AS ENUM ('active', 'pending', 'banned');
CREATE TYPE reaction_type AS ENUM ('like', 'comment', 'useful', 'yummy');
