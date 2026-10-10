// Server-only helper for API routes (not server functions).
// Validates the caller's Supabase access token and returns a Supabase client that
// acts as that user, so Row Level Security policies in the database still apply.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function getUserClient(request: Request) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY belum diset di environment server.");
  }

  const header = request.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const token = header.slice(7).trim();
  if (!token || token.split(".").length !== 3) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Response("Unauthorized", { status: 401 });

  return { supabase, userId: data.user.id };
}
