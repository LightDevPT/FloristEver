create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  email_lower text generated always as (lower(email)) stored unique,
  username text not null,
  username_lower text generated always as (lower(username)) stored unique,
  email_verified boolean not null default false,
  failed_login_attempts integer not null default 0 check (failed_login_attempts >= 0),
  lock_until timestamptz,
  last_login_at timestamptz,
  terms_accepted_at timestamptz not null,
  terms_version text not null default '1.0',
  marketing_opt_in boolean not null default false,
  status text not null default 'active' check (status in ('active', 'disabled')),
  roles text[] not null default array['user']::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  family uuid not null,
  device_info text not null default '',
  ip text not null default '',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  replaced_by uuid references public.refresh_tokens(id) on delete set null,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index refresh_tokens_user_created_idx on public.refresh_tokens (user_id, created_at desc);
create index refresh_tokens_user_active_idx on public.refresh_tokens (user_id, expires_at) where revoked_at is null;

create table public.email_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('verify', 'reset', 'change-email')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  new_email text,
  created_at timestamptz not null default now()
);
create index email_tokens_user_idx on public.email_tokens (user_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event text not null,
  ip text not null default '',
  user_agent text not null default '',
  meta jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_user_event_idx on public.audit_logs (user_id, event);
create index audit_logs_created_idx on public.audit_logs (created_at);

create table public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  app_id text not null,
  save_version integer not null default 1,
  revision integer not null default 1,
  device_id text not null default '',
  data jsonb not null,
  checksum text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, app_id)
);

create table public.save_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  app_id text not null,
  save_version integer not null default 1,
  revision integer not null,
  device_id text not null default '',
  data jsonb not null,
  checksum text not null,
  original_updated_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index save_backups_user_app_revision_idx on public.save_backups (user_id, app_id, revision desc);

create table public.migration_map (
  source_collection text not null,
  source_id text not null,
  destination_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (source_collection, source_id)
);

alter table public.profiles enable row level security;
alter table public.refresh_tokens enable row level security;
alter table public.email_tokens enable row level security;
alter table public.audit_logs enable row level security;
alter table public.saves enable row level security;
alter table public.save_backups enable row level security;
alter table public.migration_map enable row level security;
