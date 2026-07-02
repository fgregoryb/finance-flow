<script setup lang="ts">
// Colunas agrupadas Receitas vs Despesas (ECharts).
const props = withDefaults(
  defineProps<{ rec: number[]; desp: number[]; labels: string[]; unit?: 'BRL' | 'USD' }>(),
  { unit: 'BRL' },
)

const fmtAxis = (v: number) =>
  props.unit === 'USD' ? '$' + Math.round(v / 100) / 10 + 'k' : 'R$' + Math.round(v / 1000) + 'k'

const option = computed(() => ({
  grid: { left: 48, right: 12, top: 16, bottom: 28 },
  tooltip: {
    trigger: 'axis',
    valueFormatter: (v: number) =>
      props.unit === 'USD' ? 'US$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
  },
  xAxis: {
    type: 'category',
    data: props.labels,
    axisLine: { lineStyle: { color: '#E6E8F0' } },
    axisTick: { show: false },
    axisLabel: { color: '#6B7088', fontFamily: 'Inter', fontSize: 11 },
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#EEF0F6' } },
    axisLabel: { color: '#A0A3B5', fontFamily: 'Inter', fontSize: 10, formatter: fmtAxis },
  },
  series: [
    { name: 'Receitas', type: 'bar', data: props.rec, itemStyle: { color: '#00D2A0', borderRadius: [4, 4, 0, 0] }, barWidth: 14 },
    { name: 'Despesas', type: 'bar', data: props.desp, itemStyle: { color: '#FF4D6D', borderRadius: [4, 4, 0, 0] }, barWidth: 14 },
  ],
}))
</script>

<template>
  <EChart :option="option" height="250px" />
</template>
