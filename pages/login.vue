<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Entrar · FinanceFlow' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

watchEffect(() => {
  if (user.value) navigateTo('/')
})

async function entrar() {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = 'Preencha e-mail e senha.'
    return
  }
  loading.value = true
  const { error: err } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  loading.value = false
  if (err) error.value = traduzErro(err.message)
}

const googleLoading = ref(false)
async function entrarComGoogle() {
  error.value = ''
  googleLoading.value = true
  try {
    const { data, error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/confirm` },
    })
    if (err) error.value = traduzErro(err.message)
    else if (data?.url) window.location.href = data.url // garante o redirect ao Google
  } catch (e: any) {
    error.value = traduzErro(e?.message || 'Não foi possível iniciar o login com Google.')
  } finally {
    googleLoading.value = false
  }
}

function traduzErro(msg: string) {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar.'
  if (/provider is not enabled|unsupported provider|validation_failed/i.test(msg))
    return 'Login com Google ainda não está habilitado. Ative o provider Google no painel do Supabase (Authentication → Providers) com o Client ID/Secret do Google Cloud.'
  return msg
}
</script>

<template>
  <AuthShell>
    <h1 class="auth-title">Entrar</h1>
    <p class="auth-subtitle">Bem-vindo de volta. Acesse sua conta para continuar.</p>

    <form @submit.prevent="entrar">
      <label class="auth-field">
        <span class="auth-field-label">E-mail</span>
        <div class="auth-input">
          <input v-model="email" type="email" placeholder="voce@email.com" autocomplete="email" />
        </div>
      </label>

      <label class="auth-field">
        <div class="auth-field-row">
          <span class="auth-field-label">Senha</span>
          <NuxtLink to="/recuperar-senha" class="auth-link">Esqueci minha senha</NuxtLink>
        </div>
        <div class="auth-input">
          <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="••••••••" autocomplete="current-password" />
          <button type="button" class="auth-eye" @click="showPassword = !showPassword" :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"><Icon :name="showPassword ? 'eyeOff' : 'eye'" :size="18" color="#8B8FA8" :stroke="1.8" /></button>
        </div>
      </label>

      <p v-if="error" class="auth-error">{{ error }}</p>

      <button type="submit" class="auth-submit" :disabled="loading">{{ loading ? 'Entrando…' : 'Entrar' }}</button>
    </form>

    <div class="auth-divider"><span>ou</span></div>

    <button class="auth-google" :disabled="googleLoading" @click="entrarComGoogle">
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22 22-9.8 22-22c0-1.5-.2-2.6-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 15.4 2 7.9 6.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 46c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 36.9 26.9 38 24 38c-5.2 0-9.6-3.3-11.2-8l-6.6 5.1C7.8 41 15.3 46 24 46z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5c-.5.4 7.3-5.3 7.3-15 0-1.5-.2-2.6-.4-3.5z"/></svg>
      Entrar com Google
    </button>

    <p class="auth-foot-text">Não tem conta? <NuxtLink to="/cadastro" class="auth-link strong">Criar conta grátis</NuxtLink></p>
  </AuthShell>
</template>
