alter table public.farmer_users
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_scheduled_for timestamptz,
  add column if not exists deletion_confirmed_by text
    check (deletion_confirmed_by in ('phone', 'wechat')),
  add column if not exists deletion_completed_at timestamptz;

create index if not exists farmer_users_deletion_schedule_idx
  on public.farmer_users (deletion_scheduled_for)
  where deletion_requested_at is not null and deletion_completed_at is null;
