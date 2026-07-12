<script setup lang="ts">
import { useStore, addInvestment, editInvestment, removeInvestment, type Currency } from '~/composables/useStore'
import { useFinance } from '~/composables/useFinance'
import { useDisplay } from '~/composables/useDisplay'
import { useQuotes, coingeckoId } from '~/composables/useQuotes'
import { confirmar } from '~/composables/useConfirm'

definePageMeta({ crumb: 'Investimentos', title: 'Minha carteira' })

async function excluirInv(id: string, name: string) {
  if (await confirmar({ title: 'Excluir investimento', message: `Tem certeza que deseja excluir "${name}"?`, confirmLabel: 'Excluir' })) removeInvestment(id)
}

const store = useStore()
const { invest } = useFinance()
const { disp } = useDisplay()
const { refresh, atualizando, ultimaAtualizacao, erro } = useQuotes()

const TIPOS = ['Renda Fixa', 'Tesouro Direto', 'Ações', 'FIIs', 'ETFs', 'Cripto', 'Caixinhas', 'Internacional', 'Outros']
const filtros = computed(() => ['Todos', ...new Set(invest.value.rows.map((r) => r.type))])
const filtroAtivo = ref('Todos')
const rowsFiltradas = computed(() =>
  filtroAtivo.value === 'Todos' ? invest.value.rows : invest.value.rows.filter((r) => r.type === filtroAtivo.value),
)
const pct = (n: number) => (n >= 0 ? '+' : '') + (n * 100).toFixed(1).replace('.', ',') + '%'
const carteiraLabel = computed(() => disp(invest.value.valorAtual))

// ---- modal add/editar -------------------------------------------------------
const modalAberto = ref(false)
const editId = ref<string | null>(null)
const form = reactive({
  name: '', broker: '', type: 'Renda Fixa', currency: 'BRL' as Currency,
  invested: null as number | null, current: null as number | null,
  auto: false, ticker: '', qty: null as number | null,
})
const formErro = ref('')

function abrirNovo() {
  editId.value = null
  Object.assign(form, { name: '', broker: '', type: 'Renda Fixa', currency: 'BRL', invested: null, current: null, auto: false, ticker: '', qty: null })
  modalAberto.value = true
}
function abrirEditar(r: any) {
  editId.value = r.id
  Object.assign(form, {
    name: r.name, broker: r.broker, type: r.type, currency: r.currency,
    invested: r.invested, current: r.current,
    auto: r.quoteSource === 'crypto', ticker: r.ticker || '', qty: r.qty || null,
  })
  modalAberto.value = true
}
async function salvar() {
  formErro.value = ''
  if (!form.name) return (formErro.value = 'Informe o nome do ativo.')
  if (!form.invested || form.invested <= 0) return (formErro.value = 'Informe o valor aportado.')
  if (form.auto) {
    if (!form.ticker) return (formErro.value = 'Informe o ticker da cripto (ex: BTC).')
    if (!form.qty || form.qty <= 0) return (formErro.value = 'Informe a quantidade.')
  } else if (!form.current || form.current <= 0) {
    return (formErro.value = 'Informe o valor atual.')
  }
  const payload = {
    name: form.name, broker: form.broker, type: form.type, currency: form.currency,
    invested: form.invested,
    current: form.auto ? (form.current || form.invested) : form.current!,
    type_: undefined,
    ticker: form.auto ? form.ticker : undefined,
    quoteSource: (form.auto ? 'crypto' : 'manual') as 'crypto' | 'manual',
    qty: form.auto ? form.qty! : undefined,
    updatedAt: new Date().toISOString().slice(0, 10),
  }
  delete (payload as any).type_
  if (editId.value) editInvestment(editId.value, payload)
  else addInvestment(payload as any)
  modalAberto.value = false
  if (form.auto) refresh() // já busca a cotação na hora
}

function curBadgeStyle(cur: string) {
  return cur === 'USD' ? { color: '#2B8FE0', background: 'rgba(77,171,247,0.12)' } : { color: '#6B7088', background: '#F1F3F8' }
}

// auto-refresh a cada 60s enquanto a tela estiver aberta
let timer: any = null
onMounted(() => {
  refresh()
  timer = setInterval(refresh, 60000)
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <main class="screen">
    <div class="head-cards">
      <div class="card hc"><div class="hc-label">Total investido</div><div class="hc-value">{{ disp(invest.totalInvestido) }}</div></div>
      <div class="card hc"><div class="hc-label">Valor atual</div><div class="hc-value">{{ disp(invest.valorAtual) }}</div></div>
      <div class="hc-green" :class="{ neg: invest.rentPct < 0 }">
        <div class="hc-green-label">Rentabilidade total</div>
        <div class="hc-green-row"><span class="hc-green-pct">{{ pct(invest.rentPct) }}</span><span class="hc-green-abs">{{ invest.rentAbs >= 0 ? '+' : '−' }}{{ disp(Math.abs(invest.rentAbs)) }}</span></div>
      </div>
    </div>

    <ContasCorrentes />

    <div class="grid">
      <div class="card" style="padding:22px">
        <h3 class="h3" style="margin-bottom:18px">Alocação por tipo</h3>
        <div class="alloc-donut-wrap">
          <div class="alloc-donut">
            <ChartsDonutChart :segments="invest.alloc.map((a) => ({ value: a.value, color: a.color, name: a.name }))" :size="180" :thickness="28" :tooltip="true" />
            <div class="alloc-center"><span class="alloc-center-label">Carteira</span><span class="alloc-center-value">{{ carteiraLabel }}</span></div>
          </div>
        </div>
        <div class="alloc-list">
          <div v-for="a in invest.alloc" :key="a.name" class="alloc-li">
            <span class="alloc-sw" :style="{ background: a.color }" />
            <span style="flex:1">{{ a.name }}</span>
            <span style="font-weight:600">{{ a.value }}%</span>
          </div>
        </div>
      </div>

      <div class="card" style="padding:22px; overflow:hidden">
        <div class="tbl-top">
          <div class="chips">
            <button v-for="f in filtros" :key="f" class="chip-filter" :class="{ 'is-active': filtroAtivo === f }" @click="filtroAtivo = f">{{ f }}</button>
          </div>
          <div class="tbl-actions">
            <button class="btn-soft" :disabled="atualizando" @click="refresh">
              <Icon name="up" :size="14" :stroke="2.2" color="#6B7088" />{{ atualizando ? 'Atualizando…' : 'Atualizar' }}
            </button>
            <button class="btn-primary" style="height:36px" @click="abrirNovo"><Icon name="plus" :size="15" :stroke="2.2" />Novo investimento</button>
          </div>
        </div>
        <p v-if="ultimaAtualizacao || erro" class="quote-note" :class="{ err: erro }">
          {{ erro || `Cotações de cripto atualizadas às ${ultimaAtualizacao} (CoinGecko)` }}
        </p>

        <div class="tbl-scroll">
          <div class="tbl-head">
            <span>Ativo</span><span>Moeda</span><span style="text-align:right">Aportado</span><span style="text-align:right">Atual</span><span style="text-align:right">Rent.</span><span></span>
          </div>
          <div v-for="r in rowsFiltradas" :key="r.id" class="tbl-row">
            <div>
              <div class="tbl-asset">{{ r.name }}<span v-if="r.quoteSource === 'crypto'" class="auto-badge">auto</span></div>
              <div class="tbl-meta">{{ r.broker }} · {{ r.type }}</div>
            </div>
            <span><span class="cur-badge" :style="curBadgeStyle(r.currency)">{{ r.currency }}</span></span>
            <span class="tbl-num">{{ disp(r.aportBrl) }}</span>
            <span class="tbl-num" style="font-weight:600">{{ disp(r.atualBrl) }}</span>
            <span class="tbl-num" style="font-weight:700" :style="{ color: r.rentPct >= 0 ? '#00A88A' : '#F03A5C' }">{{ pct(r.rentPct) }}</span>
            <span class="row-actions">
              <button class="sq-btn" title="Editar" @click="abrirEditar(r)"><Icon name="edit" :size="14" color="#6B7088" :stroke="1.8" /></button>
              <button class="sq-btn" title="Excluir" @click="excluirInv(r.id, r.name)"><Icon name="trash" :size="14" color="#F03A5C" :stroke="1.8" /></button>
            </span>
          </div>
          <div class="tbl-total">
            <span style="font-weight:700">Total</span><span />
            <span class="tbl-num" style="font-weight:700">{{ disp(invest.totalInvestido) }}</span>
            <span class="tbl-num" style="font-weight:700">{{ disp(invest.valorAtual) }}</span>
            <span class="tbl-num" style="font-weight:800" :style="{ color: invest.rentPct >= 0 ? '#00A88A' : '#F03A5C' }">{{ pct(invest.rentPct) }}</span><span />
          </div>
        </div>
      </div>
    </div>

    <!-- Modal novo/editar investimento -->
    <Teleport to="body">
      <div v-if="modalAberto" class="modal-overlay" @click.self="modalAberto = false">
        <div class="modal">
          <header class="modal-head">
            <h3 class="drawer-title">{{ editId ? 'Editar investimento' : 'Novo investimento' }}</h3>
            <button class="drawer-close" @click="modalAberto = false">✕</button>
          </header>
          <div class="modal-body">
            <div class="row2">
              <label class="fld"><span class="fld-label">Ativo / Investimento</span><input v-model="form.name" class="fld-box" placeholder="Ex: Bitcoin, Tesouro Selic" /></label>
              <label class="fld"><span class="fld-label">Corretora / Banco</span><input v-model="form.broker" class="fld-box" placeholder="Ex: Binance, Nubank" /></label>
            </div>
            <div class="row2">
              <label class="fld"><span class="fld-label">Tipo</span><select v-model="form.type" class="fld-box"><option v-for="t in TIPOS" :key="t">{{ t }}</option></select></label>
              <label class="fld">
                <span class="fld-label">Moeda</span>
                <div class="seg sm"><button class="seg-btn" :class="{ on: form.currency === 'BRL' }" @click="form.currency = 'BRL'">BRL</button><button class="seg-btn" :class="{ on: form.currency === 'USD' }" @click="form.currency = 'USD'">USD</button></div>
              </label>
            </div>
            <label class="fld"><span class="fld-label">Valor aportado ({{ form.currency }})</span><input v-model.number="form.invested" type="number" min="0" step="0.01" class="fld-box" placeholder="0,00" /></label>

            <label class="fld-check"><input v-model="form.auto" type="checkbox" /><span>Atualizar cotação automaticamente (cripto)</span></label>

            <template v-if="form.auto">
              <div class="row2">
                <label class="fld"><span class="fld-label">Ticker</span><input v-model="form.ticker" class="fld-box" placeholder="BTC, ETH, SOL…" /></label>
                <label class="fld"><span class="fld-label">Quantidade</span><input v-model.number="form.qty" type="number" min="0" step="0.00000001" class="fld-box" placeholder="0,00" /></label>
              </div>
              <p class="hint">O valor atual passa a ser <b>quantidade × preço de mercado</b>, atualizado sozinho via CoinGecko ({{ form.ticker ? coingeckoId(form.ticker) : 'id' }}).</p>
            </template>
            <label v-else class="fld"><span class="fld-label">Valor atual ({{ form.currency }})</span><input v-model.number="form.current" type="number" min="0" step="0.01" class="fld-box" placeholder="0,00" /></label>

            <p v-if="formErro" class="drawer-erro">{{ formErro }}</p>
          </div>
          <footer class="modal-foot">
            <button class="btn-ghost" @click="modalAberto = false">Cancelar</button>
            <button class="btn-save" @click="salvar">{{ editId ? 'Salvar' : 'Adicionar' }}</button>
          </footer>
        </div>
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.screen { padding: 24px 28px 40px; display: flex; flex-direction: column; gap: 18px; }

.head-cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.hc { padding: 20px; }
.hc-label { font-size: 13px; color: var(--text-2); margin-bottom: 8px; }
.hc-value { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
.hc-green { background: linear-gradient(135deg, #00D2A0, #00b88c); border-radius: 16px; padding: 20px; box-shadow: 0 8px 28px rgba(0, 210, 160, 0.35); }
.hc-green.neg { background: linear-gradient(135deg, #FF4D6D, #e0364f); box-shadow: 0 8px 28px rgba(255, 77, 109, 0.35); }
.hc-green-label { font-size: 13px; color: rgba(255,255,255,0.85); margin-bottom: 8px; }
.hc-green-row { display: flex; align-items: baseline; gap: 10px; }
.hc-green-pct { font-size: 26px; font-weight: 800; color: #fff; }
.hc-green-abs { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); }

.grid { display: grid; grid-template-columns: 1fr 1.6fr; gap: 18px; }

.alloc-donut-wrap { display: flex; justify-content: center; margin-bottom: 18px; }
.alloc-donut { position: relative; width: 180px; height: 180px; }
.alloc-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
.alloc-center-label { font-size: 11px; color: var(--text-2); }
.alloc-center-value { font-size: 17px; font-weight: 700; }
.alloc-list { display: flex; flex-direction: column; gap: 10px; }
.alloc-li { display: flex; align-items: center; gap: 9px; font-size: 13px; }
.alloc-sw { width: 10px; height: 10px; border-radius: 3px; }

.tbl-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.tbl-actions { display: flex; gap: 8px; }
.btn-soft { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 13px; background: var(--surface-3); border: none; border-radius: 9px; font-size: 13px; font-weight: 600; color: var(--text); cursor: pointer; font-family: inherit; }
.btn-soft:disabled { opacity: 0.6; cursor: default; }
.chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.chip-filter { padding: 6px 13px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1px solid var(--border); cursor: pointer; font-family: inherit; background: var(--surface); color: var(--text-2); }
.chip-filter.is-active { background: #6C63FF; color: #fff; border-color: #6C63FF; font-weight: 600; }
.quote-note { font-size: 12px; color: var(--text-2); margin: 0 0 12px; }
.quote-note.err { color: var(--danger-text); }

.tbl-scroll { overflow-x: auto; }
.tbl-head { display: grid; grid-template-columns: 1.6fr 0.7fr 0.9fr 0.9fr 0.7fr 0.6fr; gap: 10px; padding: 0 0 10px; border-bottom: 1px solid var(--border-soft); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-3); min-width: 620px; }
.tbl-row { display: grid; grid-template-columns: 1.6fr 0.7fr 0.9fr 0.9fr 0.7fr 0.6fr; gap: 10px; padding: 13px 0; border-bottom: 1px solid var(--surface-3); align-items: center; min-width: 620px; }
.tbl-asset { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 7px; }
.auto-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #00A88A; background: rgba(0,210,160,0.14); padding: 2px 6px; border-radius: 5px; }
.tbl-meta { font-size: 11px; color: var(--text-3); }
.tbl-num { font-size: 13px; text-align: right; }
.tbl-total { display: grid; grid-template-columns: 1.6fr 0.7fr 0.9fr 0.9fr 0.7fr 0.6fr; gap: 10px; padding: 14px 0 2px; align-items: center; min-width: 620px; }
.row-actions { display: flex; gap: 4px; justify-content: flex-end; }
.sq-btn { width: 30px; height: 30px; border-radius: 8px; background: var(--surface-3); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }

/* modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(20,23,40,0.4); backdrop-filter: blur(2px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal { width: 480px; max-width: 100%; background: var(--surface); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); display: flex; flex-direction: column; max-height: 90vh; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--border); }
.drawer-title { margin: 0; font-size: 17px; font-weight: 700; }
.drawer-close { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--surface-3); cursor: pointer; font-size: 14px; color: var(--text-2); }
.modal-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fld { display: flex; flex-direction: column; }
.fld-label { font-size: 12px; font-weight: 600; color: var(--text-2); margin-bottom: 7px; }
.fld-box { height: 42px; padding: 0 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); font-family: inherit; font-size: 14px; color: var(--text); outline: none; }
.fld-box:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.seg { display: flex; gap: 3px; background: var(--surface-3); border-radius: 10px; padding: 3px; }
.seg-btn { flex: 1; padding: 9px; border: none; border-radius: 7px; background: transparent; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text-2); cursor: pointer; }
.seg-btn.on { background: var(--accent); color: #fff; }
.fld-check { display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--text); cursor: pointer; }
.fld-check input { width: 16px; height: 16px; accent-color: var(--accent); }
.hint { font-size: 12px; color: var(--text-2); margin: 0; background: var(--surface-2); border: 1px solid var(--border-soft); border-radius: 8px; padding: 9px 11px; }
.drawer-erro { font-size: 13px; color: var(--danger-text); background: rgba(255,77,109,0.08); border: 1px solid rgba(255,77,109,0.25); border-radius: 9px; padding: 9px 12px; margin: 0; }
.modal-foot { display: flex; gap: 10px; padding: 16px 22px; border-top: 1px solid var(--border); }
.btn-ghost { padding: 0 18px; height: 44px; border: 1px solid var(--border); border-radius: 10px; background: transparent; font-family: inherit; font-size: 14px; font-weight: 600; color: var(--text-2); cursor: pointer; }
.btn-save { flex: 1; height: 44px; border: none; border-radius: 10px; background: var(--accent); color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }

@media (max-width: 1100px) { .head-cards, .grid { grid-template-columns: 1fr; } }
@media (max-width: 900px) { .screen { padding: 16px; } .row2 { grid-template-columns: 1fr; } }
</style>
