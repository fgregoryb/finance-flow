/** Derivações reativas a partir da store (totais, gráficos, agrupamentos). */
import { computed } from 'vue'
import { useStore, catMeta, hexRgba, occurrenceIn, type Tx } from './useStore'
import { usePeriod, todayISO } from './usePeriod'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

/**
 * Lançamentos que caem no mês (y, m): os reais daquele mês + as projeções dos
 * recorrentes iniciados antes dele. É isso que faz uma assinatura lançada em
 * junho continuar aparecendo em julho, agosto, ...
 */
export function txsInMonth(list: Tx[], y: number, m: number): Tx[] {
  const out: Tx[] = []
  for (const t of list) {
    const d = new Date(t.date + 'T12:00:00') // evita shift de fuso (UTC → dia anterior)
    if (d.getFullYear() === y && d.getMonth() === m) { out.push(t); continue }
    const occ = occurrenceIn(t, y, m)
    if (occ) out.push(occ)
  }
  return out
}

const sum = (arr: Tx[], f: (t: Tx) => number) => arr.reduce((a, t) => a + f(t), 0)

/** Totais (receitas/despesas/saldo) de uma lista qualquer de lançamentos. */
export function resumoDe(list: Tx[]) {
  const income = list.filter((t) => t.type === 'income')
  const expense = list.filter((t) => t.type === 'expense')
  const recBrl = sum(income, (t) => t.amountBrl)
  const despBrl = sum(expense, (t) => t.amountBrl)
  const saldo = recBrl - despBrl
  return {
    receitas: { total: recBrl, brl: sum(income.filter((t) => t.currency === 'BRL'), (t) => t.amount), usd: sum(income.filter((t) => t.currency === 'USD'), (t) => t.amount) },
    despesas: { total: despBrl, brl: sum(expense.filter((t) => t.currency === 'BRL'), (t) => t.amount), usd: sum(expense.filter((t) => t.currency === 'USD'), (t) => t.amount) },
    saldo,
    gastoPct: recBrl ? Math.round((despBrl / recBrl) * 100) : 0,
    sobrouPct: recBrl ? Math.round((saldo / recBrl) * 100) : 0,
    disponivel: saldo,
  }
}

/** Agrupa por dia (desc), com subtotal — de uma lista qualquer de lançamentos. */
export function gruposDe(list: Tx[], tz?: string) {
  const byDate = new Map<string, Tx[]>()
  for (const t of [...list].sort((a, b) => b.date.localeCompare(a.date))) {
    if (!byDate.has(t.date)) byDate.set(t.date, [])
    byDate.get(t.date)!.push(t)
  }
  return [...byDate.entries()].map(([date, items]) => ({
    date,
    label: formatDayHeader(date, tz),
    subtotal: items.reduce((a, t) => a + (t.type === 'income' ? t.amountBrl : -t.amountBrl), 0),
    items,
  }))
}

export function useFinance() {
  const store = useStore()
  const { period } = usePeriod()
  // Visões pessoais = lançamentos pessoais + quaisquer "órfãos" (cujo contexto
  // não corresponde a nenhuma conta 'casal' existente), para nada sumir.
  const casalIds = computed(() => new Set(store.checking.filter((c) => c.type === 'casal').map((c) => c.id)))
  const ehPessoal = (t: Tx) => !t.context || t.context === 'Pessoal' || !casalIds.value.has(t.context)
  const personal = computed(() => store.transactions.filter(ehPessoal))
  // Visões do mês selecionado no header (com as recorrências projetadas nele)
  const txs = computed(() => txsInMonth(personal.value, period.value.y, period.value.m))
  // Tudo do mês, inclusive contas compartilhadas (a tela de Lançamentos escolhe
  // o escopo pelo filtro de conta; Dashboard e Relatórios seguem pessoais).
  const todosTxs = computed(() => txsInMonth(store.transactions, period.value.y, period.value.m))

  /** Lançamentos do mês no escopo pedido: 'Todas' | 'Pessoal' | id de conta. */
  function escopoTxs(contaId: string) {
    if (contaId === 'Pessoal') return txs.value
    if (contaId === 'Todas') return todosTxs.value
    return todosTxs.value.filter((t) => t.context === contaId)
  }

  /** Contas oferecidas no filtro da tela de Lançamentos. */
  const contasFiltro = computed(() => [
    { id: 'Todas', name: 'Todas as contas' },
    { id: 'Pessoal', name: 'Pessoal' },
    ...store.checking.filter((c) => c.type === 'casal').map((c) => ({ id: c.id, name: c.bank })),
  ])

  /** Nome da conta compartilhada de um lançamento ('' quando é pessoal). */
  function contextName(ctx?: string) {
    if (!ctx || ctx === 'Pessoal') return ''
    return store.checking.find((c) => c.id === ctx && c.type === 'casal')?.bank || ''
  }

  const income = computed(() => txs.value.filter((t) => t.type === 'income'))
  const expense = computed(() => txs.value.filter((t) => t.type === 'expense'))

  const resumo = computed(() => resumoDe(txs.value))

  // Categorias (donut + ranking)
  function categoria(tipo: 'expense' | 'income') {
    const arr = tipo === 'expense' ? expense.value : income.value
    const map = new Map<string, number>()
    for (const t of arr) map.set(t.category, (map.get(t.category) || 0) + t.amountBrl)
    const items = [...map.entries()]
      .map(([name, value]) => ({ name, value, color: catMeta(name).color }))
      .sort((a, b) => b.value - a.value)
    const total = items.reduce((a, i) => a + i.value, 0)
    return { total, items }
  }
  const catDespesas = computed(() => categoria('expense'))
  const catReceitas = computed(() => categoria('income'))

  // Distribuição BRL vs USD
  const distrib = computed(() => {
    const r = resumo.value
    const recBrlVal = sum(income.value.filter((t) => t.currency === 'BRL'), (t) => t.amountBrl)
    const recUsdVal = sum(income.value.filter((t) => t.currency === 'USD'), (t) => t.amountBrl)
    const despBrlVal = sum(expense.value.filter((t) => t.currency === 'BRL'), (t) => t.amountBrl)
    const despUsdVal = sum(expense.value.filter((t) => t.currency === 'USD'), (t) => t.amountBrl)
    const pct = (a: number, b: number) => (a + b ? Math.round((a / (a + b)) * 100) : 0)
    return {
      receitas: [{ value: recBrlVal, color: '#00D2A0' }, { value: recUsdVal, color: '#4DABF7' }],
      receitasPct: { brl: pct(recBrlVal, recUsdVal), usd: 100 - pct(recBrlVal, recUsdVal) },
      despesas: [{ value: despBrlVal, color: '#FF4D6D' }, { value: despUsdVal, color: '#4DABF7' }],
      despesasPct: { brl: pct(despBrlVal, despUsdVal), usd: 100 - pct(despBrlVal, despUsdVal) },
    }
  })

  // Série de 6 meses: janela que termina no mês selecionado no header
  function serie6(mode: 'Consolidado' | 'BRL' | 'USD') {
    const months: { y: number; m: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(period.value.y, period.value.m - i, 1)
      months.push({ y: d.getFullYear(), m: d.getMonth() })
    }
    const valueFor = (t: Tx) =>
      mode === 'Consolidado' ? t.amountBrl : mode === 'BRL' ? (t.currency === 'BRL' ? t.amount : 0) : (t.currency === 'USD' ? t.amount : 0)
    const rec = months.map(() => 0)
    const desp = months.map(() => 0)
    months.forEach((mm, idx) => {
      for (const t of txsInMonth(personal.value, mm.y, mm.m)) {
        if (t.type === 'income') rec[idx] += valueFor(t)
        else desp[idx] += valueFor(t)
      }
    })
    return { labels: months.map((mm) => MESES[mm.m]), rec, desp }
  }

  // Lançamentos agrupados por dia (desc)
  const grupos = computed(() => gruposDe(txs.value, store.profile?.timezone))

  const recent = computed(() =>
    [...txs.value].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
  )

  // Investimentos
  const invest = computed(() => {
    const rate = store.usdBrl
    const toBrl = (v: number, c: string) => (c === 'USD' ? v * rate : v)
    const rows = store.investments.map((i) => {
      const aportBrl = toBrl(i.invested, i.currency)
      const atualBrl = toBrl(i.current, i.currency)
      return { ...i, aportBrl, atualBrl, rentPct: aportBrl ? atualBrl / aportBrl - 1 : 0 }
    })
    const totalInvestido = rows.reduce((a, r) => a + r.aportBrl, 0)
    const valorAtual = rows.reduce((a, r) => a + r.atualBrl, 0)
    const allocMap = new Map<string, number>()
    for (const r of rows) allocMap.set(r.type, (allocMap.get(r.type) || 0) + r.atualBrl)
    const palette = ['#6C63FF', '#00D2A0', '#4DABF7', '#FFB800', '#FF4D6D', '#A78BFA', '#8B8FA8']
    const alloc = [...allocMap.entries()].sort((a, b) => b[1] - a[1]).map(([name, v], i) => ({
      name, value: valorAtual ? Math.round((v / valorAtual) * 100) : 0, color: palette[i % palette.length],
    }))
    return {
      totalInvestido, valorAtual,
      rentAbs: valorAtual - totalInvestido,
      rentPct: totalInvestido ? valorAtual / totalInvestido - 1 : 0,
      rows, alloc,
    }
  })

  // ----- contas correntes do tipo 'casal' (compartilhadas) -----
  function accountTxs(accId: string) {
    return store.transactions.filter((t) => t.context === accId)
  }
  function accountSummary(accId: string) {
    const arr = accountTxs(accId)
    const rec = arr.filter((t) => t.type === 'income')
    const desp = arr.filter((t) => t.type === 'expense')
    const receitas = rec.reduce((a, t) => a + t.amountBrl, 0)
    const despesas = desp.reduce((a, t) => a + t.amountBrl, 0)
    const brlPart = arr.reduce((a, t) => a + (t.currency === 'BRL' ? t.amountBrl : 0), 0)
    const usdPart = arr.reduce((a, t) => a + (t.currency === 'USD' ? t.amountBrl : 0), 0)
    return { receitas, despesas, saldo: receitas - despesas, brlPart, usdPart, count: arr.length }
  }

  // ----- contas correntes -----
  // Pessoal: saldo manual (convertido p/ BRL).
  // Compartilhada: saldo inicial manual + movimentos dos lançamentos vinculados.
  const balanceBrl = (c: any) => (c.currency === 'USD' ? c.balance * store.usdBrl : c.balance)
  const checkingTotal = computed(() =>
    store.checking.reduce((a, c) => {
      if (c.type === 'casal') return a + balanceBrl(c) + accountSummary(c.id).saldo
      return a + balanceBrl(c)
    }, 0),
  )

  return {
    resumo, catDespesas, catReceitas, distrib, serie6, grupos, recent, invest, hexRgba,
    accountTxs, accountSummary, checkingTotal,
    escopoTxs, contasFiltro, contextName,
  }
}

export function formatDayHeader(dateStr: string, tz?: string) {
  const d = new Date(dateStr + 'T12:00:00')
  const hoje = new Date(todayISO(tz) + 'T12:00:00')
  const diff = Math.round((+hoje - +d) / 86400000)
  const dia = DIAS[d.getDay()]
  const label = `${dia}, ${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()].toLowerCase()}`
  if (diff === 0) return `Hoje — ${label}`
  if (diff === 1) return `Ontem — ${label}`
  return label
}
