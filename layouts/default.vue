<script setup lang="ts">
import { useStore } from '~/composables/useStore'
import { useDisplay } from '~/composables/useDisplay'
import { useSyncStatus } from '~/composables/useSupabaseSync'
import { useTheme } from '~/composables/useTheme'

const { theme, toggle: toggleTheme } = useTheme()
const route = useRoute()
const sync = useSyncStatus()
const syncLabel = computed(() => ({
  idle: 'Local (sem nuvem)', loading: 'Carregando…', saving: 'Salvando…',
  synced: sync.lastSaved ? `Sincronizado · ${sync.lastSaved}` : 'Sincronizado', error: 'Erro de sincronização',
}[sync.status]))
const store = useStore()
const { firstName, fullName, initials, email, avatar, avatarStyle } = useProfile()
const { currency, toggle } = useDisplay()
const supabase = useSupabaseClient()

const nav = [
  { to: '/', icon: 'dashboard', label: 'Dashboard' },
  { to: '/lancamentos', icon: 'swap', label: 'Lançamentos' },
  { to: '/contas-conjuntas', icon: 'users', label: 'Contas Conjuntas', badge: '2' },
  { to: '/investimentos', icon: 'trending', label: 'Investimentos' },
  { to: '/relatorios', icon: 'bars', label: 'Relatórios' },
  { to: '/configuracoes', icon: 'settings', label: 'Configurações' },
]

const crumb = computed(() => (route.meta.crumb as string) || 'Dashboard')
const title = computed(() =>
  route.path === '/' ? `Olá, ${firstName.value} 👋` : (route.meta.title as string) || 'FinanceFlow',
)
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))

const menuOpen = ref(false)
function irConfig() {
  menuOpen.value = false
  navigateTo('/configuracoes')
}
async function sair() {
  menuOpen.value = false
  await supabase.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <div class="shell">
    <!-- ===== SIDEBAR ===== -->
    <aside class="app-sidebar">
      <div class="brand">
        <div class="brand-logo"><Icon name="logo" :size="19" color="#fff" :stroke="2.2" /></div>
        <span class="brand-name">FinanceFlow</span>
      </div>

      <button class="account" @click="navigateTo('/configuracoes')">
        <div class="account-avatar" :style="avatarStyle">
          <span v-if="!avatar">{{ initials }}</span>
        </div>
        <div class="account-info">
          <div class="account-name">{{ fullName }}</div>
          <div class="account-sub">Conta pessoal</div>
        </div>
        <Icon name="chevronDown" :size="15" color="#A0A3B5" :stroke="2" />
      </button>

      <div class="label" style="padding: 0 8px 8px">Menu</div>
      <nav class="nav">
        <NuxtLink v-for="n in nav" :key="n.to" :to="n.to" class="nav-item" :class="{ 'is-active': isActive(n.to) }">
          <Icon :name="n.icon" :size="19" :stroke="1.8" />
          {{ n.label }}
          <span v-if="n.badge" class="nav-badge">{{ n.badge }}</span>
        </NuxtLink>
      </nav>

      <div class="fx-card">
        <div class="fx-head">
          <span class="label" style="letter-spacing: 0.06em">USD / BRL</span>
          <span class="fx-delta"><Icon name="up" :size="12" color="#00A88A" :stroke="2.4" />0,4%</span>
        </div>
        <div class="fx-value">R$ {{ store.usdBrl.toFixed(2).replace('.', ',') }}</div>
        <div class="fx-foot"><span class="fx-dot" />Atualizado há 12 min · auto</div>
      </div>
    </aside>

    <!-- ===== MAIN ===== -->
    <div class="main">
      <header class="topbar">
        <div class="topbar-titles">
          <div class="crumb">
            <span>FinanceFlow</span>
            <Icon name="chevronRight" :size="13" color="#C2C5D6" :stroke="2" />
            <span class="crumb-current">{{ crumb }}</span>
          </div>
          <h1 class="page-title">{{ title }}</h1>
        </div>

        <div class="period">
          <button class="period-arrow"><Icon name="chevronLeft" :size="16" :stroke="2" /></button>
          <button class="period-label"><Icon name="calendar" :size="15" color="#6B7088" />Junho 2026</button>
          <button class="period-arrow"><Icon name="chevronRight" :size="16" :stroke="2" /></button>
        </div>

        <div class="topbar-actions">
          <div class="cur-toggle" role="group" aria-label="Moeda de exibição">
            <button class="cur-opt" :class="{ on: currency === 'BRL' }" @click="currency !== 'BRL' && toggle()">R$</button>
            <button class="cur-opt" :class="{ on: currency === 'USD' }" @click="currency !== 'USD' && toggle()">US$</button>
          </div>
          <button class="icon-btn" :aria-label="theme === 'dark' ? 'Tema claro' : 'Tema escuro'" @click="toggleTheme">
            <Icon :name="theme === 'dark' ? 'sun' : 'moon'" :size="18" :stroke="1.8" />
          </button>
          <button class="icon-btn">
            <Icon name="bell" :size="18" :stroke="1.8" />
            <span class="icon-btn-dot" />
          </button>
          <div class="avatar-wrap">
            <button class="topbar-avatar" :style="avatarStyle" @click="menuOpen = !menuOpen">
              <span v-if="!avatar">{{ initials }}</span>
            </button>
          </div>
        </div>
      </header>

      <slot />
    </div>

    <NovoLancamentoDrawer />
    <ConfirmDialog />

    <Teleport to="body">
      <div v-if="menuOpen" class="menu-backdrop" @click="menuOpen = false" />
      <div v-if="menuOpen" class="avatar-menu">
        <div class="avatar-menu-head">
          <div class="account-name">{{ fullName }}</div>
          <div class="account-sub">{{ email }}</div>
          <div class="sync-row" :class="sync.status">
            <span class="sync-dot" />{{ syncLabel }}
          </div>
        </div>
        <button class="avatar-menu-item" @click="irConfig">Configurações</button>
        <button class="avatar-menu-item danger" @click="sair">Sair</button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}

/* sidebar */
.app-sidebar {
  width: 240px;
  flex: none;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  position: sticky;
  top: 0;
  height: 100vh;
}
.brand { display: flex; align-items: center; gap: 10px; padding: 4px 6px 20px; }
.brand-logo {
  width: 34px; height: 34px; border-radius: 10px;
  background: linear-gradient(135deg, #6C63FF, #8b84ff);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(108, 99, 255, 0.4);
}
.brand-name { font-size: 17px; font-weight: 800; letter-spacing: -0.02em; }

.account {
  width: 100%; display: flex; align-items: center; gap: 11px; padding: 10px;
  background: var(--bg); border: 1px solid var(--border); border-radius: 12px;
  cursor: pointer; text-align: left; margin-bottom: 18px;
}
.account:hover { border-color: #cfd3e3; }
.account-avatar {
  width: 34px; height: 34px; flex: none; border-radius: 50%;
  background: linear-gradient(135deg, #00D2A0, #23e0b5);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 13px; color: #06251d; overflow: hidden;
}
.account-info { flex: 1; min-width: 0; }
.account-name { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.account-sub { font-size: 11px; color: var(--text-2); }

.nav { display: flex; flex-direction: column; gap: 3px; }
.nav-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 500;
  color: var(--text-2); cursor: pointer;
}
.nav-item:hover { background: var(--hover); }
.nav-item.is-active { font-weight: 600; color: var(--accent); background: rgba(108, 99, 255, 0.1); }
.nav-badge {
  margin-left: auto; font-size: 11px; font-weight: 600; color: #D99400;
  background: rgba(255, 184, 0, 0.16); padding: 2px 8px; border-radius: 20px;
}

.fx-card { margin-top: auto; padding: 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; }
.fx-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.fx-delta { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: #00A88A; }
.fx-value { font-size: 21px; font-weight: 700; letter-spacing: -0.02em; }
.fx-foot { display: flex; align-items: center; gap: 5px; margin-top: 7px; font-size: 11px; color: var(--text-2); }
.fx-dot { width: 6px; height: 6px; border-radius: 50%; background: #00D2A0; box-shadow: 0 0 0 3px rgba(0, 210, 160, 0.2); }

/* main */
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.topbar {
  display: flex; align-items: center; gap: 18px; padding: 16px 28px;
  border-bottom: 1px solid var(--border); position: sticky; top: 0;
  background: var(--topbar-bg); backdrop-filter: blur(12px); z-index: 10;
}
.topbar-titles { display: flex; flex-direction: column; gap: 3px; }
.crumb { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--text-2); }
.crumb-current { color: var(--text); font-weight: 500; }
.page-title { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }

.period {
  margin-left: 18px; display: flex; align-items: center; gap: 2px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 4px;
}
.period-arrow {
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  background: transparent; border: none; border-radius: 7px; cursor: pointer; color: var(--text-2);
}
.period-arrow:hover { background: var(--surface-3); color: var(--text); }
.period-label {
  display: flex; align-items: center; gap: 7px; padding: 0 12px; height: 30px;
  background: transparent; border: none; cursor: pointer; color: var(--text);
  font-size: 13px; font-weight: 600; font-family: inherit;
}

.topbar-actions { margin-left: auto; display: flex; align-items: center; gap: 12px; }
.cur-toggle { display: flex; gap: 2px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 3px; }
.cur-opt { width: 40px; height: 32px; border: none; background: transparent; border-radius: 7px; font-family: inherit; font-size: 13px; font-weight: 700; color: var(--text-2); cursor: pointer; transition: all 0.15s; }
.cur-opt.on { background: var(--accent); color: #fff; }
.icon-btn {
  position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; color: var(--text-2);
}
.icon-btn:hover { color: var(--text); border-color: #cfd3e3; }
.icon-btn-dot {
  position: absolute; top: 8px; right: 9px; width: 8px; height: 8px;
  border-radius: 50%; background: #FF4D6D; border: 2px solid var(--surface);
}
.avatar-wrap { position: relative; }
.topbar-avatar {
  width: 40px; height: 40px; border-radius: 50%; border: none;
  background: linear-gradient(135deg, #00D2A0, #23e0b5);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px; color: #06251d; cursor: pointer; font-family: inherit; overflow: hidden;
}
.avatar-menu {
  position: fixed; right: 28px; top: 66px; z-index: 300;
  width: 230px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; box-shadow: 0 8px 28px rgba(20, 23, 40, 0.18); padding: 6px;
}
.avatar-menu-head { padding: 10px 12px 12px; border-bottom: 1px solid var(--border-soft); margin-bottom: 6px; }
.sync-row { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 11px; color: var(--text-2); }
.sync-dot { width: 7px; height: 7px; border-radius: 50%; background: #A0A3B5; }
.sync-row.synced .sync-dot { background: #00D2A0; box-shadow: 0 0 0 3px rgba(0,210,160,0.2); }
.sync-row.saving .sync-dot, .sync-row.loading .sync-dot { background: #FFB800; }
.sync-row.error .sync-dot { background: #FF4D6D; }
.avatar-menu-item {
  width: 100%; text-align: left; padding: 9px 12px; border: none; background: transparent;
  border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 500; color: var(--text); cursor: pointer;
}
.avatar-menu-item:hover { background: var(--surface-3); }
.avatar-menu-item.danger { color: var(--danger-text); }
.menu-backdrop { position: fixed; inset: 0; z-index: 290; }

@media (max-width: 900px) {
  .period { display: none; }
  .topbar { padding: 14px 16px; }
}
</style>
