import { watch } from 'vue'
import { activateUserStore, deactivateUserStore } from '~/composables/useStore'
import { startSupabaseSync, stopSupabaseSync } from '~/composables/useSupabaseSync'

/**
 * Ciclo de vida dos dados por usuário:
 * - login/sessão restaurada → zera a store, carrega o cache DESTE usuário
 *   (ff_state:<id>) e inicia a sincronização com o Supabase;
 * - logout/troca de usuário → para a sync e zera a store.
 *
 * Roda após app:mounted para não conflitar com a hidratação do SSR.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const user = useSupabaseUser()
  nuxtApp.hook('app:mounted', () => {
    watch(
      user,
      (u) => {
        if (u) {
          activateUserStore(u.id)
          startSupabaseSync()
        } else {
          stopSupabaseSync()
          deactivateUserStore()
        }
      },
      { immediate: true },
    )
  })
})
