-- Optional Supabase database schema for ARISE SYSTEM.
-- Personal/private version can run fully on localStorage without database.

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  age int,
  gender text,
  height_cm numeric,
  weight_kg numeric,
  target_weight_kg numeric,
  goal text,
  condition text,
  activity text,
  frequency int,
  equipment jsonb default '[]'::jsonb,
  health jsonb default '[]'::jsonb,
  focus jsonb default '[]'::jsonb,
  ability jsonb default '{}'::jsonb,
  system_stats jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.quest_logs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete cascade,
  quest_title text not null,
  quest_type text,
  target_value text,
  proof_type text,
  status text default 'pending',
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.players enable row level security;
alter table public.quest_logs enable row level security;

-- Kalau nanti pakai Supabase Auth, buat policies berdasarkan auth.uid() = user_id.
