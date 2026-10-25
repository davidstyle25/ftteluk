// Auth middleware for server functions: validates the caller's Supabase access token
// and exposes a Supabase client that acts as that user (so RLS applies).
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AuthContext = {
  userId: string;
  email: string;
  isAdmin: boolean;
  /** true hanya untuk administrator 1 (role "admin"), bukan administrator 2. */
  isFullAdmin: boolean;
  supabase: ReturnType<typeof createClient<Database>>;
};

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function supabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (isNewSupabaseApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function bearer(): string {
  const request = getRequest();
  const header = request?.headers?.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new Error("Unauthorized: token tidak ada");
  const token = header.slice(7).trim();
  if (token.split(".").length !== 3) throw new Error("Unauthorized: token tidak valid");
  return token;
}

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const token = bearer();

  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Konfigurasi backend belum lengkap (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY).");
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: supabaseFetch(SUPABASE_PUBLISHABLE_KEY),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Unauthorized: token tidak valid");

  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: data.claims.sub,
    _role: "admin",
  });

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.claims.sub);
  const isFullAdmin = (roleRows ?? []).some((r) => String(r.role) === "admin");

  const context: AuthContext = {
    userId: data.claims.sub,
    email: String(data.claims["email"] ?? ""),
    isAdmin: Boolean(isAdmin),
    isFullAdmin,
    supabase,
  };
  return next({ context });
});

export function assertAdmin(context: { isAdmin: boolean }) {
  if (!context.isAdmin) throw new Error("Forbidden: hanya admin.");
}

/** Khusus administrator 1 (kelola user). */
export function assertFullAdmin(context: { isFullAdmin: boolean }) {
  if (!context.isFullAdmin) throw new Error("Forbidden: hanya administrator utama.");
}