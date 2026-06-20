"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export function SessionSync() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" && session?.access_token) {
        void fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: session.access_token }),
        });
      }

      if (event === "SIGNED_OUT") {
        void fetch("/api/auth/session", { method: "DELETE" });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
