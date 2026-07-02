/** Estado global do drawer "Novo/Editar lançamento". */
export function useNovoLancamento() {
  return useState('novo-lancamento-open', () => false)
}
export function useEditingTx() {
  return useState<string | null>('editing-tx', () => null)
}
export function usePresetConta() {
  return useState<string | null>('preset-conta', () => null)
}

/** Abre o drawer em modo edição para um lançamento existente. */
export function abrirEdicao(id: string) {
  useEditingTx().value = id
  useNovoLancamento().value = true
}
/** Abre o drawer em modo criação (opcionalmente já numa conta). */
export function abrirNovo(conta?: string) {
  useEditingTx().value = null
  usePresetConta().value = conta || null
  useNovoLancamento().value = true
}
