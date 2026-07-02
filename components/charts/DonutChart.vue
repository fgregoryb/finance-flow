<script setup lang="ts">
// Donut (ECharts). Mantém a API antiga: segments {value,color,name?}, size, thickness.
const props = withDefaults(
  defineProps<{
    segments: { value: number; color: string; name?: string }[]
    size?: number
    thickness?: number
    tooltip?: boolean
  }>(),
  { size: 170, thickness: 26, tooltip: false },
)

const option = computed(() => ({
  tooltip: props.tooltip
    ? { trigger: 'item', formatter: (p: any) => `${p.name}: ${p.percent}%` }
    : { show: false },
  series: [
    {
      type: 'pie',
      radius: [props.size / 2 - props.thickness, props.size / 2 - 1],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      label: { show: false },
      labelLine: { show: false },
      silent: !props.tooltip,
      data: props.segments
        .filter((s) => s.value > 0)
        .map((s, i) => ({ value: s.value, name: s.name || String(i), itemStyle: { color: s.color } })),
    },
  ],
}))
</script>

<template>
  <EChart :option="option" :height="`${size}px`" />
</template>
