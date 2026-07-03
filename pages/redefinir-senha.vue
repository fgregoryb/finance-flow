<script setup lang="ts">
definePageMeta({ layout: false })

// O usuário chega aqui pelo link do e-mail; o módulo já estabelece a sessão
// de recuperação a partir do token na URL.
const supabase = useSupabaseClient()

const password = ref('')
const confirm = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const ok = ref(false)

async function salvar() {
  error.value = ''
  if (password.value.length < 8) {
    error.value = 'A senha precisa ter ao menos 8 caracteres.'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'As senhas não coincidem.'
    return
  }
  loading.value = true
  const { error: err } = await supabase.auth.updateUser({ password: password.value })
  loading.value = false
  if (err) error.value = err.message
  else {
    ok.value = true
    setTimeout(() => navigateTo('/'), 1500)
  }
}
</script>

<template>
  <AuthShell
    headline="Defina sua\nnova senha."
    sub="Escolha uma senha forte para manter sua conta segura."
  >
    <h1 class="auth-title">Nova senha</h1>
    <p class="auth-subtitle">Crie uma nova senha para sua conta.</p>

    <form @submit.prevent="salvar">
      <label class="auth-field">
        <span class="auth-field-label">Nova senha</span>
        <div class="auth-input">
          <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Mínimo 8 caracteres" autocomplete="new-password" />
          <button type="button" class="auth-eye" @click="showPassword = !showPassword"><Icon :name="showPassword ? 'eyeOff' : 'eye'" :size="18" color="#8B8FA8" :stroke="1.8" /></button>
        </div>
      </label>

      <label class="auth-field">
        <span class="auth-field-label">Confirmar nova senha</span>
        <div class="auth-input"><input v-model="confirm" :type="showPassword ? 'text' : 'password'" placeholder="Repita a senha" autocomplete="new-password" /></div>
      </label>

      <p v-if="error" class="auth-error">{{ error }}</p>
      <p v-if="ok" class="auth-success">Senha atualizada! Redirecionando…</p>

      <button type="submit" class="auth-submit" :disabled="loading || ok">{{ loading ? 'Salvando…' : 'Salvar nova senha' }}</button>
    </form>

    <p class="auth-foot-text"><NuxtLink to="/login" class="auth-link strong">Voltar ao login</NuxtLink></p>
  </AuthShell>
</template>
