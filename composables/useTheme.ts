/** Tema claro/escuro. Padrão = preferência do sistema (prefers-color-scheme). */
import { ref } from 'vue'

type Theme = 'light' | 'dark'
const theme = ref<Theme>('light')
let initialized = false

function systemTheme(): Theme {
  return import.meta.client && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(t: Theme) {
  if (import.meta.client) document.documentElement.setAttribute('data-theme', t)
}

export function initTheme() {
  if (initialized || !import.meta.client) return
  initialized = true
  const saved = localStorage.getItem('ff_theme') as Theme | null
  theme.value = saved || systemTheme()
  apply(theme.value)
  // segue o sistema enquanto o usuário não escolher manualmente
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('ff_theme')) {
      theme.value = e.matches ? 'dark' : 'light'
      apply(theme.value)
    }
  })
}

export function useTheme() {
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem('ff_theme', theme.value)
    apply(theme.value)
  }
  return { theme, toggle }
}
