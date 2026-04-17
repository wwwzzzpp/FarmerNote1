alter table public.farmer_users
  alter column unionid drop not null;

alter table public.farmer_users
  add column if not exists merged_into_user_id uuid references public.farmer_users(id),
  add column if not exists merged_at timestamptz;

create table if not exists public.farmer_user_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.farmer_users(id) on delete cascade,
  provider text not null check (
    provider in (
      'wechat_unionid',
      'wechat_mini_openid',
      'wechat_app_openid',
      'phone'
    )
  ),
  identity_key text not null,
  verified_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists farmer_user_identities_provider_key_idx
  on public.farmer_user_identities (provider, identity_key);

create index if not exists farmer_user_identities_user_idx
  on public.farmer_user_identities (user_id, provider);

drop trigger if exists farmer_user_identities_touch_updated_at on public.farmer_user_identities;
create trigger farmer_user_identities_touch_updated_at
before update on public.farmer_user_identities
for each row
execute function public.farmernote_touch_updated_at();

insert into public.farmer_user_identities (user_id, provider, identity_key, verified_at)
select
  id,
  'wechat_unionid',
  unionid,
  coalesce(updated_at, created_at)
from public.farmer_users
where coalesce(unionid, '') <> ''
on conflict (provider, identity_key) do nothing;

insert into public.farmer_user_identities (user_id, provider, identity_key, verified_at)
select
  id,
  'wechat_mini_openid',
  mini_openid,
  coalesce(updated_at, created_at)
from public.farmer_users
where coalesce(mini_openid, '') <> ''
on conflict (provider, identity_key) do nothing;

insert into public.farmer_user_identities (user_id, provider, identity_key, verified_at)
select
  id,
  'wechat_app_openid',
  app_openid,
  coalesce(updated_at, created_at)
from public.farmer_users
where coalesce(app_openid, '') <> ''
on conflict (provider, identity_key) do nothing;

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
    display_name = case
      when coalesce(trim(display_name), '') = '' then coalesce(loser_display_name, '')
      else display_name
    end,
    avatar_url = case
      when coalesce(trim(avatar_url), '') = '' then coalesce(loser_avatar_url, '')
      else avatar_url
    end
  where id = winner_user_id;

  update public.farmer_users
  set
    unionid = null,
    mini_openid = null,
    app_openid = null,
    merged_into_user_id = winner_user_id,
    merged_at = timezone('utc', now())
  where id = loser_user_id;
end;
$$;
