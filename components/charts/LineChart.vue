<script setup lang="ts">
// Fluxo de caixa acumulado do mês selecionado (ECharts), na moeda de exibição.
// Considera apenas lançamentos pessoais (contas 'casal' têm visão própria).
import { useStore } from '~/composables/useStore'
import { useDisplay } from '~/composables/useDisplay'
import { usePeriod } from '~/composables/usePeriod'

const store = useStore()
const { currency } = useDisplay()
const { period } = usePeriod()

const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const mesLabel = computed(() => MES_ABREV[period.value.m])

const data = computed(() => {
  const conv = (v: number) => (currency.value === 'USD' ? v / store.usdBrl : v)
  const casalIds = new Set(store.checking.filter((c) => c.type === 'casal').map((c) => c.id))
  const pessoais = store.transactions.filter((t) => !t.context || t.context === 'Pessoal' || !casalIds.has(t.context))
  const totalDias = new Date(period.value.y, period.value.m + 1, 0).getDate()
  const days = Array.from({ length: totalDias }, (_, i) => i + 1)
  const labels = days.map((d) => String(d).padStart(2, '0'))
  let rec = 0, desp = 0
  const recCum: number[] = [], despCum: number[] = []
  for (const d of days) {
    for (const t of pessoais) {
      const dt = new Date(t.date + 'T12:00:00')
      if (dt.getFullYear() === period.value.y && dt.getMonth() === period.value.m && dt.getDate() === d) {
        if (t.type === 'income') rec += t.amountBrl
        else desp += t.amountBrl
      }
    }
    recCum.push(+conv(rec).toFixed(2))
    despCum.push(+conv(desp).toFixed(2))
  }
  return { labels, recCum, despCum }
})

const sym = computed(() => (currency.value === 'USD' ? 'US$' : 'R$'))

const option = computed(() => ({
  grid: { left: 52, right: 14, top: 16, bottom: 28 },
  tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${sym.value} ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` },
  xAxis: {
    type: 'category', data: data.value.labels, boundaryGap: false,
    axisLine: { lineStyle: { color: '#E6E8F0' } }, axisTick: { show: false },
    axisLabel: { color: '#6B7088', fontFamily: 'Inter', fontSize: 10, interval: 6, formatter: (v: string) => v + ' ' + mesLabel.value },
  },
  yAxis: {
    type: 'value', splitLine: { lineStyle: { color: '#EEF0F6' } },
    axisLabel: { color: '#A0A3B5', fontFamily: 'Inter', fontSize: 10, formatter: (v: number) => sym.value + (v / 1000).toFixed(0) + 'k' },
  },
  series: [
    { name: 'Receitas', type: 'line', smooth: true, showSymbol: false, data: data.value.recCum, lineStyle: { color: '#00D2A0', width: 2.5 }, areaStyle: { color: 'rgba(0,210,160,0.15)' } },
    { name: 'Despesas', type: 'line', smooth: true, showSymbol: false, data: data.value.despCum, lineStyle: { color: '#FF4D6D', width: 2.5 }, areaStyle: { color: 'rgba(255,77,109,0.12)' } },
  ],
}))
</script>

<template>
  <EChart :option="option" height="280px" />
</template>
