const optionalEnv = (key: string) => process.env[key] || "";

export const env = {
  supabaseUrl: optionalEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: optionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  aiServiceUrl: optionalEnv("AI_SERVICE_URL") || "http://localhost:8000",
};

export function hasSupabaseConfig() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
