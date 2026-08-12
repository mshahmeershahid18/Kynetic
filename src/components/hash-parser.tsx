"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function HashParser() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) return;

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          router.refresh();
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [router]);

  return null;
}
