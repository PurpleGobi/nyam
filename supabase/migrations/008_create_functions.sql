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

drop trigger if exists on_verification_created on verifications;
create trigger on_verification_created
  after insert on verifications
  for each row execute function update_user_stats();

create or replace function increment_prompt_usage()
returns trigger as $$
begin
  if new.prompt_template_id is not null then
    update prompt_templates
    set usage_count = usage_count + 1
    where id = new.prompt_template_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_prompt_used on prompt_usage_logs;
create trigger on_prompt_used
  after insert on prompt_usage_logs
  for each row execute function increment_prompt_usage();

create or replace function refresh_verification_summary()
returns void as $$
begin
  refresh materialized view concurrently restaurant_verification_summary;
end;
$$ language plpgsql security definer;
