import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GitCompare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useRole } from "@/lib/use-role";

export const Route = createFileRoute("/compare-data")({
  head: () => ({
    meta: [
      { title: "Compare Data — BO Teluk Betung" },
      {
        name: "description",
        content: "Bandingkan kenaikan dan penurunan saldo giro serta tabungan MTD dan YTD.",
      },
      { property: "og:title", content: "Compare Data — BO Teluk Betung" },
      {
        property: "og:description",
        content: "Bandingkan kenaikan dan penurunan saldo giro serta tabungan MTD dan YTD.",
      },
    ],
  }),
  component: CompareDataPage,
});

const JOBS = [
  {
    kind: "mtd_giro",
    title: "DI321 DATA2 vs DATA3 → MTD GIRO",
    source: "DATA2",
    target: "MTD GIRO",
  },
  {
    kind: "mtd_tab",
    title: "DI319 DATA2 vs DATA3 → MTD TAB",
    source: "DATA2",
    target: "MTD TAB",
  },
  {
    kind: "ytd_giro",
    title: "DI321 DATA1 vs DATA3 → YTD GIRO",
    source: "DATA1",
    target: "YTD GIRO",
  },
  {
    kind: "ytd_tab",
    title: "DI319 DATA1 vs DATA3 → YTD TAB",
    source: "DATA1",
    target: "YTD TAB",
  },
];

function CompareDataPage() {
  const { isAdmin } = useRole();
  const [running, setRunning] = useState<string | null>(null);

  const run = async (kind: string) => {
    if (!isAdmin) {
      toast.error("Hanya admin yang dapat menjalankan compare data.");
      return;
    }
    setRunning(kind);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("run_compare", { _kind: kind });
    setRunning(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    const res = data as { kenaikan?: number; penurunan?: number } | null;
    toast.success(
      `Compare selesai — kenaikan ${res?.kenaikan ?? 0}, penurunan ${res?.penurunan ?? 0}.`,
    );
  };

  return (
    <AppLayout>
      <PageHeader
        title="Compare Data"
        description="Bandingkan saldo antar data (DATA2 vs DATA3 untuk MTD, DATA1 vs DATA3 untuk YTD), lalu perbarui tabel MTD/YTD GIRO (DI321) dan MTD/YTD TAB (DI319) secara otomatis."
      />

      <div className="max-w-3xl space-y-4">
        {JOBS.map((j) => (
          <div key={j.kind} className="card-elevated px-6 py-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <GitCompare className="size-4 text-primary" />
              {j.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Setiap nomor rekening pada DATA3 akan dicocokkan (vlookup) dengan nomor rekening yang
              sama di {j.source}. Selisihnya (Saldo {j.source} − Saldo DATA3) menjadi DELTA. Rekening
              yang saldonya naik akan masuk ke tabel <strong>{j.target} → Kenaikan</strong>, dan yang
              turun akan masuk ke <strong>{j.target} → Penurunan</strong>. Data lama pada kedua tabel
              tersebut akan diganti dengan hasil compare terbaru.
            </p>
            <Button className="mt-4" disabled={running === j.kind} onClick={() => run(j.kind)}>
              <GitCompare className="mr-2 size-4" />
              {running === j.kind ? "Memproses…" : "Jalankan Compare Data"}
            </Button>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
