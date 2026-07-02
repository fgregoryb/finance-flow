import { watch } from 'vue'
import { startSupabaseSync } from '~/composables/useSupabaseSync'

// Quando o usuário fica disponível (login/sessão restaurada), sincroniza a store
// com o Supabase. Roda só no cliente, após o hydrate do localStorage.
export default defineNuxtPlugin(() => {
  const user = useSupabaseUser()
  watch(
    user,
    (u) => { if (u) startSupabaseSync() },
    { immediate: true },
  )
})
