create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, restaurant_id)
);

create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references collections(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  note text,
  created_at timestamptz default now(),
  unique(collection_id, restaurant_id)
);

create index if not exists idx_favorites_user on favorites(user_id);
create index if not exists idx_collection_items_collection on collection_items(collection_id);
