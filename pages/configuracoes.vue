<script setup lang="ts">
import { useStore, catMeta, hexRgba, setProfile, addCategory, editCategory, removeCategory, setDisplayCurrency, setExtraCurrency, EXTRA_CURRENCIES, type TxType } from '~/composables/useStore'
import { confirmar } from '~/composables/useConfirm'

definePageMeta({ crumb: 'Configurações', title: 'Configurações' })

const store = useStore()
const { fullName, email, initials, avatar, avatarStyle } = useProfile()

const tab = ref<'perfil' | 'cat' | 'cot' | 'notif' | 'dados'>('perfil')
const subnav = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'cat', label: 'Categorias' },
  { id: 'cot', label: 'Moedas & Câmbio' },
  { id: 'notif', label: 'Notificações' },
  { id: 'dados', label: 'Dados e Privacidade' },
] as const

// ---- perfil ----
const nomeEdit = ref('')
const salvouPerfil = ref(false)
watchEffect(() => { nomeEdit.value = fullName.value })
const fileInput = ref<HTMLInputElement>()
const editorOpen = ref(false)
const editorImg = ref('')
function escolherFoto() { fileInput.value?.click() }
function onFoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { editorImg.value = reader.result as string; editorOpen.value = true }
  reader.readAsDataURL(file)
  ;(e.target as HTMLInputElement).value = ''
}
function ajustarFoto() {
  if (store.profile.avatar) { editorImg.value = store.profile.avatar; editorOpen.value = true }
}
function salvarFoto(dataUrl: string) {
  // dataUrl já vem recortado/comprimido (256px JPEG) do AvatarEditor
  setProfile({ avatar: dataUrl })
  editorOpen.value = false
}
function salvarPerfil() {
  setProfile({ name: nomeEdit.value.trim() || undefined, timezone: tzEdit.value })
  salvouPerfil.value = true
  setTimeout(() => (salvouPerfil.value = false), 2000)
}

// ---- fuso horário (lista IANA completa quando o navegador suporta) ----
const TZ_FALLBACK = [
  'America/Sao_Paulo', 'America/Manaus', 'America/Fortaleza', 'America/Recife', 'America/Cuiaba', 'America/Rio_Branco', 'America/Noronha',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage',
  'America/Toronto', 'America/Vancouver', 'America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Santiago',
  'America/Argentina/Buenos_Aires', 'America/Montevideo', 'America/Caracas', 'America/Asuncion', 'America/La_Paz',
  'Europe/Lisbon', 'Europe/London', 'Europe/Madrid', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Zurich',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland', 'UTC',
]
const timezones = ref<string[]>(TZ_FALLBACK)
const tzEdit = ref(store.profile.timezone || 'America/Sao_Paulo')
watchEffect(() => { tzEdit.value = store.profile.timezone || 'America/Sao_Paulo' })
onMounted(() => {
  try {
    const all = (Intl as any).supportedValuesOf?.('timeZone')
    if (Array.isArray(all) && all.length) timezones.value = all
  } catch { /* mantém fallback */ }
})

// ---- moedas (padrão de exibição + adicionais) ----
const moedaPadrao = computed({
  get: () => store.displayCurrency,
  set: (v: string) => setDisplayCurrency(v),
})
function toggleMoeda(code: string) {
  const cur = store.extraCurrencies[code]
  setExtraCurrency(code, !(cur?.enabled), cur?.rate)
}
function setTaxa(code: string, e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  if (v > 0) setExtraCurrency(code, store.extraCurrencies[code]?.enabled ?? false, v)
}

// ---- categorias ----
const catTipo = ref<TxType>('expense')
const categorias = computed(() => (catTipo.value === 'expense' ? store.categories.expense : store.categories.income))
const ICONS = ['home', 'food', 'car', 'film', 'heart', 'cart', 'cam', 'trending', 'bars', 'bell', 'calendar', 'settings']
const CORES = ['#6C63FF', '#00D2A0', '#4DABF7', '#FFB800', '#FF4D6D', '#A78BFA', '#2B8FE0', '#8B8FA8']

const catModal = ref(false)
const catEditando = ref<string | null>(null)
const catForm = reactive({ name: '', icon: 'home', color: '#6C63FF' })
const catErro = ref('')

function novaCategoria() {
  catEditando.value = null
  Object.assign(catForm, { name: '', icon: ICONS[0], color: CORES[0] })
  catErro.value = ''
  catModal.value = true
}
function editarCategoria(name: string) {
  catEditando.value = name
  const m = catMeta(name)
  Object.assign(catForm, { name, icon: m.icon, color: m.color })
  catErro.value = ''
  catModal.value = true
}
function salvarCategoria() {
  catErro.value = ''
  if (!catForm.name.trim()) return (catErro.value = 'Informe o nome.')
  if (catEditando.value) editCategory(catTipo.value, catEditando.value, catForm.name.trim(), catForm.icon, catForm.color)
  else addCategory(catTipo.value, catForm.name.trim(), catForm.icon, catForm.color)
  catModal.value = false
}
async function excluirCategoria(name: string) {
  const ok = await confirmar({ title: 'Excluir categoria', message: `Tem certeza que deseja excluir a categoria "${name}"? Esta ação não pode ser desfeita.`, confirmLabel: 'Excluir' })
  if (ok) removeCategory(catTipo.value, name)
}

// ---- cotação ----
const cotManual = ref<number | null>(null)
const cotModo = ref<'auto' | 'manual'>('auto')
function aplicarCotacao() {
  if (cotModo.value === 'manual' && cotManual.value && cotManual.value > 0) store.usdBrl = cotManual.value
}
const cotHistory = [
  { data: '23 jun, 09:00', val: 'R$ 5,2001', fonte: 'GOOGLEFINANCE' },
  { data: '22 jun, 09:00', val: 'R$ 5,18', fonte: 'GOOGLEFINANCE' },
  { data: '21 jun, 09:00', val: 'R$ 5,21', fonte: 'GOOGLEFINANCE' },
]

// ---- notificações ----
const notifs = ref([
  { title: 'Lembrete mensal de lançamentos', sub: 'Todo dia 1º às 9h', on: true },
  { title: 'Alerta de saldo negativo', sub: 'Quando o saldo do mês ficar negativo', on: true },
  { title: 'Novos convites de conta conjunta', sub: '', on: true },
  { title: 'Atualizações de investimentos', sub: '', on: false },
])

function exportarJSON() {
  // backup completo do estado
  const dump = {
    transactions: store.transactions, investments: store.investments,
    checking: store.checking, categories: store.categories,
    customMeta: store.customMeta, usdBrl: store.usdBrl,
  }
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `financeflow-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

function exportarPDF() {
  window.print() // no diálogo do navegador, escolha "Salvar como PDF"
}

// ---- deletar conta (confirmação dupla) ----
const deletando = ref(false)
async function deletarConta() {
  const ok1 = await confirmar({
    title: 'Deletar conta',
    message: 'Isso remove PERMANENTEMENTE todos os seus lançamentos, investimentos e contas. Deseja continuar?',
    confirmLabel: 'Continuar',
  })
  if (!ok1) return
  const ok2 = await confirmar({
    title: 'Confirmação final',
    message: 'Última chance: seus dados serão apagados da nuvem e deste dispositivo, sem volta. Confirma a exclusão?',
    confirmLabel: 'Apagar tudo',
  })
  if (!ok2) return

  deletando.value = true
  try {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    if (user.value) {
      // RLS garante que só as linhas do próprio usuário são afetadas
      await supabase.from('transactions').delete().eq('user_id', user.value.id)
      await supabase.from('user_state').delete().eq('user_id', user.value.id)
      localStorage.removeItem(`ff_state:${user.value.id}`)
      await supabase.auth.signOut()
    }
    navigateTo('/login')
  } catch (e) {
    console.warn('[conta] falha ao deletar:', e)
  } finally {
    deletando.value = false
  }
}

const importInput = ref<HTMLInputElement>()
const importMsg = ref('')
function escolherImport() { importInput.value?.click() }
function importarJSON(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const d = JSON.parse(reader.result as string)
      if (Array.isArray(d.transactions)) store.transactions = d.transactions
      if (Array.isArray(d.investments)) store.investments = d.investments
      if (Array.isArray(d.checking)) store.checking = d.checking
      // backups antigos podem ter um array `shared` separado — dobra em checking (type:'casal')
      if (Array.isArray(d.shared)) {
        for (const s of d.shared) {
          if (!store.checking.some((c: any) => c.id === s.id)) {
            store.checking.push({ id: s.id, bank: s.name, balance: 0, currency: s.mainCurrency || 'BRL', color: s.color, type: 'casal', icon: s.icon, members: s.members, settle: s.settle ?? null })
          }
        }
      }
      if (d.categories) store.categories = d.categories
      if (d.customMeta) store.customMeta = d.customMeta
      if (d.usdBrl) store.usdBrl = d.usdBrl
      importMsg.value = 'Dados importados com sucesso!'
    } catch {
      importMsg.value = 'Arquivo inválido.'
    }
    setTimeout(() => (importMsg.value = ''), 3000)
  }
  reader.readAsText(file)
  ;(e.target as HTMLInputElement).value = ''
}
</script>

<template>
  <main class="screen">
    <div class="subnav">
      <a v-for="s in subnav" :key="s.id" class="subnav-item" :class="{ 'is-active': tab === s.id }" @click="tab = s.id">{{ s.label }}</a>
    </div>

    <div class="content">
      <!-- Perfil -->
      <div v-if="tab === 'perfil'" class="card pad">
        <h3 class="h3" style="margin-bottom:20px">Perfil</h3>
        <div class="profile-head">
          <div class="profile-avatar" :style="avatarStyle">
            <span v-if="!avatar">{{ initials }}</span>
          </div>
          <button class="btn-soft" @click="escolherFoto"><Icon name="camera" :size="15" color="#6B7088" :stroke="1.8" />Alterar foto</button>
          <button v-if="avatar" class="btn-soft" @click="ajustarFoto">Ajustar</button>
          <input ref="fileInput" type="file" accept="image/*" hidden @change="onFoto" />
        </div>
        <div class="form-grid">
          <div class="field"><label class="label">Nome completo</label><input v-model="nomeEdit" class="field-box field-input" /></div>
          <div class="field"><label class="label">E-mail</label><div class="field-box">{{ email }}</div></div>
          <div class="field">
            <label class="label">Fuso horário</label>
            <select v-model="tzEdit" class="field-box field-input">
              <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz.replace(/_/g, ' ') }}</option>
            </select>
          </div>
          <div class="field">
            <label class="label">Moeda padrão de exibição</label>
            <select v-model="moedaPadrao" class="field-box field-input">
              <option value="BRL">Real (BRL)</option>
              <option value="USD">Dólar (USD)</option>
            </select>
          </div>
        </div>
        <div style="margin-top:24px; display:flex; align-items:center; gap:14px">
          <button class="btn-primary" @click="salvarPerfil">Salvar alterações</button>
          <span v-if="salvouPerfil" style="font-size:13px; color:#00A88A; font-weight:600">✓ Salvo</span>
        </div>
      </div>

      <!-- Categorias -->
      <div v-else-if="tab === 'cat'" class="card pad">
        <div class="block-head">
          <h3 class="h3">Categorias</h3>
          <button class="btn-primary" style="height:36px" @click="novaCategoria"><Icon name="plus" :size="15" :stroke="2.2" />Nova categoria</button>
        </div>
        <div class="tab-group" style="width:fit-content; margin-bottom:8px">
          <button class="tab" :class="{ 'is-active': catTipo === 'expense' }" @click="catTipo = 'expense'">Despesa</button>
          <button class="tab" :class="{ 'is-active': catTipo === 'income' }" @click="catTipo = 'income'">Receita</button>
        </div>
        <div v-for="c in categorias" :key="c" class="cat-manage">
          <div class="cat-manage-ico" :style="{ background: hexRgba(catMeta(c).color, 0.14) }"><Icon :name="catMeta(c).icon" :size="19" :color="catMeta(c).color" :stroke="1.8" /></div>
          <span class="cat-manage-name">{{ c }}</span>
          <button class="sq-btn" @click="editarCategoria(c)"><Icon name="edit" :size="15" color="#6B7088" :stroke="1.8" /></button>
          <button class="sq-btn" @click="excluirCategoria(c)"><Icon name="trash" :size="15" color="#F03A5C" :stroke="1.8" /></button>
        </div>
      </div>

      <!-- Cotação -->
      <div v-else-if="tab === 'cot'" class="card pad">
        <h3 class="h3" style="margin-bottom:18px">Cotação USD/BRL</h3>
        <div class="cot-modes">
          <button class="cot-mode" :class="{ 'is-on': cotModo === 'auto' }" @click="cotModo = 'auto'">
            <div class="cot-mode-head"><span>Automática</span><span :class="cotModo === 'auto' ? 'radio-on' : 'radio-off'"><Icon v-if="cotModo === 'auto'" name="check" :size="11" color="#fff" :stroke="3" /></span></div>
            <div class="cot-mode-sub">Atual <b>R$ {{ store.usdBrl.toFixed(4) }}</b></div>
          </button>
          <button class="cot-mode" :class="{ 'is-on': cotModo === 'manual' }" @click="cotModo = 'manual'">
            <div class="cot-mode-head"><span>Manual</span><span :class="cotModo === 'manual' ? 'radio-on' : 'radio-off'"><Icon v-if="cotModo === 'manual'" name="check" :size="11" color="#fff" :stroke="3" /></span></div>
            <div class="cot-mode-sub">Você define o valor</div>
          </button>
        </div>
        <div v-if="cotModo === 'manual'" style="display:flex; gap:10px; align-items:flex-end; margin-bottom:22px">
          <label class="fld" style="flex:1; max-width:220px"><span class="fld-label">Cotação manual (R$ por US$)</span><input v-model.number="cotManual" type="number" step="0.0001" class="field-box field-input" placeholder="5,20" /></label>
          <button class="btn-primary" @click="aplicarCotacao">Aplicar</button>
        </div>
        <div class="label" style="margin-bottom:10px">Histórico recente</div>
        <div class="cot-table" style="margin-bottom:26px">
          <div class="cot-table-head"><span style="flex:1">Data</span><span style="width:90px; text-align:right">Cotação</span><span style="width:130px; text-align:right">Fonte</span></div>
          <div v-for="h in cotHistory" :key="h.data" class="cot-table-row"><span style="flex:1">{{ h.data }}</span><span style="width:90px; text-align:right; font-weight:600">{{ h.val }}</span><span style="width:130px; text-align:right; color:var(--text-2)">{{ h.fonte }}</span></div>
        </div>

        <h3 class="h3" style="margin-bottom:6px">Moedas adicionais</h3>
        <p class="notif-sub" style="margin-bottom:14px">BRL e USD são nativas. Ative outras moedas para usá-las em receitas e despesas — só as ativas aparecem no cadastro de lançamento. A taxa (R$ por unidade) é editável.</p>
        <div v-for="(info, code) in EXTRA_CURRENCIES" :key="code" class="moeda-row">
          <div style="flex:1">
            <div class="notif-title">{{ code }} — {{ info.name }}</div>
            <div class="notif-sub">Taxa: R$ {{ (store.extraCurrencies[code]?.rate ?? info.defaultRate).toFixed(4) }} por {{ code }}</div>
          </div>
          <input
            v-if="store.extraCurrencies[code]?.enabled"
            type="number" step="0.0001" min="0.0001" class="field-box field-input taxa-input"
            :value="store.extraCurrencies[code]?.rate ?? info.defaultRate"
            @change="setTaxa(code as string, $event)"
          />
          <button class="switch-lg" :class="{ 'is-on': store.extraCurrencies[code]?.enabled }" @click="toggleMoeda(code as string)"><div class="switch-lg-knob" /></button>
        </div>
      </div>

      <!-- Notificações -->
      <div v-else-if="tab === 'notif'" class="card pad">
        <h3 class="h3" style="margin-bottom:18px">Notificações</h3>
        <div v-for="n in notifs" :key="n.title" class="notif">
          <div style="flex:1"><div class="notif-title">{{ n.title }}</div><div v-if="n.sub" class="notif-sub">{{ n.sub }}</div></div>
          <button class="switch-lg" :class="{ 'is-on': n.on }" @click="n.on = !n.on"><div class="switch-lg-knob" /></button>
        </div>
      </div>

      <!-- Dados -->
      <div v-else class="card pad">
        <h3 class="h3" style="margin-bottom:18px">Dados e Privacidade</h3>
        <div class="data-row"><div style="flex:1"><div class="notif-title">Backup dos dados</div><div class="notif-sub">Baixe um JSON com tudo (lançamentos, investimentos, contas) — ou restaure um backup</div></div><div style="display:flex; gap:8px"><button class="btn-soft" @click="escolherImport">Importar</button><button class="btn-soft" @click="exportarJSON">Exportar JSON</button></div><input ref="importInput" type="file" accept="application/json" hidden @change="importarJSON" /></div>
        <p v-if="importMsg" style="font-size:13px; color:#00A88A; font-weight:600; margin:-4px 0 12px">{{ importMsg }}</p>
        <div class="data-row" style="margin-bottom:24px"><div style="flex:1"><div class="notif-title">Relatório completo</div><div class="notif-sub">Imprime a tela atual — no diálogo, escolha "Salvar como PDF"</div></div><button class="btn-soft" @click="exportarPDF">Exportar PDF</button></div>
        <div class="danger-zone">
          <div class="danger-title">Deletar conta</div>
          <div class="danger-sub">Esta ação é permanente e remove todos os seus dados. Pede confirmação dupla.</div>
          <button class="btn-danger" :disabled="deletando" @click="deletarConta">{{ deletando ? 'Removendo dados…' : 'Deletar minha conta' }}</button>
        </div>
      </div>
    </div>

    <!-- Modal categoria -->
    <Teleport to="body">
      <div v-if="catModal" class="modal-overlay" @click.self="catModal = false">
        <div class="modal">
          <header class="modal-head">
            <h3 class="h3">{{ catEditando ? 'Editar categoria' : 'Nova categoria' }} ({{ catTipo === 'expense' ? 'Despesa' : 'Receita' }})</h3>
            <button class="drawer-close" @click="catModal = false">✕</button>
          </header>
          <div class="modal-body">
            <label class="fld"><span class="fld-label">Nome</span><input v-model="catForm.name" class="field-box field-input" placeholder="Ex: Pets, Educação…" /></label>
            <div class="fld">
              <span class="fld-label">Ícone</span>
              <div class="picker">
                <button v-for="ic in ICONS" :key="ic" class="pick-ico" :class="{ on: catForm.icon === ic }" :style="catForm.icon === ic ? { borderColor: catForm.color, background: hexRgba(catForm.color, 0.12) } : {}" @click="catForm.icon = ic">
                  <Icon :name="ic" :size="18" :color="catForm.color" :stroke="1.8" />
                </button>
              </div>
            </div>
            <div class="fld">
              <span class="fld-label">Cor</span>
              <div class="picker">
                <button v-for="cor in CORES" :key="cor" class="pick-cor" :class="{ on: catForm.color === cor }" :style="{ background: cor }" @click="catForm.color = cor" />
              </div>
            </div>
            <div class="preview">
              <div class="cat-manage-ico" :style="{ background: hexRgba(catForm.color, 0.14) }"><Icon :name="catForm.icon" :size="19" :color="catForm.color" :stroke="1.8" /></div>
              <span style="font-weight:600">{{ catForm.name || 'Prévia' }}</span>
            </div>
            <p v-if="catErro" class="drawer-erro">{{ catErro }}</p>
          </div>
          <footer class="modal-foot">
            <button class="btn-ghost" @click="catModal = false">Cancelar</button>
            <button class="btn-save" @click="salvarCategoria">{{ catEditando ? 'Salvar' : 'Criar categoria' }}</button>
          </footer>
        </div>
      </div>
    </Teleport>

    <AvatarEditor v-if="editorOpen" :image="editorImg" :scale="store.profile.avatarScale" :x="store.profile.avatarX" :y="store.profile.avatarY" @save="salvarFoto" @close="editorOpen = false" />
  </main>
</template>

<style scoped>
.screen { padding: 24px 28px 40px; display: flex; gap: 22px; }

.subnav { width: 210px; flex: none; display: flex; flex-direction: column; gap: 3px; }
.subnav-item { display: block; padding: 11px 14px; border-radius: 10px; font-size: 14px; cursor: pointer; font-weight: 500; color: var(--text-2); }
.subnav-item:hover { background: var(--hover); }
.subnav-item.is-active { font-weight: 600; color: var(--accent); background: rgba(108, 99, 255, 0.1); }

.content { flex: 1; min-width: 0; }
.pad { padding: 24px; }
.block-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }

.profile-head { display: flex; align-items: center; gap: 18px; margin-bottom: 24px; }
.profile-avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #00D2A0, #23e0b5); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; color: #06251d; overflow: hidden; flex: none; }
.btn-soft { height: 38px; padding: 0 16px; background: var(--surface-3); border: none; border-radius: 9px; font-size: 13px; font-weight: 600; color: var(--text); cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field label { display: block; margin-bottom: 7px; }
.field-box { height: 42px; padding: 0 14px; background: var(--surface-3); border-radius: 10px; display: flex; align-items: center; font-size: 14px; }
.field-input { background: var(--surface); border: 1px solid var(--border); width: 100%; font-family: inherit; color: var(--text); outline: none; }
.field-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.field-select { justify-content: space-between; }

.cat-manage { display: flex; align-items: center; gap: 13px; padding: 12px 0; border-top: 1px solid var(--surface-3); }
.cat-manage-ico { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex: none; }
.cat-manage-name { font-size: 14px; font-weight: 500; flex: 1; }
.sq-btn { width: 32px; height: 32px; border-radius: 8px; background: var(--surface-3); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }

.cot-modes { display: flex; gap: 12px; margin-bottom: 22px; }
.cot-mode { flex: 1; padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); cursor: pointer; text-align: left; font-family: inherit; }
.cot-mode.is-on { border: 2px solid #6C63FF; background: rgba(108, 99, 255, 0.05); }
.cot-mode-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 14px; font-weight: 600; }
.cot-mode-sub { font-size: 12px; color: var(--text-2); }
.radio-on { width: 18px; height: 18px; border-radius: 50%; background: #6C63FF; display: flex; align-items: center; justify-content: center; }
.radio-off { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #D7DAE6; display: inline-block; }
.cot-table { border: 1px solid var(--border-soft); border-radius: 12px; overflow: hidden; }
.cot-table-head { display: flex; padding: 11px 16px; background: var(--surface-2); font-size: 12px; color: var(--text-2); }
.cot-table-row { display: flex; padding: 12px 16px; border-top: 1px solid var(--surface-3); font-size: 13px; }

.moeda-row { display: flex; align-items: center; gap: 12px; padding: 13px 0; border-top: 1px solid var(--surface-3); }
.taxa-input { width: 120px; height: 38px; text-align: right; }

.notif { display: flex; align-items: center; padding: 14px 0; border-top: 1px solid var(--surface-3); }
.notif-title { font-size: 14px; font-weight: 500; }
.notif-sub { font-size: 12px; color: var(--text-2); margin-top: 2px; }
.switch-lg { width: 40px; height: 23px; border-radius: 20px; background: #D7DAE6; padding: 2px; display: flex; border: none; cursor: pointer; }
.switch-lg.is-on { background: #6C63FF; justify-content: flex-end; }
.switch-lg-knob { width: 19px; height: 19px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); }

.data-row { display: flex; align-items: center; gap: 14px; padding: 16px; background: var(--surface-2); border: 1px solid var(--border-soft); border-radius: 12px; margin-bottom: 12px; }
.danger-zone { padding: 18px; border: 1px solid rgba(255, 77, 109, 0.3); border-radius: 12px; background: rgba(255, 77, 109, 0.04); }
.danger-title { font-size: 14px; font-weight: 600; color: #F03A5C; margin-bottom: 4px; }
.danger-sub { font-size: 12px; color: var(--text-2); margin-bottom: 14px; }
.btn-danger { height: 38px; padding: 0 18px; background: #FF4D6D; border: none; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }

/* modal categoria */
.modal-overlay { position: fixed; inset: 0; background: rgba(20,23,40,0.4); backdrop-filter: blur(2px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal { width: 440px; max-width: 100%; background: var(--surface); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); display: flex; flex-direction: column; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--border); }
.drawer-close { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--surface-3); cursor: pointer; font-size: 14px; color: var(--text-2); }
.modal-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; }
.fld { display: flex; flex-direction: column; }
.fld-label { font-size: 12px; font-weight: 600; color: var(--text-2); margin-bottom: 7px; }
.picker { display: flex; flex-wrap: wrap; gap: 8px; }
.pick-ico { width: 40px; height: 40px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.pick-cor { width: 30px; height: 30px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; }
.pick-cor.on { box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--text-3); }
.preview { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-2); border: 1px solid var(--border-soft); border-radius: 10px; }
.drawer-erro { font-size: 13px; color: var(--danger-text); background: rgba(255,77,109,0.08); border: 1px solid rgba(255,77,109,0.25); border-radius: 9px; padding: 9px 12px; margin: 0; }
.modal-foot { display: flex; gap: 10px; padding: 16px 22px; border-top: 1px solid var(--border); }
.btn-ghost { padding: 0 18px; height: 44px; border: 1px solid var(--border); border-radius: 10px; background: transparent; font-family: inherit; font-size: 14px; font-weight: 600; color: var(--text-2); cursor: pointer; }
.btn-save { flex: 1; height: 44px; border: none; border-radius: 10px; background: var(--accent); color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }

@media (max-width: 900px) {
  .screen { padding: 16px; flex-direction: column; }
  .subnav { width: 100%; flex-direction: row; overflow-x: auto; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
