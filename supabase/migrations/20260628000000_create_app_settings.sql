create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.app_settings enable row level security;

insert into public.app_settings (key, value)
values ('auto_approve_submissions', '{"enabled": false}'::jsonb)
on conflict (key) do nothing;
