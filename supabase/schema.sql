create extension if not exists pgcrypto;

create table if not exists public.flow_track_snapshots (
  id uuid primary key default gen_random_uuid(),
  scope_key text not null unique,
  state_json jsonb not null default '{"standaloneItems": [], "releases": [], "environments": [], "deployments": []}'::jsonb,
  version integer not null default 1,
  updated_by uuid null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_flow_track_snapshot_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_flow_track_snapshot_updated_at on public.flow_track_snapshots;

create trigger set_flow_track_snapshot_updated_at
before update on public.flow_track_snapshots
for each row
execute function public.set_flow_track_snapshot_updated_at();

alter table public.flow_track_snapshots disable row level security;

insert into public.flow_track_snapshots (scope_key)
values ('global/default')
on conflict (scope_key) do nothing;