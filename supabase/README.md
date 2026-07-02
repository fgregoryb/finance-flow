# Supabase — FinanceFlow

A UI já roda 100% sem Supabase (usa dados mock idênticos ao design em
`composables/useFinanceData.ts`). Para ligar o backend real:

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, cole e rode [`schema.sql`](./schema.sql) (tabelas + RLS).
3. Copie `.env.example` para `.env` na raiz e preencha:

   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_KEY=<anon public key>
   ```

4. `npm run dev`. O plugin `plugins/supabase.client.ts` detecta as credenciais
   e expõe `useNuxtApp().$supabase`.

## Próximos passos da integração

As funções de `useFinanceData()` devolvem objetos cuja forma já espelha o
schema. Para trocar mock → real, substitua o corpo de cada função por queries,
por exemplo:

```ts
const { $supabase } = useNuxtApp()
const { data } = await $supabase
  .from('transactions')
  .select('*, categories(name,color,icon)')
  .order('occurred_on', { ascending: false })
```

- **Auth**: `$supabase.auth.signInWithPassword` / `signInWithOAuth({ provider: 'google' })`.
- **Cotação**: agende uma Edge Function horária que busca a AwesomeAPI e insere em `fx_quotes`.
- **Convites**: insira em `shared_members` com `status = 'pending'`.
