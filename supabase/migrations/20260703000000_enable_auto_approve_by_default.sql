insert into public.app_settings (key, value, updated_at, updated_by)
values ('auto_approve_submissions', '{"enabled": true}'::jsonb, now(), 'migration:enable-auto-approve-by-default')
on conflict (key) do update
set
  value = excluded.value,
  updated_at = excluded.updated_at,
  updated_by = excluded.updated_by;
