/**
 * Sincronização da store com o Supabase (tabela user_state, 1 linha por usuário).
 *
 * Fluxo por usuário (SEMPRE após activateUserStore(userId)):
 * - Se já existe linha no Supabase → ela é a fonte de verdade e é carregada.
 * - Se não existe → sobe o estado atual (que é exclusivamente do usuário ativo,
 *   pois a store foi zerada e carregada da chave dele antes).
 * - Depois, alterações são salvas com debounce.
 *
 * stopSupabaseSync() interrompe tudo no logout/troca de usuário.
 */
import { reactive, watch } from 'vue'
import { useStore, applyState, snapshot } from './useStore'

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
      applyState(data.data) // Supabase é a fonte de verdade
    } else {
      await push(supabase, uid) // primeiro login deste usuário: sobe o estado DELE
    }
    syncState.status = 'synced'
  } catch (e) {
    console.warn('[sync] falha ao carregar do Supabase:', e)
    syncState.status = 'error'
    currentUserId = null
    return
  }

  // Persiste alterações futuras (debounced), amarradas ao uid capturado.
  stopWatch = watch(
    store,
    () => {
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => push(supabase, uid), 800)
    },
    { deep: true },
  )
}

async function push(supabase: any, userId: string) {
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
