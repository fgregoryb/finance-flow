/** Período (mês/ano) selecionado no header — filtra as visões financeiras. */
import { computed } from 'vue'
import { useStore } from './useStore'

const MESES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

/**
 * "Hoje" (YYYY-MM-DD) no fuso do usuário; sem fuso definido, usa o do navegador.
 * en-CA formata como YYYY-MM-DD — evita o shift de UTC do toISOString().
 */
export function todayISO(tz?: string) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz || undefined, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())
  } catch {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
}

export function usePeriod() {
  const store = useStore()

  /** Data de hoje no fuso do perfil, como { y, m, d } (m 0-based). */
  function hoje() {
    const [y, m, d] = todayISO(store.profile?.timezone).split('-').map(Number)
    return { y, m: m - 1, d }
  }

  // default: mês corrente (não um mês fixo — o app abre onde o usuário está)
  const period = useState('period', () => {
    const h = hoje()
    return { y: h.y, m: h.m }
  })

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

  return { period, label, prev, next, inPeriod, hoje }
}
