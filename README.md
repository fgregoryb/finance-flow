# FinanceFlow

Controle financeiro pessoal e compartilhado em **BRL + USD**, réplica fiel do
design Claude Design (FinanceFlow App).

## Stack

- **Nuxt 3 + Vue 3** (SSR, file-based routing, composables)
- **Supabase** (Postgres + Auth + RLS) — opcional; ver [`supabase/`](./supabase)
- Gráficos em **SVG puro** (sem libs externas), portados do design

## Rodar

```bash
npm install
npm run dev      # http://localhost:3000
```

A app abre com dados mock idênticos ao design — não precisa de Supabase para ver
o sistema completo. Para ligar o backend real, siga [`supabase/README.md`](./supabase/README.md).

## Telas implementadas

| Rota | Tela |
|------|------|
| `/` | Dashboard (visão geral, gráficos, categorias, BRL×USD, widgets) |
| `/lancamentos` | Lançamentos (filtros, totalizadores, lista agrupada por dia) |
| `/contas-conjuntas` | Contas conjuntas (convite, cards, divisão) |
| `/investimentos` | Carteira (alocação, tabela de ativos) |
| `/relatorios` | Relatórios (fluxo, categoria, pessoal×conjunto, moedas) |
| `/configuracoes` | Perfil, categorias, cotação, notificações, dados |

## Estrutura

```
assets/css/main.css        Design tokens + utilitários
layouts/default.vue        Shell (sidebar + header)
components/Icon.vue         Ícones Lucide (SVG)
components/charts/          ColumnChart · DonutChart · LineChart
composables/useFinanceData  Camada de dados (mock → Supabase)
pages/                      Uma página por tela
plugins/supabase.client.ts  Cliente Supabase (ativado via .env)
supabase/schema.sql         Tabelas + Row Level Security
```
