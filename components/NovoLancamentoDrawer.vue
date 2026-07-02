<script setup lang="ts">
import { useStore, addTransaction, editTransaction, brlCents, catMeta, type TxType, type Currency } from '~/composables/useStore'

const open = useNovoLancamento()
const editingId = useEditingTx()
const presetConta = usePresetConta()
const store = useStore()

const tipo = ref<TxType>('expense')
const conta = ref('Pessoal')
const contas = computed(() => [{ id: 'Pessoal', name: 'Pessoal' }, ...store.shared.map((s) => ({ id: s.id, name: s.name }))])
const data = ref('2026-06-23')
const desc = ref('')
const categoria = ref('')
const moeda = ref<Currency>('BRL')
const valor = ref<number | null>(null)
const recorrente = ref(false)
const frequencia = ref('Mensal')
const notes = ref('')
const erro = ref('')

const editando = computed(() => !!editingId.value)
const categorias = computed(() => (tipo.value === 'income' ? store.categories.income : store.categories.expense))
const conversao = computed(() => {
  if (moeda.value !== 'USD' || !valor.value) return null
  return valor.value * store.usdBrl
})

watch(tipo, () => { if (!editando.value) categoria.value = '' })

// Preenche o formulário ao abrir (edição) ou limpa (novo).
watch(open, (v) => {
  if (!v) return
  const id = editingId.value
  if (id) {
    const t = store.transactions.find((x) => x.id === id)
    if (t) {
      tipo.value = t.type; conta.value = t.context || 'Pessoal'; data.value = t.date
      desc.value = t.desc; categoria.value = t.category; moeda.value = t.currency
      valor.value = t.amount; recorrente.value = t.recurring; notes.value = t.notes || ''
    }
  } else {
    reset()
    if (presetConta.value) conta.value = presetConta.value
  }
})

function fechar() {
  open.value = false
  editingId.value = null
}
function reset() {
  tipo.value = 'expense'; data.value = '2026-06-23'; desc.value = ''; categoria.value = ''
  moeda.value = 'BRL'; valor.value = null; recorrente.value = false; notes.value = ''; erro.value = ''
}
function salvar() {
  erro.value = ''
  if (!desc.value) return (erro.value = 'Informe uma descrição.')
  if (!categoria.value) return (erro.value = 'Escolha uma categoria.')
  if (!valor.value || valor.value <= 0) return (erro.value = 'Informe um valor válido.')
  const payload = {
    date: data.value, desc: desc.value, type: tipo.value, category: categoria.value,
    currency: moeda.value, amount: valor.value, recurring: recorrente.value, notes: notes.value || undefined,
    context: conta.value,
  }
  if (editingId.value) editTransaction(editingId.value, payload)
  else addTransaction(payload)
  fechar()
}

function onKey(e: KeyboardEvent) { if (e.key === 'Escape') fechar() }
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="overlay" @click.self="fechar">
        <aside class="drawer" :class="tipo === 'income' ? 'is-income' : 'is-expense'">
          <header class="drawer-head">
            <h3 class="drawer-title">{{ editando ? 'Editar lançamento' : 'Novo lançamento' }}</h3>
            <button class="drawer-close" @click="fechar" aria-label="Fechar">✕</button>
          </header>

          <div class="drawer-body">
            <div class="seg">
              <button class="seg-btn" :class="{ on: tipo === 'income' }" @click="tipo = 'income'">Receita</button>
              <button class="seg-btn" :class="{ on: tipo === 'expense' }" @click="tipo = 'expense'">Despesa</button>
            </div>

            <label class="fld">
              <span class="fld-label">Conta</span>
              <select v-model="conta" class="fld-box">
                <option v-for="c in contas" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </label>

            <div class="row2">
              <label class="fld">
                <span class="fld-label">Data</span>
                <input v-model="data" type="date" class="fld-box" />
              </label>
              <label class="fld">
                <span class="fld-label">Moeda</span>
                <div class="seg sm">
                  <button class="seg-btn" :class="{ on: moeda === 'BRL' }" @click="moeda = 'BRL'">BRL</button>
                  <button class="seg-btn" :class="{ on: moeda === 'USD' }" @click="moeda = 'USD'">USD</button>
                </div>
              </label>
            </div>

            <label class="fld">
              <span class="fld-label">Descrição</span>
              <input v-model="desc" type="text" class="fld-box" placeholder="Ex: Mercado, Salário…" />
            </label>

            <label class="fld">
              <span class="fld-label">Categoria</span>
              <div class="cat-grid">
                <button
                  v-for="c in categorias" :key="c" type="button"
                  class="cat-chip" :class="{ on: categoria === c }"
                  :style="categoria === c ? { borderColor: catMeta(c).color, background: catMeta(c).color + '14' } : {}"
                  @click="categoria = c"
                >
                  <span class="cat-dot" :style="{ background: catMeta(c).color }" />{{ c }}
                </button>
              </div>
            </label>

            <label class="fld">
              <span class="fld-label">Valor ({{ moeda }})</span>
              <input v-model.number="valor" type="number" min="0" step="0.01" class="fld-box fld-amount" placeholder="0,00" />
              <span v-if="conversao" class="fld-conv">= {{ brlCents(conversao) }} · cotação R$ {{ store.usdBrl.toFixed(4) }}/USD</span>
            </label>

            <label class="fld-check">
              <input v-model="recorrente" type="checkbox" />
              <span>Lançamento recorrente</span>
            </label>
            <label v-if="recorrente" class="fld">
              <span class="fld-label">Frequência</span>
              <select v-model="frequencia" class="fld-box">
                <option>Diário</option><option>Semanal</option><option>Mensal</option><option>Anual</option>
              </select>
            </label>

            <label class="fld">
              <span class="fld-label">Observações</span>
              <textarea v-model="notes" class="fld-box" rows="2" placeholder="Opcional"></textarea>
            </label>

            <p v-if="erro" class="drawer-erro">{{ erro }}</p>
          </div>

          <footer class="drawer-foot">
            <button class="btn-ghost" @click="fechar">Cancelar</button>
            <button class="btn-save" @click="salvar">{{ editando ? 'Salvar alterações' : 'Salvar lançamento' }}</button>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(20, 23, 40, 0.4); backdrop-filter: blur(2px); z-index: 100; display: flex; justify-content: flex-end; }
.drawer { width: 440px; max-width: 100%; height: 100%; background: var(--surface); display: flex; flex-direction: column; box-shadow: -8px 0 40px rgba(0, 0, 0, 0.15); }

.drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 20px 22px; border-bottom: 1px solid var(--border); }
.drawer-title { margin: 0; font-size: 17px; font-weight: 700; }
.drawer-close { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--surface-3); cursor: pointer; font-size: 14px; color: var(--text-2); }

.drawer-body { flex: 1; overflow-y: auto; padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; }

.seg { display: flex; gap: 4px; background: var(--surface-3); border-radius: 10px; padding: 4px; }
.seg.sm { padding: 3px; }
.seg-btn { flex: 1; padding: 9px; border: none; border-radius: 7px; background: transparent; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text-2); cursor: pointer; transition: all 0.15s; }
.is-income .seg-btn.on { background: var(--success); color: #06251d; }
.is-expense .seg-btn.on { background: var(--danger); color: #fff; }
.seg.sm .seg-btn.on { background: var(--accent); color: #fff; }

.fld { display: flex; flex-direction: column; }
.fld-label { font-size: 12px; font-weight: 600; color: var(--text-2); margin-bottom: 7px; }
.fld-box { height: 42px; padding: 0 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); font-family: inherit; font-size: 14px; color: var(--text); outline: none; }
.fld-box:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
textarea.fld-box { height: auto; padding: 10px 12px; resize: vertical; }
.fld-amount { font-size: 18px; font-weight: 600; }
.fld-conv { font-size: 12px; color: var(--text-2); margin-top: 6px; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.cat-chip { display: flex; align-items: center; gap: 8px; padding: 9px 11px; border: 1px solid var(--border); border-radius: 9px; background: var(--surface); font-family: inherit; font-size: 13px; font-weight: 500; color: var(--text); cursor: pointer; text-align: left; }
.cat-dot { width: 9px; height: 9px; border-radius: 3px; flex: none; }

.fld-check { display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--text); cursor: pointer; }
.fld-check input { width: 16px; height: 16px; accent-color: var(--accent); }

.drawer-erro { font-size: 13px; color: var(--danger-text); background: rgba(255, 77, 109, 0.08); border: 1px solid rgba(255, 77, 109, 0.25); border-radius: 9px; padding: 9px 12px; margin: 0; }

.drawer-foot { display: flex; gap: 10px; padding: 16px 22px; border-top: 1px solid var(--border); }
.btn-ghost { flex: none; padding: 0 18px; height: 44px; border: 1px solid var(--border); border-radius: 10px; background: transparent; font-family: inherit; font-size: 14px; font-weight: 600; color: var(--text-2); cursor: pointer; }
.btn-save { flex: 1; height: 44px; border: none; border-radius: 10px; background: var(--accent); color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 6px 18px rgba(108, 99, 255, 0.35); }

.drawer-enter-active, .drawer-leave-active { transition: opacity 0.2s; }
.drawer-enter-active .drawer, .drawer-leave-active .drawer { transition: transform 0.25s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .drawer, .drawer-leave-to .drawer { transform: translateX(100%); }

@media (max-width: 520px) { .drawer { width: 100%; } }
</style>
