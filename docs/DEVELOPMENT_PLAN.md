# Nyam 개발 계획

> 작성일: 2026-03-15
> 기반: [PRD.md](./PRD.md)
> 백엔드: Supabase (PostgreSQL + Auth + Storage + RLS)

---

## 현재 상태 분석

### 기존 코드베이스

| 항목 | 현재 | 목표 |
|------|------|------|
| 아키텍처 | 모놀리식 (페이지에 로직 혼재) | Clean Architecture (5계층 분리) |
| 데이터 저장 | localStorage / sessionStorage | Supabase PostgreSQL |
| 인증 | 없음 | Supabase Auth (카카오, Google, Apple) |
| API | Tavily 직접 호출 | Supabase + Tavily (프롬프트 브릿지 모델) |
| 상태 관리 | 없음 (직접 DOM/storage) | SWR |
| 검색 | Tavily 웹 검색 기반 | Supabase Full-text + Kakao Local API |
| 컴포넌트 | shadcn/ui 기본 | shadcn/ui + 커스텀 디자인 시스템 |

### 유지할 것

- Next.js 16 + App Router
- shadcn/ui + Tailwind CSS + Lucide Icons
- Tavily API (프롬프트 적중률 검증용으로 용도 전환)
- 기존 UI 컴포넌트 (`src/components/ui/*`)

### 새로 도입

- `@supabase/supabase-js`, `@supabase/ssr`
- SWR (데이터 페칭 + 캐싱)
- Framer Motion (핵심 애니메이션)
- Pretendard 폰트 (가변)
- Supabase MCP (migration 및 DB 작업)

---

## 데이터베이스 설계

### ERD 개요

```
users ──────────┐
  │              │
  ├── verifications ──── restaurants
  │                        │
  ├── favorites ───────────┤
  │                        │
  ├── collections ─────────┤
  │   └── collection_items─┘
  │
  ├── user_badges
  │   └── badges
  │
  └── prompt_usage_logs
      └── prompt_templates
```

### 테이블 정의

> 구현 시 Supabase MCP를 통해 migration 파일 생성 후 적용

#### Migration 001: 기본 테이블

```sql
-- 001_create_base_tables.sql

-- 식당 정보
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  short_address text,
  phone text,
  cuisine text not null,
  cuisine_category text not null, -- 한식, 일식, 중식, 양식, 카페 등
  price_range text, -- $, $$, $$$, $$$$
  hours jsonb, -- { "mon": "11:00-21:00", ... }
  mood text[] default '{}',
  region text,
  image_url text,
  naver_map_url text,
  kakao_map_url text,
  google_map_url text,
  latitude double precision,
  longitude double precision,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 식당 평점 (외부 소스 캐싱)
create table restaurant_ratings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  source text not null, -- 'naver', 'kakao', 'google'
  rating numeric(3,2),
  review_count integer default 0,
  fetched_at timestamptz default now(),
  unique(restaurant_id, source)
);

-- 인덱스
create index idx_restaurants_cuisine on restaurants(cuisine_category);
create index idx_restaurants_region on restaurants(region);
create index idx_restaurants_location on restaurants using gist (
  ll_to_earth(latitude, longitude)
);
create index idx_restaurants_name_search on restaurants using gin (
  to_tsvector('simple', name)
);
```

#### Migration 002: 사용자 & 인증

```sql
-- 002_create_user_tables.sql

-- 사용자 프로필 (Supabase Auth 확장)
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text unique,
  avatar_url text,
  preferred_ai text default 'chatgpt', -- chatgpt, claude, gemini
  allergies text[] default '{}',
  food_preferences text[] default '{}',
  tier text default 'explorer', -- explorer, verifier, analyst, master, guide
  total_verifications integer default 0,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 새 유저 생성 시 자동 프로필 생성 트리거
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into user_profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

#### Migration 003: 검증 시스템

```sql
-- 003_create_verification_tables.sql

-- 검증 기록
create table verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  prompt_template_id uuid,
  ai_model text, -- 'chatgpt', 'claude', 'gemini', 'other'
  taste_score integer check (taste_score between 0 and 100),
  value_score integer check (value_score between 0 and 100),
  service_score integer check (service_score between 0 and 100),
  ambiance_score integer check (ambiance_score between 0 and 100),
  comment text,
  visited boolean default false,
  visited_at timestamptz,
  created_at timestamptz default now()
);

-- 식당별 검증 요약 (materialized view)
create materialized view restaurant_verification_summary as
select
  restaurant_id,
  count(*) as verification_count,
  round(avg(taste_score)) as avg_taste,
  round(avg(value_score)) as avg_value,
  round(avg(service_score)) as avg_service,
  round(avg(ambiance_score)) as avg_ambiance,
  max(created_at) as last_verified_at,
  case
    when count(*) >= 20 then 'trusted'
    when count(*) >= 5 then 'verified'
    when count(*) >= 1 then 'partial'
    else 'unverified'
  end as verification_level
from verifications
group by restaurant_id;

create unique index idx_verification_summary_restaurant
  on restaurant_verification_summary(restaurant_id);

-- 의심 플래그
create table suspicious_flags (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz default now(),
  unique(restaurant_id, user_id)
);

create index idx_verifications_restaurant on verifications(restaurant_id);
create index idx_verifications_user on verifications(user_id);
create index idx_verifications_created on verifications(created_at desc);
```

#### Migration 004: 프롬프트 시스템

```sql
-- 004_create_prompt_tables.sql

-- 프롬프트 템플릿
create table prompt_templates (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  category text not null, -- 'review_verify', 'situation_recommend', 'compare', 'info_check', 'hidden_gem'
  template text not null, -- 프롬프트 본문 (변수 포함)
  variables jsonb default '[]', -- [{ "key": "restaurant_name", "label": "식당명", "type": "auto" }]
  is_official boolean default false,
  is_public boolean default true,
  usage_count integer default 0,
  like_count integer default 0,
  dislike_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 프롬프트 사용 로그
create table prompt_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  prompt_template_id uuid references prompt_templates(id) on delete set null,
  restaurant_id uuid references restaurants(id) on delete set null,
  action text not null, -- 'copy', 'deeplink_chatgpt', 'share'
  created_at timestamptz default now()
);

-- 프롬프트 반응
create table prompt_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  prompt_template_id uuid references prompt_templates(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz default now(),
  unique(user_id, prompt_template_id)
);

create index idx_prompt_templates_category on prompt_templates(category);
create index idx_prompt_usage_user on prompt_usage_logs(user_id);
create index idx_prompt_usage_created on prompt_usage_logs(created_at desc);
```

#### Migration 005: 찜 & 컬렉션

```sql
-- 005_create_collection_tables.sql

-- 찜하기
create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, restaurant_id)
);

-- 컬렉션
create table collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 컬렉션 아이템
create table collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references collections(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  note text,
  created_at timestamptz default now(),
  unique(collection_id, restaurant_id)
);

create index idx_favorites_user on favorites(user_id);
create index idx_collection_items_collection on collection_items(collection_id);
```

#### Migration 006: 배지 시스템

```sql
-- 006_create_badge_tables.sql

-- 배지 정의
create table badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, -- 'first_verification', 'gangnam_master', etc.
  name text not null,
  description text not null,
  category text not null, -- 'milestone', 'region', 'cuisine', 'special'
  icon text not null, -- 아이콘 이름 또는 이모지
  tier text, -- 'bronze', 'silver', 'gold', 'master'
  condition jsonb not null, -- { "type": "verification_count", "value": 10 }
  created_at timestamptz default now()
);

-- 사용자 배지
create table user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  badge_id uuid references badges(id) on delete cascade,
  earned_at timestamptz default now(),
  unique(user_id, badge_id)
);

create index idx_user_badges_user on user_badges(user_id);
```

#### Migration 007: RLS 정책

```sql
-- 007_create_rls_policies.sql

-- RLS 활성화
alter table user_profiles enable row level security;
alter table verifications enable row level security;
alter table favorites enable row level security;
alter table collections enable row level security;
alter table collection_items enable row level security;
alter table prompt_templates enable row level security;
alter table prompt_usage_logs enable row level security;
alter table prompt_reactions enable row level security;
alter table user_badges enable row level security;
alter table suspicious_flags enable row level security;

-- restaurants: 누구나 읽기, 관리자만 쓰기
alter table restaurants enable row level security;
create policy "restaurants_read" on restaurants for select using (true);

-- user_profiles: 본인만 수정, 공개 프로필은 누구나 읽기
create policy "profiles_read" on user_profiles for select using (true);
create policy "profiles_update" on user_profiles for update using (auth.uid() = id);

-- verifications: 누구나 읽기, 본인만 생성
create policy "verifications_read" on verifications for select using (true);
create policy "verifications_insert" on verifications for insert with check (auth.uid() = user_id);
create policy "verifications_delete" on verifications for delete using (auth.uid() = user_id);

-- favorites: 본인 것만
create policy "favorites_all" on favorites for all using (auth.uid() = user_id);

-- collections: 본인 것 또는 공개 컬렉션 읽기
create policy "collections_read" on collections for select using (
  auth.uid() = user_id or is_public = true
);
create policy "collections_write" on collections for all using (auth.uid() = user_id);

-- collection_items: 컬렉션 소유자만
create policy "collection_items_all" on collection_items for all using (
  exists (select 1 from collections where id = collection_id and user_id = auth.uid())
);

-- prompt_templates: 공개 읽기, 본인만 수정
create policy "prompts_read" on prompt_templates for select using (
  is_public = true or auth.uid() = author_id
);
create policy "prompts_insert" on prompt_templates for insert with check (auth.uid() = author_id);
create policy "prompts_update" on prompt_templates for update using (auth.uid() = author_id);

-- prompt_usage_logs: 본인 것만
create policy "prompt_logs_all" on prompt_usage_logs for all using (auth.uid() = user_id);

-- prompt_reactions: 본인만
create policy "reactions_all" on prompt_reactions for all using (auth.uid() = user_id);

-- user_badges: 누구나 읽기
create policy "badges_read" on user_badges for select using (true);

-- suspicious_flags: 누구나 읽기, 본인만 생성
create policy "flags_read" on suspicious_flags for select using (true);
create policy "flags_insert" on suspicious_flags for insert with check (auth.uid() = user_id);
```

#### Migration 008: 함수 & 트리거

```sql
-- 008_create_functions.sql

-- 검증 완료 시 사용자 통계 업데이트
create or replace function update_user_stats()
returns trigger as $$
begin
  update user_profiles
  set
    total_verifications = total_verifications + 1,
    last_verified_at = now(),
    current_streak = case
      when last_verified_at >= now() - interval '1 day' then current_streak + 1
      else 1
    end,
    longest_streak = greatest(
      longest_streak,
      case
        when last_verified_at >= now() - interval '1 day' then current_streak + 1
        else 1
      end
    ),
    tier = case
      when total_verifications + 1 >= 100 then 'master'
      when total_verifications + 1 >= 50 then 'analyst'
      when total_verifications + 1 >= 10 then 'verifier'
      else 'explorer'
    end,
    updated_at = now()
  where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_verification_created
  after insert on verifications
  for each row execute function update_user_stats();

-- 프롬프트 사용 시 카운트 증가
create or replace function increment_prompt_usage()
returns trigger as $$
begin
  update prompt_templates
  set usage_count = usage_count + 1
  where id = new.prompt_template_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_prompt_used
  after insert on prompt_usage_logs
  for each row execute function increment_prompt_usage();

-- materialized view 주기적 갱신 (Supabase cron 또는 Edge Function)
-- refresh materialized view concurrently restaurant_verification_summary;

-- 검증 요약 새로고침 함수
create or replace function refresh_verification_summary()
returns void as $$
begin
  refresh materialized view concurrently restaurant_verification_summary;
end;
$$ language plpgsql security definer;
```

#### Migration 009: 시드 데이터

```sql
-- 009_seed_data.sql

-- 기본 프롬프트 템플릿 5종
insert into prompt_templates (title, description, category, template, variables, is_official, is_public) values
(
  '리뷰 검증',
  '식당 리뷰의 신뢰도를 AI에게 분석 요청',
  'review_verify',
  '[식당명] [지역]의 리뷰를 분석해줘.
네이버, 구글맵, 인스타그램 등 여러 소스의 평판을 종합해서:
1. 체험단/협찬 리뷰 비율이 높은지
2. 최근 6개월 리뷰 트렌드 (개선/악화)
3. 반복 언급되는 긍정/부정 키워드
4. 가격 대비 만족도
5. 실제 방문 가치가 있는지 (10점 만점)
솔직하게 평가해줘.',
  '[{"key":"restaurant_name","label":"식당명","type":"auto"},{"key":"region","label":"지역","type":"auto"}]',
  true, true
),
(
  '상황 맞춤 추천',
  '상황에 맞는 식당 3곳 추천 요청',
  'situation_recommend',
  '[지역]에서 [상황]에 맞는 식당 3곳만 추천해줘.
조건:
- 인원: [인원]명
- 예산: 1인당 [예산]원
- 분위기: [분위기]
- 제외: [제외]
추천 이유와 대표 메뉴, 예상 가격을 포함해줘.
광고/협찬이 아닌 실제 평판 기반으로만.',
  '[{"key":"region","label":"지역","type":"auto"},{"key":"situation","label":"상황","type":"preset"},{"key":"party_size","label":"인원","type":"input"},{"key":"budget","label":"예산","type":"input"},{"key":"mood","label":"분위기","type":"input"},{"key":"exclude","label":"제외","type":"input"}]',
  true, true
),
(
  '비교 분석',
  '여러 식당을 비교 분석 요청',
  'compare',
  '다음 식당들을 비교해줘: [식당A], [식당B], [식당C]
비교 기준: 맛, 가성비, 서비스, 분위기, 대기시간
표 형식으로 정리하고 최종 추천 1곳과 이유를 알려줘.',
  '[{"key":"restaurant_a","label":"식당A","type":"input"},{"key":"restaurant_b","label":"식당B","type":"input"},{"key":"restaurant_c","label":"식당C","type":"input"}]',
  true, true
),
(
  '정보 확인',
  '식당의 최신 영업 정보 확인',
  'info_check',
  '[식당명] [지역] 현재 영업 중인지 확인해줘.
최근 메뉴, 가격, 영업시간, 휴무일, 예약 필요 여부 등
가장 최신 정보를 알려줘.',
  '[{"key":"restaurant_name","label":"식당명","type":"auto"},{"key":"region","label":"지역","type":"auto"}]',
  true, true
),
(
  '숨은 맛집 발굴',
  '광고 없이 입소문으로 유명한 맛집 찾기',
  'hidden_gem',
  '[지역]에서 광고나 인플루언서 없이 입소문으로만 유명한
숨은 맛집을 찾아줘. 조건:
- 네이버 블로그 체험단 리뷰가 적을 것
- 동네 주민/단골이 추천하는 곳
- 오래된 곳 우선
- [음식종류] 중심으로',
  '[{"key":"region","label":"지역","type":"auto"},{"key":"cuisine","label":"음식종류","type":"input"}]',
  true, true
);

-- 기본 배지
insert into badges (slug, name, description, category, icon, tier, condition) values
('first_verification', '맛집 탐정', '첫 번째 AI 검증 완료', 'milestone', 'search', null, '{"type":"verification_count","value":1}'),
('verification_10', '검증 루키', 'AI 검증 10회 달성', 'milestone', 'shield-check', 'bronze', '{"type":"verification_count","value":10}'),
('verification_50', '맛집 분석가', 'AI 검증 50회 달성', 'milestone', 'bar-chart-3', 'silver', '{"type":"verification_count","value":50}'),
('verification_100', '검증 마스터', 'AI 검증 100회 달성', 'milestone', 'award', 'gold', '{"type":"verification_count","value":100}'),
('streak_7', '일주일 연속 검증', '7일 연속 검증 달성', 'special', 'flame', null, '{"type":"streak","value":7}'),
('prompt_creator', '프롬프트 장인', '커스텀 프롬프트 공유', 'special', 'sparkles', null, '{"type":"prompt_shared","value":1}'),
('early_adopter', '얼리어답터', '앱 출시 초기 가입', 'special', 'rocket', null, '{"type":"early_adopter","value":true}');
```

---

## 프로젝트 구조 (Clean Architecture)

```
src/
├── app/                              # Next.js App Router (라우팅만)
│   ├── page.tsx                      # → HomeContainer
│   ├── layout.tsx                    # Provider + 구조적 wrapper
│   ├── explore/
│   │   └── page.tsx                  # → ExploreContainer
│   ├── restaurant/[id]/
│   │   └── page.tsx                  # → RestaurantDetailContainer
│   ├── prompts/
│   │   └── page.tsx                  # → PromptsContainer
│   ├── activity/
│   │   └── page.tsx                  # → ActivityContainer
│   ├── profile/
│   │   └── page.tsx                  # → ProfileContainer
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts        # Supabase Auth 콜백
│   └── api/
│       └── cron/
│           └── refresh-summary/route.ts  # materialized view 갱신
│
├── domain/                           # Core Layer (순수, 의존성 없음)
│   ├── entities/
│   │   ├── restaurant.ts            # Restaurant, RestaurantRating
│   │   ├── verification.ts          # Verification, VerificationSummary
│   │   ├── prompt.ts                # PromptTemplate, PromptVariable
│   │   ├── user.ts                  # UserProfile, UserTier
│   │   ├── badge.ts                 # Badge, UserBadge
│   │   └── collection.ts           # Collection, Favorite
│   ├── repositories/
│   │   ├── restaurant-repository.ts # interface
│   │   ├── verification-repository.ts
│   │   ├── prompt-repository.ts
│   │   ├── user-repository.ts
│   │   ├── badge-repository.ts
│   │   └── collection-repository.ts
│   └── services/
│       ├── prompt-builder.ts        # 프롬프트 변수 치환 로직
│       ├── verification-level.ts    # 검증 등급 판정 로직
│       └── badge-checker.ts         # 배지 획득 조건 판정 로직
│
├── application/                      # Use Case Layer
│   ├── hooks/
│   │   ├── use-restaurants.ts       # SWR: 식당 목록/검색/필터
│   │   ├── use-restaurant-detail.ts # SWR: 식당 상세 + 검증 요약
│   │   ├── use-verifications.ts     # SWR: 검증 목록, 검증 생성
│   │   ├── use-prompts.ts           # SWR: 프롬프트 템플릿
│   │   ├── use-prompt-bridge.ts     # 프롬프트 생성 + 복사 + 딥링크
│   │   ├── use-favorites.ts         # SWR: 찜 목록, 토글
│   │   ├── use-collections.ts       # SWR: 컬렉션 CRUD
│   │   ├── use-user-profile.ts      # SWR: 프로필 + 통계
│   │   ├── use-badges.ts            # SWR: 배지 목록 + 획득 여부
│   │   └── use-auth.ts              # Supabase Auth 상태
│   └── useCases/
│       ├── verify-restaurant.ts     # 검증 제출 유스케이스
│       └── check-badge-eligibility.ts # 배지 획득 체크
│
├── infrastructure/                   # Infra Layer
│   ├── supabase/
│   │   ├── client.ts                # 브라우저 클라이언트
│   │   ├── server.ts                # 서버 클라이언트
│   │   └── middleware.ts            # Auth 미들웨어
│   ├── repositories/
│   │   ├── supabase-restaurant-repository.ts
│   │   ├── supabase-verification-repository.ts
│   │   ├── supabase-prompt-repository.ts
│   │   ├── supabase-user-repository.ts
│   │   ├── supabase-badge-repository.ts
│   │   └── supabase-collection-repository.ts
│   └── api/
│       ├── kakao-local-client.ts    # 식당 데이터 소스
│       └── tavily-client.ts         # 웹 검색 (검증 보조용)
│
├── presentation/                     # UI Layer
│   ├── components/
│   │   ├── ui/                      # shadcn 기본 UI (기존 유지)
│   │   ├── layout/
│   │   │   ├── bottom-nav.tsx
│   │   │   └── top-nav.tsx
│   │   ├── restaurant/
│   │   │   ├── restaurant-card.tsx
│   │   │   ├── restaurant-card-compact.tsx
│   │   │   ├── restaurant-card-skeleton.tsx
│   │   │   ├── trust-meter.tsx
│   │   │   ├── verification-badge.tsx
│   │   │   └── category-tag.tsx
│   │   ├── prompt/
│   │   │   ├── prompt-card.tsx
│   │   │   ├── prompt-preview-sheet.tsx
│   │   │   ├── prompt-variable-editor.tsx
│   │   │   └── copy-button.tsx
│   │   ├── verification/
│   │   │   ├── verification-form.tsx
│   │   │   ├── score-slider.tsx
│   │   │   └── verification-timeline.tsx
│   │   ├── badge/
│   │   │   ├── badge-card.tsx
│   │   │   ├── badge-grid.tsx
│   │   │   └── progress-bar.tsx
│   │   └── shared/
│   │       ├── empty-state.tsx
│   │       ├── error-state.tsx
│   │       └── filter-chips.tsx
│   ├── containers/
│   │   ├── home-container.tsx
│   │   ├── explore-container.tsx
│   │   ├── restaurant-detail-container.tsx
│   │   ├── prompts-container.tsx
│   │   ├── activity-container.tsx
│   │   ├── profile-container.tsx
│   │   └── auth-container.tsx
│   └── hooks/                       # UI 상태 전용
│       ├── use-copy-to-clipboard.ts
│       └── use-bottom-sheet.ts
│
├── shared/
│   ├── constants/
│   │   ├── categories.ts            # 음식 카테고리 정의
│   │   ├── situations.ts            # 상황 프리셋 정의
│   │   └── routes.ts                # 라우트 경로
│   └── utils/
│       ├── cn.ts                    # className 유틸
│       └── format.ts                # 날짜, 숫자 포맷
│
└── middleware.ts                     # Supabase Auth 세션 갱신
```

---

## 스프린트 계획

### Sprint 0: 프로젝트 셋업 (2일)

#### S0-1. 환경 설정

- [ ] Supabase MCP 연결 확인
- [ ] `@supabase/supabase-js`, `@supabase/ssr` 설치
- [ ] `swr`, `framer-motion` 설치
- [ ] Pretendard 폰트 설정
- [ ] Tailwind 디자인 토큰 설정 (design-system.md 기반)
- [ ] ESLint + import 순서 규칙 추가

#### S0-2. 데이터베이스 구축

- [ ] Supabase MCP로 migration 001~009 순차 실행
- [ ] RLS 정책 테스트
- [ ] 시드 데이터 확인

#### S0-3. 인프라 레이어 기본

- [ ] `infrastructure/supabase/client.ts` — 브라우저 클라이언트
- [ ] `infrastructure/supabase/server.ts` — 서버 클라이언트
- [ ] `infrastructure/supabase/middleware.ts` — Auth 미들웨어
- [ ] `middleware.ts` — 세션 갱신

#### S0-4. 프로젝트 구조 스캐폴딩

- [ ] Clean Architecture 폴더 구조 생성
- [ ] 기존 코드를 새 구조로 이동 (기능 변경 없이)
- [ ] 기존 `src/lib/storage.ts` 삭제 (Supabase 대체)

---

### Sprint 1: 인증 + 도메인 레이어 (3일)

#### S1-1. 도메인 엔티티

- [ ] `domain/entities/restaurant.ts` — Restaurant, RestaurantWithSummary
- [ ] `domain/entities/verification.ts` — Verification, VerificationSummary, VerificationLevel
- [ ] `domain/entities/prompt.ts` — PromptTemplate, PromptVariable, PromptCategory
- [ ] `domain/entities/user.ts` — UserProfile, UserTier
- [ ] `domain/entities/badge.ts` — Badge, UserBadge
- [ ] `domain/entities/collection.ts` — Favorite, Collection

#### S1-2. 도메인 서비스

- [ ] `domain/services/prompt-builder.ts` — 변수 치환 + 프롬프트 조립
- [ ] `domain/services/verification-level.ts` — 검증 횟수 → 등급 판정
- [ ] `domain/services/badge-checker.ts` — 배지 획득 조건 판정

#### S1-3. 리포지토리 인터페이스

- [ ] 6개 리포지토리 인터페이스 정의

#### S1-4. 인증

- [ ] Supabase Auth 설정 (카카오, Google, Apple)
- [ ] `application/hooks/use-auth.ts`
- [ ] `app/auth/login/page.tsx` — 로그인 페이지
- [ ] `app/auth/callback/route.ts` — OAuth 콜백
- [ ] 게스트 모드 지원 (비로그인 탐색 가능)

---

### Sprint 2: 식당 탐색 (4일)

#### S2-1. 인프라 구현

- [ ] `supabase-restaurant-repository.ts` — CRUD + 검색 + 필터
- [ ] `kakao-local-client.ts` — Kakao Local API 연동 (식당 데이터 수급)

#### S2-2. Application Hooks

- [ ] `use-restaurants.ts` — SWR: 목록, 검색, 카테고리/상황 필터, 페이지네이션
- [ ] `use-restaurant-detail.ts` — SWR: 상세 + 검증 요약 + 평점

#### S2-3. UI 컴포넌트

- [ ] `restaurant-card.tsx` — 검증 배지 + Trust Meter 포함 카드
- [ ] `restaurant-card-compact.tsx` — 리스트뷰용 컴팩트 카드
- [ ] `restaurant-card-skeleton.tsx` — 로딩 스켈레톤
- [ ] `trust-meter.tsx` — 4축 바 차트 (맛/가성비/서비스/분위기)
- [ ] `verification-badge.tsx` — 5단계 검증 배지
- [ ] `category-tag.tsx` — 음식 카테고리 태그 (카테고리별 컬러)
- [ ] `filter-chips.tsx` — 카테고리 + 상황 필터 칩

#### S2-4. 컨테이너 + 페이지

- [ ] `explore-container.tsx` — 검색 + 필터 + 리스트/지도 토글
- [ ] `restaurant-detail-container.tsx` — 상세 페이지
- [ ] `app/explore/page.tsx`
- [ ] `app/restaurant/[id]/page.tsx`

---

### Sprint 3: 프롬프트 브릿지 (4일)

> **MVP 핵심 기능**

#### S3-1. 인프라 구현

- [ ] `supabase-prompt-repository.ts` — 템플릿 CRUD + 사용 로그

#### S3-2. Application Hooks

- [ ] `use-prompts.ts` — SWR: 템플릿 목록, 카테고리 필터
- [ ] `use-prompt-bridge.ts` — 핵심:
  - 프롬프트 변수 자동 삽입 (식당명, 지역 등)
  - 상황 프리셋 적용
  - 클립보드 복사 (`navigator.clipboard.writeText`)
  - ChatGPT 딥링크 생성 (`https://chat.openai.com/?q=`)
  - Web Share API 호출
  - 사용 로그 기록

#### S3-3. UI 컴포넌트

- [ ] `prompt-card.tsx` — 템플릿 카드 (카테고리, 미리보기, 사용 횟수)
- [ ] `prompt-preview-sheet.tsx` — 바텀 시트 (프롬프트 전문 + 변수 편집 + 복사/딥링크 버튼)
- [ ] `prompt-variable-editor.tsx` — 변수 입력 폼 (인원, 예산, 상황 등)
- [ ] `copy-button.tsx` — 복사 버튼 (아이콘 전환 + "복사됨!" 애니메이션)

#### S3-4. 컨테이너 + 페이지

- [ ] `prompts-container.tsx` — 프롬프트 탭 (기본 5종 + 최근 사용)
- [ ] `app/prompts/page.tsx`
- [ ] 식당 상세 페이지에 "AI 검증하기" CTA 연동

#### S3-5. AI 검증하기 플로우

```
식당 카드 "AI 검증하기" 탭
  → prompt-preview-sheet 열림 (바텀 시트)
  → 프롬프트 미리보기 + 변수 자동 삽입
  → [📋 복사하기] / [↗ ChatGPT에서 열기] 버튼
  → 복사 완료 시 아이콘 전환 애니메이션
  → "ChatGPT에 붙여넣기 하세요" 토스트
```

---

### Sprint 4: 검증 시스템 (3일)

#### S4-1. 인프라 구현

- [ ] `supabase-verification-repository.ts` — 검증 생성/조회/삭제
- [ ] materialized view 갱신 API (`app/api/cron/refresh-summary/route.ts`)

#### S4-2. Application Hooks

- [ ] `use-verifications.ts` — SWR:
  - 식당별 검증 목록 (타임라인)
  - 내 검증 이력
  - 검증 생성 (mutate)

#### S4-3. UI 컴포넌트

- [ ] `verification-form.tsx` — 검증 결과 입력 폼
  - 4축 슬라이더 (맛/가성비/서비스/분위기)
  - AI 모델 선택 (ChatGPT/Claude/Gemini/기타)
  - 한 줄 코멘트 (선택)
  - "검증 완료" 버튼
- [ ] `score-slider.tsx` — 0-100 슬라이더 (컬러 그라데이션)
- [ ] `verification-timeline.tsx` — 식당별 검증 이력 타임라인

#### S4-4. 검증 완료 플로우

```
AI에서 결과 확인 후 Nyam으로 복귀
  → "검증 결과를 기록하세요" 배너 (식당 상세 페이지 상단)
  → verification-form 바텀 시트 열림
  → 4축 간편 평가 + 코멘트 입력
  → "검증 완료" 탭
  → 배지 업데이트 애니메이션 (scale + 파티클)
  → Trust Meter 업데이트 (바 채움 애니메이션)
```

---

### Sprint 5: 프로필 + 게이미피케이션 (3일)

#### S5-1. 인프라 구현

- [ ] `supabase-user-repository.ts` — 프로필 CRUD + 통계
- [ ] `supabase-badge-repository.ts` — 배지 목록 + 획득
- [ ] `supabase-collection-repository.ts` — 찜 + 컬렉션

#### S5-2. Application Hooks

- [ ] `use-user-profile.ts` — SWR: 프로필 + 검증 통계
- [ ] `use-badges.ts` — SWR: 배지 목록 + 획득 여부
- [ ] `use-favorites.ts` — SWR: 찜 토글 (낙관적 업데이트)
- [ ] `use-collections.ts` — SWR: 컬렉션 CRUD

#### S5-3. UI 컴포넌트

- [ ] `badge-card.tsx` — 배지 카드 (획득/미획득 시각 구분)
- [ ] `badge-grid.tsx` — 배지 컬렉션 그리드 (4열)
- [ ] `progress-bar.tsx` — 지역 마스터 진행률 바 + 격려 텍스트

#### S5-4. 컨테이너 + 페이지

- [ ] `activity-container.tsx` — 검증 이력 + 배지 + 진행률
- [ ] `profile-container.tsx` — 프로필 + 찜 목록 + 설정
- [ ] `app/activity/page.tsx`
- [ ] `app/profile/page.tsx`

---

### Sprint 6: 홈 + 네비게이션 + 통합 (3일)

#### S6-1. 홈 화면

- [ ] `home-container.tsx`:
  - 시간대별 추천 프롬프트 (점심/저녁)
  - 최근 검증된 맛집 (가로 스크롤)
  - 트렌딩 식당 (검증 급증)
  - 내 검증 스트릭 표시

#### S6-2. 네비게이션

- [ ] `bottom-nav.tsx` 리뉴얼 — 5탭 (홈, 탐색, 프롬프트, 활동, 프로필)
- [ ] `top-nav.tsx` — 페이지별 헤더
- [ ] 탭 활성/비활성 아이콘 전환 (outline ↔ filled)

#### S6-3. 온보딩

- [ ] 첫 방문 시 3장 온보딩 슬라이드:
  1. "별점 말고, 진짜를 찾으세요"
  2. "원탭으로 AI 검증"
  3. "나만의 맛집 지도를 완성하세요"

#### S6-4. 통합 테스트

- [ ] 핵심 플로우 E2E 확인:
  - 회원가입 → 식당 탐색 → AI 검증하기 → 프롬프트 복사 → 검증 결과 입력 → 배지 획득
- [ ] 비로그인(게스트) 플로우 확인
- [ ] 다크 모드 대응

---

### Sprint 7: 디자인 시스템 적용 + 모션 (2일)

#### S7-1. 디자인 토큰 적용

- [ ] `globals.css`에 CSS 변수 전체 적용 (design-system.md 부록 기반)
- [ ] Tailwind extend 설정 (컬러, 폰트, spacing, radius, shadow)
- [ ] 다크 모드 토큰 매핑

#### S7-2. 핵심 마이크로 인터랙션

- [ ] 프롬프트 복사 애니메이션 (아이콘 전환 + 리플 + 텍스트)
- [ ] 검증 배지 획득 애니메이션 (scale + 파티클 + 동심원)
- [ ] Trust Meter 바 채움 애니메이션 (뷰포트 진입 시)
- [ ] 카드 호버/탭 피드백
- [ ] 숫자 카운트 롤링 애니메이션

#### S7-3. 빈 상태 + 에러 상태

- [ ] 검색 결과 없음, 첫 검증 전, 찜 비어있음 등 빈 상태 UI
- [ ] 네트워크 오류, 서버 오류 등 에러 상태 UI

---

### Sprint 8: QA + 최적화 + 배포 (2일)

#### S8-1. 성능 최적화

- [ ] 이미지 최적화 (Next.js Image, WebP)
- [ ] 폰트 최적화 (Pretendard 서브셋, `font-display: swap`)
- [ ] 스켈레톤 UI로 CLS 방지
- [ ] SWR 캐시 전략 최적화

#### S8-2. 접근성

- [ ] WCAG AA 대비비 검증
- [ ] 터치 타겟 44px 확인
- [ ] 스크린 리더 시맨틱 마크업 (`aria-label`, `role`)
- [ ] `prefers-reduced-motion` 대응

#### S8-3. QA

- [ ] 모바일 (iOS Safari, Android Chrome) 테스트
- [ ] 다크 모드 전체 화면 점검
- [ ] 오프라인/느린 네트워크 대응 확인
- [ ] Lighthouse 점수 목표: Performance 90+, Accessibility 90+

#### S8-4. 배포

- [ ] Vercel 배포 설정
- [ ] 환경 변수 설정 (Supabase, Tavily, Kakao)
- [ ] 도메인 연결
- [ ] Sentry 에러 모니터링 연결

---

## 스프린트 요약

| 스프린트 | 기간 | 핵심 산출물 |
|---------|------|-----------|
| **S0** | 2일 | 환경 설정, DB 구축, 인프라 기본, 폴더 구조 |
| **S1** | 3일 | 도메인 레이어, 인증, 로그인 |
| **S2** | 4일 | 식당 탐색 (카드, 검색, 필터, 상세) |
| **S3** | 4일 | **프롬프트 브릿지** (복사, 딥링크, 바텀 시트) |
| **S4** | 3일 | 검증 시스템 (폼, 타임라인, Trust Meter) |
| **S5** | 3일 | 프로필 + 배지 + 찜 |
| **S6** | 3일 | 홈 + 네비게이션 + 온보딩 + 통합 |
| **S7** | 2일 | 디자인 시스템 + 모션 + 빈/에러 상태 |
| **S8** | 2일 | QA + 최적화 + 배포 |
| **총계** | **26일** | **MVP 완성** |

---

## 기술적 주의사항

### Supabase MCP 사용 규칙

```
1. 모든 DB 스키마 변경은 migration 파일로 관리
2. MCP를 통해 migration 생성 → 리뷰 → 적용
3. RLS 정책은 반드시 테스트 후 적용
4. materialized view는 cron 또는 Edge Function으로 주기적 갱신
```

### Clean Architecture 준수 체크리스트

```
✓ domain/ 은 어떤 외부 라이브러리도 import하지 않는다
✓ infrastructure/ 는 domain/ 인터페이스를 구현한다
✓ application/ 은 domain/ 인터페이스에만 의존한다 (구현체 직접 사용 금지)
✓ presentation/components/ 는 application/ hooks을 사용하지 않는다
✓ presentation/containers/ 만 application/ hooks을 호출한다
✓ app/ page.tsx 는 Container 렌더링만 한다
```

### 보안

```
✓ .env.local은 절대 커밋하지 않는다
✓ Supabase Service Role Key는 서버 사이드에서만 사용
✓ 클라이언트에서는 Anon Key + RLS로만 접근
✓ 사용자 입력은 항상 검증/sanitize
✓ API 키/토큰은 UI에서 마스킹
```

### 의존성 방향

```
app/ → presentation/ → application/ → domain/ ← infrastructure/

절대 위반 금지:
  ✗ domain → infrastructure (import 금지)
  ✗ presentation/components → application (hook 호출 금지)
  ✗ app/ 에 비즈니스 로직 (라우팅만)
```

---

## 참고 문서

| 문서 | 용도 |
|------|------|
| `docs/PRD.md` | 제품 요구사항 전체 |
| `docs/design-system.md` | 컬러, 타이포, 컴포넌트, 모션 사양 |
| `docs/research/design-philosophy-research.md` | 디자인 결정 근거 |
| `docs/research/ai-assisted-solution-strategy.md` | 프롬프트 브릿지 전략 |
| `docs/research/pain-points-restaurant-apps.md` | 해결할 문제 정의 |
| `CLAUDE.md` | Clean Architecture 규칙, 개발 컨벤션 |
