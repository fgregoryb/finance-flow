<script setup lang="ts">
const props = defineProps<{ image: string; scale?: number; x?: number; y?: number }>()
const emit = defineEmits<{ save: [dataUrl: string]; close: [] }>()

const FRAME = 220 // px do preview (usado no cálculo do recorte)

// Recorta/redimensiona para um quadrado pequeno (256px, JPEG) e emite o dataURL.
function salvar() {
  const img = new Image()
  img.onload = () => {
    const S = 256
    const canvas = document.createElement('canvas')
    canvas.width = S
    canvas.height = S
    const ctx = canvas.getContext('2d')
    if (!ctx) return emit('save', props.image)
    ctx.fillStyle = '#F1F3F8'
    ctx.fillRect(0, 0, S, S)
    const k = S / FRAME
    const dispW = FRAME * scale.value
    const dispH = dispW * (img.naturalHeight / img.naturalWidth)
    const offX = (posX.value / 100) * (FRAME - dispW)
    const offY = (posY.value / 100) * (FRAME - dispH)
    ctx.drawImage(img, offX * k, offY * k, dispW * k, dispH * k)
    emit('save', canvas.toDataURL('image/jpeg', 0.85))
  }
  img.onerror = () => emit('save', props.image)
  img.src = props.image
}

const scale = ref(props.scale ?? 1.2)
const posX = ref(props.x ?? 50)
const posY = ref(props.y ?? 50)

const frame = ref<HTMLDivElement>()
let dragging = false
let lastX = 0, lastY = 0

function onDown(e: PointerEvent) {
  dragging = true
  lastX = e.clientX; lastY = e.clientY
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}
function onMove(e: PointerEvent) {
  if (!dragging || !frame.value) return
  const size = frame.value.offsetWidth || 220
  const dx = e.clientX - lastX, dy = e.clientY - lastY
  lastX = e.clientX; lastY = e.clientY
  posX.value = Math.min(100, Math.max(0, posX.value - (dx / size) * 100 / scale.value))
  posY.value = Math.min(100, Math.max(0, posY.value - (dy / size) * 100 / scale.value))
}
function onUp() { dragging = false }

const previewStyle = computed(() => ({
  backgroundImage: `url(${props.image})`,
  backgroundSize: `${scale.value * 100}%`,
  backgroundPosition: `${posX.value}% ${posY.value}%`,
  backgroundRepeat: 'no-repeat',
}))
</script>

<template>
  <Teleport to="body">
    <div class="ov" @click.self="emit('close')">
      <div class="box">
        <header class="hd"><h3 class="h3">Ajustar foto</h3><button class="x" @click="emit('close')">✕</button></header>
        <div class="body">
          <div ref="frame" class="frame" :style="previewStyle" @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointerleave="onUp">
            <div class="ring" />
          </div>
          <p class="hint">Arraste para posicionar · use o controle para dar zoom</p>
          <div class="zoom">
            <Icon name="search" :size="15" color="#8B8FA8" />
            <input type="range" min="1" max="3" step="0.01" v-model.number="scale" />
          </div>
        </div>
        <footer class="ft">
          <button class="ghost" @click="emit('close')">Cancelar</button>
          <button class="save" @click="salvar">Salvar foto</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ov { position: fixed; inset: 0; background: rgba(20,23,40,0.45); backdrop-filter: blur(3px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
.box { width: 360px; max-width: 100%; background: var(--surface); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.28); }
.hd { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--border); }
.x { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--surface-3); cursor: pointer; font-size: 14px; color: var(--text-2); }
.body { padding: 22px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.frame { width: 220px; height: 220px; border-radius: 50%; position: relative; cursor: grab; touch-action: none; background-color: var(--surface-3); box-shadow: 0 0 0 2px var(--border); }
.frame:active { cursor: grabbing; }
.ring { position: absolute; inset: 0; border-radius: 50%; box-shadow: 0 0 0 9999px rgba(244,246,251,0.0); pointer-events: none; }
.hint { font-size: 12px; color: var(--text-2); margin: 0; text-align: center; }
.zoom { display: flex; align-items: center; gap: 10px; width: 100%; }
.zoom input { flex: 1; accent-color: var(--accent); }
.ft { display: flex; gap: 10px; padding: 16px 22px; border-top: 1px solid var(--border); }
.ghost { flex: none; padding: 0 18px; height: 44px; border: 1px solid var(--border); border-radius: 10px; background: transparent; font-family: inherit; font-size: 14px; font-weight: 600; color: var(--text-2); cursor: pointer; }
.save { flex: 1; height: 44px; border: none; border-radius: 10px; background: var(--accent); color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
</style>
