create table if not exists prompt_templates (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  category text not null,
  template text not null,
  variables jsonb default '[]',
  is_official boolean default false,
  is_public boolean default true,
  usage_count integer default 0,
  like_count integer default 0,
  dislike_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists prompt_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  prompt_template_id uuid references prompt_templates(id) on delete set null,
  restaurant_id uuid references restaurants(id) on delete set null,
  action text not null,
  created_at timestamptz default now()
);

create table if not exists prompt_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  prompt_template_id uuid references prompt_templates(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz default now(),
  unique(user_id, prompt_template_id)
);

create index if not exists idx_prompt_templates_category on prompt_templates(category);
create index if not exists idx_prompt_usage_user on prompt_usage_logs(user_id);
create index if not exists idx_prompt_usage_created on prompt_usage_logs(created_at desc);
