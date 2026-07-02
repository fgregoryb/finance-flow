/** Moeda de exibição global (BRL ⇄ USD) para os resumos/agregados. */
import { computed } from 'vue'
import { useStore, setDisplayCurrency } from './useStore'

export function useDisplay() {
  const store = useStore()

  /** Formata um valor que está em BRL na moeda de exibição escolhida. */
  function disp(valueBrl: number, cents = false) {
    const isUsd = store.displayCurrency === 'USD'
    const value = isUsd ? valueBrl / store.usdBrl : valueBrl
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: isUsd ? 'USD' : 'BRL',
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: cents ? 2 : 0,
    }).format(value)
  }

  const symbol = computed(() => (store.displayCurrency === 'USD' ? 'US$' : 'R$'))
  const currency = computed(() => store.displayCurrency)
  function toggle() {
    setDisplayCurrency(store.displayCurrency === 'BRL' ? 'USD' : 'BRL')
  }

  return { disp, symbol, currency, toggle }
}
