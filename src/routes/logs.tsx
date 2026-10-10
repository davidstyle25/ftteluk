import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useRole } from "@/lib/use-role";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Activity Logs — BO Teluk Betung" },
      { name: "description", content: "Riwayat aktivitas pengguna aplikasi BO Teluk Betung." },
      { property: "og:title", content: "Activity Logs — BO Teluk Betung" },
      { property: "og:description", content: "Riwayat aktivitas pengguna aplikasi BO Teluk Betung." },
    ],
  }),
  component: LogsPage,
});

type Log = {
  id: number;
  username: string;
  action: string;
  description: string;
  ip_address: string;
  created_at: string;
};

function LogsPage() {
  const [rows, setRows] = useState<Log[] | null>(null);
  const [stats, setStats] = useState<{
    online: number;
    visitsToday: number;
    usersToday: number;
    visits7d: number;
  } | null>(null);

  useEffect(() => {
    supabase
      .from("activity_logs")
      .select("id,username,action,description,ip_address,created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setRows((data ?? []) as Log[]));
  }, []);

  useEffect(() => {
    const now = Date.now();
    const since7d = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const online5m = new Date(now - 5 * 60 * 1000).toISOString();

    supabase
      .from("activity_logs")
      .select("username,action,created_at")
      .gte("created_at", since7d)
      .then(({ data }) => {
        const list = (data ?? []) as { username: string; action: string; created_at: string }[];
        const today = list.filter((r) => new Date(r.created_at) >= startToday);
        setStats({
          online: new Set(list.filter((r) => r.created_at >= online5m).map((r) => r.username)).size,
          visitsToday: today.length,
          usersToday: new Set(today.map((r) => r.username)).size,
          visits7d: list.length,
        });
      });
  }, []);

  const { isAdmin } = useRole();
  const [clearing, setClearing] = useState(false);

  const clearLogs = async () => {
    setClearing(true);
    const { error } = await supabase.from("activity_logs").delete().gte("id", 0);
    setClearing(false);
    if (error) {
      toast.error("Gagal menghapus log: " + error.message);
      return;
    }
    setRows([]);
    setStats({ online: 0, visitsToday: 0, usersToday: 0, visits7d: 0 });
    toast.success("Activity logs berhasil dibersihkan.");
  };

  return (
    <AppLayout>
      <PageHeader
        title="Activity Logs"
        description="System-wide audit trail of user actions."
        actions={
          isAdmin ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={clearing}>
                  <Trash2 className="mr-2 size-4" />
                  {clearing ? "Menghapus…" : "Clear Activity Logs"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus semua activity logs?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Seluruh riwayat aktivitas akan dihapus permanen dan tidak dapat dikembalikan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={clearLogs}>Hapus Semua</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats === null ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px] w-full" />)
        ) : (
          <>
            <StatCard label="Online (5 menit terakhir)" value={stats.online} tone="success" />
            <StatCard label="Pengguna aktif hari ini" value={stats.usersToday} tone="primary" />
            <StatCard label="Aktivitas hari ini" value={stats.visitsToday} tone="warning" />
            <StatCard label="Aktivitas 7 hari" value={stats.visits7d} tone="primary" />
          </>
        )}
      </div>

      <div className="card-elevated overflow-x-auto">
        {rows === null ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Belum ada aktivitas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                {["Waktu", "Username", "Action", "Keterangan", "IP Address"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t transition-colors hover:bg-muted/40">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("id-ID")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">{r.username}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className="rounded border bg-muted/60 px-2 py-0.5 text-xs">{r.action}</span>
                  </td>
                  <td className="px-4 py-2.5">{r.description}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {r.ip_address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
