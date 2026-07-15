<script setup lang="ts">
import { useConfirmState, resolveConfirm } from '~/composables/useConfirm'
const s = useConfirmState()
</script>

<template>
  <Teleport to="body">
    <Transition name="cfm">
      <div v-if="s.open" class="cfm-overlay" @click.self="resolveConfirm(false)">
        <div v-trap="() => resolveConfirm(false)" class="cfm">
          <div class="cfm-ico" :class="{ danger: s.danger }">
            <Icon :name="s.danger ? 'trash' : 'bell'" :size="22" :color="s.danger ? '#F03A5C' : '#6C63FF'" :stroke="1.8" />
          </div>
          <h3 class="cfm-title">{{ s.title }}</h3>
          <p class="cfm-msg">{{ s.message }}</p>
          <div class="cfm-actions">
            <button class="cfm-cancel" @click="resolveConfirm(false)">Cancelar</button>
            <button class="cfm-ok" :class="{ danger: s.danger }" @click="resolveConfirm(true)">{{ s.confirmLabel }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cfm-overlay { position: fixed; inset: 0; background: rgba(20, 23, 40, 0.45); backdrop-filter: blur(3px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
.cfm { width: 380px; max-width: 100%; background: var(--surface); border-radius: 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28); padding: 26px; text-align: center; }
.cfm-ico { width: 52px; height: 52px; border-radius: 14px; background: rgba(108, 99, 255, 0.12); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.cfm-ico.danger { background: rgba(255, 77, 109, 0.12); }
.cfm-title { margin: 0 0 8px; font-size: 17px; font-weight: 700; }
.cfm-msg { margin: 0 0 22px; font-size: 14px; color: var(--text-2); line-height: 1.5; }
.cfm-actions { display: flex; gap: 10px; }
.cfm-cancel { flex: 1; height: 44px; border: 1px solid var(--border); border-radius: 10px; background: transparent; font-family: inherit; font-size: 14px; font-weight: 600; color: var(--text-2); cursor: pointer; }
.cfm-ok { flex: 1; height: 44px; border: none; border-radius: 10px; background: var(--accent); color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
.cfm-ok.danger { background: var(--danger); }

.cfm-enter-active, .cfm-leave-active { transition: opacity 0.18s; }
.cfm-enter-active .cfm, .cfm-leave-active .cfm { transition: transform 0.18s ease; }
.cfm-enter-from, .cfm-leave-to { opacity: 0; }
.cfm-enter-from .cfm, .cfm-leave-to .cfm { transform: scale(0.94); }
</style>
