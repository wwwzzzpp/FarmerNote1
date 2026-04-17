create table if not exists public.farmer_phone_verification_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  purpose text not null check (purpose in ('auth')),
  provider text not null default 'aliyun_sms' check (provider in ('aliyun_sms')),
  code_hash text not null,
  status text not null default 'pending' check (
    status in (
      'pending',
      'verified',
      'expired',
      'attempts_exhausted',
      'send_failed'
    )
  ),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  expires_at timestamptz not null,
  sent_at timestamptz not null default timezone('utc', now()),
  verified_at timestamptz,
  consumed_at timestamptz,
  delivery_id text,
  template_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists farmer_phone_verification_codes_phone_idx
  on public.farmer_phone_verification_codes (phone, purpose, created_at desc);

create index if not exists farmer_phone_verification_codes_status_idx
  on public.farmer_phone_verification_codes (status, expires_at);

drop trigger if exists farmer_phone_verification_codes_touch_updated_at
  on public.farmer_phone_verification_codes;
create trigger farmer_phone_verification_codes_touch_updated_at
before update on public.farmer_phone_verification_codes
for each row
execute function public.farmernote_touch_updated_at();
