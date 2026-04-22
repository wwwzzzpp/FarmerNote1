alter table public.entries
  add column if not exists plan_instance_id text,
  add column if not exists plan_action_id text;

create table if not exists public.crop_plan_instances (
  id text primary key,
  user_id uuid not null references public.farmer_users(id) on delete cascade,
  crop_code text not null,
  region_code text not null,
  anchor_date text not null,
  status text not null default 'active' check (status in ('active')),
  created_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now()),
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_version bigint not null default nextval('public.farmernote_sync_version_seq')
);

create unique index if not exists crop_plan_instances_user_crop_unique_idx
  on public.crop_plan_instances (user_id, crop_code, region_code)
  where deleted_at is null;

create index if not exists crop_plan_instances_user_sync_idx
  on public.crop_plan_instances (user_id, sync_version);

create index if not exists crop_plan_instances_user_deleted_idx
  on public.crop_plan_instances (user_id, deleted_at);

create table if not exists public.crop_plan_action_progresses (
  id text primary key,
  user_id uuid not null references public.farmer_users(id) on delete cascade,
  plan_instance_id text not null references public.crop_plan_instances(id) on delete cascade,
  action_id text not null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now()),
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_version bigint not null default nextval('public.farmernote_sync_version_seq')
);

create unique index if not exists crop_plan_action_progresses_active_unique_idx
  on public.crop_plan_action_progresses (plan_instance_id, action_id)
  where deleted_at is null;

create index if not exists crop_plan_action_progresses_user_sync_idx
  on public.crop_plan_action_progresses (user_id, sync_version);

create index if not exists crop_plan_action_progresses_user_deleted_idx
  on public.crop_plan_action_progresses (user_id, deleted_at);

drop trigger if exists crop_plan_instances_touch_updated_at on public.crop_plan_instances;
create trigger crop_plan_instances_touch_updated_at
before update on public.crop_plan_instances
for each row
execute function public.farmernote_touch_updated_at();

drop trigger if exists crop_plan_instances_bump_sync_version on public.crop_plan_instances;
create trigger crop_plan_instances_bump_sync_version
before insert or update on public.crop_plan_instances
for each row
execute function public.farmernote_bump_sync_version();

drop trigger if exists crop_plan_action_progresses_touch_updated_at on public.crop_plan_action_progresses;
create trigger crop_plan_action_progresses_touch_updated_at
before update on public.crop_plan_action_progresses
for each row
execute function public.farmernote_touch_updated_at();

drop trigger if exists crop_plan_action_progresses_bump_sync_version on public.crop_plan_action_progresses;
create trigger crop_plan_action_progresses_bump_sync_version
before insert or update on public.crop_plan_action_progresses
for each row
execute function public.farmernote_bump_sync_version();

create or replace function public.farmernote_merge_users(
  winner_user_id uuid,
  loser_user_id uuid
)
returns void
language plpgsql
as $$
declare
  loser_unionid text;
  loser_mini_openid text;
  loser_app_openid text;
  loser_display_name text;
  loser_avatar_url text;
begin
  if winner_user_id is null or loser_user_id is null or winner_user_id = loser_user_id then
    return;
  end if;

  select
    unionid,
    mini_openid,
    app_openid,
    display_name,
    avatar_url
  into
    loser_unionid,
    loser_mini_openid,
    loser_app_openid,
    loser_display_name,
    loser_avatar_url
  from public.farmer_users
  where id = loser_user_id
  for update;

  if not found then
    return;
  end if;

  perform 1
  from public.farmer_users
  where id = winner_user_id
  for update;

  if not found then
    raise exception 'Winner user not found.';
  end if;

  update public.entries
  set user_id = winner_user_id
  where user_id = loser_user_id;

  update public.tasks
  set user_id = winner_user_id
  where user_id = loser_user_id;

  delete from public.crop_plan_action_progresses loser_progress
  where loser_progress.user_id = loser_user_id
    and exists (
      select 1
      from public.crop_plan_instances loser_plan
      join public.crop_plan_instances winner_plan
        on winner_plan.user_id = winner_user_id
       and winner_plan.crop_code = loser_plan.crop_code
       and winner_plan.region_code = loser_plan.region_code
       and winner_plan.deleted_at is null
      where loser_plan.id = loser_progress.plan_instance_id
        and loser_plan.user_id = loser_user_id
        and loser_plan.deleted_at is null
    );

  delete from public.crop_plan_instances loser_plan
  where loser_plan.user_id = loser_user_id
    and loser_plan.deleted_at is null
    and exists (
      select 1
      from public.crop_plan_instances winner_plan
      where winner_plan.user_id = winner_user_id
        and winner_plan.crop_code = loser_plan.crop_code
        and winner_plan.region_code = loser_plan.region_code
        and winner_plan.deleted_at is null
    );

  update public.crop_plan_instances
  set user_id = winner_user_id
  where user_id = loser_user_id;

  update public.crop_plan_action_progresses
  set user_id = winner_user_id
  where user_id = loser_user_id;

  delete from public.farmer_user_identities loser_identity
  where loser_identity.user_id = loser_user_id
    and exists (
      select 1
      from public.farmer_user_identities winner_identity
      where winner_identity.user_id = winner_user_id
        and winner_identity.provider = loser_identity.provider
        and winner_identity.identity_key = loser_identity.identity_key
    );

  update public.farmer_user_identities
  set user_id = winner_user_id
  where user_id = loser_user_id;

  delete from public.farmer_user_sessions
  where user_id = loser_user_id;

  update public.farmer_users
  set
    unionid = coalesce(unionid, loser_unionid),
    mini_openid = coalesce(mini_openid, loser_mini_openid),
    app_openid = coalesce(app_openid, loser_app_openid),
    display_name = coalesce(display_name, loser_display_name),
    avatar_url = coalesce(avatar_url, loser_avatar_url)
  where id = winner_user_id;

  update public.farmer_users
  set merged_into_user_id = winner_user_id
  where id = loser_user_id;
end;
$$;
