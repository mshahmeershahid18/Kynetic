import { NextResponse } from "next/server";

import { getAiServiceHealth } from "@/lib/ai-service";
import { hasSupabaseConfig } from "@/lib/config/env";

export async function GET() {
  const ai = await getAiServiceHealth();

  return NextResponse.json({
    status: "ok",
    app: "kynetic-web",
    supabase: hasSupabaseConfig() ? "configured" : "missing-env",
    aiService: ai ?? "unreachable",
  });
}
