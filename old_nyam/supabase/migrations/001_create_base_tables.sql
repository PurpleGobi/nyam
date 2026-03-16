-- 식당 정보
create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  short_address text,
  phone text,
  cuisine text not null,
  cuisine_category text not null,
  price_range text,
  hours jsonb,
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

create table if not exists restaurant_ratings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  source text not null,
  rating numeric(3,2),
  review_count integer default 0,
  fetched_at timestamptz default now(),
  unique(restaurant_id, source)
);

create index if not exists idx_restaurants_cuisine on restaurants(cuisine_category);
create index if not exists idx_restaurants_region on restaurants(region);
create index if not exists idx_restaurants_name_search on restaurants using gin (to_tsvector('simple', name));
