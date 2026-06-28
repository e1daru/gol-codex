create extension if not exists pgcrypto;

do $$
begin
  create type public.submission_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 16),
  status public.submission_status not null default 'pending',
  client_token_hash text not null,
  ip_hash text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  approved_by text
);

create index if not exists submissions_status_created_at_idx on public.submissions (status, created_at desc);
create index if not exists submissions_status_approved_at_idx on public.submissions (status, approved_at asc);
create index if not exists submissions_ip_hash_created_at_idx on public.submissions (ip_hash, created_at desc);

alter table public.submissions enable row level security;

drop policy if exists "Approved submissions are publicly readable" on public.submissions;
create policy "Approved submissions are publicly readable"
  on public.submissions
  for select
  to anon, authenticated
  using (status = 'approved');

do $$
begin
  alter publication supabase_realtime add table public.submissions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
