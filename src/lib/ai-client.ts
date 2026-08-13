import { env } from "@/lib/config/env";
import type { AnalysisSummary } from "@/lib/vision/exercise-analyzers";
import type { GenerationSource } from "@/lib/ai-service";

export async function analyzeVideoWithAI(
  file: File | Blob,
  kind: string,
  accessToken: string | null
): Promise<{ summary: AnalysisSummary; source: GenerationSource } | null> {
  try {
    const formData = new FormData();
    formData.append("video", file, "video.mp4");
    formData.append("kind", kind);

    // Using custom headers for FormData (don't set Content-Type so browser sets boundary)
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const response = await fetch(`${env.aiServiceUrl}/analyze-video`, {
      method: "POST",
      headers,
      body: formData,
      cache: "no-store",
    });

    if (response.ok) {
      const body = (await response.json()) as { status: string; summary?: unknown };
      if (body.status === "ok" && body.summary) {
        return { summary: body.summary as AnalysisSummary, source: "gemini" };
      }
    }
  } catch (err) {
    console.error("AI Video Analysis failed:", err);
  }

  return null;
}
