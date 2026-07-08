/**
 * Sincronização da store com o Supabase.
 *
 * Duas fontes por usuário (SEMPRE após activateUserStore(userId)):
 * - Tabela `transactions` (relacional): lançamentos — carregados no login e
 *   persistidos por operação (insert/update/delete) nas mutações da store.
 * - Tabela `user_state` (JSONB): o restante (investimentos, contas, perfil,
 *   preferências) — carregado no login e salvo com debounce.
 *
 * stopSupabaseSync() interrompe tudo no logout/troca de usuário.
 */
import { reactive, watch } from 'vue'
import { useStore, applyState, snapshot, type Tx } from './useStore'
import { remote } from './remote'

let currentUserId: string | null = null
let stopWatch: (() => void) | null = null
let saveTimer: any = null

const syncState = reactive({ status: 'idle' as 'idle' | 'loading' | 'saving' | 'synced' | 'error', lastSaved: '' as string })
export function useSyncStatus() { return syncState }

export function stopSupabaseSync() {
  stopWatch?.()
  stopWatch = null
  clearTimeout(saveTimer)
  saveTimer = null
  currentUserId = null
  remote.client = null
  remote.userId = null
  syncState.status = 'idle'
  syncState.lastSaved = ''
}

export async function startSupabaseSync() {
  if (!import.meta.client) return
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()
  if (!user.value) return
  const uid = user.value.id
  if (currentUserId === uid) return // já sincronizando este usuário
  stopSupabaseSync()
  currentUserId = uid
  remote.client = supabase
  remote.userId = uid
  const store = useStore()

  syncState.status = 'loading'
  try {
    const { data, error } = await supabase
      .from('user_state')
      .select('data')
      .eq('user_id', uid)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error

    if (data?.data) {
      applyState(data.data) // Supabase é a fonte de verdade do blob
    } else {
      await pushBlob(supabase, uid) // primeiro login deste usuário: sobe o estado DELE
    }

    await loadTransactions(supabase, store)
    syncState.status = 'synced'
  } catch (e) {
    console.warn('[sync] falha ao carregar do Supabase:', e)
    syncState.status = 'error'
    currentUserId = null
    remote.client = null
    remote.userId = null
    return
  }

  // Persiste alterações futuras do blob (debounced), amarradas ao uid capturado.
  // Os lançamentos ficam fora (snapshot os exclui) — vão por operação.
  stopWatch = watch(
    store,
    () => {
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => pushBlob(supabase, uid), 800)
    },
    { deep: true },
  )
}

/** Carrega os lançamentos da tabela relacional para a store. */
async function loadTransactions(supabase: any, store: any) {
  try {
    const { data: rows, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
    if (error) throw error
    // A tabela é SEMPRE a fonte de verdade quando a consulta funciona —
    // inclusive vazia. Isso garante que exclusões (na UI ou via SQL) nunca
    // sejam "ressuscitadas" por um cache local desatualizado.
    store.transactions = (rows || []).map(rowToTx)
  } catch (e: any) {
    // tabela ainda não criada (pré-migração): segue com os lançamentos do blob
    console.warn('[sync] tabela transactions indisponível — usando o blob:', e?.message || e)
  }
}

function rowToTx(r: any): Tx {
  return {
    id: r.id,
    date: r.date,
    desc: r.description,
    type: r.type,
    category: r.category,
    currency: r.currency,
    amount: Number(r.amount),
    amountBrl: Number(r.amount_brl),
    recurring: !!r.recurring,
    notes: r.notes ?? undefined,
    context: r.context || 'Pessoal',
    bankAccountId: r.bank_account_id ?? undefined,
  }
}

async function pushBlob(supabase: any, userId: string) {
  // proteção extra: nunca grava na conta errada se o usuário trocou no meio
  if (currentUserId && currentUserId !== userId) return
  syncState.status = 'saving'
  try {
    const { error } = await supabase
      .from('user_state')
      .upsert({ user_id: userId, data: snapshot(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) throw error
    syncState.status = 'synced'
    syncState.lastSaved = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    console.warn('[sync] falha ao salvar no Supabase:', e)
    syncState.status = 'error'
  }
}
