<script setup lang="ts">
import { useStore, brl, fmtMoney, catMeta, hexRgba } from '~/composables/useStore'
import { useFinance } from '~/composables/useFinance'
import { useDisplay } from '~/composables/useDisplay'

definePageMeta({ crumb: 'Dashboard', title: 'Dashboard' })

const store = useStore()
const { disp } = useDisplay()
const { resumo, catDespesas, catReceitas, distrib, serie6, recent, invest, accountSummary } = useFinance()

const colMode = ref<'Consolidado' | 'BRL' | 'USD'>('Consolidado')
const catMode = ref<'Despesas' | 'Receitas'>('Despesas')

const contasCasal = computed(() => store.checking.filter((c) => c.type === 'casal'))
const serie = computed(() => serie6(colMode.value))
const activeCat = computed(() => (catMode.value === 'Despesas' ? catDespesas.value : catReceitas.value))
const catRows = computed(() =>
  activeCat.value.items.map((it) => ({
    name: it.name,
    color: it.color,
    valueLabel: disp(it.value),
    pctLabel: Math.round((it.value / (activeCat.value.total || 1)) * 100) + '%',
    pctWidth: ((it.value / (activeCat.value.total || 1)) * 100).toFixed(1) + '%',
  })),
)
const saldoColor = computed(() => (resumo.value.saldo >= 0 ? '#fff' : '#fff'))
</script>

<template>
  <main class="screen">
    <!-- Seção A — visão geral -->
    <div class="overview">
      <div class="card stat">
        <div class="stat-head">
          <div class="stat-ico" style="background: rgba(0,210,160,0.14)"><Icon name="arrowInUp" :size="19" color="#00A88A" :stroke="2" /></div>
          <span class="stat-label">Receitas</span>
        </div>
        <div class="stat-value">{{ disp(resumo.receitas.total) }}</div>
        <div class="stat-break"><b style="color:#00A88A">{{ brl(resumo.receitas.brl) }}</b> + <b style="color:#2B8FE0">US$ {{ resumo.receitas.usd.toLocaleString('pt-BR') }}</b></div>
      </div>

      <div class="card stat">
        <div class="stat-head">
          <div class="stat-ico" style="background: rgba(255,77,109,0.12)"><Icon name="arrowOutDown" :size="19" color="#F03A5C" :stroke="2" /></div>
          <span class="stat-label">Despesas</span>
        </div>
        <div class="stat-value">{{ disp(resumo.despesas.total) }}</div>
        <div class="stat-break"><b style="color:#F03A5C">{{ brl(resumo.despesas.brl) }}</b> + <b style="color:#2B8FE0">US$ {{ resumo.despesas.usd.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }}</b></div>
      </div>

      <div class="balance" :class="{ neg: resumo.saldo < 0 }">
        <div class="balance-glow" />
        <div class="balance-head">
          <span>Saldo do mês</span>
          <span class="balance-chip">{{ resumo.sobrouPct >= 0 ? 'Sobrou' : 'Faltou' }} {{ Math.abs(resumo.sobrouPct) }}%</span>
        </div>
        <div class="balance-value" :style="{ color: saldoColor }">{{ disp(resumo.saldo) }}</div>
        <div class="balance-foot">{{ resumo.sobrouPct >= 0 ? 'Sobrou' : 'Faltou' }} <b>{{ Math.abs(resumo.sobrouPct) }}%</b> da sua receita este mês</div>
      </div>
    </div>

    <!-- barra de progresso -->
    <div class="card progress-card">
      <div class="progress-head">
        <span>Você gastou <b style="color:var(--text)">{{ resumo.gastoPct }}%</b> da sua receita este mês</span>
        <span style="font-weight:600; color:#00A88A">{{ disp(resumo.disponivel) }} disponível</span>
      </div>
      <div class="progress-track"><div class="progress-fill" :style="{ width: Math.min(100, resumo.gastoPct) + '%' }" /></div>
    </div>

    <!-- gráfico colunas -->
    <div class="card" style="padding:22px">
      <div class="block-head">
        <div><h3 class="h3">Receitas vs Despesas</h3><p class="block-sub">Últimos 6 meses</p></div>
        <div class="tab-group">
          <button v-for="m in ['Consolidado','BRL','USD']" :key="m" class="tab" :class="{ 'is-active': colMode === m }" @click="colMode = m as any">{{ m }}</button>
        </div>
      </div>
      <ChartsColumnChart :rec="serie.rec" :desp="serie.desp" :labels="serie.labels" :unit="colMode === 'USD' ? 'USD' : 'BRL'" />
      <div class="chart-legend">
        <span class="leg"><span class="leg-dot" style="background:#00D2A0" />Receitas</span>
        <span class="leg"><span class="leg-dot" style="background:#FF4D6D" />Despesas</span>
        <span style="margin-left:auto; font-size:12px; color:var(--text-3)">Cotação aplicada: R$ {{ store.usdBrl.toFixed(2) }} / USD</span>
      </div>
    </div>

    <!-- categoria + distribuição -->
    <div class="grid-60-40">
      <div class="card" style="padding:22px">
        <div class="block-head">
          <h3 class="h3">Resumo por categoria</h3>
          <div class="tab-group">
            <button class="tab" :class="{ 'is-active': catMode === 'Despesas' }" @click="catMode = 'Despesas'">Despesas</button>
            <button class="tab" :class="{ 'is-active': catMode === 'Receitas' }" @click="catMode = 'Receitas'">Receitas</button>
          </div>
        </div>
        <div class="cat-body">
          <div class="cat-donut">
            <ChartsDonutChart :segments="activeCat.items" :size="170" :thickness="26" />
            <div class="cat-center">
              <span class="cat-center-label">{{ catMode }}</span>
              <span class="cat-center-value">{{ disp(activeCat.total) }}</span>
            </div>
          </div>
          <div class="cat-list">
            <div v-for="c in catRows" :key="c.name" class="cat-row">
              <div class="cat-row-head">
                <span class="cat-sw" :style="{ background: c.color }" />
                <span class="cat-name">{{ c.name }}</span>
                <span class="cat-val">{{ c.valueLabel }}</span>
                <span class="cat-pct">{{ c.pctLabel }}</span>
              </div>
              <div class="cat-bar"><div :style="{ background: c.color, width: c.pctWidth }" /></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card distrib">
        <h3 class="h3" style="margin-bottom:18px">Distribuição BRL vs USD</h3>
        <div class="distrib-body">
          <div class="distrib-row">
            <div class="distrib-donut"><ChartsDonutChart :segments="distrib.receitas" :size="90" :thickness="15" /><span class="distrib-center">Rec.</span></div>
            <div class="distrib-legend">
              <div class="distrib-title">Receitas</div>
              <div class="distrib-li"><span class="leg-dot" style="background:#00D2A0" /><span style="flex:1">BRL</span><b>{{ distrib.receitasPct.brl }}%</b></div>
              <div class="distrib-li"><span class="leg-dot" style="background:#4DABF7" /><span style="flex:1">USD</span><b>{{ distrib.receitasPct.usd }}%</b></div>
            </div>
          </div>
          <div class="hr" />
          <div class="distrib-row">
            <div class="distrib-donut"><ChartsDonutChart :segments="distrib.despesas" :size="90" :thickness="15" /><span class="distrib-center">Desp.</span></div>
            <div class="distrib-legend">
              <div class="distrib-title">Despesas</div>
              <div class="distrib-li"><span class="leg-dot" style="background:#FF4D6D" /><span style="flex:1">BRL</span><b>{{ distrib.despesasPct.brl }}%</b></div>
              <div class="distrib-li"><span class="leg-dot" style="background:#4DABF7" /><span style="flex:1">USD</span><b>{{ distrib.despesasPct.usd }}%</b></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- contas conjuntas + investimentos -->
    <div class="grid-2">
      <div class="card" style="padding:22px">
        <div class="block-head" style="margin-bottom:16px"><h3 class="h3">Contas conjuntas</h3><NuxtLink to="/investimentos" class="link-more">Ver todas</NuxtLink></div>
        <div v-if="contasCasal.length" class="acct-list">
          <NuxtLink v-for="a in contasCasal" :key="a.id" to="/investimentos" class="acct">
            <div class="acct-ico" :style="{ background: hexRgba(a.color, 0.14) }"><Icon :name="a.icon || 'users'" :size="20" :color="a.color" :stroke="1.8" /></div>
            <div class="acct-info"><div class="acct-name">{{ a.bank }}</div><div class="acct-sub">{{ accountSummary(a.id).count }} lançamentos · {{ (a.members || []).length }} membros</div></div>
            <div class="acct-amt"><div :style="{ color: accountSummary(a.id).saldo >= 0 ? '#00A88A' : '#F03A5C' }">{{ accountSummary(a.id).saldo >= 0 ? '+' : '' }}{{ disp(accountSummary(a.id).saldo) }}</div><div class="acct-amt-sub">saldo do mês</div></div>
          </NuxtLink>
        </div>
        <div v-else class="acct-empty">Nenhuma conta conjunta ainda.</div>
      </div>

      <div class="card" style="padding:22px">
        <div class="block-head" style="margin-bottom:16px"><h3 class="h3">Investimentos</h3><NuxtLink to="/investimentos" class="link-more">Ver carteira</NuxtLink></div>
        <div class="inv-top">
          <div><div class="inv-top-label">Total investido</div><div class="inv-top-value">{{ disp(invest.valorAtual) }}</div></div>
          <div class="inv-top-chip"><Icon name="up" :size="13" color="#00A88A" :stroke="2.4" /><span>+{{ (invest.rentPct * 100).toFixed(1).replace('.', ',') }}%</span></div>
        </div>
        <div class="inv-list">
          <div v-for="r in invest.rows.slice(0, 3)" :key="r.id" class="inv-row">
            <div class="inv-sigla" :style="{ background: hexRgba(catMeta(r.type).color, 0.14), color: catMeta(r.type).color }">{{ r.name.slice(0, 2).toUpperCase() }}</div>
            <div style="flex:1"><div class="inv-name">{{ r.name }}</div><div class="inv-meta">{{ r.type }} · {{ r.currency }}</div></div>
            <span class="inv-rent">+{{ (r.rentPct * 100).toFixed(1).replace('.', ',') }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- lançamentos recentes -->
    <div class="card" style="padding:22px">
      <div class="block-head"><h3 class="h3">Lançamentos recentes</h3><NuxtLink to="/lancamentos" class="link-more">Ver todos</NuxtLink></div>
      <div class="tx-list" style="margin-top:8px">
        <div v-for="(l, i) in recent" :key="l.id" class="tx" :class="{ 'tx-last': i === recent.length - 1 }">
          <div class="tx-ico" :style="{ background: hexRgba(catMeta(l.category).color, 0.14) }"><Icon :name="catMeta(l.category).icon" :size="19" :color="catMeta(l.category).color" :stroke="1.8" /></div>
          <div class="tx-info">
            <div class="tx-title-row">
              <span class="tx-title">{{ l.desc }}</span>
              <span v-if="l.recurring" class="pill-tag" style="color:#D99400; background:rgba(255,184,0,0.14)">Recorrente</span>
            </div>
            <div class="tx-cat">{{ l.category }}</div>
          </div>
          <span class="cur-badge" :style="l.currency !== 'BRL' ? { color: '#2B8FE0', background: 'rgba(77,171,247,0.12)' } : { color: '#6B7088', background: '#F1F3F8' }">{{ l.currency }}</span>
          <div class="tx-amt">
            <div :style="{ color: l.type === 'income' ? '#00A88A' : '#F03A5C' }">{{ l.type === 'income' ? '+' : '−' }}{{ l.currency === 'BRL' ? disp(l.amount) : fmtMoney(l.currency, l.amount) }}</div>
            <div v-if="l.currency !== 'BRL'" class="tx-conv">≈ {{ disp(l.amountBrl) }}</div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.screen { padding: 24px 28px 40px; display: flex; flex-direction: column; gap: 20px; }

.overview { display: grid; grid-template-columns: 1fr 1fr 1.15fr; gap: 16px; }
.stat { padding: 20px; }
.stat-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.stat-ico { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.stat-label { font-size: 13px; font-weight: 600; color: var(--text-2); }
.stat-value { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
.stat-break { margin-top: 10px; font-size: 12px; color: var(--text-2); }
.stat-break b { font-weight: 600; }

.balance { background: linear-gradient(135deg, #6C63FF, #564ee0); border-radius: 16px; padding: 20px; box-shadow: 0 8px 28px rgba(108, 99, 255, 0.4); position: relative; overflow: hidden; color: #fff; }
.balance.neg { background: linear-gradient(135deg, #FF4D6D, #e0364f); box-shadow: 0 8px 28px rgba(255, 77, 109, 0.4); }
.balance-glow { position: absolute; right: -30px; top: -30px; width: 130px; height: 130px; border-radius: 50%; background: rgba(255, 255, 255, 0.1); }
.balance-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; position: relative; font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.85); }
.balance-chip { font-size: 11px; font-weight: 600; color: #fff; background: rgba(255, 255, 255, 0.2); padding: 3px 10px; border-radius: 20px; }
.balance-value { font-size: 34px; font-weight: 800; letter-spacing: -0.025em; position: relative; }
.balance-foot { margin-top: 10px; font-size: 12px; color: rgba(255, 255, 255, 0.85); position: relative; }
.balance-foot b { color: #fff; }

.progress-card { padding: 18px 20px; }
.progress-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 11px; font-size: 13px; color: var(--text-2); }
.progress-track { height: 10px; border-radius: 6px; background: var(--surface-3); overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #FF4D6D, #ff6b85); border-radius: 6px; }

.block-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
.block-sub { margin: 4px 0 0; font-size: 12px; color: var(--text-2); }
.chart-legend { display: flex; align-items: center; gap: 22px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-soft); }
.leg { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-2); }
.leg-dot { width: 11px; height: 11px; border-radius: 3px; }

.grid-60-40 { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

.cat-body { display: flex; align-items: center; gap: 24px; }
.cat-donut { position: relative; flex: none; width: 170px; height: 170px; }
.cat-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.cat-center-label { font-size: 11px; color: var(--text-2); }
.cat-center-value { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
.cat-list { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 13px; }
.cat-row-head { display: flex; align-items: center; gap: 9px; margin-bottom: 6px; }
.cat-sw { width: 9px; height: 9px; border-radius: 3px; flex: none; }
.cat-name { font-size: 13px; font-weight: 500; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cat-val { font-size: 13px; font-weight: 600; }
.cat-pct { font-size: 11px; color: var(--text-3); width: 34px; text-align: right; }
.cat-bar { height: 5px; border-radius: 3px; background: var(--surface-3); overflow: hidden; }
.cat-bar > div { height: 100%; border-radius: 3px; }

.distrib { padding: 22px; display: flex; flex-direction: column; }
.distrib-body { display: flex; flex-direction: column; gap: 18px; flex: 1; justify-content: center; }
.distrib-row { display: flex; align-items: center; gap: 16px; }
.distrib-donut { position: relative; width: 90px; height: 90px; flex: none; }
.distrib-center { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: var(--text-2); }
.distrib-legend { flex: 1; }
.distrib-title { font-size: 12px; color: var(--text-2); margin-bottom: 9px; }
.distrib-li { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; font-size: 13px; }
.distrib-li b { font-size: 13px; }
.hr { height: 1px; background: var(--border-soft); }

.acct-list { display: flex; flex-direction: column; gap: 12px; }
.acct { display: flex; align-items: center; gap: 13px; padding: 13px; background: var(--surface-2); border: 1px solid var(--border-soft); border-radius: 12px; text-decoration: none; color: inherit; }
.acct:hover { border-color: #cfd3e3; }
.acct-empty { font-size: 13px; color: var(--text-2); padding: 8px 0; }
.acct-ico { width: 42px; height: 42px; flex: none; border-radius: 11px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.acct-info { flex: 1; min-width: 0; }
.acct-name { font-size: 14px; font-weight: 600; }
.acct-sub { font-size: 11px; color: var(--text-2); margin-top: 2px; }
.acct-amt { text-align: right; font-size: 14px; font-weight: 700; }
.acct-amt-sub { font-size: 11px; color: var(--text-3); font-weight: 400; }

.tx-list { display: flex; flex-direction: column; }
.tx { display: flex; align-items: center; gap: 14px; padding: 13px 0; border-bottom: 1px solid var(--surface-3); }
.tx-last { border-bottom: none; }
.tx-ico { width: 40px; height: 40px; flex: none; border-radius: 11px; display: flex; align-items: center; justify-content: center; }
.tx-info { flex: 1; min-width: 0; }
.tx-title-row { display: flex; align-items: center; gap: 8px; }
.tx-title { font-size: 14px; font-weight: 600; }
.tx-cat { font-size: 12px; color: var(--text-2); margin-top: 2px; }
.tx-amt { text-align: right; min-width: 96px; font-size: 14px; font-weight: 700; }
.tx-conv { font-size: 11px; color: var(--text-3); font-weight: 400; }

.inv-top { display: flex; align-items: flex-end; gap: 16px; margin-bottom: 18px; }
.inv-top-label { font-size: 11px; color: var(--text-2); margin-bottom: 3px; }
.inv-top-value { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
.inv-top-chip { margin-bottom: 3px; display: flex; align-items: center; gap: 5px; padding: 4px 9px; background: rgba(0, 210, 160, 0.14); border-radius: 8px; font-size: 13px; font-weight: 700; color: #00A88A; }
.inv-list { display: flex; flex-direction: column; gap: 11px; }
.inv-row { display: flex; align-items: center; gap: 11px; }
.inv-sigla { width: 34px; height: 34px; flex: none; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
.inv-name { font-size: 13px; font-weight: 600; }
.inv-meta { font-size: 11px; color: var(--text-2); }
.inv-rent { font-size: 13px; font-weight: 600; color: #00A88A; }

@media (max-width: 1100px) { .overview, .grid-60-40, .grid-2 { grid-template-columns: 1fr; } }
@media (max-width: 900px) { .screen { padding: 16px; } }
</style>
