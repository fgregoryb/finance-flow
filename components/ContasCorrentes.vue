<script setup lang="ts">
import { useStore, addChecking, editChecking, removeChecking, checkingBrl, hexRgba, type Currency } from '~/composables/useStore'
import { useDisplay } from '~/composables/useDisplay'
import { confirmar } from '~/composables/useConfirm'

const store = useStore()
const { disp } = useDisplay()

const total = computed(() => store.checking.reduce((a, c) => a + checkingBrl(c), 0))

const CORES = ['#FF6B00', '#8A05BE', '#EC7000', '#6C63FF', '#00D2A0', '#4DABF7', '#FF4D6D', '#8B8FA8']
const modal = ref(false)
const editId = ref<string | null>(null)
const form = reactive({ bank: '', balance: null as number | null, currency: 'BRL' as Currency, color: CORES[0] })
const erro = ref('')

function novo() {
  editId.value = null
  Object.assign(form, { bank: '', balance: null, currency: 'BRL', color: CORES[0] })
  erro.value = ''
  modal.value = true
}
function editar(c: any) {
  editId.value = c.id
  Object.assign(form, { bank: c.bank, balance: c.balance, currency: c.currency || 'BRL', color: c.color })
  erro.value = ''
  modal.value = true
}
function salvar() {
  erro.value = ''
  if (!form.bank.trim()) return (erro.value = 'Informe o banco.')
  if (form.balance == null || form.balance < 0) return (erro.value = 'Informe o saldo.')
  if (editId.value) editChecking(editId.value, { bank: form.bank.trim(), balance: form.balance, currency: form.currency, color: form.color })
  else addChecking(form.bank.trim(), form.balance, form.currency, form.color)
  modal.value = false
}
async function excluir(c: any) {
  if (await confirmar({ title: 'Excluir conta', message: `Remover a conta corrente "${c.bank}"?`, confirmLabel: 'Excluir' })) removeChecking(c.id)
}
</script>

<template>
  <div class="card cc">
    <div class="cc-head">
      <div>
        <h3 class="h3">Contas correntes</h3>
        <div class="cc-total">{{ disp(total) }} <span>disponível</span></div>
      </div>
      <button class="btn-soft" @click="novo"><Icon name="plus" :size="15" :stroke="2.2" color="#6B7088" />Nova conta</button>
    </div>

    <div v-if="store.checking.length" class="cc-list">
      <div v-for="c in store.checking" :key="c.id" class="cc-item">
        <div class="cc-ico" :style="{ background: hexRgba(c.color, 0.16), color: c.color }">{{ c.bank.slice(0, 2).toUpperCase() }}</div>
        <div class="cc-info"><div class="cc-bank">{{ c.bank }}</div><div class="cc-sub">Conta corrente<span v-if="c.currency === 'USD'"> · US$ {{ c.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span></div></div>
        <div class="cc-bal">{{ disp(checkingBrl(c)) }}</div>
        <div class="cc-actions">
          <button class="sq-btn" @click="editar(c)"><Icon name="edit" :size="14" color="#6B7088" :stroke="1.8" /></button>
          <button class="sq-btn" @click="excluir(c)"><Icon name="trash" :size="14" color="#F03A5C" :stroke="1.8" /></button>
        </div>
      </div>
    </div>
    <div v-else class="cc-empty">Nenhuma conta corrente. Adicione para acompanhar seu saldo.</div>

    <Teleport to="body">
      <div v-if="modal" class="modal-overlay" @click.self="modal = false">
        <div class="modal">
          <header class="modal-head"><h3 class="h3">{{ editId ? 'Editar conta' : 'Nova conta corrente' }}</h3><button class="drawer-close" @click="modal = false">✕</button></header>
          <div class="modal-body">
            <label class="fld"><span class="fld-label">Banco</span><input v-model="form.bank" class="fld-box" placeholder="Ex: Itaú, Nubank" /></label>
            <div class="fld">
              <span class="fld-label">Moeda</span>
              <div class="seg"><button class="seg-btn" :class="{ on: form.currency === 'BRL' }" @click="form.currency = 'BRL'">BRL</button><button class="seg-btn" :class="{ on: form.currency === 'USD' }" @click="form.currency = 'USD'">USD</button></div>
            </div>
            <label class="fld"><span class="fld-label">Saldo ({{ form.currency }})</span><input v-model.number="form.balance" type="number" step="0.01" min="0" class="fld-box" placeholder="0,00" /></label>
            <div class="fld">
              <span class="fld-label">Cor</span>
              <div class="picker"><button v-for="cor in CORES" :key="cor" class="pick-cor" :class="{ on: form.color === cor }" :style="{ background: cor }" @click="form.color = cor" /></div>
            </div>
            <p v-if="erro" class="drawer-erro">{{ erro }}</p>
          </div>
          <footer class="modal-foot"><button class="btn-ghost" @click="modal = false">Cancelar</button><button class="btn-save" @click="salvar">{{ editId ? 'Salvar' : 'Adicionar' }}</button></footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.cc { padding: 22px; }
.cc-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.cc-total { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin-top: 6px; }
.cc-total span { font-size: 13px; font-weight: 500; color: var(--text-2); }
.btn-soft { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 13px; background: var(--surface-3); border: none; border-radius: 9px; font-size: 13px; font-weight: 600; color: var(--text); cursor: pointer; font-family: inherit; }
.cc-list { display: flex; flex-direction: column; gap: 10px; }
.cc-item { display: flex; align-items: center; gap: 13px; padding: 12px 13px; background: var(--surface-2); border: 1px solid var(--border-soft); border-radius: 12px; }
.cc-ico { width: 40px; height: 40px; flex: none; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
.cc-info { flex: 1; min-width: 0; }
.cc-bank { font-size: 14px; font-weight: 600; }
.cc-sub { font-size: 11px; color: var(--text-2); }
.cc-bal { font-size: 15px; font-weight: 700; }
.cc-actions { display: flex; gap: 4px; }
.sq-btn { width: 30px; height: 30px; border-radius: 8px; background: var(--surface-3); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.cc-empty { font-size: 13px; color: var(--text-2); padding: 8px 0; }

.modal-overlay { position: fixed; inset: 0; background: rgba(20,23,40,0.4); backdrop-filter: blur(2px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal { width: 420px; max-width: 100%; background: var(--surface); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--border); }
.drawer-close { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--surface-3); cursor: pointer; font-size: 14px; color: var(--text-2); }
.modal-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 14px; }
.fld { display: flex; flex-direction: column; }
.fld-label { font-size: 12px; font-weight: 600; color: var(--text-2); margin-bottom: 7px; }
.fld-box { height: 42px; padding: 0 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); font-family: inherit; font-size: 14px; color: var(--text); outline: none; }
.fld-box:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.seg { display: flex; gap: 3px; background: var(--surface-3); border-radius: 10px; padding: 3px; }
.seg-btn { flex: 1; padding: 9px; border: none; border-radius: 7px; background: transparent; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text-2); cursor: pointer; }
.seg-btn.on { background: var(--accent); color: #fff; }
.picker { display: flex; flex-wrap: wrap; gap: 8px; }
.pick-cor { width: 30px; height: 30px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; }
.pick-cor.on { box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--text-3); }
.drawer-erro { font-size: 13px; color: var(--danger-text); background: rgba(255,77,109,0.08); border: 1px solid rgba(255,77,109,0.25); border-radius: 9px; padding: 9px 12px; margin: 0; }
.modal-foot { display: flex; gap: 10px; padding: 16px 22px; border-top: 1px solid var(--border); }
.btn-ghost { padding: 0 18px; height: 44px; border: 1px solid var(--border); border-radius: 10px; background: transparent; font-family: inherit; font-size: 14px; font-weight: 600; color: var(--text-2); cursor: pointer; }
.btn-save { flex: 1; height: 44px; border: none; border-radius: 10px; background: var(--accent); color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
</style>
