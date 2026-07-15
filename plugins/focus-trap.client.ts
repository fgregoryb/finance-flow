/**
 * Diretiva v-trap: acessibilidade de modais.
 * - Esc fecha o modal (chama a função passada no binding), sem salvar nada.
 * - Tab/Shift+Tab ficam presos aos elementos focáveis DENTRO do modal
 *   (focus trap) — o foco nunca vaza para a tela coberta atrás.
 * - Ao abrir, foca o primeiro campo; ao fechar, devolve o foco ao elemento
 *   que estava ativo antes.
 *
 * Uso: <div v-trap="fechar" class="modal">...</div>
 */
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Pilha de modais abertos: só o do topo responde a Esc/Tab
// (ex.: diálogo de confirmação aberto por cima de outro modal).
const stack: HTMLElement[] = []

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('trap', {
    mounted(el: HTMLElement, binding: { value?: () => void }) {
      const previous = document.activeElement as HTMLElement | null
      stack.push(el)

      const focusables = () =>
        [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((f) => f.offsetParent !== null)

      // foca o primeiro campo do modal ao abrir
      requestAnimationFrame(() => focusables()[0]?.focus())

      const onKeydown = (e: KeyboardEvent) => {
        if (stack[stack.length - 1] !== el) return // só o modal do topo reage
        if (e.key === 'Escape') {
          e.stopPropagation()
          binding.value?.()
          return
        }
        if (e.key !== 'Tab') return
        const items = focusables()
        if (!items.length) return
        const idx = items.indexOf(document.activeElement as HTMLElement)
        if (e.shiftKey && idx <= 0) {
          e.preventDefault()
          items[items.length - 1].focus()
        } else if (!e.shiftKey && (idx === items.length - 1 || idx === -1)) {
          e.preventDefault()
          items[0].focus()
        }
      }

      // keydown no documento: cobre Esc mesmo sem foco dentro do modal
      document.addEventListener('keydown', onKeydown, true)
      ;(el as any).__trap = { onKeydown, previous }
    },
    unmounted(el: HTMLElement) {
      const i = stack.indexOf(el)
      if (i >= 0) stack.splice(i, 1)
      const t = (el as any).__trap
      if (t) {
        document.removeEventListener('keydown', t.onKeydown, true)
        t.previous?.focus?.()
        delete (el as any).__trap
      }
    },
  })
})
