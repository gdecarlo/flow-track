import { createClient } from '@supabase/supabase-js'

let cachedSupabaseClient = null

const getSupabaseEnvironment = () => ({
  url: import.meta.env.VITE_SUPABASE_URL?.trim() ?? '',
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
})

export const getSupabaseConfigError = () => {
  const { url, publishableKey, anonKey } = getSupabaseEnvironment()
  const apiKey = publishableKey || anonKey

  if (!url || !apiKey) {
    return 'Faltan VITE_SUPABASE_URL y una key de acceso de Supabase en la configuración del entorno.'
  }

  return null
}

export const getSupabaseClient = () => {
  const configError = getSupabaseConfigError()
  if (configError) {
    return { ok: false, reason: configError }
  }

  if (!cachedSupabaseClient) {
    const { url, publishableKey, anonKey } = getSupabaseEnvironment()
    const apiKey = publishableKey || anonKey

    cachedSupabaseClient = createClient(url, apiKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  return { ok: true, client: cachedSupabaseClient }
}