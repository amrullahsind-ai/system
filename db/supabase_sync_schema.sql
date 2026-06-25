-- ARISE SYSTEM v32 Supabase Sync Schema
create table if not exists public.arise_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  system jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  quests jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  penalty jsonb not null default '{}'::jsonb,
  logs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.arise_profiles enable row level security;

drop policy if exists "read own arise profile" on public.arise_profiles;
drop policy if exists "insert own arise profile" on public.arise_profiles;
drop policy if exists "update own arise profile" on public.arise_profiles;

create policy "read own arise profile"
on public.arise_profiles for select
using (auth.uid() = user_id);

create policy "insert own arise profile"
on public.arise_profiles for insert
with check (auth.uid() = user_id);

create policy "update own arise profile"
on public.arise_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Personal/server-token sync fallback used by /api/profile.
-- This table is written only by the Vercel server with SUPABASE_SERVICE_ROLE_KEY.
create table if not exists public.arise_player_states (
  player_id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.arise_player_states enable row level security;
