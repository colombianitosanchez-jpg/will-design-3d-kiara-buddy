create schema if not exists private;

create table if not exists private.cron_secret (
  id boolean primary key default true,
  secret text not null,
  created_at timestamptz not null default now(),
  constraint cron_secret_single_row check (id)
);

insert into private.cron_secret (id, secret)
values (true, encode(gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;

create or replace function public.verify_cron_secret(_secret text)
returns boolean
language sql
stable
security definer
set search_path = private, public
as $$
  select exists (select 1 from private.cron_secret where secret = _secret)
$$;

revoke all on function public.verify_cron_secret(text) from public, anon, authenticated;
grant execute on function public.verify_cron_secret(text) to service_role;

select cron.alter_job(
  1,
  command := $cmd$
  select net.http_post(
    url:='https://project--9b4899ec-438b-43d4-b5c4-20af0ac45e2d.lovable.app/api/public/hooks/process-notifications',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select secret from private.cron_secret limit 1)
    ),
    body:='{}'::jsonb
  ) as request_id;
  $cmd$
);