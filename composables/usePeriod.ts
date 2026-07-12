/** Período (mês/ano) selecionado no header — filtra as visões financeiras. */
import { computed } from 'vue'

const MESES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export function usePeriod() {
  // default: junho/2026 (mês dos dados atuais do usuário)
  const period = useState('period', () => ({ y: 2026, m: 5 }))

  const label = computed(() => `${MESES_FULL[period.value.m]} ${period.value.y}`)

  function prev() {
    const d = new Date(period.value.y, period.value.m - 1, 1)
    period.value = { y: d.getFullYear(), m: d.getMonth() }
  }
  function next() {
    const d = new Date(period.value.y, period.value.m + 1, 1)
    period.value = { y: d.getFullYear(), m: d.getMonth() }
  }

  /** true se a data (YYYY-MM-DD) cai no mês/ano selecionado. */
  function inPeriod(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00')
    return d.getFullYear() === period.value.y && d.getMonth() === period.value.m
  }

  return { period, label, prev, next, inPeriod }
}
