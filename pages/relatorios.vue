<script setup lang="ts">
import { brl } from '~/composables/useStore'
import { useFinance } from '~/composables/useFinance'
import { useDisplay } from '~/composables/useDisplay'
import { usePeriod } from '~/composables/usePeriod'

definePageMeta({ crumb: 'Relatórios', title: 'Relatórios' })

const { disp } = useDisplay()
const { label: periodLabel } = usePeriod()
const { catDespesas, resumo, grupos } = useFinance()

// ---- exportações ----
function exportarCSV() {
  const linhas = [['Data', 'Descrição', 'Tipo', 'Categoria', 'Moeda', 'Valor', 'Valor (BRL)', 'Recorrente']]
  for (const g of grupos.value) {
    for (const t of g.items) {
      linhas.push([
        t.date, t.desc, t.type === 'income' ? 'Receita' : 'Despesa', t.category,
        t.currency, String(t.amount).replace('.', ','), String(t.amountBrl).replace('.', ','),
        t.recurring ? 'Sim' : 'Não',
      ])
    }
  }
  const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `financeflow-${periodLabel.value.toLowerCase().replace(' ', '-')}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
function exportarPDF() {
  window.print() // no diálogo, escolha "Salvar como PDF"
}
const catRows = computed(() =>
  catDespesas.value.items.map((it) => ({
    name: it.name,
    color: it.color,
    valueLabel: disp(it.value),
    pctWidth: ((it.value / (catDespesas.value.total || 1)) * 100).toFixed(1) + '%',
  })),
)

const tab = ref<'fluxo' | 'cat' | 'pessoal' | 'moedas'>('fluxo')
const tabs = [
  { id: 'fluxo', label: 'Fluxo de Caixa' },
  { id: 'cat', label: 'Por Categoria' },
  { id: 'pessoal', label: 'Pessoal vs Conjunto' },
  { id: 'moedas', label: 'Moedas' },
] as const
</script>

<template>
  <main class="screen">
    <div class="rep-head">
      <div class="tab-group rep-tabs">
        <button v-for="t in tabs" :key="t.id" class="tab" :class="{ 'is-active': tab === t.id }" @click="tab = t.id">{{ t.label }}</button>
      </div>
      <div class="rep-export">
        <button class="export-btn" @click="exportarPDF"><Icon name="filePdf" :size="15" color="#F03A5C" />Exportar PDF</button>
        <button class="export-btn" @click="exportarCSV"><Icon name="download" :size="15" color="#00A88A" />Exportar CSV</button>
      </div>
    </div>

    <div class="totals">
      <div class="card total"><div class="total-label">Entradas no período</div><div class="total-value" style="color:#00A88A">{{ disp(resumo.receitas.total) }}</div></div>
      <div class="card total"><div class="total-label">Saídas no período</div><div class="total-value" style="color:#F03A5C">{{ disp(resumo.despesas.total) }}</div></div>
      <div class="card total"><div class="total-label">Resultado</div><div class="total-value" style="color:#6C63FF">{{ disp(resumo.saldo) }}</div></div>
    </div>

    <div class="card" style="padding:22px">
      <template v-if="tab === 'fluxo'">
        <h3 class="h3" style="margin-bottom:4px">Fluxo de caixa acumulado</h3>
        <p class="block-sub">Receitas e despesas acumuladas — {{ periodLabel.toLowerCase() }}</p>
        <ChartsLineChart />
        <div class="legend">
          <span class="leg"><span class="leg-dot" style="background:#00D2A0" />Receitas</span>
          <span class="leg"><span class="leg-dot" style="background:#FF4D6D" />Despesas</span>
        </div>
      </template>

      <template v-else-if="tab === 'cat'">
        <h3 class="h3" style="margin-bottom:16px">Ranking de despesas por categoria</h3>
        <div class="rank">
          <div v-for="c in catRows" :key="c.name" class="rank-row">
            <span class="rank-name">{{ c.name }}</span>
            <div class="rank-bar"><div :style="{ background: c.color, width: c.pctWidth }" /></div>
            <span class="rank-val">{{ c.valueLabel }}</span>
          </div>
        </div>
      </template>

      <template v-else-if="tab === 'pessoal'">
        <h3 class="h3" style="margin-bottom:16px">Pessoal vs Contas conjuntas</h3>
        <div class="bars">
          <div class="bar-group"><div class="bar-pair"><div class="bar" style="height:170px; background:#00D2A0" /><div class="bar" style="height:96px; background:#FF4D6D" /></div><span class="bar-label">Pessoal</span></div>
          <div class="bar-group"><div class="bar-pair"><div class="bar" style="height:62px; background:#00D2A0" /><div class="bar" style="height:40px; background:#FF4D6D" /></div><span class="bar-label">Casal</span></div>
          <div class="bar-group"><div class="bar-pair"><div class="bar" style="height:22px; background:#00D2A0" /><div class="bar" style="height:49px; background:#FF4D6D" /></div><span class="bar-label">Viagem Paris</span></div>
        </div>
        <div class="legend" style="justify-content:center; margin-top:18px">
          <span class="leg"><span class="leg-dot" style="background:#00D2A0" />Receitas</span>
          <span class="leg"><span class="leg-dot" style="background:#FF4D6D" />Despesas</span>
        </div>
      </template>

      <template v-else>
        <h3 class="h3" style="margin-bottom:16px">Comparativo de moedas</h3>
        <div class="moedas">
          <div class="moeda-card"><div class="moeda-label">Receitas/Despesas em BRL (original)</div><div class="moeda-val">{{ brl(resumo.receitas.brl + resumo.despesas.brl) }}</div><div class="moeda-sub">{{ resumo.receitas.brl.toLocaleString('pt-BR') }} entradas · {{ resumo.despesas.brl.toLocaleString('pt-BR') }} saídas</div></div>
          <div class="moeda-card"><div class="moeda-label">Movimentação em USD (original)</div><div class="moeda-val" style="color:#2B8FE0">US$ {{ (resumo.receitas.usd + resumo.despesas.usd).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }}</div><div class="moeda-sub">cotação aplicada R$ 5,2001</div></div>
        </div>
      </template>
    </div>
  </main>
</template>

<style scoped>
.screen { padding: 24px 28px 40px; display: flex; flex-direction: column; gap: 18px; }

.rep-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rep-tabs { background: var(--surface); border: 1px solid var(--border); }
.rep-export { margin-left: auto; display: flex; gap: 10px; }
.export-btn { display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 9px; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text); font-family: inherit; }

.totals { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.total { padding: 18px; box-shadow: none; }
.total-label { font-size: 12px; color: var(--text-2); margin-bottom: 6px; }
.total-value { font-size: 22px; font-weight: 700; }

.block-sub { margin: 0 0 16px; font-size: 12px; color: var(--text-2); }
.legend { display: flex; gap: 22px; margin-top: 6px; }
.leg { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-2); }
.leg-dot { width: 11px; height: 11px; border-radius: 3px; }

.rank { display: flex; flex-direction: column; gap: 16px; }
.rank-row { display: flex; align-items: center; gap: 14px; }
.rank-name { font-size: 13px; font-weight: 500; width: 120px; }
.rank-bar { flex: 1; height: 14px; border-radius: 7px; background: var(--surface-3); overflow: hidden; }
.rank-bar > div { height: 100%; border-radius: 7px; }
.rank-val { font-size: 13px; font-weight: 700; width: 90px; text-align: right; }

.bars { display: flex; align-items: flex-end; gap: 40px; height: 240px; padding: 0 20px; }
.bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.bar-pair { display: flex; align-items: flex-end; gap: 8px; height: 190px; }
.bar { width: 38px; border-radius: 6px 6px 0 0; }
.bar-label { font-size: 13px; font-weight: 600; }

.moedas { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.moeda-card { padding: 18px; background: var(--surface-2); border: 1px solid var(--border-soft); border-radius: 14px; }
.moeda-label { font-size: 12px; color: var(--text-2); margin-bottom: 10px; }
.moeda-val { font-size: 24px; font-weight: 700; }
.moeda-sub { font-size: 12px; color: var(--text-2); margin-top: 6px; }

@media (max-width: 900px) {
  .screen { padding: 16px; }
  .totals, .moedas { grid-template-columns: 1fr; }
  .rep-export { margin-left: 0; }
}
</style>
