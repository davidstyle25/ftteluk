import { supabase } from "@/integrations/supabase/client";

export async function logActivity(
  username: string,
  action: string,
  description: string,
) {
  try {
    await supabase.from("activity_logs").insert({
      username,
      action,
      description,
      ip_address: "-",
    });
  } catch {
    /* logging must never break the app */
  }
}

// One "visit" entry per path per browser session.
export async function logVisitOnce(username: string, path: string) {
  if (typeof window === "undefined") return;
  const key = `visit:${username}:${path}`;
  if (window.sessionStorage.getItem(key)) return;
  window.sessionStorage.setItem(key, "1");
  await logActivity(username, "visit", `Membuka halaman ${path}`);
}
