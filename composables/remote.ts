/**
 * Referência ao cliente Supabase do usuário logado, preenchida por
 * startSupabaseSync() e limpa por stopSupabaseSync(). Quando null,
 * o app opera em modo local (mutações só na memória/localStorage).
 */
export const remote: { client: any | null; userId: string | null } = {
  client: null,
  userId: null,
}
