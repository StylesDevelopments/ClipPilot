-- ClipPilot job records.
-- Job files live in Supabase Storage; this table tracks job status/progress so
-- it survives restarts and is queryable for third-party integrations.

create table if not exists public.jobs (
  id          text primary key,
  tool        text not null,
  status      text not null default 'queued',
  progress    integer not null default 0,
  step_label  text not null default '',
  options     jsonb not null default '{}'::jsonb,
  created_at  bigint not null,
  updated_at  bigint not null,
  input       jsonb not null,
  output      jsonb,
  output_kind text not null default 'video',
  error       text
);

create index if not exists jobs_created_at_idx on public.jobs (created_at desc);
create index if not exists jobs_status_idx on public.jobs (status);

-- The server uses the service-role key (which bypasses RLS). Enable RLS so the
-- table is not exposed via the public anon API; no permissive policies are
-- added, so anon/auth clients get no direct access.
alter table public.jobs enable row level security;
