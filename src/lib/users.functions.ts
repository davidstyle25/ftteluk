import { createServerFn } from "@tanstack/react-start";
import { requireAuth, assertFullAdmin } from "@/lib/api/require-auth";

export type AppUserRow = {
  id: string;
  nama: string;
  username: string;
  email: string;
  role: "admin" | "admin2" | "viewer";
  active: boolean;
};

// Username -> email palsu internal (login memakai username, Supabase Auth butuh email).
function toEmail(username: string): string {
  const v = username.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@app.local`;
}

export const listAppUsers = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<AppUserRow[]> => {
    assertFullAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error(error.message);
    const ids = data.users.map((u) => u.id);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);
    const roleMap = new Map<string, string>();
    for (const r of roles ?? []) roleMap.set(r.user_id as string, String(r.role));
    return data.users.map((u) => {
      const email = u.email ?? "";
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      return {
        id: u.id,
        nama:
          typeof meta["nama"] === "string" && meta["nama"]
            ? (meta["nama"] as string)
            : email.split("@")[0]!,
        username: email.split("@")[0]!,
        email,
        role: (["admin", "admin2"].includes(roleMap.get(u.id) ?? "") ? roleMap.get(u.id) : "viewer") as
          | "admin"
          | "admin2"
          | "viewer",
        active: !(u as unknown as { banned_until?: string | null }).banned_until,
      };
    });
  });

export const createAppUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: { nama: string; username: string; password: string; role: "admin" | "admin2" | "viewer" }) => d,
  )
  .handler(async ({ data, context }) => {
    assertFullAdmin(context);
    if (!data.username.trim() || data.password.length < 6) {
      throw new Error("Username wajib diisi dan password minimal 6 karakter.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: toEmail(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { nama: data.nama.trim() || data.username.trim() },
    });
    if (error) throw new Error(error.message);
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user!.id, role: data.role });
    if (roleErr) throw new Error(roleErr.message);
    return { ok: true };
  });

export const updateAppUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      id: string;
      nama?: string;
      password?: string;
      role?: "admin" | "admin2" | "viewer";
      active?: boolean;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    assertFullAdmin(context);
    if (data.password && data.password.length < 6) throw new Error("Password minimal 6 karakter.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const attrs: Record<string, unknown> = {};
    if (data.nama !== undefined) attrs["user_metadata"] = { nama: data.nama };
    if (data.password) attrs["password"] = data.password;
    if (data.active !== undefined) attrs["ban_duration"] = data.active ? "none" : "876000h";
    if (Object.keys(attrs).length) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, attrs);
      if (error) throw new Error(error.message);
    }
    if (data.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.id, role: data.role });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteAppUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    assertFullAdmin(context);
    if (data.id === context.userId) throw new Error("Tidak bisa menghapus akun sendiri.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });