<script setup lang="ts">
// Rota descontinuada: "Contas Conjuntas" virou parte de "Contas correntes"
// dentro de Investimentos (conta do tipo 'casal'). Mantido como redirect para
// não quebrar links/favoritos antigos.
definePageMeta({ crumb: 'Investimentos', title: 'Minha carteira' })
navigateTo('/investimentos', { replace: true })
</script>

<template>
  <div />
</template>
