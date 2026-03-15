-- User interaction tracking for behavior pattern analysis
-- Append-only event log for implicit preference tracking

create table if not exists user_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event_type text not null,
  event_data jsonb default '{}',
  created_at timestamptz default now()
);

-- RLS
alter table user_interactions enable row level security;
create policy "interaction_own" on user_interactions for all using (auth.uid() = user_id);

-- Indexes
create index idx_interactions_user_time on user_interactions(user_id, created_at desc);
create index idx_interactions_event_type on user_interactions(user_id, event_type);

-- Aggregation function: returns preference summary for a user over N days
create or replace function get_user_preference_summary(p_user_id uuid, p_days int default 90)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'top_cuisines', (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (
      SELECT event_data->>'category' as label, count(*) as count
      FROM user_interactions WHERE user_id = p_user_id
        AND event_type in ('category_click','restaurant_view')
        AND event_data->>'category' IS NOT NULL
        AND created_at > now() - (p_days || ' days')::interval
      GROUP BY 1 ORDER BY 2 DESC LIMIT 5
    ) t),
    'top_regions', (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (
      SELECT event_data->>'region' as label, count(*) as count
      FROM user_interactions WHERE user_id = p_user_id
        AND event_type in ('region_select','restaurant_view')
        AND event_data->>'region' IS NOT NULL
        AND created_at > now() - (p_days || ' days')::interval
      GROUP BY 1 ORDER BY 2 DESC LIMIT 5
    ) t),
    'top_situations', (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (
      SELECT event_data->>'label' as label, count(*) as count
      FROM user_interactions WHERE user_id = p_user_id
        AND event_type = 'situation_click'
        AND created_at > now() - (p_days || ' days')::interval
      GROUP BY 1 ORDER BY 2 DESC LIMIT 3
    ) t),
    'search_keywords', (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (
      SELECT event_data->>'query' as label, count(*) as count
      FROM user_interactions WHERE user_id = p_user_id
        AND event_type = 'search_query'
        AND created_at > now() - (p_days || ' days')::interval
      GROUP BY 1 ORDER BY 2 DESC LIMIT 5
    ) t),
    'total_interactions', (SELECT count(*) FROM user_interactions
      WHERE user_id = p_user_id AND created_at > now() - (p_days || ' days')::interval
    ),
    'computed_at', now()
  );
$$;
