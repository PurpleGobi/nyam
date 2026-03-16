create table if not exists user_taste_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  priorities text[] default '{"맛", "가성비", "서비스", "분위기"}',
  spice_tolerance text default 'medium',
  portion_preference text default 'medium',
  dining_notes text[] default '{}',
  updated_at timestamptz default now()
);

create table if not exists dining_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  restaurant_name text not null,
  visit_date date not null,
  note text default '',
  liked text[] default '{}',
  disliked text[] default '{}',
  overall_feeling text default 'good',
  created_at timestamptz default now()
);

alter table user_taste_profiles enable row level security;
alter table dining_experiences enable row level security;

create policy "taste_profile_own" on user_taste_profiles for all using (auth.uid() = user_id);
create policy "dining_experience_own" on dining_experiences for all using (auth.uid() = user_id);

create index idx_dining_experiences_user on dining_experiences(user_id, created_at desc);
create index idx_dining_experiences_restaurant on dining_experiences(restaurant_id);
