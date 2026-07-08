-- ============================================================
-- Migração 0004 — vínculo de despesa a conta bancária +
-- suporte a moedas adicionais nos lançamentos.
-- Rode no SQL Editor do Supabase (depois de publicar o código).
-- ============================================================

begin;

-- 1) Conta bancária de origem do pagamento (id da conta corrente do usuário,
--    que vive no user_state; sem FK de propósito — vínculo lógico).
alter table public.transactions
  add column if not exists bank_account_id text;

-- 2) Moedas adicionais: o check antigo limitava a BRL/USD. Passa a aceitar
--    qualquer código ISO de 3 letras (EUR, GBP, CAD, ...).
alter table public.transactions
  drop constraint if exists transactions_currency_check;

alter table public.transactions
  add constraint transactions_currency_check
  check (currency ~ '^[A-Z]{3}$');

commit;
