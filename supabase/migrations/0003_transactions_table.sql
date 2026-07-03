-- ============================================================
-- Migração 0003 — lançamentos saem do JSON (user_state) e vão
-- para a tabela relacional `transactions`.
--
-- ORDEM DE EXECUÇÃO IMPORTA:
--   1. Rode ANTES a query do extrato (se ainda não rodou) — ela
--      opera no JSON antigo.
--   2. Faça o deploy do código novo na Vercel e aguarde "Ready".
--   3. Rode este script.
--   4. Recarregue o app com Cmd+Shift+R.
-- Não use o app entre os passos 2 e 3.
-- ============================================================

begin;

-- A tabela antiga `transactions` (do schema inicial) está vazia e nunca foi
-- usada pelo app — o formato novo espelha os campos reais dos lançamentos.
drop table if exists public.transactions cascade;

create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  description text not null,
  type        text not null check (type in ('income', 'expense')),
  category    text not null default 'Outros',
  currency    text not null default 'BRL' check (currency in ('BRL', 'USD')),
  amount      numeric(14,2) not null,
  amount_brl  numeric(14,2) not null,
  recurring   boolean not null default false,
  notes       text,
  context     text not null default 'Pessoal', -- 'Pessoal' ou id da conta conjunta
  created_at  timestamptz not null default now()
);

create index idx_transactions_user_date on public.transactions (user_id, date desc);

alter table public.transactions enable row level security;

create policy "lancamentos proprios" on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----- migra os lançamentos que hoje vivem no JSON de cada usuário -----------
insert into public.transactions
  (user_id, date, description, type, category, currency, amount, amount_brl, recurring, notes, context)
select
  us.user_id,
  (t->>'date')::date,
  coalesce(t->>'desc', ''),
  t->>'type',
  coalesce(t->>'category', 'Outros'),
  coalesce(t->>'currency', 'BRL'),
  coalesce((t->>'amount')::numeric, 0),
  coalesce((t->>'amountBrl')::numeric, 0),
  coalesce((t->>'recurring')::boolean, false),
  t->>'notes',
  coalesce(t->>'context', 'Pessoal')
from public.user_state us,
     jsonb_array_elements(us.data->'transactions') as t
where t->>'type' in ('income', 'expense')
  and t->>'date' ~ '^\d{4}-\d{2}-\d{2}';

-- ----- remove a cópia antiga do JSON (a tabela vira a fonte de verdade) ------
update public.user_state
set data = data - 'transactions';

-- ----- limpeza: receitas "Salário em dólar" duplicadas do Gregory ------------
-- Esses lançamentos representam o mesmo dinheiro dos "Pagamento (Transfer
-- from Main)" importados do extrato — ficam só os pagamentos.
-- (o "_" no LIKE cobre as grafias "dólar" e "dolar")
delete from public.transactions
where user_id = '97b0c3ee-2324-4c45-90f7-8f8c4db73735'
  and type = 'income'
  and lower(description) like 'sal_rio em d_lar%';

commit;

-- Conferência (opcional, rode depois):
-- select date, description, type, amount, currency, context
-- from public.transactions
-- where user_id = '97b0c3ee-2324-4c45-90f7-8f8c4db73735'
-- order by date;
