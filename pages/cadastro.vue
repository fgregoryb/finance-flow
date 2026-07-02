<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Criar conta · FinanceFlow' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const nome = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const aceito = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const sucesso = ref(false)

watchEffect(() => {
  if (user.value) navigateTo('/')
})

const strength = computed(() => {
  const p = password.value
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s // 0–4
})
const strengthMeta = computed(() => {
  return [
    { label: '', color: 'var(--surface-3)' },
    { label: 'Fraca', color: '#FF4D6D' },
    { label: 'Razoável', color: '#FFB800' },
    { label: 'Boa', color: '#4DABF7' },
    { label: 'Forte', color: '#00D2A0' },
  ][strength.value]
})

async function cadastrar() {
  error.value = ''
  if (!nome.value || !email.value || !password.value) {
    error.value = 'Preencha todos os campos.'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'As senhas não coincidem.'
    return
  }
  if (password.value.length < 8) {
    error.value = 'A senha precisa ter ao menos 8 caracteres.'
    return
  }
  if (!aceito.value) {
    error.value = 'Você precisa aceitar os Termos de Uso.'
    return
  }
  loading.value = true
  const { data, error: err } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: {
      data: { full_name: nome.value }, // alimenta o trigger handle_new_user
      emailRedirectTo: `${window.location.origin}/confirm`,
    },
  })
  loading.value = false
  if (err) {
    error.value = /already registered/i.test(err.message) ? 'Este e-mail já tem conta.' : err.message
    return
  }
  // Se a confirmação por e-mail estiver ativa, não há sessão imediata.
  if (data.session) navigateTo('/')
  else sucesso.value = true
}
</script>

<template>
  <AuthShell
    headline="Comece a organizar\nsuas finanças\nhoje mesmo."
    sub="Crie sua conta grátis e tenha receitas, despesas e investimentos em BRL e USD num só painel."
  >
    <template v-if="!sucesso">
      <h1 class="auth-title">Criar conta</h1>
      <p class="auth-subtitle">É grátis e leva menos de um minuto.</p>

      <form @submit.prevent="cadastrar">
        <label class="auth-field">
          <span class="auth-field-label">Nome completo</span>
          <div class="auth-input"><input v-model="nome" type="text" placeholder="Seu nome" autocomplete="name" /></div>
        </label>

        <label class="auth-field">
          <span class="auth-field-label">E-mail</span>
          <div class="auth-input"><input v-model="email" type="email" placeholder="voce@email.com" autocomplete="email" /></div>
        </label>

        <label class="auth-field" style="margin-bottom: 8px">
          <span class="auth-field-label">Senha</span>
          <div class="auth-input">
            <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Mínimo 8 caracteres" autocomplete="new-password" />
            <button type="button" class="auth-eye" @click="showPassword = !showPassword"><Icon :name="showPassword ? 'eyeOff' : 'eye'" :size="18" color="#8B8FA8" :stroke="1.8" /></button>
          </div>
        </label>
        <div v-if="password" style="margin-bottom: 18px">
          <div class="auth-strength">
            <div v-for="i in 4" :key="i" class="auth-strength-bar" :style="{ background: i <= strength ? strengthMeta.color : 'var(--surface-3)' }" />
          </div>
          <span class="auth-strength-label">Força: <b :style="{ color: strengthMeta.color }">{{ strengthMeta.label || '—' }}</b></span>
        </div>

        <label class="auth-field">
          <span class="auth-field-label">Confirmar senha</span>
          <div class="auth-input"><input v-model="confirm" :type="showPassword ? 'text' : 'password'" placeholder="Repita a senha" autocomplete="new-password" /></div>
        </label>

        <label class="auth-check">
          <input v-model="aceito" type="checkbox" />
          <span>Aceito os <a class="auth-link" href="#">Termos de Uso</a> e a <a class="auth-link" href="#">Política de Privacidade</a>.</span>
        </label>

        <p v-if="error" class="auth-error">{{ error }}</p>

        <button type="submit" class="auth-submit" :disabled="loading">{{ loading ? 'Criando…' : 'Criar conta' }}</button>
      </form>

      <p class="auth-foot-text">Já tem conta? <NuxtLink to="/login" class="auth-link strong">Entrar</NuxtLink></p>
    </template>

    <template v-else>
      <div style="text-align: center">
        <div class="auth-success-ico"><Icon name="mail" :size="28" color="#6C63FF" :stroke="1.7" /></div>
        <h1 class="auth-title">Confirme seu e-mail</h1>
        <p class="auth-subtitle">Enviamos um link de confirmação para <b>{{ email }}</b>. Abra-o para ativar sua conta.</p>
        <NuxtLink to="/login" class="auth-link strong">Voltar ao login</NuxtLink>
      </div>
    </template>
  </AuthShell>
</template>
