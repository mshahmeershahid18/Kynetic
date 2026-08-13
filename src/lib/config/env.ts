const optionalEnv = (key: string) => process.env[key] || "";

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8000",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
};

export function hasSupabaseConfig() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
