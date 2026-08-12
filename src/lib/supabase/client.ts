import { createClient } from "@supabase/supabase-js";

import { env, hasSupabaseConfig } from "@/lib/config/env";

export function createBrowserSupabaseClient() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  return createClient(env.supabaseUrl, env.supabaseAnonKey);
}
