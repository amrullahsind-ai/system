-- ARISE SYSTEM v31 Supabase Sync Schema
create table if not exists public.arise_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  system jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  quests jsonb not null default '[]'::jsonb,
  logs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.arise_profiles enable row level security;
create policy "read own arise profile" on public.arise_profiles for select using (auth.uid() = user_id);
create policy "insert own arise profile" on public.arise_profiles for insert with check (auth.uid() = user_id);
create policy "update own arise profile" on public.arise_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
