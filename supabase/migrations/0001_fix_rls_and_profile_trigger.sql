-- ============================================================
-- Migração 0001 — corrige recursão de RLS + trigger de profiles
-- Rode no SQL Editor do Supabase (seguro rodar em banco já criado).
-- ============================================================

-- 1) Funções auxiliares SECURITY DEFINER -------------------------------------
--    Rodam como dono da função, então NÃO re-disparam o RLS das tabelas
--    consultadas — é isso que quebra o ciclo de recursão.

create or replace function public.is_account_member(aid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.shared_members
    where account_id = aid and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.is_account_owner(aid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.shared_accounts
    where id = aid and owner_id = auth.uid()
  );
$$;

-- 2) Recria as políticas que recursavam, agora via funções ---------------------

-- shared_accounts
drop policy if exists "contas conjuntas visíveis" on public.shared_accounts;
create policy "contas conjuntas visíveis" on public.shared_accounts
  for select using (owner_id = auth.uid() or public.is_account_member(id));

-- shared_members
drop policy if exists "membros visíveis" on public.shared_members;
create policy "membros visíveis" on public.shared_members
  for select using (user_id = auth.uid() or public.is_account_owner(account_id));

-- transactions (SELECT)
drop policy if exists "lançamentos acessíveis" on public.transactions;
create policy "lançamentos acessíveis" on public.transactions
  for select using (
    user_id = auth.uid()
    or (account_id is not null and public.is_account_member(account_id))
  );

-- 3) Trigger: cria public.profiles automaticamente ao registrar ---------------
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
