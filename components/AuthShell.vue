<script setup lang="ts">
// Layout split das telas de autenticação: painel de marca + slot do formulário.
const props = withDefaults(
  defineProps<{
    headline?: string
    sub?: string
  }>(),
  {
    headline: 'Suas finanças em\nReal e Dólar,\nnum só lugar.',
    sub: 'Controle receitas, despesas, investimentos e contas compartilhadas — com câmbio aplicado em tempo real.',
  },
)

// Aceita tanto quebras reais (default em JS) quanto "\n" literal vindo de atributo.
const displayHeadline = computed(() => props.headline.replace(/\\n/g, '\n'))
</script>

<template>
  <div class="auth">
    <!-- Painel de marca -->
    <aside class="brand-panel">
      <div class="brand-glow brand-glow-1" />
      <div class="brand-glow brand-glow-2" />

      <div class="brand-top">
        <div class="brand-mark"><Icon name="logo" :size="22" color="#fff" :stroke="2.2" /></div>
        <span class="brand-wordmark">FinanceFlow</span>
      </div>

      <div class="brand-center">
        <h2 class="brand-headline" style="white-space: pre-line">{{ displayHeadline }}</h2>
        <p class="brand-sub">{{ sub }}</p>
        <svg class="brand-chart" viewBox="0 0 320 120" fill="none">
          <defs>
            <linearGradient id="bArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#fff" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#fff" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 95 L40 80 L80 88 L120 55 L160 64 L200 35 L240 44 L280 18 L320 26 L320 120 L0 120 Z" fill="url(#bArea)" />
          <path d="M0 95 L40 80 L80 88 L120 55 L160 64 L200 35 L240 44 L280 18 L320 26" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <circle v-for="(c, i) in [[40,80],[120,55],[200,35],[280,18]]" :key="i" :cx="c[0]" :cy="c[1]" r="4.5" fill="#fff" />
        </svg>
      </div>

      <div class="brand-foot">
        <div class="brand-chip"><span class="brand-dot" />USD / BRL · R$ 5,42 hoje</div>
      </div>
    </aside>

    <!-- Formulário (slot) -->
    <main class="auth-form-panel">
      <div class="auth-card">
        <div class="auth-logo-mobile">
          <div class="brand-mark sm"><Icon name="logo" :size="18" color="#fff" :stroke="2.2" /></div>
          <span class="brand-wordmark dark">FinanceFlow</span>
        </div>
        <slot />
      </div>
      <footer class="auth-legal">© 2026 FinanceFlow · Termos · Privacidade</footer>
    </main>
  </div>
</template>
