create table if not exists public.farmer_request_rate_limits (
  scope_type text not null check (scope_type in ('user', 'ip')),
  scope_key text not null,
  endpoint text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (scope_type, scope_key, endpoint, window_started_at)
);

create index if not exists farmer_request_rate_limits_window_idx
  on public.farmer_request_rate_limits (window_started_at);

create index if not exists farmer_request_rate_limits_updated_idx
  on public.farmer_request_rate_limits (updated_at);

create or replace function public.farmernote_consume_rate_limit(
  p_scope_type text,
  p_scope_key text,
  p_endpoint text,
  p_request_limit integer default 30,
  p_window_seconds integer default 60
)
returns table (
  allowed boolean,
  request_count integer,
  limit_value integer,
  retry_after_seconds integer,
  window_started_at timestamptz
)
language plpgsql
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_scope_type text := trim(coalesce(p_scope_type, ''));
  v_scope_key text := trim(coalesce(p_scope_key, ''));
  v_endpoint text := trim(coalesce(p_endpoint, ''));
  v_limit integer := greatest(coalesce(p_request_limit, 30), 1);
  v_window_seconds integer := greatest(coalesce(p_window_seconds, 60), 1);
  v_window_started_at timestamptz := to_timestamp(
    floor(extract(epoch from v_now) / v_window_seconds) * v_window_seconds
  );
  v_window_ends_at timestamptz := v_window_started_at + make_interval(secs => v_window_seconds);
  v_request_count integer;
  v_inserted integer := 0;
  v_allowed boolean := false;
begin
  if v_scope_type = '' then
    raise exception 'Missing scope type.';
  end if;

  if v_scope_key = '' then
    raise exception 'Missing scope key.';
  end if;

  if v_endpoint = '' then
    raise exception 'Missing endpoint.';
  end if;

  insert into public.farmer_request_rate_limits (
    scope_type,
    scope_key,
    endpoint,
    window_started_at,
    request_count,
    created_at,
    updated_at
  )
  values (
    v_scope_type,
    v_scope_key,
    v_endpoint,
    v_window_started_at,
    1,
    v_now,
    v_now
  )
  on conflict do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    v_request_count := 1;
    v_allowed := true;
  else
    update public.farmer_request_rate_limits as limits
    set
      request_count = limits.request_count + 1,
      updated_at = v_now
    where
      limits.scope_type = v_scope_type
      and limits.scope_key = v_scope_key
      and limits.endpoint = v_endpoint
      and limits.window_started_at = v_window_started_at
      and limits.request_count < v_limit
    returning limits.request_count
    into v_request_count;

    if v_request_count is null then
      v_allowed := false;
      select limits.request_count
      into v_request_count
      from public.farmer_request_rate_limits as limits
      where
        limits.scope_type = v_scope_type
        and limits.scope_key = v_scope_key
        and limits.endpoint = v_endpoint
        and limits.window_started_at = v_window_started_at;
    else
      v_allowed := true;
    end if;
  end if;

  allowed := v_allowed;
  request_count := coalesce(v_request_count, 0);
  limit_value := v_limit;
  retry_after_seconds := greatest(
    1,
    ceil(extract(epoch from (v_window_ends_at - v_now)))::integer
  );
  window_started_at := v_window_started_at;

  return next;
end;
$$;
