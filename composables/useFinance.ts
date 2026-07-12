/** Derivações reativas a partir da store (totais, gráficos, agrupamentos). */
import { computed } from 'vue'
import { useStore, catMeta, hexRgba, type Tx } from './useStore'
import { usePeriod } from './usePeriod'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export function useFinance() {
  const store = useStore()
  const { period, inPeriod } = usePeriod()
  // Visões pessoais = lançamentos pessoais + quaisquer "órfãos" (cujo contexto
  // não corresponde a nenhuma conta 'casal' existente), para nada sumir.
  const casalIds = computed(() => new Set(store.checking.filter((c) => c.type === 'casal').map((c) => c.id)))
  const personal = computed(() =>
    store.transactions.filter((t) => !t.context || t.context === 'Pessoal' || !casalIds.value.has(t.context)),
  )
  // Visões do mês selecionado no header
  const txs = computed(() => personal.value.filter((t) => inPeriod(t.date)))

  const income = computed(() => txs.value.filter((t) => t.type === 'income'))
  const expense = computed(() => txs.value.filter((t) => t.type === 'expense'))
  const sum = (arr: Tx[], f: (t: Tx) => number) => arr.reduce((a, t) => a + f(t), 0)

  const resumo = computed(() => {
    const recBrl = sum(income.value, (t) => t.amountBrl)
    const despBrl = sum(expense.value, (t) => t.amountBrl)
    const recBRLorig = sum(income.value.filter((t) => t.currency === 'BRL'), (t) => t.amount)
    const recUSDorig = sum(income.value.filter((t) => t.currency === 'USD'), (t) => t.amount)
    const despBRLorig = sum(expense.value.filter((t) => t.currency === 'BRL'), (t) => t.amount)
    const despUSDorig = sum(expense.value.filter((t) => t.currency === 'USD'), (t) => t.amount)
    const saldo = recBrl - despBrl
    return {
      receitas: { total: recBrl, brl: recBRLorig, usd: recUSDorig },
      despesas: { total: despBrl, brl: despBRLorig, usd: despUSDorig },
      saldo,
      gastoPct: recBrl ? Math.round((despBrl / recBrl) * 100) : 0,
      sobrouPct: recBrl ? Math.round((saldo / recBrl) * 100) : 0,
      disponivel: saldo,
    }
  })

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
    for (const t of personal.value) {
      const d = new Date(t.date + 'T12:00:00') // evita shift de fuso (UTC → dia anterior)
      const idx = months.findIndex((mm) => mm.y === d.getFullYear() && mm.m === d.getMonth())
      if (idx < 0) continue
      if (t.type === 'income') rec[idx] += valueFor(t)
      else desp[idx] += valueFor(t)
    }
    return { labels: months.map((mm) => MESES[mm.m]), rec, desp }
  }

  // Lançamentos agrupados por dia (desc)
  const grupos = computed(() => {
    const byDate = new Map<string, Tx[]>()
    for (const t of [...txs.value].sort((a, b) => b.date.localeCompare(a.date))) {
      if (!byDate.has(t.date)) byDate.set(t.date, [])
      byDate.get(t.date)!.push(t)
    }
    return [...byDate.entries()].map(([date, items]) => {
      const subtotal = items.reduce((a, t) => a + (t.type === 'income' ? t.amountBrl : -t.amountBrl), 0)
      return { date, label: formatDayHeader(date), subtotal, items }
    })
  })

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
  // Pessoal: saldo manual (convertido p/ BRL). Casal: saldo calculado dos lançamentos vinculados.
  const checkingTotal = computed(() =>
    store.checking.reduce((a, c) => {
      if (c.type === 'casal') return a + accountSummary(c.id).saldo
      return a + (c.currency === 'USD' ? c.balance * store.usdBrl : c.balance)
    }, 0),
  )

  return { resumo, catDespesas, catReceitas, distrib, serie6, grupos, recent, invest, hexRgba, accountTxs, accountSummary, checkingTotal }
}

export function formatDayHeader(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  const hoje = new Date('2026-06-23T12:00:00') // "hoje" do sistema
  const diff = Math.round((+hoje - +d) / 86400000)
  const dia = DIAS[d.getDay()]
  const label = `${dia}, ${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()].toLowerCase()}`
  if (diff === 0) return `Hoje — ${label}`
  if (diff === 1) return `Ontem — ${label}`
  return label
}
