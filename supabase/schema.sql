-- ============================================================
-- FinanceFlow — schema Supabase (PostgreSQL)
-- Execute no SQL Editor do Supabase ou via `supabase db push`.
-- ============================================================

-- Perfis (1:1 com auth.users)
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text not null,
  avatar_url   text,
  timezone     text not null default 'America/Sao_Paulo',
  display_currency text not null default 'BRL' check (display_currency in ('BRL','USD')),
  created_at   timestamptz not null default now()
);

-- Categorias (de receita e despesa), por usuário
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  kind       text not null check (kind in ('income','expense')),
  color      text not null default '#6C63FF',
  icon       text not null default 'home',
  created_at timestamptz not null default now()
);

-- Contas conjuntas
create table if not exists public.shared_accounts (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  emoji         text not null default '🏠',
  theme_color   text not null default '#6C63FF',
  main_currency text not null default 'BRL' check (main_currency in ('BRL','USD','BOTH')),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now()
);

-- Membros das contas conjuntas
create table if not exists public.shared_members (
  account_id uuid not null references public.shared_accounts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null default 'editor' check (role in ('editor','viewer')),
  status     text not null default 'pending' check (status in ('pending','active')),
  invited_email text,
  joined_at  timestamptz,
  primary key (account_id, user_id)
);

-- Lançamentos (receitas e despesas)
create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  account_id    uuid references public.shared_accounts (id) on delete set null, -- null = pessoal
  category_id   uuid references public.categories (id) on delete set null,
  kind          text not null check (kind in ('income','expense')),
  description   text not null,
  currency      text not null default 'BRL' check (currency in ('BRL','USD')),
  amount        numeric(14,2) not null,            -- valor na moeda original
  amount_brl    numeric(14,2) not null,            -- valor convertido p/ BRL
  fx_rate       numeric(10,4),                     -- cotação aplicada (se USD)
  occurred_on   date not null default current_date,
  recurring     boolean not null default false,
  recurrence    text check (recurrence in ('daily','weekly','monthly','yearly')),
  notes         text,
  receipt_url   text,
  created_at    timestamptz not null default now()
);

-- Investimentos
create table if not exists public.investments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  name         text not null,
  broker       text,
  asset_type   text not null check (asset_type in ('Renda Fixa','Ações','FIIs','ETF','Cripto','Internacional','Outros')),
  currency     text not null default 'BRL' check (currency in ('BRL','USD')),
  invested     numeric(14,2) not null,
  current      numeric(14,2) not null,
  last_deposit date,
  notes        text,
  created_at   timestamptz not null default now()
);

-- Histórico de cotação USD/BRL
create table if not exists public.fx_quotes (
  id        bigint generated always as identity primary key,
  rate      numeric(10,4) not null,
  source    text not null default 'AwesomeAPI',
  fetched_at timestamptz not null default now()
);

create index if not exists idx_tx_user_date on public.transactions (user_id, occurred_on desc);
create index if not exists idx_tx_account on public.transactions (account_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.shared_accounts enable row level security;
alter table public.shared_members  enable row level security;
alter table public.transactions    enable row level security;
alter table public.investments     enable row level security;

create policy "perfil próprio" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "categorias próprias" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "investimentos próprios" on public.investments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Funções auxiliares SECURITY DEFINER: evitam recursão entre as políticas de
-- shared_accounts ↔ shared_members (rodam como dono, sem re-disparar o RLS).
create or replace function public.is_account_member(aid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.shared_members
    where account_id = aid and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.is_account_owner(aid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.shared_accounts where id = aid and owner_id = auth.uid()
  );
$$;

-- Contas conjuntas: dono ou membro ativo enxerga
create policy "contas conjuntas visíveis" on public.shared_accounts
  for select using (owner_id = auth.uid() or public.is_account_member(id));
create policy "dono gerencia conta" on public.shared_accounts
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "membros visíveis" on public.shared_members
  for select using (user_id = auth.uid() or public.is_account_owner(account_id));

-- Lançamentos: próprios OU de uma conta conjunta a que pertenço
create policy "lançamentos acessíveis" on public.transactions
  for select using (
    user_id = auth.uid()
    or (account_id is not null and public.is_account_member(account_id))
  );
create policy "lançar próprios" on public.transactions
  for insert with check (user_id = auth.uid());
create policy "editar próprios" on public.transactions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "apagar próprios" on public.transactions
  for delete using (user_id = auth.uid());

-- Cotações são leitura pública para usuários autenticados
alter table public.fx_quotes enable row level security;
create policy "cotações leitura" on public.fx_quotes for select using (auth.role() = 'authenticated');

-- ============================================================
-- Trigger: cria public.profiles automaticamente ao registrar
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
