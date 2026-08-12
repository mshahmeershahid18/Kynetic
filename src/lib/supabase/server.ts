import { createClient } from "@supabase/supabase-js";

import { env, hasSupabaseConfig } from "@/lib/config/env";

export function createServerSupabaseClient() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
