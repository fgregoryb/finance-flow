<script setup lang="ts">
import type { ECharts } from 'echarts'

const props = withDefaults(defineProps<{ option: any; height?: string }>(), { height: '250px' })
const el = ref<HTMLDivElement>()
let chart: ECharts | null = null
let ro: ResizeObserver | null = null

onMounted(async () => {
  // import dinâmico → só roda no cliente (onMounted nunca executa no SSR)
  const echarts = await import('echarts')
  if (!el.value) return
  chart = echarts.init(el.value)
  chart.setOption(props.option)
  ro = new ResizeObserver(() => chart?.resize())
  ro.observe(el.value)
})

watch(
  () => props.option,
  (o) => chart?.setOption(o, true),
  { deep: true },
)

onBeforeUnmount(() => {
  ro?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="el" :style="{ width: '100%', height }" />
</template>
