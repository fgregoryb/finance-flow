/**
 * Store reativa única do FinanceFlow (singleton em nível de módulo).
 *
 * Semente = dados reais importados da planilha do usuário. Persistida em
 * localStorage para o app ser usável imediatamente (adicionar/editar lançamentos).
 * Quando o Supabase for plugado, basta trocar a fonte da semente e as mutações
 * por queries — a forma dos objetos já espelha o schema.
 */
import { reactive, watch } from 'vue'
import { remote } from './remote'

const STATE_VERSION = 'ff-v3'

export type TxType = 'income' | 'expense'
export type Currency = 'BRL' | 'USD'

export interface Tx {
  id: string
  date: string // YYYY-MM-DD
  desc: string
  type: TxType
  category: string
  currency: Currency
  amount: number // valor na moeda original
  amountBrl: number
  recurring: boolean
  notes?: string
  context?: string // 'Pessoal' ou nome de conta conjunta
}

export interface Inv {
  id: string
  name: string
  broker: string
  currency: Currency
  invested: number // moeda original (aportado)
  current: number // moeda original (valor atual)
  type: string
  updatedAt: string
  ticker?: string // símbolo p/ cotação automática (ex: BTC, AAPL)
  quoteSource?: 'crypto' | 'stock' | 'manual'
  qty?: number // quantidade (p/ recalcular valor atual quando há cotação)
  lastPrice?: number // último preço unitário conhecido
}

export interface SharedMember { name: string; initial: string; color: string }
export interface SharedAccount {
  id: string
  name: string
  icon: string
  color: string // gradiente base
  mainCurrency: Currency
  members: SharedMember[]
  settle?: { from: string; to: string; amount: number } | null
}

export interface CheckingAccount { id: string; bank: string; balance: number; currency: Currency; color: string }

// ---- metadados de categoria (ícone + cor) -----------------------------------
export const CAT_META: Record<string, { icon: string; color: string }> = {
  Moradia: { icon: 'home', color: '#6C63FF' },
  Alimentação: { icon: 'food', color: '#00D2A0' },
  Transporte: { icon: 'car', color: '#4DABF7' },
  Assinaturas: { icon: 'film', color: '#FFB800' },
  Lazer: { icon: 'heart', color: '#FF4D6D' },
  Saúde: { icon: 'heart', color: '#A78BFA' },
  Educação: { icon: 'bars', color: '#2B8FE0' },
  Vestuário: { icon: 'cart', color: '#D99400' },
  Outros: { icon: 'cart', color: '#8B8FA8' },
  Salário: { icon: 'cam', color: '#00D2A0' },
  Freela: { icon: 'cam', color: '#4DABF7' },
  'Ticket Dev': { icon: 'cam', color: '#6C63FF' },
  Investimentos: { icon: 'trending', color: '#FFB800' },
  Bônus: { icon: 'cam', color: '#A78BFA' },
}
export function catMeta(name: string) {
  return state.customMeta[name] || CAT_META[name] || { icon: 'cart', color: '#8B8FA8' }
}

// ---- helpers monetários -----------------------------------------------------
export const brl = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
export const brlCents = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(n)
export const usd = (n: number) =>
  'US$ ' + new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(n)
export function hexRgba(hex: string, a: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

// Gera sempre um UUID v4 válido (os ids agora vão para uma coluna uuid no banco).
const uid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ---- semente (planilha do usuário) ------------------------------------------
function seedTransactions(): Tx[] {
  const raw: Omit<Tx, 'id'>[] = [
    { date: '2026-06-01', desc: 'Salário em real', type: 'income', category: 'Salário', currency: 'BRL', amount: 1000, amountBrl: 1000, recurring: true },
    { date: '2026-06-01', desc: 'Salário em dólar', type: 'income', category: 'Salário', currency: 'USD', amount: 100, amountBrl: 520.01, recurring: true },
    { date: '2026-06-13', desc: 'Salário em dólar', type: 'income', category: 'Salário', currency: 'USD', amount: 150, amountBrl: 780.02, recurring: true },
    { date: '2026-06-15', desc: 'Trabalho para o Dave', type: 'income', category: 'Freela', currency: 'USD', amount: 260, amountBrl: 1352.03, recurring: false, notes: 'Dinheiro' },
    { date: '2026-06-01', desc: 'Academia do meu pai', type: 'expense', category: 'Saúde', currency: 'BRL', amount: 70, amountBrl: 70, recurring: true },
    { date: '2026-06-01', desc: 'Prime', type: 'expense', category: 'Assinaturas', currency: 'BRL', amount: 20, amountBrl: 20, recurring: true },
    { date: '2026-06-01', desc: 'HBO', type: 'expense', category: 'Assinaturas', currency: 'BRL', amount: 45, amountBrl: 45, recurring: true },
    { date: '2026-06-01', desc: 'iCloud', type: 'expense', category: 'Assinaturas', currency: 'USD', amount: 10.71, amountBrl: 55.69, recurring: true, notes: 'Assinatura do iCloud da Isadora' },
    { date: '2026-06-01', desc: 'Claude', type: 'expense', category: 'Assinaturas', currency: 'USD', amount: 21.45, amountBrl: 111.54, recurring: true },
    { date: '2026-06-01', desc: 'Combustível', type: 'expense', category: 'Transporte', currency: 'USD', amount: 57.53, amountBrl: 299.16, recurring: false, notes: 'Maverik' },
    { date: '2026-06-01', desc: 'Black Bear', type: 'expense', category: 'Lazer', currency: 'USD', amount: 45.4, amountBrl: 236.08, recurring: false },
    { date: '2026-06-01', desc: 'Feijoada', type: 'expense', category: 'Lazer', currency: 'USD', amount: 26.18, amountBrl: 136.14, recurring: false },
    { date: '2026-06-01', desc: 'Alimentação', type: 'expense', category: 'Alimentação', currency: 'USD', amount: 3.64, amountBrl: 18.93, recurring: false, notes: "Lee's" },
    { date: '2026-06-01', desc: 'Gatorade', type: 'expense', category: 'Lazer', currency: 'USD', amount: 4.9, amountBrl: 25.48, recurring: false, notes: 'Walmart' },
    { date: '2026-06-01', desc: 'Combustível', type: 'expense', category: 'Transporte', currency: 'USD', amount: 50.65, amountBrl: 263.39, recurring: false },
    { date: '2026-06-01', desc: 'Roupas (Ross)', type: 'expense', category: 'Vestuário', currency: 'USD', amount: 15.82, amountBrl: 82.27, recurring: false },
    { date: '2026-06-01', desc: 'Alimentação', type: 'expense', category: 'Lazer', currency: 'USD', amount: 40, amountBrl: 208.0, recurring: false, notes: 'O Ku' },
    { date: '2026-06-01', desc: 'Nord VPN', type: 'expense', category: 'Assinaturas', currency: 'USD', amount: 21.26, amountBrl: 110.55, recurring: false },
    { date: '2026-06-01', desc: 'Academia', type: 'expense', category: 'Assinaturas', currency: 'USD', amount: 53.61, amountBrl: 278.78, recurring: false, notes: 'Eos Fitness' },
    { date: '2026-06-01', desc: 'Sabão para tirar manchas', type: 'expense', category: 'Outros', currency: 'USD', amount: 4.6, amountBrl: 23.92, recurring: false, notes: "Lee's" },
  ]
  return raw.map((t) => ({ ...t, id: uid(), context: 'Pessoal' }))
}

// Dados importados das telas Nubank/Inter (cripto com cotação automática).
// Valores aproximados a partir das imagens — fáceis de ajustar na própria tela.
function seedInvestments(): Inv[] {
  const r = 5.2001
  const usdFromBrl = (brl: number) => +(brl / r).toFixed(2)
  return [
    // ----- Nubank · Tesouro Direto -----
    { name: 'Tesouro Prefixado 2029', broker: 'Nubank', currency: 'BRL', invested: 1006.9, current: 1013.63, type: 'Tesouro Direto', updatedAt: '2026-06-25', quoteSource: 'manual' },
    { name: 'Tesouro IPCA+ 2032', broker: 'Nubank', currency: 'BRL', invested: 2058.37, current: 2016.87, type: 'Tesouro Direto', updatedAt: '2026-06-25', quoteSource: 'manual' },
    // ----- Nubank · Bolsa / Renda Fixa -----
    { name: 'IVVB11 (iShares S&P 500)', broker: 'Nubank', currency: 'BRL', invested: 2415.49, current: 3007.41, type: 'ETFs', updatedAt: '2026-06-25', quoteSource: 'manual', qty: 7 },
    { name: 'CDB Nubank 103% CDI', broker: 'Nubank', currency: 'BRL', invested: 2000, current: 2028.71, type: 'Renda Fixa', updatedAt: '2026-06-25', quoteSource: 'manual' },
    { name: 'Caixinha Turbo', broker: 'Nubank', currency: 'BRL', invested: 1298.69, current: 1325.55, type: 'Renda Fixa', updatedAt: '2026-06-25', quoteSource: 'manual' },
    // ----- Nubank · Cripto (cotação automática) -----
    { name: 'Bitcoin', broker: 'Nubank', currency: 'USD', invested: usdFromBrl(6886.43), current: usdFromBrl(5084), type: 'Cripto', updatedAt: '2026-06-25', quoteSource: 'crypto', ticker: 'BTC', qty: 0.01644579 },
    { name: 'Ethereum', broker: 'Nubank', currency: 'USD', invested: usdFromBrl(1168.03), current: usdFromBrl(538.65), type: 'Cripto', updatedAt: '2026-06-25', quoteSource: 'crypto', ticker: 'ETH', qty: 0.06448882 },
    { name: 'Solana', broker: 'Nubank', currency: 'USD', invested: usdFromBrl(694.61), current: usdFromBrl(196.93), type: 'Cripto', updatedAt: '2026-06-25', quoteSource: 'crypto', ticker: 'SOL', qty: 0.56706793 },
    { name: 'Uniswap', broker: 'Nubank', currency: 'BRL', invested: 1142.4, current: 243.12, type: 'Cripto', updatedAt: '2026-06-25', quoteSource: 'manual' },
    // ----- Inter -----
    { name: 'IVVB11', broker: 'Inter', currency: 'BRL', invested: 391.2, current: 430.43, type: 'ETFs', updatedAt: '2026-06-25', quoteSource: 'manual', qty: 1 },
    { name: 'Bitcoin', broker: 'Inter', currency: 'USD', invested: usdFromBrl(93.05), current: usdFromBrl(104.27), type: 'Cripto', updatedAt: '2026-06-25', quoteSource: 'manual' },
    { name: 'Solana', broker: 'Inter', currency: 'USD', invested: usdFromBrl(54.7), current: usdFromBrl(60.81), type: 'Cripto', updatedAt: '2026-06-25', quoteSource: 'manual' },
  ].map((i) => ({ ...i, id: uid() }))
}

function seedShared(): SharedAccount[] {
  return [
    {
      id: uid(), name: 'Casal', icon: 'home', color: '#6C63FF', mainCurrency: 'BRL',
      members: [
        { name: 'Lucas', initial: 'L', color: '#00D2A0' },
        { name: 'Ana', initial: 'A', color: '#FFB800' },
      ],
      settle: { from: 'Ana', to: 'Você', amount: 340 },
    },
  ]
}

// Lançamentos da conta "Casal" (derivam o resumo da conta).
function seedSharedTx(accId: string): Tx[] {
  const raw: Omit<Tx, 'id'>[] = [
    { date: '2026-06-02', desc: 'Aluguel', type: 'expense', category: 'Moradia', currency: 'BRL', amount: 1800, amountBrl: 1800, recurring: true, context: accId },
    { date: '2026-06-05', desc: 'Mercado', type: 'expense', category: 'Alimentação', currency: 'BRL', amount: 760, amountBrl: 760, recurring: false, context: accId },
    { date: '2026-06-10', desc: 'Conta de luz', type: 'expense', category: 'Moradia', currency: 'BRL', amount: 320, amountBrl: 320, recurring: true, context: accId },
    { date: '2026-06-01', desc: 'Contribuição Lucas', type: 'income', category: 'Outros', currency: 'BRL', amount: 1600, amountBrl: 1600, recurring: true, context: accId },
    { date: '2026-06-01', desc: 'Contribuição Ana', type: 'income', category: 'Outros', currency: 'BRL', amount: 1600, amountBrl: 1600, recurring: true, context: accId },
  ]
  return raw.map((t) => ({ ...t, id: uid() }))
}

function seedChecking(): CheckingAccount[] {
  return [
    { id: uid(), bank: 'Itaú', balance: 11397.1, currency: 'BRL', color: '#FF6B00' },
    { id: uid(), bank: 'Nubank', balance: 2310, currency: 'BRL', color: '#8A05BE' },
  ]
}

const CATEGORIES = {
  income: ['Salário', 'Freela', 'Ticket Dev', 'Investimentos', 'Bônus', 'Outros'],
  expense: ['Moradia', 'Alimentação', 'Transporte', 'Assinaturas', 'Lazer', 'Saúde', 'Educação', 'Vestuário', 'Outros'],
}

interface State {
  version: string
  usdBrl: number
  displayCurrency: Currency
  transactions: Tx[]
  investments: Inv[]
  shared: SharedAccount[]
  checking: CheckingAccount[]
  inviteVisible: boolean
  categories: { income: string[]; expense: string[] }
  customMeta: Record<string, { icon: string; color: string }>
  profile: { name?: string; avatar?: string; avatarScale?: number; avatarX?: number; avatarY?: number }
}

/** Estado em branco — todo usuário novo começa assim (sem dados de ninguém). */
function blankState(): State {
  return {
    version: STATE_VERSION,
    usdBrl: 5.2001,
    displayCurrency: 'BRL',
    transactions: [],
    investments: [],
    shared: [],
    checking: [],
    inviteVisible: false,
    categories: { income: [...CATEGORIES.income], expense: [...CATEGORIES.expense] },
    customMeta: {},
    profile: {},
  }
}

const state = reactive<State>(blankState())

export function useStore() {
  return state
}

/** Volta a store ao estado em branco (troca de usuário / logout). */
export function resetState() {
  Object.assign(state, blankState())
}

/**
 * Cópia plana (serializável) do estado — usada para persistir no Supabase.
 * Os lançamentos NÃO entram: agora vivem na tabela relacional `transactions`.
 */
export function snapshot() {
  const s = JSON.parse(JSON.stringify(state))
  delete s.transactions
  return s
}

/** Aplica um estado salvo (de localStorage ou Supabase), com migração de versão. */
export function applyState(parsed: any) {
  if (!parsed) return
  if (parsed.version === STATE_VERSION) {
    Object.assign(state, parsed)
  } else if (parsed.version === 'ff-v2') {
    Object.assign(state, parsed)
    state.investments = seedInvestments()
    state.checking = state.checking.map((c: any) => ({ ...c, currency: c.currency || 'BRL' }))
    state.version = STATE_VERSION
  } else if (parsed.version === 'ff-v1') {
    if (parsed.profile) state.profile = parsed.profile
    if (Array.isArray(parsed.transactions)) {
      state.transactions = parsed.transactions.filter((t: Tx) => !t.context || t.context === 'Pessoal')
    }
    if (parsed.categories) state.categories = parsed.categories
    if (parsed.customMeta) state.customMeta = parsed.customMeta
    if (parsed.usdBrl) state.usdBrl = parsed.usdBrl
    if (parsed.displayCurrency) state.displayCurrency = parsed.displayCurrency
    state.version = STATE_VERSION
  } else {
    // estado sem versão (ex.: backup de import) — aplica os campos conhecidos
    Object.assign(state, parsed, { version: STATE_VERSION })
  }
}

/**
 * Ciclo de vida por usuário: cada usuário tem sua própria chave de cache
 * (ff_state:<userId>), e a troca de usuário zera a store antes de carregar.
 */
let stopPersist: (() => void) | null = null

export function activateUserStore(userId: string) {
  if (!import.meta.client) return
  stopPersist?.()
  stopPersist = null
  resetState()

  // Remove o cache global legado (versão antiga): ele não tem dono e por isso
  // vazava entre usuários. Cada usuário passa a usar SÓ a própria chave.
  localStorage.removeItem('ff_state')

  const key = `ff_state:${userId}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) applyState(JSON.parse(raw))
  } catch { /* ignora cache inválido */ }

  stopPersist = watch(
    state,
    () => {
      try {
        localStorage.setItem(key, JSON.stringify(state))
      } catch (e) {
        // ex.: QuotaExceededError — não deixa a persistência quebrar por inteiro
        console.warn('[store] falha ao salvar no localStorage:', e)
      }
    },
    { deep: true },
  )
}

export function deactivateUserStore() {
  stopPersist?.()
  stopPersist = null
  resetState()
}

// ---- persistência de lançamentos na tabela `transactions` -------------------
function txRow(t: Tx) {
  return {
    id: t.id,
    user_id: remote.userId,
    date: t.date,
    description: t.desc,
    type: t.type,
    category: t.category,
    currency: t.currency,
    amount: t.amount,
    amount_brl: t.amountBrl,
    recurring: t.recurring,
    notes: t.notes ?? null,
    context: t.context || 'Pessoal',
  }
}
function remoteTxInsert(t: Tx) {
  if (!remote.client || !remote.userId) return
  remote.client.from('transactions').insert(txRow(t))
    .then(({ error }: any) => error && console.warn('[tx] insert falhou:', error.message))
}
function remoteTxUpdate(t: Tx) {
  if (!remote.client || !remote.userId) return
  remote.client.from('transactions').update(txRow(t)).eq('id', t.id)
    .then(({ error }: any) => error && console.warn('[tx] update falhou:', error.message))
}
function remoteTxDelete(id: string) {
  if (!remote.client || !remote.userId) return
  remote.client.from('transactions').delete().eq('id', id)
    .then(({ error }: any) => error && console.warn('[tx] delete falhou:', error.message))
}

// ---- mutações ---------------------------------------------------------------
export function addTransaction(input: {
  date: string
  desc: string
  type: TxType
  category: string
  currency: Currency
  amount: number
  recurring: boolean
  notes?: string
  context?: string
}) {
  const amountBrl = input.currency === 'USD' ? +(input.amount * state.usdBrl).toFixed(2) : input.amount
  const tx: Tx = { ...input, id: uid(), amountBrl, context: input.context || 'Pessoal' }
  state.transactions.unshift(tx)
  remoteTxInsert(tx)
}

export function editTransaction(id: string, input: {
  date: string; desc: string; type: TxType; category: string
  currency: Currency; amount: number; recurring: boolean; notes?: string; context?: string
}) {
  const t = state.transactions.find((x) => x.id === id)
  if (!t) return
  const amountBrl = input.currency === 'USD' ? +(input.amount * state.usdBrl).toFixed(2) : input.amount
  Object.assign(t, input, { amountBrl })
  remoteTxUpdate(t)
}

export function removeTransaction(id: string) {
  const i = state.transactions.findIndex((t) => t.id === id)
  if (i >= 0) state.transactions.splice(i, 1)
  remoteTxDelete(id)
}

// ---- categorias -------------------------------------------------------------
export function addCategory(kind: TxType, name: string, icon: string, color: string) {
  const list = kind === 'income' ? state.categories.income : state.categories.expense
  if (!list.includes(name)) list.push(name)
  state.customMeta[name] = { icon, color }
}
export function editCategory(kind: TxType, oldName: string, name: string, icon: string, color: string) {
  const list = kind === 'income' ? state.categories.income : state.categories.expense
  const i = list.indexOf(oldName)
  if (i >= 0) list[i] = name
  if (oldName !== name) delete state.customMeta[oldName]
  state.customMeta[name] = { icon, color }
  // mantém os lançamentos coerentes (memória + tabela)
  if (oldName !== name) {
    state.transactions.forEach((t) => { if (t.category === oldName) t.category = name })
    if (remote.client && remote.userId) {
      remote.client.from('transactions').update({ category: name }).eq('category', oldName)
        .then(({ error }: any) => error && console.warn('[tx] rename categoria falhou:', error.message))
    }
  }
}
export function removeCategory(kind: TxType, name: string) {
  const list = kind === 'income' ? state.categories.income : state.categories.expense
  const i = list.indexOf(name)
  if (i >= 0) list.splice(i, 1)
  delete state.customMeta[name]
}

// ---- investimentos ----------------------------------------------------------
export function addInvestment(input: Omit<Inv, 'id'>) {
  state.investments.unshift({ ...input, id: uid() })
}
export function editInvestment(id: string, input: Partial<Inv>) {
  const inv = state.investments.find((x) => x.id === id)
  if (inv) Object.assign(inv, input)
}
export function removeInvestment(id: string) {
  const i = state.investments.findIndex((x) => x.id === id)
  if (i >= 0) state.investments.splice(i, 1)
}

// ---- contas conjuntas -------------------------------------------------------
export function addSharedAccount(input: Omit<SharedAccount, 'id'>) {
  state.shared.push({ ...input, id: uid() })
}
export function editSharedAccount(id: string, input: Partial<SharedAccount>) {
  const a = state.shared.find((x) => x.id === id)
  if (a) Object.assign(a, input)
}
export function removeSharedAccount(id: string) {
  const i = state.shared.findIndex((x) => x.id === id)
  if (i >= 0) state.shared.splice(i, 1)
  // remove também os lançamentos da conta (memória + tabela)
  state.transactions = state.transactions.filter((t) => t.context !== id)
  if (remote.client && remote.userId) {
    remote.client.from('transactions').delete().eq('context', id)
      .then(({ error }: any) => error && console.warn('[tx] delete por conta falhou:', error.message))
  }
}
export function settleAccount(id: string) {
  const a = state.shared.find((x) => x.id === id)
  if (a) a.settle = null
}
export function dismissInvite() { state.inviteVisible = false }
export function acceptInvite() {
  state.shared.push({
    id: uid(), name: 'Apartamento 502', icon: 'home', color: '#4DABF7', mainCurrency: 'BRL',
    members: [{ name: 'Ana', initial: 'A', color: '#FFB800' }, { name: 'Você', initial: 'V', color: '#00D2A0' }],
    settle: null,
  })
  state.inviteVisible = false
}

// ---- contas correntes -------------------------------------------------------
export function addChecking(bank: string, balance: number, currency: Currency = 'BRL', color = '#6C63FF') {
  state.checking.push({ id: uid(), bank, balance, currency, color })
}
export function checkingBrl(c: CheckingAccount) {
  return c.currency === 'USD' ? c.balance * state.usdBrl : c.balance
}
export function editChecking(id: string, input: Partial<CheckingAccount>) {
  const c = state.checking.find((x) => x.id === id)
  if (c) Object.assign(c, input)
}
export function removeChecking(id: string) {
  const i = state.checking.findIndex((x) => x.id === id)
  if (i >= 0) state.checking.splice(i, 1)
}

// ---- perfil / exibição ------------------------------------------------------
export function setDisplayCurrency(c: Currency) { state.displayCurrency = c }
export function setProfile(p: Partial<State['profile']>) { Object.assign(state.profile, p) }

export function resetToSeed() {
  state.transactions = seedTransactions()
  state.investments = seedInvestments()
}
