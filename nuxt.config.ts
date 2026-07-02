// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  ssr: true,
  css: ['~/assets/css/main.css'],
  modules: ['@nuxtjs/supabase'],

  // @nuxtjs/supabase lê SUPABASE_URL e SUPABASE_KEY do .env automaticamente.
  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm', // página que finaliza o OAuth/magic link
      // Rotas públicas (não exigem sessão):
      exclude: ['/login', '/cadastro', '/recuperar-senha', '/redefinir-senha'],
    },
  },

  app: {
    head: {
      title: 'FinanceFlow',
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Controle financeiro pessoal e compartilhado em BRL e USD' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
        },
      ],
    },
  },
})
