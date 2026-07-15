<script setup lang="ts">
import {
  useStore, addChecking, editChecking, removeChecking, settleAccount,
  acceptInvite, dismissInvite, removeTransaction, checkingBrl, hexRgba, catMeta,
  type Currency, type SharedMember, type Tx,
} from '~/composables/useStore'
import { useFinance } from '~/composables/useFinance'
import { useDisplay } from '~/composables/useDisplay'
import { confirmar } from '~/composables/useConfirm'
import { abrirNovo, abrirEdicao } from '~/composables/useDrawer'

const store = useStore()
const { disp } = useDisplay()
const { accountSummary, accountTxs, checkingTotal } = useFinance()

const pessoais = computed(() => store.checking.filter((c) => c.type !== 'casal'))
const casais = computed(() => store.checking.filter((c) => c.type === 'casal'))
// Lista única: compartilhadas primeiro, mesmo formato de linha das pessoais
const contas = computed(() => [...casais.value, ...pessoais.value])

const CORES = ['#FF6B00', '#8A05BE', '#6C63FF', '#4DABF7', '#00D2A0', '#FFB800', '#FF4D6D', '#8B8FA8']
const AVATAR_CORES = ['#00D2A0', '#FFB800', '#FF4D6D', '#6C63FF', '#4DABF7', '#A78BFA']
// Tipos oferecidos no cadastro (os compartilhados viram type:'casal' + sharedLabel)
const TIPOS_CONTA = ['Pessoal', 'Casal', 'Entre Irmãos', 'Compartilhada (outra)'] as const

// Saldo exibido: pessoal = saldo manual; compartilhada = saldo inicial + movimentos
function saldoConta(c: any) {
  const base = checkingBrl(c)
  return c.type === 'casal' ? base + accountSummary(c.id).saldo : base
}

// ---- modal nova/editar conta (layout compacto) ------------------------------
const modal = ref(false)
const editId = ref<string | null>(null)
const form = reactive({
  tipoConta: 'Pessoal' as string,
  customLabel: '',
  bank: '', currency: 'BRL' as Currency, balance: null as number | null, color: CORES[0],
  members: [] as SharedMember[], memberInput: '',
})
const erro = ref('')

const ehCompartilhada = computed(() => form.tipoConta !== 'Pessoal')
const naturezaFinal = computed(() =>
  form.tipoConta === 'Compartilhada (outra)' ? (form.customLabel.trim() || 'Compartilhada') : form.tipoConta,
)

function novo() {
  editId.value = null
  Object.assign(form, { tipoConta: 'Pessoal', customLabel: '', bank: '', currency: 'BRL', balance: null, color: CORES[0], members: [{ name: 'Você', initial: 'V', color: '#00D2A0' }], memberInput: '' })
  erro.value = ''
  modal.value = true
}
function editar(c: any) {
  editId.value = c.id
  const tipo = c.type === 'casal' ? 'casal' : 'pessoal' // fallback p/ contas antigas sem type
  const label = c.sharedLabel || 'Casal'
  const tiposConhecidos = TIPOS_CONTA as readonly string[]
  Object.assign(form, {
    tipoConta: tipo === 'pessoal' ? 'Pessoal' : (tiposConhecidos.includes(label) ? label : 'Compartilhada (outra)'),
    customLabel: tipo === 'casal' && !tiposConhecidos.includes(label) ? label : '',
    bank: c.bank, currency: c.currency || 'BRL', balance: typeof c.balance === 'number' ? c.balance : 0,
    color: c.color, members: c.members ? [...c.members] : [], memberInput: '',
  })
  erro.value = ''
  modal.value = true
}
function addMembro() {
  const n = form.memberInput.trim()
  if (!n) return
  form.members.push({ name: n, initial: n[0].toUpperCase(), color: AVATAR_CORES[form.members.length % AVATAR_CORES.length] })
  form.memberInput = ''
}
function rmMembro(i: number) { form.members.splice(i, 1) }

function salvar() {
  erro.value = ''
  if (!form.bank.trim()) return (erro.value = ehCompartilhada.value ? 'Informe o nome da conta.' : 'Informe o banco.')
  if (form.balance == null || form.balance < 0) return (erro.value = 'Informe o saldo.')
  if (ehCompartilhada.value && form.members.length === 0) return (erro.value = 'Adicione ao menos um membro.')

  const base = {
    bank: form.bank.trim(), currency: form.currency, balance: form.balance!, color: form.color,
  }
  if (editId.value) {
    editChecking(editId.value, {
      ...base,
      ...(ehCompartilhada.value ? { sharedLabel: naturezaFinal.value, members: form.members } : {}),
    })
  } else {
    addChecking({
      ...base,
      type: ehCompartilhada.value ? 'casal' : 'pessoal',
      ...(ehCompartilhada.value ? { sharedLabel: naturezaFinal.value, members: form.members, icon: 'users' } : {}),
    })
  }
  modal.value = false
}
async function excluir(c: any) {
  const msg = c.type === 'casal' ? `Remover a conta "${c.bank}" e todos os seus lançamentos?` : `Remover a conta corrente "${c.bank}"?`
  if (await confirmar({ title: 'Excluir conta', message: msg, confirmLabel: 'Excluir' })) removeChecking(c.id)
}

// ---- modal acessar (detalhe de conta casal) ---------------------------------
const detalheId = ref<string | null>(null)
const contaDetalhe = computed(() => casais.value.find((a) => a.id === detalheId.value))
const txsDetalhe = computed(() => (detalheId.value ? accountTxs(detalheId.value).slice().sort((a, b) => b.date.localeCompare(a.date)) : []))

async function excluirTx(t: Tx) {
  if (await confirmar({ title: 'Excluir lançamento', message: `Tem certeza que deseja excluir "${t.desc}"?`, confirmLabel: 'Excluir' })) removeTransaction(t.id)
}
async function quitar(a: any) {
  if (await confirmar({ title: 'Marcar como quitado', message: `Confirmar que ${a.settle.from} acertou ${disp(a.settle.amount)} com ${a.settle.to}?`, confirmLabel: 'Marcar como quitado', danger: false })) settleAccount(a.id)
}
</script>

<template>
  <div class="card cc">
    <!-- convite -->
    <div v-if="store.inviteVisible" class="invite">
      <div class="invite-ico"><Icon name="send" :size="20" color="#fff" /></div>
      <div class="invite-text">
        <div class="invite-title"><b>Ana Silva</b> te convidou para a conta <b>"Apartamento 502"</b></div>
        <div class="invite-sub">3 membros já participam · moeda principal BRL</div>
      </div>
      <button class="btn-green" @click="acceptInvite">Aceitar</button>
      <button class="btn-ghost" @click="dismissInvite">Recusar</button>
    </div>

    <div class="cc-head">
      <div>
        <h3 class="h3">Contas correntes</h3>
        <div class="cc-total">{{ disp(checkingTotal) }} <span>disponível</span></div>
      </div>
      <button class="btn-soft" @click="novo"><Icon name="plus" :size="15" :stroke="2.2" color="#6B7088" />Nova conta</button>
    </div>

    <!-- quem deve a quem -->
    <div v-for="a in casais.filter(x => x.settle)" :key="a.id + '-settle'" class="settle-card">
      <h3 class="h3" style="margin-bottom:4px; font-size:14px">Divisão · quem deve a quem</h3>
      <p class="settle-sub">Conta "{{ a.bank }}" — fechamento do mês</p>
      <div class="settle">
        <div class="settle-person"><span class="av-lg" style="background:#FFB800; color:#3a2c00">{{ a.settle!.from[0] }}</span><span class="settle-name">{{ a.settle!.from }}</span></div>
        <Icon name="arrowRight" :size="20" color="#6C63FF" :stroke="2" />
        <div class="settle-person"><span class="av-lg" style="background:#00D2A0; color:#06251d">{{ a.settle!.to[0] }}</span><span class="settle-name">{{ a.settle!.to }}</span></div>
        <div class="settle-amt">{{ disp(a.settle!.amount) }}</div>
        <button class="btn-green" style="margin-left:auto" @click="quitar(a)">Marcar como quitado</button>
      </div>
    </div>

    <!-- contas (pessoais e compartilhadas no mesmo formato) -->
    <div v-if="contas.length" class="cc-list">
      <div v-for="c in contas" :key="c.id" class="cc-item">
        <div class="cc-ico" :style="{ background: hexRgba(c.color, 0.16), color: c.color }">
          <Icon v-if="c.type === 'casal'" :name="c.icon || 'users'" :size="19" :color="c.color" :stroke="1.9" />
          <template v-else>{{ c.bank.slice(0, 2).toUpperCase() }}</template>
        </div>
        <div class="cc-info">
          <div class="cc-bank">{{ c.bank }}</div>
          <div class="cc-sub">
            <template v-if="c.type === 'casal'">{{ c.sharedLabel || 'Casal' }} · {{ (c.members || []).map(m => m.name).join(' · ') }} · {{ accountSummary(c.id).count }} lançamentos</template>
            <template v-else>Conta corrente<span v-if="c.currency === 'USD'"> · US$ {{ c.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span></template>
          </div>
        </div>
        <div class="cc-bal">{{ disp(saldoConta(c)) }}</div>
        <div class="cc-actions">
          <button v-if="c.type === 'casal'" class="sq-btn" title="Acessar" @click="detalheId = c.id"><Icon name="arrowRight" :size="14" color="#6C63FF" :stroke="2" /></button>
          <button class="sq-btn" title="Editar" @click="editar(c)"><Icon name="edit" :size="14" color="#6B7088" :stroke="1.8" /></button>
          <button class="sq-btn" title="Excluir" @click="excluir(c)"><Icon name="trash" :size="14" color="#F03A5C" :stroke="1.8" /></button>
        </div>
      </div>
    </div>
    <div v-else class="cc-empty">Nenhuma conta ainda. Adicione uma conta pessoal ou uma conta compartilhada (Casal).</div>

    <!-- modal nova/editar conta (layout compacto) -->
    <Teleport to="body">
      <div v-if="modal" class="modal-overlay" @click.self="modal = false">
        <div v-trap="() => (modal = false)" class="modal">
          <header class="modal-head"><h3 class="h3">{{ editId ? 'Editar conta' : 'Nova conta corrente' }}</h3><button class="x" @click="modal = false">✕</button></header>
          <div class="modal-body">
            <label class="fld">
              <span class="fld-label">Tipo de conta</span>
              <select v-model="form.tipoConta" class="fld-box">
                <option v-for="t in TIPOS_CONTA" :key="t" :value="t">{{ t }}</option>
              </select>
            </label>
            <label v-if="form.tipoConta === 'Compartilhada (outra)'" class="fld">
              <span class="fld-label">Natureza da conta</span>
              <input v-model="form.customLabel" class="fld-box" placeholder="Ex: República, Viagem, Sócios" />
            </label>

            <label class="fld"><span class="fld-label">{{ ehCompartilhada ? 'Nome da conta' : 'Banco' }}</span><input v-model="form.bank" class="fld-box" :placeholder="ehCompartilhada ? 'Ex: I & G, Casa da Praia' : 'Ex: Itaú, Nubank'" /></label>

            <div class="fld">
              <span class="fld-label">Moeda</span>
              <div class="seg"><button class="seg-btn" :class="{ on: form.currency === 'BRL' }" @click="form.currency = 'BRL'">BRL</button><button class="seg-btn" :class="{ on: form.currency === 'USD' }" @click="form.currency = 'USD'">USD</button></div>
            </div>
            <label class="fld">
              <span class="fld-label">{{ ehCompartilhada ? `Saldo inicial (${form.currency})` : `Saldo (${form.currency})` }}</span>
              <input v-model.number="form.balance" type="number" step="0.01" min="0" class="fld-box" placeholder="0,00" />
              <span v-if="ehCompartilhada" class="fld-hint">Os lançamentos vinculados à conta somam por cima deste valor.</span>
            </label>

            <div v-if="ehCompartilhada" class="fld">
              <span class="fld-label">Membros</span>
              <div class="member-chips">
                <span v-for="(m, i) in form.members" :key="i" class="member-chip"><span class="av-sm" :style="{ background: m.color }">{{ m.initial }}</span>{{ m.name }}<button class="chip-x" @click="rmMembro(i)">✕</button></span>
              </div>
              <div class="member-add"><input v-model="form.memberInput" class="fld-box" placeholder="Nome do membro" @keyup.enter="addMembro" /><button class="btn-soft-sm" @click="addMembro">Adicionar</button></div>
            </div>

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

    <!-- modal acessar conta casal -->
    <Teleport to="body">
      <div v-if="contaDetalhe" class="modal-overlay" @click.self="detalheId = null">
        <div v-trap="() => (detalheId = null)" class="modal lg">
          <header class="modal-head" :style="{ background: `linear-gradient(135deg, ${contaDetalhe.color}, ${hexRgba(contaDetalhe.color, 0.78)})` }">
            <div style="display:flex; align-items:center; gap:12px">
              <div class="acct-banner-ico"><Icon :name="contaDetalhe.icon || 'users'" :size="20" color="#fff" :stroke="1.9" /></div>
              <div><div style="color:#fff; font-weight:700; font-size:16px">{{ contaDetalhe.bank }}</div><div style="color:rgba(255,255,255,0.85); font-size:12px">{{ (contaDetalhe.members || []).map(m=>m.name).join(' · ') }}</div></div>
            </div>
            <button class="x light" @click="detalheId = null">✕</button>
          </header>
          <div class="modal-body">
            <div class="det-stats">
              <div><div class="acct-stat-label">Receitas</div><div class="acct-stat-val" style="color:#00A88A">{{ disp(accountSummary(contaDetalhe.id).receitas) }}</div></div>
              <div><div class="acct-stat-label">Despesas</div><div class="acct-stat-val" style="color:#F03A5C">{{ disp(accountSummary(contaDetalhe.id).despesas) }}</div></div>
              <div><div class="acct-stat-label">Saldo</div><div class="acct-stat-val" style="color:#6C63FF">{{ disp(accountSummary(contaDetalhe.id).saldo) }}</div></div>
            </div>
            <div class="det-head"><span class="label">Lançamentos da conta</span><button class="btn-primary" style="height:34px" @click="abrirNovo(contaDetalhe.id)"><Icon name="plus" :size="15" :stroke="2.2" />Novo lançamento</button></div>
            <div v-if="txsDetalhe.length" class="det-list">
              <div v-for="t in txsDetalhe" :key="t.id" class="det-tx">
                <div class="tx-ico" :style="{ background: hexRgba(catMeta(t.category).color, 0.14) }"><Icon :name="catMeta(t.category).icon" :size="18" :color="catMeta(t.category).color" :stroke="1.8" /></div>
                <div style="flex:1; min-width:0"><div class="det-tx-desc">{{ t.desc }}</div><div class="det-tx-cat">{{ t.category }}</div></div>
                <div class="det-tx-val" :style="{ color: t.type === 'income' ? '#00A88A' : '#F03A5C' }">{{ t.type === 'income' ? '+' : '−' }}{{ disp(t.amountBrl) }}</div>
                <div class="det-tx-actions">
                  <button class="sq-mini" title="Editar" @click="abrirEdicao(t.id)"><Icon name="edit" :size="14" color="#6B7088" :stroke="1.8" /></button>
                  <button class="sq-mini" title="Excluir" @click="excluirTx(t)"><Icon name="trash" :size="14" color="#F03A5C" :stroke="1.8" /></button>
                </div>
              </div>
            </div>
            <div v-else class="cc-empty">Nenhum lançamento ainda. Adicione o primeiro.</div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.cc { padding: 22px; display: flex; flex-direction: column; gap: 18px; }
.cc-head { display: flex; align-items: flex-start; justify-content: space-between; }
.cc-total { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin-top: 6px; }
.cc-total span { font-size: 13px; font-weight: 500; color: var(--text-2); }
.btn-soft { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 13px; background: var(--surface-3); border: none; border-radius: 9px; font-size: 13px; font-weight: 600; color: var(--text); cursor: pointer; font-family: inherit; }
.btn-soft-sm { height: 42px; padding: 0 14px; background: var(--surface-3); border: none; border-radius: 10px; font-size: 13px; font-weight: 600; color: var(--text); cursor: pointer; font-family: inherit; flex: none; }

.invite { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: linear-gradient(135deg, rgba(108,99,255,0.08), rgba(77,171,247,0.06)); border: 1px solid rgba(108,99,255,0.25); border-radius: 14px; flex-wrap: wrap; }
.invite-ico { width: 40px; height: 40px; flex: none; border-radius: 11px; background: #6C63FF; display: flex; align-items: center; justify-content: center; }
.invite-text { flex: 1; min-width: 200px; }
.invite-title { font-size: 13px; font-weight: 600; }
.invite-sub { font-size: 11px; color: var(--text-2); margin-top: 2px; }
.btn-green { height: 36px; padding: 0 16px; background: #00B894; border: none; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
.btn-ghost { height: 36px; padding: 0 14px; background: transparent; border: 1px solid var(--border); border-radius: 9px; color: var(--text-2); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }

.acct-banner-ico { width: 40px; height: 40px; flex: none; border-radius: 11px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.acct-stat-label { font-size: 11px; color: var(--text-2); margin-bottom: 3px; }
.acct-stat-val { font-size: 14px; font-weight: 700; }

.settle-card { padding: 16px 18px; background: var(--surface-2); border: 1px solid var(--border-soft); border-radius: 12px; }
.settle-sub { margin: 0 0 12px; font-size: 12px; color: var(--text-2); }
.settle { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.settle-person { display: flex; align-items: center; gap: 8px; }
.av-lg { width: 30px; height: 30px; border-radius: 50%; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.settle-name { font-size: 13px; font-weight: 600; }
.settle-amt { margin-left: 4px; font-size: 16px; font-weight: 700; color: #6C63FF; }

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
.modal { width: 440px; max-width: 100%; background: var(--surface); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); display: flex; flex-direction: column; max-height: 90vh; }
.modal.lg { width: 560px; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--border); }
.x { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--surface-3); cursor: pointer; font-size: 14px; color: var(--text-2); }
.x.light { background: rgba(255,255,255,0.2); color: #fff; }
.modal-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
.fld { display: flex; flex-direction: column; }
.fld-label { font-size: 12px; font-weight: 600; color: var(--text-2); margin-bottom: 7px; }
.fld-box { height: 42px; padding: 0 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); font-family: inherit; font-size: 14px; color: var(--text); outline: none; }
.fld-box:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.fld-hint { font-size: 11px; color: var(--text-3); margin-top: 6px; }
.seg { display: flex; gap: 3px; background: var(--surface-3); border-radius: 10px; padding: 3px; }
.seg-btn { flex: 1; padding: 9px; border: none; border-radius: 7px; background: transparent; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text-2); cursor: pointer; }
.seg-btn.on { background: var(--accent); color: #fff; }
.seg-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.picker { display: flex; flex-wrap: wrap; gap: 8px; }
.pick-ico { width: 40px; height: 40px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.pick-cor { width: 30px; height: 30px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; }
.pick-cor.on { box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--text-3); }
.member-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.member-chip { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; background: var(--surface-3); border-radius: 20px; padding: 4px 10px 4px 4px; }
.av-sm { width: 22px; height: 22px; border-radius: 50%; font-size: 10px; font-weight: 700; color: #06251d; display: flex; align-items: center; justify-content: center; }
.chip-x { border: none; background: transparent; cursor: pointer; color: var(--text-3); font-size: 11px; }
.member-add { display: flex; gap: 8px; }
.drawer-erro { font-size: 13px; color: var(--danger-text); background: rgba(255,77,109,0.08); border: 1px solid rgba(255,77,109,0.25); border-radius: 9px; padding: 9px 12px; margin: 0; }
.modal-foot { display: flex; gap: 10px; padding: 16px 22px; border-top: 1px solid var(--border); }
.btn-save { flex: 1; height: 44px; border: none; border-radius: 10px; background: var(--accent); color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }

.det-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 14px; background: var(--surface-2); border: 1px solid var(--border-soft); border-radius: 12px; }
.det-head { display: flex; align-items: center; justify-content: space-between; }
.det-list { display: flex; flex-direction: column; }
.det-tx { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-top: 1px solid var(--surface-3); }
.tx-ico { width: 36px; height: 36px; flex: none; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.det-tx-desc { font-size: 14px; font-weight: 600; }
.det-tx-cat { font-size: 12px; color: var(--text-2); }
.det-tx-val { font-size: 14px; font-weight: 700; }
.det-tx-actions { display: flex; gap: 4px; }
.sq-mini { width: 28px; height: 28px; border-radius: 8px; background: var(--surface-3); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
</style>
