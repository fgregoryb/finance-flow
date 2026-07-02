-- ============================================================
-- Migração 0002 — persistência da store no Supabase
-- 1 linha por usuário, com todo o estado do app em JSONB.
-- Rode no SQL Editor do Supabase.
-- ============================================================

create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

-- Cada usuário só lê/escreve a própria linha.
drop policy if exists "estado próprio" on public.user_state;
create policy "estado próprio" on public.user_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
