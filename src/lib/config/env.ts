const optionalEnv = (key: string) => process.env[key] || "";

export const env = {
  supabaseUrl: optionalEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: optionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: optionalEnv("SUPABASE_SERVICE_ROLE_KEY"),
  aiServiceUrl: optionalEnv("AI_SERVICE_URL") || "http://localhost:8000",
  siteUrl: optionalEnv("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000",
};

export function hasSupabaseConfig() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
