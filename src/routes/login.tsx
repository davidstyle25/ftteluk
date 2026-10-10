import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Masuk — BO Teluk Betung" },
      {
        name: "description",
        content: "Halaman masuk aplikasi pengelolaan data BO Teluk Betung oleh RMFT Teluk Betung.",
      },
      { property: "og:title", content: "Masuk — BO Teluk Betung" },
      { property: "og:description", content: "Masuk ke aplikasi pengelolaan data BO Teluk Betung." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nama, setNama] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  function toEmail(value: string) {
    const v = value.trim().toLowerCase();
    return v.includes("@") ? v : `${v}@app.local`;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: toEmail(email), password });
        if (error) throw error;
        await logActivity(email.trim().toLowerCase(), "login", "Berhasil masuk ke aplikasi");
        navigate({ to: "/" });

      } else {
        const { error } = await supabase.auth.signUp({
          email: toEmail(email),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { nama },
          },
        });
        if (error) throw error;
        toast.success("Akun dibuat. Silakan cek email untuk konfirmasi bila diminta.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal masuk");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="card-elevated w-full max-w-md px-8 py-8">
        <h1 className="text-center text-2xl font-bold tracking-tight">BO Teluk Betung</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Development by RMFT Teluk Betung
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="nama">Nama</Label>
              <Input
                id="nama"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama lengkap"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Username / Email</Label>
            <Input
              id="email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Memproses…" : mode === "signin" ? "Sign In" : "Daftar"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
        </button>
      </div>
    </div>
  );
}
