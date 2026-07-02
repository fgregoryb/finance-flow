<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Confirmando… · FinanceFlow' })

// Página de callback do OAuth / confirmação de e-mail.
// O @nuxtjs/supabase troca o código por sessão; quando o usuário existir,
// redirecionamos para o dashboard.
const user = useSupabaseUser()

watchEffect(() => {
  if (user.value) navigateTo('/')
})
</script>

<template>
  <div class="confirm">
    <div class="brand-mark sm" style="background: linear-gradient(135deg,#6C63FF,#8b84ff)"><Icon name="logo" :size="20" color="#fff" :stroke="2.2" /></div>
    <p>Finalizando seu acesso…</p>
  </div>
</template>

<style scoped>
.confirm {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--text-2);
  font-size: 14px;
}
.brand-mark { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
</style>
