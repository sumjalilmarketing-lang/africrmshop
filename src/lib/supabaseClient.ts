import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL est manquante.");
}

if (!supabasePublishableKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY est manquante.");
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
