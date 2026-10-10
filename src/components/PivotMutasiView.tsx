import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsUpDown, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { exportTableCsv } from "@/components/DataTableView";
import { cn } from "@/lib/utils";


type Raw = {
  nama: string | null;
  tanggal_transaksi: string | null;
  mutasi_debet: string | null;
  mutasi_kredit: string | null;
};

const PAGE_SIZES = [10, 25, 50, 100];

function toNum(v: string | null) {
  if (!v) return 0;
  const cleaned = String(v).trim().replace(/[^0-9,.-]/g, "");
  // "1.234.567,89" (id) vs "1234567.89"
  const idStyle = /,\d{1,2}$/.test(cleaned);
  const n = Number(
    idStyle ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, ""),
  );
  return Number.isFinite(n) ? n : 0;
}

const fmt = (n: number) => n.toLocaleString("id-ID");


export function PivotMutasiView({ refreshKey = 0 }: { refreshKey?: number }) {
  const [raw, setRaw] = useState<Raw[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [asc, setAsc] = useState(false);


  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const all: Raw[] = [];
      const chunk = 1000;
      for (let i = 0; i < 100; i++) {
        const { data, error } = await supabase
          .from("data_pivot_multi")
          .select("nama, tanggal_transaksi, mutasi_debet, mutasi_kredit")
          .order("id", { ascending: true })
          .range(i * chunk, i * chunk + chunk - 1);
        if (error) {
          toast.error("Gagal memuat data pivot");
          break;
        }
        all.push(...((data ?? []) as Raw[]));
        if (!data || data.length < chunk) break;
      }
      if (!cancelled) {
        setRaw(all);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const pivot = useMemo(() => {
    const map = new Map<string, { nama: string; debet: number; kredit: number }>();
    for (const r of raw) {
      const nama = (r.nama ?? "").trim() || "(TANPA NAMA)";
      const cur = map.get(nama) ?? { nama, debet: 0, kredit: 0 };
      cur.debet += toNum(r.mutasi_debet);
      cur.kredit += toNum(r.mutasi_kredit);
      map.set(nama, cur);
    }
    let list = [...map.values()].map((x) => ({ ...x, delta: x.kredit - x.debet }));
    list.sort((a, b) => (asc ? a.delta - b.delta : b.delta - a.delta));
    return list;
  }, [raw, asc]);

  useEffect(() => setPage(0), [pageSize]);


  const totals = useMemo(
    () =>
      pivot.reduce(
        (acc, r) => ({
          debet: acc.debet + r.debet,
          kredit: acc.kredit + r.kredit,
          delta: acc.delta + r.delta,
        }),
        { debet: 0, kredit: 0, delta: 0 },
      ),
    [pivot],
  );

  const pages = Math.max(1, Math.ceil(pivot.length / pageSize));
  const slice = pivot.slice(page * pageSize, page * pageSize + pageSize);

  const exportPivot = () =>
    exportTableCsv(
      pivot.map((r) => ({
        Nama: r.nama,
        "Total Debet": r.debet,
        "Total Kredit": r.kredit,
        "Delta (Kredit - Debet)": r.delta,
      })),
      "pivot-mutasi-rekening.xlsx",
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={exportPivot}>
          <Download className="mr-2 size-4" /> Export Excel
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>


      <div className="card-elevated overflow-x-auto">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : pivot.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Tidak ada data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Nama</th>
                <th className="px-4 py-3 text-right font-semibold">Total Debet</th>
                <th className="px-4 py-3 text-right font-semibold">Total Kredit</th>
                <th className="px-4 py-3 text-right font-semibold">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => setAsc((v) => !v)}
                  >
                    Delta (Kredit - Debet)
                    <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {slice.map((r) => (
                <tr key={r.nama} className="border-t transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3">{r.nama}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(r.debet)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(r.kredit)}</td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-semibold tabular-nums",
                      r.delta < 0 ? "text-destructive" : "text-success",
                    )}
                  >
                    {fmt(r.delta)}
                  </td>
                </tr>
              ))}
              <tr className="border-t bg-muted/40 font-semibold">
                <td className="px-4 py-3">TOTAL (seluruh data terfilter)</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(totals.debet)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(totals.kredit)}</td>
                <td
                  className={cn(
                    "px-4 py-3 text-right tabular-nums",
                    totals.delta < 0 ? "text-destructive" : "text-success",
                  )}
                >
                  {fmt(totals.delta)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {pivot.length === 0 ? 0 : page * pageSize + 1} to{" "}
          {Math.min(pivot.length, page * pageSize + pageSize)} of {fmt(pivot.length)} entries
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="mr-1 size-4" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
