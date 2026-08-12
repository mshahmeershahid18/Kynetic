import { createBrowserClient } from "@supabase/ssr";

import { env, hasSupabaseConfig } from "@/lib/config/env";

export function createBrowserSupabaseClient() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
