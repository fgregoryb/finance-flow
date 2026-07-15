<script setup lang="ts">
import { useStore, fmtMoney, catMeta, hexRgba, removeTransaction } from '~/composables/useStore'
import { useFinance } from '~/composables/useFinance'
import { useDisplay } from '~/composables/useDisplay'
import { abrirNovo, abrirEdicao } from '~/composables/useDrawer'
import { confirmar } from '~/composables/useConfirm'

definePageMeta({ crumb: 'Lançamentos', title: 'Lançamentos' })

const { grupos, resumo } = useFinance()
const { disp } = useDisplay()
const store = useStore()

function bankName(id?: string) {
  if (!id) return ''
  const c = store.checking.find((x) => x.id === id)
  if (!c) return ''
  return c.type === 'casal' ? `${c.bank} (${c.sharedLabel || 'Casal'})` : c.bank
}

async function excluir(id: string, desc: string) {
  if (await confirmar({ title: 'Excluir lançamento', message: `Tem certeza que deseja excluir "${desc}"?`, confirmLabel: 'Excluir' })) removeTransaction(id)
}

const tipo = ref<'Todos' | 'Receitas' | 'Despesas'>('Todos')
const moeda = ref<'Todas' | 'BRL' | 'USD'>('Todas')
const busca = ref('')

const gruposFiltrados = computed(() => {
  return grupos.value
    .map((g) => {
      const items = g.items.filter((t) => {
        if (tipo.value === 'Receitas' && t.type !== 'income') return false
        if (tipo.value === 'Despesas' && t.type !== 'expense') return false
        if (moeda.value !== 'Todas' && t.currency !== moeda.value) return false
        if (busca.value && !`${t.desc} ${t.category} ${t.notes || ''}`.toLowerCase().includes(busca.value.toLowerCase())) return false
        return true
      })
      const subtotal = items.reduce((a, t) => a + (t.type === 'income' ? t.amountBrl : -t.amountBrl), 0)
      return { ...g, items, subtotal }
    })
    .filter((g) => g.items.length)
})
</script>

<template>
  <main class="screen">
    <!-- filtros -->
    <div class="filters">
      <div class="tab-group">
        <button v-for="t in ['Todos','Receitas','Despesas']" :key="t" class="tab" :class="{ 'is-active': tipo === t }" @click="tipo = t as any">{{ t }}</button>
      </div>
      <div class="tab-group">
        <button v-for="m in ['Todas','BRL','USD']" :key="m" class="tab" :class="{ 'is-active': moeda === m }" @click="moeda = m as any">{{ m }}</button>
      </div>
      <div class="search">
        <Icon name="search" :size="16" color="#A0A3B5" />
        <input v-model="busca" type="text" placeholder="Buscar lançamento…" />
      </div>
      <button class="btn-primary" @click="abrirNovo()"><Icon name="plus" :size="17" :stroke="2.2" />Novo lançamento</button>
    </div>

    <!-- totalizadores -->
    <div class="totals">
      <div class="card total"><div class="total-label">Receitas do período</div><div class="total-value" style="color:#00A88A">{{ disp(resumo.receitas.total) }}</div></div>
      <div class="card total"><div class="total-label">Despesas do período</div><div class="total-value" style="color:#F03A5C">{{ disp(resumo.despesas.total) }}</div></div>
      <div class="card total"><div class="total-label">Saldo do período</div><div class="total-value" style="color:#6C63FF">{{ disp(resumo.saldo) }}</div></div>
    </div>

    <!-- lista agrupada -->
    <div v-if="gruposFiltrados.length" class="card list-card">
      <template v-for="g in gruposFiltrados" :key="g.date">
        <div class="day-head">
          <span class="label">{{ g.label }}</span>
          <span class="day-sub">Subtotal: <b :style="{ color: g.subtotal >= 0 ? '#00A88A' : '#F03A5C' }">{{ g.subtotal >= 0 ? '+' : '−' }}{{ disp(Math.abs(g.subtotal)) }}</b></span>
        </div>
        <div v-for="t in g.items" :key="t.id" class="tx">
          <div class="tx-ico" :style="{ background: hexRgba(catMeta(t.category).color, 0.14) }"><Icon :name="catMeta(t.category).icon" :size="19" :color="catMeta(t.category).color" :stroke="1.8" /></div>
          <div class="tx-info">
            <div class="tx-title-row">
              <span class="tx-title">{{ t.desc }}</span>
              <span v-if="t.recurring" class="pill-tag" style="color:#D99400; background:rgba(255,184,0,0.14)">Recorrente</span>
            </div>
            <div class="tx-cat">{{ t.category }}<span v-if="bankName(t.bankAccountId)"> · {{ bankName(t.bankAccountId) }}</span><span v-if="t.notes"> · {{ t.notes }}</span></div>
          </div>
          <span class="cur-badge" :style="t.currency !== 'BRL' ? { color: '#2B8FE0', background: 'rgba(77,171,247,0.12)' } : { color: '#6B7088', background: '#F1F3F8' }">{{ t.currency }}</span>
          <div class="tx-amt">
            <div :style="{ color: t.type === 'income' ? '#00A88A' : '#F03A5C' }">{{ t.type === 'income' ? '+' : '−' }}{{ t.currency === 'BRL' ? disp(t.amount) : fmtMoney(t.currency, t.amount) }}</div>
            <div v-if="t.currency !== 'BRL'" class="tx-conv">≈ {{ disp(t.amountBrl) }}</div>
          </div>
          <div class="tx-actions">
            <button class="tx-act" title="Editar" @click="abrirEdicao(t.id)"><Icon name="edit" :size="15" color="#6B7088" :stroke="1.8" /></button>
            <button class="tx-act" title="Excluir" @click="excluir(t.id, t.desc)"><Icon name="trash" :size="15" color="#F03A5C" :stroke="1.8" /></button>
          </div>
        </div>
      </template>
    </div>

    <div v-else class="card empty">
      <div class="empty-ico"><Icon name="search" :size="26" color="#8B8FA8" :stroke="1.6" /></div>
      <div class="empty-title">Nenhum lançamento encontrado</div>
      <div class="empty-sub">Ajuste os filtros ou crie um novo lançamento.</div>
      <button class="btn-primary" style="margin-top:16px" @click="abrirNovo()"><Icon name="plus" :size="17" :stroke="2.2" />Novo lançamento</button>
    </div>
  </main>
</template>

<style scoped>
.screen { padding: 24px 28px 40px; display: flex; flex-direction: column; gap: 18px; }

.filters { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tab-group { background: var(--surface); border: 1px solid var(--border); }
.search {
  margin-left: auto; display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 13px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 9px; width: 240px;
}
.search input { border: none; outline: none; background: transparent; font-family: inherit; font-size: 13px; color: var(--text); flex: 1; min-width: 0; }
.search input::placeholder { color: var(--text-3); }

.totals { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.total { border-radius: 14px; padding: 16px 18px; box-shadow: none; }
.total-label { font-size: 12px; color: var(--text-2); margin-bottom: 6px; }
.total-value { font-size: 22px; font-weight: 700; }

.list-card { padding: 8px 22px 14px; }
.day-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 0 8px; }
.day-sub { font-size: 12px; color: var(--text-2); }

.tx { display: flex; align-items: center; gap: 14px; padding: 13px 0; border-top: 1px solid var(--surface-3); }
.tx-ico { width: 40px; height: 40px; flex: none; border-radius: 11px; display: flex; align-items: center; justify-content: center; }
.tx-info { flex: 1; min-width: 0; }
.tx-title-row { display: flex; align-items: center; gap: 8px; }
.tx-title { font-size: 14px; font-weight: 600; }
.tx-cat { font-size: 12px; color: var(--text-2); margin-top: 2px; }
.tx-amt { text-align: right; min-width: 110px; font-size: 14px; font-weight: 700; }
.tx-conv { font-size: 11px; color: var(--text-3); font-weight: 400; }
.tx-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; }
.tx:hover .tx-actions { opacity: 1; }
.tx-act { width: 30px; height: 30px; border: none; background: transparent; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.tx-act:hover { background: var(--surface-3); }

.empty { padding: 48px; text-align: center; }
.empty-ico { width: 56px; height: 56px; border-radius: 16px; background: var(--surface-3); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
.empty-title { font-size: 15px; font-weight: 600; }
.empty-sub { font-size: 13px; color: var(--text-2); margin-top: 4px; }

@media (max-width: 900px) {
  .screen { padding: 16px; }
  .totals { grid-template-columns: 1fr; }
  .search { width: 100%; margin-left: 0; }
}
</style>
