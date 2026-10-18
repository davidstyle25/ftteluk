import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { DataTableView, exportTableCsv } from "@/components/DataTableView";
import { ExcelUploadDialog } from "@/components/ExcelUploadDialog";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { PivotMutasiView } from "@/components/PivotMutasiView";
import { ProduktivitasRmftView } from "@/components/ProduktivitasRmftView";
import { AverageGiroView } from "@/components/AverageGiroView";
import { EdcQrisView, PROD_CFG, SV_CFG } from "@/components/EdcQrisView";
import { TimeSeriesView } from "@/components/TimeSeriesView";
import { CategoryStats } from "@/components/CategoryStats";
import { EdcProduktifTable } from "@/components/EdcProduktifTable";
import { ValasGiroCard } from "@/components/ValasGiroCard";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CATEGORY_BY_SLUG } from "@/lib/data-catalog";
import { useRole } from "@/lib/use-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/data/$slug")({
  head: () => ({
    meta: [
      { title: "Detail Kategori Data — BO Teluk Betung" },
      {
        name: "description",
        content: "Lihat, cari, dan ekspor catatan data kategori terpilih di BO Teluk Betung.",
      },
      { property: "og:title", content: "Detail Kategori Data — BO Teluk Betung" },
      {
        property: "og:description",
        content: "Lihat, cari, dan ekspor catatan data kategori terpilih.",
      },
    ],
  }),
  component: DataCategoryPage,
});

function useCount(table: string, tick: number) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    setCount(null);
    supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(table as any)
      .select("*", { count: "exact", head: true })
      .then(({ count: c }) => setCount(c ?? 0));
  }, [table, tick]);
  return count;
}

function DataCategoryPage() {
  const { slug } = Route.useParams();
  const category = CATEGORY_BY_SLUG.get(slug);
  const { isAdmin } = useRole();
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<"data" | "pivot">("data");
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [periods, setPeriods] = useState<Record<string, string>>({});
  const count = useCount(category?.table ?? "settings", tick);

  // Untuk kategori hasil compare (MTD/YTD TAB & GIRO), tampilkan periode sumber
  // pada header tgl1/tgl2 alih-alih label statis.
  useEffect(() => {
    const map: Record<string, { src: string; base: string }> = {
      mtd_tab: { src: "data_di319_data2", base: "data_di319_data3" },
      ytd_tab: { src: "data_di319_data1", base: "data_di319_data3" },
      mtd_giro: { src: "data_di321_data2", base: "data_di321_data3" },
      ytd_giro: { src: "data_di321_data1", base: "data_di321_data3" },
    };
    const cfg = map[slug];
    if (!cfg) {
      setPeriods({});
      return;
    }
    let cancelled = false;
    (async () => {
      const fetchPeriode = async (table: string): Promise<string> => {
        const { data, error } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(table as any)
          .select("periode")
          .limit(1);
        if (error) return "";
        const rows = (data ?? []) as unknown as Record<string, unknown>[];
        return String(rows[0]?.["periode"] ?? "");
      };
      const [p1, p2] = await Promise.all([fetchPeriode(cfg.src), fetchPeriode(cfg.base)]);
      if (!cancelled) setPeriods({ tgl1: p1, tgl2: p2 });
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!category) {
    return (
      <AppLayout>
        <p className="text-sm text-muted-foreground">Kategori tidak ditemukan.</p>
      </AppLayout>
    );
  }

  const isCompareResult = category.readonly && !!CATEGORY_BY_SLUG.get(`${slug}_kenaikan`);
  const isProduktivitas = slug === "produktivitas_rmft";
  const isTimeSeries = slug === "time_series";
  // DATA1 YTD / DATA2 MTD / DATA3 DTD / DATA4 KEMARIN milik DI321: tampilkan tabel kurs Valas Giro.
  const isDi321 = /^di321_data[1-4]$/.test(slug);
  // Tabel Valas Giro hanya untuk admin; viewer tidak melihatnya.
  const showValas = isDi321 && isAdmin;
  // Viewer hanya punya akses penuh di kategori Pivot Multi; selainnya read-only.
  const canManage = isAdmin || slug === "pivot_multi";

  const exportExcel = async () => {
    // Server membatasi satu permintaan (default 1000 baris), jadi ambil bertahap per 1000 baris
    // berurutan berdasarkan id sampai habis, supaya semua data ikut ter-export.
    const all: Record<string, unknown>[] = [];
    const chunk = 1000;
    for (let i = 0; i < 1000; i++) {
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(category.table as any)
        .select("*")
        .order("id", { ascending: true })
        .range(i * chunk, i * chunk + chunk - 1);
      if (error) {
        toast.error(`Export gagal: ${error.message}`);
        return;
      }
      const part = (data ?? []) as unknown as Record<string, unknown>[];
      all.push(...part);
      if (part.length < chunk) break;
    }
    // Kolom internal balance_asli (penyimpan balance sebelum dikali kurs) tidak ikut di file.
    const rows = all.map((r) => {
      const { balance_asli: _asli, ...rest } = r;
      void _asli;
      return rest;
    });
    exportTableCsv(rows, `${slug}.xlsx`);
  };

  const wipe = async () => {
    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(category.table as any)
      .delete()
      .gte("id", 0);
    setConfirmWipe(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Semua data dihapus.");
    setTick((t) => t + 1);
  };

  return (
    <AppLayout>
      <PageHeader
        title={category.label}
        description="Manage data records for this category."
        actions={
          isTimeSeries ? null : (
          <>
            <Button variant="outline" onClick={exportExcel}>
              <Download className="mr-2 size-4" /> Export Excel
            </Button>
            {canManage && !category.readonly && (
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="mr-2 size-4" /> Upload Excel
              </Button>
            )}
            {canManage && category.csvUpload && (
              <Button variant="outline" onClick={() => setCsvOpen(true)}>
                <Upload className="mr-2 size-4" /> Upload CSV
              </Button>
            )}
            {canManage && (
              <Button variant="destructive" onClick={() => setConfirmWipe(true)}>
                <Trash2 className="mr-2 size-4" /> Hapus Semua Data
              </Button>
            )}
          </>
          )
        }

      />

      {(slug === "edc" || slug === "qris") && <CategoryStats slug={slug} />}

      {slug === "edc" && <EdcProduktifTable canEdit={isAdmin} variant="edc" />}
      {slug === "qris" && <EdcProduktifTable canEdit={isAdmin} variant="qris" />}

      {!isCompareResult && !isTimeSeries && !(slug === "edc" || slug === "qris") && (
        <div
          className={cn(
            "mb-5 grid gap-4",
            showValas ? "items-start md:grid-cols-[minmax(0,1fr)_22rem]" : "sm:grid-cols-2 lg:grid-cols-3",
          )}
        >
          <div className={showValas ? "grid gap-4 sm:grid-cols-2" : "contents"}>
            <StatCard
              label={`Jumlah Data · ${category.label}`}
              value={count === null ? "…" : count.toLocaleString("id-ID")}
            />
          </div>
          {showValas && (
            <ValasGiroCard table={category.table} isAdmin={isAdmin} onCompared={() => setTick((t) => t + 1)} />
          )}
        </div>
      )}

      {category.csvUpload && (
        <div className="mb-4 inline-flex rounded-lg border bg-muted/50 p-1">
          {(["data", "pivot"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                tab === t ? "bg-card font-medium shadow-card" : "text-muted-foreground",
              )}
            >
              {t === "data" ? "Data" : "Pivot Mutasi Rekening"}
            </button>
          ))}
        </div>
      )}

      {isTimeSeries ? (
        <TimeSeriesView />
      ) : category.csvUpload && tab === "pivot" ? (
        <PivotMutasiView refreshKey={tick} />
      ) : isProduktivitas ? (
        <>
          <ProduktivitasRmftView key={`prod-${tick}`} canEdit={canManage} />
          <AverageGiroView />
          <EdcQrisView cfg={PROD_CFG} title="EDC & QRIS PRODUKTIF" />
          <EdcQrisView cfg={SV_CFG} title="SALES VOLUME EDC & QRIS" />
        </>
      ) : isCompareResult ? (
        <div className="space-y-10">
          <DataTableView
            key={`${slug}-turun-${tick}`}
            title="Penurunan"
            table={`${category.table}_penurunan`}
            columns={CATEGORY_BY_SLUG.get(`${slug}_penurunan`)?.columns ?? []}
            showDelta
            canEdit={canManage}
            canAdd={false}
            headerOverrides={periods}
          />
          <DataTableView
            key={`${slug}-naik-${tick}`}
            title="Kenaikan"
            table={`${category.table}_kenaikan`}
            columns={CATEGORY_BY_SLUG.get(`${slug}_kenaikan`)?.columns ?? []}
            showDelta
            canEdit={canManage}
            canAdd={false}
            headerOverrides={periods}
          />
        </div>
      ) : (
        <DataTableView
          key={`${slug}-${tick}`}
          table={category.table}
          columns={category.columns}
          canEdit={canManage && !category.readonly}
          canAdd={canManage && !category.readonly && !category.noAdd}
          onChanged={() => setTick((t) => t + 1)}
        />
      )}

      <ExcelUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        table={category.table}
        label={category.label}
        onImported={() => setTick((t) => t + 1)}
      />

      {category.csvUpload && (
        <ExcelUploadDialog
          mode="csv"
          open={csvOpen}
          onOpenChange={setCsvOpen}
          table={category.table}
          label={category.label}
          onImported={() => setTick((t) => t + 1)}
        />
      )}

      <AlertDialog open={confirmWipe} onOpenChange={setConfirmWipe}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus semua data {category.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Seluruh baris pada kategori ini akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={wipe}>Hapus Semua</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}