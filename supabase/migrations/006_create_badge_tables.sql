create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  category text not null,
  icon text not null,
  tier text,
  condition jsonb not null,
  created_at timestamptz default now()
);

create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  badge_id uuid references badges(id) on delete cascade,
  earned_at timestamptz default now(),
  unique(user_id, badge_id)
);

create index if not exists idx_user_badges_user on user_badges(user_id);
