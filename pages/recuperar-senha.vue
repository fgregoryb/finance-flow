<script setup lang="ts">
definePageMeta({ layout: false })

const supabase = useSupabaseClient()

const email = ref('')
const loading = ref(false)
const error = ref('')
const enviado = ref(false)

async function enviar() {
  error.value = ''
  if (!email.value) {
    error.value = 'Informe seu e-mail.'
    return
  }
  loading.value = true
  const { error: err } = await supabase.auth.resetPasswordForEmail(email.value, {
    redirectTo: `${window.location.origin}/redefinir-senha`,
  })
  loading.value = false
  if (err) error.value = err.message
  else enviado.value = true
}
</script>

<template>
  <AuthShell
    headline="Recuperar o\nacesso é simples."
    sub="Informe seu e-mail e enviaremos um link seguro para você criar uma nova senha."
  >
    <template v-if="!enviado">
      <h1 class="auth-title">Esqueci minha senha</h1>
      <p class="auth-subtitle">Enviaremos instruções de recuperação para seu e-mail.</p>

      <form @submit.prevent="enviar">
        <label class="auth-field">
          <span class="auth-field-label">E-mail</span>
          <div class="auth-input"><input v-model="email" type="email" placeholder="voce@email.com" autocomplete="email" /></div>
        </label>

        <p v-if="error" class="auth-error">{{ error }}</p>

        <button type="submit" class="auth-submit" :disabled="loading">{{ loading ? 'Enviando…' : 'Enviar instruções' }}</button>
      </form>

      <p class="auth-foot-text"><NuxtLink to="/login" class="auth-link strong">Voltar ao login</NuxtLink></p>
    </template>

    <template v-else>
      <div style="text-align: center">
        <div class="auth-success-ico"><Icon name="checkCircle" :size="28" color="#00A88A" :stroke="1.7" /></div>
        <h1 class="auth-title">Verifique seu e-mail</h1>
        <p class="auth-subtitle">Se existir uma conta para <b>{{ email }}</b>, enviamos um link para redefinir a senha.</p>
        <NuxtLink to="/login" class="auth-link strong">Voltar ao login</NuxtLink>
      </div>
    </template>
  </AuthShell>
</template>
