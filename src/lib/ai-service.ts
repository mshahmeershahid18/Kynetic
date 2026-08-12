import { env } from "@/lib/config/env";

export type AiHealth = {
  status: string;
  service: string;
};

export async function getAiServiceHealth(): Promise<AiHealth | null> {
  try {
    const response = await fetch(`${env.aiServiceUrl}/health`, {
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AiHealth;
  } catch {
    return null;
  }
}
