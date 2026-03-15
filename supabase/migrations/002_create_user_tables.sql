create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text unique,
  avatar_url text,
  preferred_ai text default 'chatgpt',
  allergies text[] default '{}',
  food_preferences text[] default '{}',
  tier text default 'explorer',
  total_verifications integer default 0,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into user_profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
