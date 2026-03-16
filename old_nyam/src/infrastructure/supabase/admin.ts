import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'
import 'server-only'

/**
 * Admin Supabase client with service-role privileges.
 * For server-only operations (cron jobs, admin tasks).
 *
 * WARNING: This client bypasses RLS. Never import from client code.
 * The 'server-only' import ensures a build error if accidentally
 * imported in a client bundle.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
