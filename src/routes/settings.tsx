import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BO Teluk Betung" },
      { name: "description", content: "Pengaturan aplikasi data BO Teluk Betung." },
      { property: "og:title", content: "Settings — BO Teluk Betung" },
      { property: "og:description", content: "Pengaturan aplikasi data BO Teluk Betung." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [rows, setRows] = useState<{ id: number; key: string; value: string }[]>([]);

  useEffect(() => {
    supabase
      .from("settings")
      .select("id,key,value")
      .order("id")
      .then(({ data }) => setRows(data ?? []));
  }, []);

  return (
    <AppLayout>
      <h2 className="mb-4 text-2xl font-bold tracking-tight">Settings</h2>
      <div className="card-elevated divide-y">
        {rows.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm font-medium">{s.key.replace(/_/g, " ")}</span>
            <span className="text-sm text-muted-foreground">{s.value || "—"}</span>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground">Tidak ada data.</p>
        )}
      </div>
    </AppLayout>
  );
}
