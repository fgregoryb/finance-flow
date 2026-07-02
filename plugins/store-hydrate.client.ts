import { hydrateStore } from '~/composables/useStore'

// Carrega a store do localStorage após a montagem (pós-hidratação),
// evitando mismatch entre o HTML do servidor (seed) e o do cliente.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => hydrateStore())
})
