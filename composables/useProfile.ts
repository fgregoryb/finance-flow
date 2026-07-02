/** Dados de exibição do usuário logado (nome, iniciais, foto). */
import { useStore } from './useStore'

export function useProfile() {
  const user = useSupabaseUser()
  const store = useStore()

  const fullName = computed(() => {
    if (store.profile.name) return store.profile.name
    const u = user.value
    const meta = (u?.user_metadata || {}) as Record<string, any>
    return meta.full_name || meta.name || u?.email?.split('@')[0] || 'Usuário'
  })
  const firstName = computed(() => fullName.value.split(' ')[0])
  const initials = computed(() =>
    fullName.value
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase(),
  )
  const email = computed(() => user.value?.email || '')
  const avatar = computed(() => store.profile.avatar || '')
  const avatarStyle = computed(() =>
    store.profile.avatar
      ? { backgroundImage: `url(${store.profile.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : {},
  )

  return { user, fullName, firstName, initials, email, avatar, avatarStyle }
}
