create extension if not exists pgcrypto;

create sequence if not exists public.farmernote_sync_version_seq;

create table if not exists public.farmer_users (
  id uuid primary key default gen_random_uuid(),
  unionid text not null unique,
  mini_openid text unique,
  app_openid text unique,
  display_name text not null default '',
  avatar_url text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.farmer_user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.farmer_users(id) on delete cascade,
  access_token_hash text not null unique,
  refresh_token_hash text not null unique,
  platform text not null check (platform in ('mini_program', 'flutter_app')),
  device_id text,
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists farmer_user_sessions_user_idx
  on public.farmer_user_sessions (user_id, platform);

create table if not exists public.entries (
  id text primary key,
  user_id uuid not null references public.farmer_users(id) on delete cascade,
  note_text text not null,
  photo_object_path text,
  source_platform text not null check (source_platform in ('mini_program', 'flutter_app')),
  created_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now()),
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_version bigint not null default nextval('public.farmernote_sync_version_seq')
);

create index if not exists entries_user_sync_idx
  on public.entries (user_id, sync_version);

create index if not exists entries_user_deleted_idx
  on public.entries (user_id, deleted_at);

create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references public.farmer_users(id) on delete cascade,
  entry_id text not null references public.entries(id) on delete cascade,
  due_at timestamptz not null,
  status text not null check (status in ('pending', 'overdue', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now()),
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_version bigint not null default nextval('public.farmernote_sync_version_seq')
);

create unique index if not exists tasks_active_entry_unique_idx
  on public.tasks (entry_id)
  where deleted_at is null;

create index if not exists tasks_user_sync_idx
  on public.tasks (user_id, sync_version);

create index if not exists tasks_user_deleted_idx
  on public.tasks (user_id, deleted_at);

create or replace function public.farmernote_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.farmernote_bump_sync_version()
returns trigger
language plpgsql
as $$
begin
  new.sync_version = nextval('public.farmernote_sync_version_seq');
  return new;
end;
$$;

drop trigger if exists farmer_users_touch_updated_at on public.farmer_users;
create trigger farmer_users_touch_updated_at
before update on public.farmer_users
for each row
execute function public.farmernote_touch_updated_at();

drop trigger if exists farmer_user_sessions_touch_updated_at on public.farmer_user_sessions;
create trigger farmer_user_sessions_touch_updated_at
before update on public.farmer_user_sessions
for each row
execute function public.farmernote_touch_updated_at();

drop trigger if exists entries_touch_updated_at on public.entries;
create trigger entries_touch_updated_at
before update on public.entries
for each row
execute function public.farmernote_touch_updated_at();

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
before update on public.tasks
for each row
execute function public.farmernote_touch_updated_at();

drop trigger if exists entries_bump_sync_version on public.entries;
create trigger entries_bump_sync_version
before insert or update on public.entries
for each row
execute function public.farmernote_bump_sync_version();

drop trigger if exists tasks_bump_sync_version on public.tasks;
create trigger tasks_bump_sync_version
before insert or update on public.tasks
for each row
execute function public.farmernote_bump_sync_version();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entry-photos',
  'entry-photos',
  false,
  26214400,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
