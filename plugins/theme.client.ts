import { initTheme } from '~/composables/useTheme'

// Aplica o tema o quanto antes no cliente (evita "flash" de tema errado).
export default defineNuxtPlugin(() => {
  initTheme()
})
