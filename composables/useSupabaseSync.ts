/**
 * Sincronização da store com o Supabase (tabela user_state, 1 linha por usuário).
 *
 * - Na primeira vez logado: se não houver linha no Supabase, sobe o estado atual
 *   (vindo do localStorage) — assim os dados que você já preencheu não se perdem.
 * - Se já houver linha: o Supabase é a fonte de verdade e é carregado na store.
 * - Depois, qualquer alteração é salva no Supabase (debounce) e também no
 *   localStorage (cache offline).
 */
import { reactive, watch } from 'vue'
import { useStore, applyState, snapshot } from './useStore'

let started = false
let saveTimer: any = null

const syncState = reactive({ status: 'idle' as 'idle' | 'loading' | 'saving' | 'synced' | 'error', lastSaved: '' as string })
export function useSyncStatus() { return syncState }

export async function startSupabaseSync() {
  if (started || !import.meta.client) return
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()
  if (!user.value) return
  started = true
  const store = useStore()

  syncState.status = 'loading'
  try {
    const { data, error } = await supabase
      .from('user_state')
      .select('data')
      .eq('user_id', user.value.id)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error

    if (data?.data) {
      applyState(data.data) // Supabase é a fonte de verdade
    } else {
      await push(store, supabase, user.value.id) // primeira migração: sobe o estado local
    }
    syncState.status = 'synced'
  } catch (e) {
    console.warn('[sync] falha ao carregar do Supabase:', e)
    syncState.status = 'error'
    started = false
    return
  }

  // Persiste alterações futuras (debounced). O watch é criado APÓS o applyState,
  // então o carregamento inicial não dispara um save desnecessário.
  watch(
    store,
    () => {
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => push(store, supabase, user.value!.id), 800)
    },
    { deep: true },
  )
}

async function push(store: any, supabase: any, userId: string) {
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
