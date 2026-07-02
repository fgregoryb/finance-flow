/** Diálogo de confirmação in-app (substitui o confirm() nativo). */
import { reactive } from 'vue'

interface ConfirmState {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  danger: boolean
  resolve?: (v: boolean) => void
}

const state = reactive<ConfirmState>({
  open: false, title: '', message: '', confirmLabel: 'Confirmar', danger: true,
})

export function useConfirmState() { return state }

export function confirmar(opts: { title: string; message: string; confirmLabel?: string; danger?: boolean }): Promise<boolean> {
  state.title = opts.title
  state.message = opts.message
  state.confirmLabel = opts.confirmLabel || 'Confirmar'
  state.danger = opts.danger ?? true
  state.open = true
  return new Promise((res) => { state.resolve = res })
}

export function resolveConfirm(v: boolean) {
  state.open = false
  state.resolve?.(v)
  state.resolve = undefined
}
