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
alter table restaurants enable row level security;
alter table restaurant_ratings enable row level security;
alter table badges enable row level security;

-- restaurants: public read
create policy "restaurants_read" on restaurants for select using (true);
create policy "restaurant_ratings_read" on restaurant_ratings for select using (true);

-- user_profiles
create policy "profiles_read" on user_profiles for select using (true);
create policy "profiles_update" on user_profiles for update using (auth.uid() = id);
create policy "profiles_insert" on user_profiles for insert with check (auth.uid() = id);

-- verifications
create policy "verifications_read" on verifications for select using (true);
create policy "verifications_insert" on verifications for insert with check (auth.uid() = user_id);
create policy "verifications_delete" on verifications for delete using (auth.uid() = user_id);

-- favorites
create policy "favorites_select" on favorites for select using (auth.uid() = user_id);
create policy "favorites_insert" on favorites for insert with check (auth.uid() = user_id);
create policy "favorites_delete" on favorites for delete using (auth.uid() = user_id);

-- collections
create policy "collections_read" on collections for select using (auth.uid() = user_id or is_public = true);
create policy "collections_insert" on collections for insert with check (auth.uid() = user_id);
create policy "collections_update" on collections for update using (auth.uid() = user_id);
create policy "collections_delete" on collections for delete using (auth.uid() = user_id);

-- collection_items
create policy "collection_items_select" on collection_items for select using (
  exists (select 1 from collections where id = collection_id and (user_id = auth.uid() or is_public = true))
);
create policy "collection_items_insert" on collection_items for insert with check (
  exists (select 1 from collections where id = collection_id and user_id = auth.uid())
);
create policy "collection_items_delete" on collection_items for delete using (
  exists (select 1 from collections where id = collection_id and user_id = auth.uid())
);

-- prompt_templates
create policy "prompts_read" on prompt_templates for select using (is_public = true or auth.uid() = author_id);
create policy "prompts_insert" on prompt_templates for insert with check (auth.uid() = author_id);
create policy "prompts_update" on prompt_templates for update using (auth.uid() = author_id);

-- prompt_usage_logs: allow insert for anyone (even anonymous for logging)
create policy "prompt_logs_insert" on prompt_usage_logs for insert with check (true);
create policy "prompt_logs_select" on prompt_usage_logs for select using (auth.uid() = user_id);

-- prompt_reactions
create policy "reactions_select" on prompt_reactions for select using (auth.uid() = user_id);
create policy "reactions_insert" on prompt_reactions for insert with check (auth.uid() = user_id);
create policy "reactions_update" on prompt_reactions for update using (auth.uid() = user_id);
create policy "reactions_delete" on prompt_reactions for delete using (auth.uid() = user_id);

-- badges: public read
create policy "badges_read" on badges for select using (true);

-- user_badges
create policy "user_badges_read" on user_badges for select using (true);

-- suspicious_flags
create policy "flags_read" on suspicious_flags for select using (true);
create policy "flags_insert" on suspicious_flags for insert with check (auth.uid() = user_id);
