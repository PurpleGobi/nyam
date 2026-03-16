create table if not exists verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  prompt_template_id uuid,
  ai_model text,
  taste_score integer check (taste_score between 0 and 100),
  value_score integer check (value_score between 0 and 100),
  service_score integer check (service_score between 0 and 100),
  ambiance_score integer check (ambiance_score between 0 and 100),
  comment text,
  visited boolean default false,
  visited_at timestamptz,
  created_at timestamptz default now()
);

create materialized view if not exists restaurant_verification_summary as
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

create unique index if not exists idx_verification_summary_restaurant
  on restaurant_verification_summary(restaurant_id);

create table if not exists suspicious_flags (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz default now(),
  unique(restaurant_id, user_id)
);

create index if not exists idx_verifications_restaurant on verifications(restaurant_id);
create index if not exists idx_verifications_user on verifications(user_id);
create index if not exists idx_verifications_created on verifications(created_at desc);
