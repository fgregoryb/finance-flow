/**
 * Cotação automática de investimentos.
 *
 * Cripto: usa a API pública e gratuita da CoinGecko (com CORS liberado), que
 * não exige chave. Para um ativo cripto com `ticker` + `qty`, o valor atual
 * passa a ser recalculado sozinho (qty × preço de mercado).
 *
 * Ações/ETFs/Renda fixa: não há API gratuita confiável e com CORS para o
 * navegador, então seguem em modo manual (você informa o valor atual).
 */
import { useStore } from './useStore'

const CRYPTO_IDS: Record<string, string> = {
  btc: 'bitcoin', bitcoin: 'bitcoin',
  eth: 'ethereum', ethereum: 'ethereum',
  sol: 'solana', solana: 'solana',
  bnb: 'binancecoin', binancecoin: 'binancecoin',
  ada: 'cardano', cardano: 'cardano',
  xrp: 'ripple', ripple: 'ripple',
  doge: 'dogecoin', dogecoin: 'dogecoin',
  usdt: 'tether', usdc: 'usd-coin',
}
export function coingeckoId(ticker: string) {
  return CRYPTO_IDS[ticker.trim().toLowerCase()] || ticker.trim().toLowerCase()
}

export function useQuotes() {
  const store = useStore()
  const atualizando = ref(false)
  const ultimaAtualizacao = ref<string | null>(null)
  const erro = ref('')

  async function refresh() {
    const cryptos = store.investments.filter((i) => i.quoteSource === 'crypto' && i.ticker && i.qty)
    if (!cryptos.length) return
    atualizando.value = true
    erro.value = ''
    try {
      const ids = [...new Set(cryptos.map((i) => coingeckoId(i.ticker!)))].join(',')
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`)
      if (!res.ok) throw new Error('Falha na cotação')
      const data = await res.json()
      for (const inv of cryptos) {
        const price = data[coingeckoId(inv.ticker!)]?.usd
        if (price) {
          inv.lastPrice = price
          inv.current = +(inv.qty! * price).toFixed(2) // valor na moeda original (USD)
          inv.updatedAt = new Date().toISOString().slice(0, 10)
        }
      }
      ultimaAtualizacao.value = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch (e: any) {
      erro.value = 'Não foi possível atualizar as cotações agora.'
    } finally {
      atualizando.value = false
    }
  }

  return { refresh, atualizando, ultimaAtualizacao, erro }
}
