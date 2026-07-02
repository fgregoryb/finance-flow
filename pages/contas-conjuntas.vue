<script setup lang="ts">
import { useStore, addSharedAccount, editSharedAccount, removeSharedAccount, settleAccount, acceptInvite, dismissInvite, hexRgba, catMeta, type SharedMember } from '~/composables/useStore'
import { useFinance } from '~/composables/useFinance'
import { useDisplay } from '~/composables/useDisplay'
import { confirmar } from '~/composables/useConfirm'
import { abrirNovo } from '~/composables/useDrawer'

definePageMeta({ crumb: 'Contas Conjuntas', title: 'Contas Conjuntas' })

const store = useStore()
const { accountSummary, accountTxs } = useFinance()
const { disp } = useDisplay()

const ICONS = ['home', 'cam', 'car', 'heart', 'cart', 'trending', 'bars', 'film']
const CORES = ['#6C63FF', '#4DABF7', '#00D2A0', '#FFB800', '#FF4D6D', '#A78BFA', '#2B8FE0', '#EC7000']
const AVATAR_CORES = ['#00D2A0', '#FFB800', '#FF4D6D', '#6C63FF', '#4DABF7', '#A78BFA']

// ---- modal nova/editar conta ----
const modal = ref(false)
const editId = ref<string | null>(null)
const form = reactive({ name: '', icon: 'home', color: '#6C63FF', members: [] as SharedMember[], memberInput: '' })
const erro = ref('')

function novaConta() {
  editId.value = null
  Object.assign(form, { name: '', icon: 'home', color: '#6C63FF', members: [{ name: 'Você', initial: 'V', color: '#00D2A0' }], memberInput: '' })
  erro.value = ''
  modal.value = true
}
function editarConta(a: any) {
  editId.value = a.id
  Object.assign(form, { name: a.name, icon: a.icon, color: a.color, members: [...a.members], memberInput: '' })
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
function salvarConta() {
  erro.value = ''
  if (!form.name.trim()) return (erro.value = 'Informe o nome da conta.')
  const payload = { name: form.name.trim(), icon: form.icon, color: form.color, mainCurrency: 'BRL' as const, members: form.members, settle: null }
  if (editId.value) editSharedAccount(editId.value, payload)
  else addSharedAccount(payload)
  modal.value = false
}
async function excluirConta(a: any) {
  if (await confirmar({ title: 'Excluir conta conjunta', message: `Remover a conta "${a.name}" e todos os seus lançamentos?`, confirmLabel: 'Excluir' })) removeSharedAccount(a.id)
}

// ---- modal acessar (detalhe) ----
const detalhe = ref<string | null>(null)
const contaDetalhe = computed(() => store.shared.find((a) => a.id === detalhe.value))
const txsDetalhe = computed(() => (detalhe.value ? accountTxs(detalhe.value).slice().sort((a, b) => b.date.localeCompare(a.date)) : []))

async function quitar(a: any) {
  if (await confirmar({ title: 'Marcar como quitado', message: `Confirmar que ${a.settle.from} acertou ${disp(a.settle.amount)} com ${a.settle.to}?`, confirmLabel: 'Marcar como quitado', danger: false })) settleAccount(a.id)
}
</script>

<template>
  <main class="screen">
    <!-- convite -->
    <div v-if="store.inviteVisible" class="invite">
      <div class="invite-ico"><Icon name="send" :size="22" color="#fff" /></div>
      <div class="invite-text">
        <div class="invite-title"><b>Ana Silva</b> te convidou para a conta <b>"Apartamento 502"</b></div>
        <div class="invite-sub">3 membros já participam · moeda principal BRL</div>
      </div>
      <button class="btn-green" @click="acceptInvite">Aceitar</button>
      <button class="btn-ghost" @click="dismissInvite">Recusar</button>
    </div>

    <div class="head-row">
      <span class="count"><b>{{ store.shared.length }} {{ store.shared.length === 1 ? 'conta conjunta' : 'contas conjuntas' }}</b> ativas</span>
      <button class="btn-primary" @click="novaConta"><Icon name="plus" :size="17" :stroke="2.2" />Nova conta conjunta</button>
    </div>

    <div class="cards">
      <div v-for="a in store.shared" :key="a.id" class="card acct-card">
        <div class="acct-banner" :style="{ background: `linear-gradient(135deg, ${a.color}, ${hexRgba(a.color, 0.78)})` }">
          <div class="acct-banner-ico"><Icon :name="a.icon" :size="22" color="#fff" :stroke="1.9" /></div>
          <div style="flex:1; min-width:0">
            <div class="acct-banner-title">{{ a.name }}</div>
            <div class="acct-banner-sub">{{ a.members.map(m => m.name).join(' · ') }}</div>
          </div>
          <div class="avatars">
            <span v-for="(m, i) in a.members.slice(0, 4)" :key="i" class="av" :class="{ 'av-stack': i > 0 }" :style="{ background: m.color, color: '#06251d', borderColor: a.color }">{{ m.initial }}</span>
            <span v-if="a.members.length > 4" class="av av-stack" :style="{ background: '#EEF0F6', color: '#6B7088', borderColor: a.color }">+{{ a.members.length - 4 }}</span>
          </div>
        </div>
        <div class="acct-body">
          <div class="acct-stats">
            <div><div class="acct-stat-label">Receitas</div><div class="acct-stat-val" style="color:#00A88A">{{ disp(accountSummary(a.id).receitas) }}</div></div>
            <div><div class="acct-stat-label">Despesas</div><div class="acct-stat-val" style="color:#F03A5C">{{ disp(accountSummary(a.id).despesas) }}</div></div>
            <div><div class="acct-stat-label">Saldo</div><div class="acct-stat-val" :style="{ color: accountSummary(a.id).saldo >= 0 ? '#6C63FF' : '#F03A5C' }">{{ disp(accountSummary(a.id).saldo) }}</div></div>
          </div>
          <div class="acct-chips">
            <span class="chip" style="color:#00A88A; background:rgba(0,210,160,0.12)">BRL {{ disp(accountSummary(a.id).brlPart) }}</span>
            <span v-if="accountSummary(a.id).usdPart" class="chip" style="color:#2B8FE0; background:rgba(77,171,247,0.12)">USD {{ disp(accountSummary(a.id).usdPart) }}</span>
            <span class="chip-meta">{{ accountSummary(a.id).count }} lançamentos</span>
          </div>
          <div class="acct-actions">
            <button class="btn-access" @click="detalhe = a.id">Acessar</button>
            <button class="btn-cog" title="Configurar" @click="editarConta(a)"><Icon name="cog" :size="17" color="#6B7088" :stroke="1.8" /></button>
            <button class="btn-cog" title="Excluir" @click="excluirConta(a)"><Icon name="trash" :size="16" color="#F03A5C" :stroke="1.8" /></button>
          </div>
        </div>
      </div>
    </div>

    <!-- quem deve a quem -->
    <div v-for="a in store.shared.filter(x => x.settle)" :key="a.id + '-settle'" class="card settle-card">
      <h3 class="h3" style="margin-bottom:4px">Divisão · quem deve a quem</h3>
      <p class="settle-sub">Conta "{{ a.name }}" — fechamento de junho</p>
      <div class="settle">
        <div class="settle-person"><span class="av-lg" style="background:#FFB800; color:#3a2c00">{{ a.settle!.from[0] }}</span><span class="settle-name">{{ a.settle!.from }}</span></div>
        <Icon name="arrowRight" :size="22" color="#6C63FF" :stroke="2" />
        <div class="settle-person"><span class="av-lg" style="background:#00D2A0; color:#06251d">{{ a.settle!.to[0] }}</span><span class="settle-name">{{ a.settle!.to }}</span></div>
        <div class="settle-amt">{{ disp(a.settle!.amount) }}</div>
        <button class="btn-green" style="margin-left:auto" @click="quitar(a)">Marcar como quitado</button>
      </div>
    </div>

    <!-- modal nova/editar conta -->
    <Teleport to="body">
      <div v-if="modal" class="modal-overlay" @click.self="modal = false">
        <div class="modal">
          <header class="modal-head"><h3 class="h3">{{ editId ? 'Editar conta conjunta' : 'Nova conta conjunta' }}</h3><button class="x" @click="modal = false">✕</button></header>
          <div class="modal-body">
            <label class="fld"><span class="fld-label">Nome da conta</span><input v-model="form.name" class="fld-box" placeholder="Ex: Casal, República, Viagem" /></label>
            <div class="fld"><span class="fld-label">Ícone</span><div class="picker"><button v-for="ic in ICONS" :key="ic" class="pick-ico" :class="{ on: form.icon === ic }" :style="form.icon === ic ? { borderColor: form.color, background: hexRgba(form.color, 0.12) } : {}" @click="form.icon = ic"><Icon :name="ic" :size="18" :color="form.color" :stroke="1.8" /></button></div></div>
            <div class="fld"><span class="fld-label">Cor</span><div class="picker"><button v-for="cor in CORES" :key="cor" class="pick-cor" :class="{ on: form.color === cor }" :style="{ background: cor }" @click="form.color = cor" /></div></div>
            <div class="fld">
              <span class="fld-label">Membros</span>
              <div class="member-chips">
                <span v-for="(m, i) in form.members" :key="i" class="member-chip"><span class="av-sm" :style="{ background: m.color }">{{ m.initial }}</span>{{ m.name }}<button class="chip-x" @click="rmMembro(i)">✕</button></span>
              </div>
              <div class="member-add"><input v-model="form.memberInput" class="fld-box" placeholder="Nome do membro" @keyup.enter="addMembro" /><button class="btn-soft" @click="addMembro">Adicionar</button></div>
            </div>
            <p v-if="erro" class="drawer-erro">{{ erro }}</p>
          </div>
          <footer class="modal-foot"><button class="btn-ghost" @click="modal = false">Cancelar</button><button class="btn-save" @click="salvarConta">{{ editId ? 'Salvar' : 'Criar conta' }}</button></footer>
        </div>
      </div>
    </Teleport>

    <!-- modal acessar -->
    <Teleport to="body">
      <div v-if="contaDetalhe" class="modal-overlay" @click.self="detalhe = null">
        <div class="modal lg">
          <header class="modal-head" :style="{ background: `linear-gradient(135deg, ${contaDetalhe.color}, ${hexRgba(contaDetalhe.color, 0.78)})` }">
            <div style="display:flex; align-items:center; gap:12px">
              <div class="acct-banner-ico"><Icon :name="contaDetalhe.icon" :size="20" color="#fff" :stroke="1.9" /></div>
              <div><div style="color:#fff; font-weight:700; font-size:16px">{{ contaDetalhe.name }}</div><div style="color:rgba(255,255,255,0.85); font-size:12px">{{ contaDetalhe.members.map(m=>m.name).join(' · ') }}</div></div>
            </div>
            <button class="x light" @click="detalhe = null">✕</button>
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
              </div>
            </div>
            <div v-else class="cc-empty">Nenhum lançamento ainda. Adicione o primeiro.</div>
          </div>
        </div>
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.screen { padding: 24px 28px 40px; display: flex; flex-direction: column; gap: 18px; }

.invite { display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: linear-gradient(135deg, rgba(108,99,255,0.08), rgba(77,171,247,0.06)); border: 1px solid rgba(108,99,255,0.25); border-radius: 16px; }
.invite-ico { width: 44px; height: 44px; flex: none; border-radius: 12px; background: #6C63FF; display: flex; align-items: center; justify-content: center; }
.invite-text { flex: 1; }
.invite-title { font-size: 14px; font-weight: 600; }
.invite-sub { font-size: 12px; color: var(--text-2); margin-top: 2px; }
.btn-green { height: 38px; padding: 0 18px; background: #00B894; border: none; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
.btn-ghost { height: 38px; padding: 0 16px; background: transparent; border: 1px solid var(--border); border-radius: 9px; color: var(--text-2); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }

.head-row { display: flex; align-items: center; justify-content: space-between; }
.count { font-size: 14px; color: var(--text-2); }
.count b { color: var(--text); }

.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.acct-card { overflow: hidden; }
.acct-banner { padding: 18px 20px; display: flex; align-items: center; gap: 13px; }
.acct-banner-ico { width: 44px; height: 44px; flex: none; border-radius: 12px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.acct-banner-title { font-size: 17px; font-weight: 700; color: #fff; }
.acct-banner-sub { font-size: 12px; color: rgba(255,255,255,0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.avatars { display: flex; flex: none; }
.av { width: 30px; height: 30px; border-radius: 50%; border: 2px solid; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.av-stack { margin-left: -9px; }

.acct-body { padding: 18px 20px; }
.acct-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.acct-stat-label { font-size: 11px; color: var(--text-2); margin-bottom: 3px; }
.acct-stat-val { font-size: 15px; font-weight: 700; }
.acct-chips { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.chip { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; }
.chip-meta { margin-left: auto; font-size: 11px; color: var(--text-3); }
.acct-actions { display: flex; gap: 10px; }
.btn-access { flex: 1; height: 38px; background: #6C63FF; border: none; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
.btn-cog { width: 38px; height: 38px; background: var(--surface-3); border: none; border-radius: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

.settle-card { padding: 22px; }
.settle-sub { margin: 0 0 16px; font-size: 12px; color: var(--text-2); }
.settle { display: flex; align-items: center; gap: 16px; padding: 16px; background: var(--surface-2); border: 1px solid var(--border-soft); border-radius: 12px; flex-wrap: wrap; }
.settle-person { display: flex; align-items: center; gap: 10px; }
.av-lg { width: 34px; height: 34px; border-radius: 50%; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.settle-name { font-size: 14px; font-weight: 600; }
.settle-amt { margin-left: 6px; font-size: 18px; font-weight: 700; color: #6C63FF; }

/* modais */
.modal-overlay { position: fixed; inset: 0; background: rgba(20,23,40,0.4); backdrop-filter: blur(2px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal { width: 460px; max-width: 100%; background: var(--surface); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); display: flex; flex-direction: column; max-height: 90vh; }
.modal.lg { width: 560px; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--border); }
.x { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--surface-3); cursor: pointer; font-size: 14px; color: var(--text-2); }
.x.light { background: rgba(255,255,255,0.2); color: #fff; }
.modal-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
.fld { display: flex; flex-direction: column; }
.fld-label { font-size: 12px; font-weight: 600; color: var(--text-2); margin-bottom: 7px; }
.fld-box { height: 42px; padding: 0 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); font-family: inherit; font-size: 14px; color: var(--text); outline: none; }
.fld-box:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.picker { display: flex; flex-wrap: wrap; gap: 8px; }
.pick-ico { width: 40px; height: 40px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.pick-cor { width: 30px; height: 30px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; }
.pick-cor.on { box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--text-3); }
.member-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.member-chip { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; background: var(--surface-3); border-radius: 20px; padding: 4px 10px 4px 4px; }
.av-sm { width: 22px; height: 22px; border-radius: 50%; font-size: 10px; font-weight: 700; color: #06251d; display: flex; align-items: center; justify-content: center; }
.chip-x { border: none; background: transparent; cursor: pointer; color: var(--text-3); font-size: 11px; }
.member-add { display: flex; gap: 8px; }
.btn-soft { height: 42px; padding: 0 14px; background: var(--surface-3); border: none; border-radius: 10px; font-size: 13px; font-weight: 600; color: var(--text); cursor: pointer; font-family: inherit; flex: none; }
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
.cc-empty { font-size: 13px; color: var(--text-2); padding: 10px 0; }

@media (max-width: 1100px) { .cards { grid-template-columns: 1fr; } }
@media (max-width: 900px) { .screen { padding: 16px; } .invite { flex-wrap: wrap; } }
</style>
