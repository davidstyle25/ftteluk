import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportTableCsv } from "@/components/DataTableView";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/use-role";

type AvgRow = { id: number; rm: string | null; jg: string | null };
type ViewRow = {
  key: string;
  rm: string;
  pn: string;
  dpk: string;
  tgl1: number;
  tgl2: number;
  tgl3: number;
  tgl4: number;
  rka: string;
  rka_bulan: string;
};

const DPK_ORDER = ["Giro", "Tabungan"] as const;

// Hasil hitung (tgl 1-4) dan pilihan RKA disimpan di tabel settings supaya halaman langsung tampil
// tanpa membaca ribuan baris DI321/DI319 setiap dibuka (sama seperti Produktivitas RMFT).
const CACHE_KEY = "ui_cache_avg_giro";
type CacheRow = { tgl1: number; tgl2: number; tgl3: number; tgl4: number; rka: string; rka_bulan: string };

function parseCache(raw: string | null | undefined): Record<string, CacheRow> {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as { rows?: Record<string, Partial<CacheRow>> };
    const out: Record<string, CacheRow> = {};
    for (const [k, v] of Object.entries(o.rows ?? {})) {
      out[k] = {
        tgl1: Number(v?.tgl1) || 0,
        tgl2: Number(v?.tgl2) || 0,
        tgl3: Number(v?.tgl3) || 0,
        tgl4: Number(v?.tgl4) || 0,
        rka: typeof v?.rka === "string" ? v.rka : "",
        rka_bulan: typeof v?.rka_bulan === "string" ? v.rka_bulan : "",
      };
    }
    return out;
  } catch {
    return {};
  }
}

const MONTHS = [
  { key: "jan", label: "Jan" },
  { key: "feb", label: "Feb" },
  { key: "mar", label: "Mar" },
  { key: "apr", label: "Apr" },
  { key: "mei", label: "Mei" },
  { key: "jun", label: "Jun" },
  { key: "jul", label: "Jul" },
  { key: "agu", label: "Agu" },
  { key: "sep", label: "Sep" },
  { key: "okt", label: "Okt" },
  { key: "nov", label: "Nov" },
  { key: "des", label: "Des" },
] as const;

function num(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number) {
  return n.toLocaleString("id-ID");
}

/** Normalisasi PN: hapus leading zero. "00135655" dan "135655" dianggap PN yang sama. */
function pnKey(v: string): string {
  return v.trim().replace(/^0+/, "");
}

function rmName(rm: string | null): string {
  const s = String(rm ?? "").trim();
  return (s.includes(" - ") ? s.split(" - ").slice(1).join(" - ") : s).trim().toLowerCase();
}

function monthLabel(key: string | null): string {
  const found = MONTHS.find((m) => m.key === key);
  return found?.label ?? "";
}

async function sumByPn(table: string, pnColumn: string, valueColumn: string) {
  const map = new Map<string, number>();
  const size = 1000;
  for (let page = 0; page < 60; page += 1) {
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(table as any)
      .select(`${pnColumn},${valueColumn}`)
      // Wajib berurutan: tanpa ORDER BY, halaman 1000-baris bisa saling tumpang tindih / terlewat.
      .order("id", { ascending: true })
      .range(page * size, page * size + size - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    for (const r of rows) {
      const raw = String(r[pnColumn] ?? "").trim();
      const pn = pnKey(raw.split("-")[0]!.trim());
      if (!pn) continue;
      map.set(pn, (map.get(pn) ?? 0) + num(r[valueColumn]));
    }
    if (rows.length < size) break;
  }
  return map;
}

// Sumber rincian untuk "Export Rincian": semua baris yang ikut dijumlahkan di tabel.
const DETAIL_SRC = [
  { label: "GIRO YTD", table: "data_di321_data1", pn: "pn_rm_dana", val: "avrg_balance", curr: "curr" },
  { label: "GIRO MTD", table: "data_di321_data2", pn: "pn_rm_dana", val: "avrg_balance", curr: "curr" },
  { label: "GIRO DTD", table: "data_di321_data3", pn: "pn_rm_dana", val: "avrg_balance", curr: "curr" },
  { label: "GIRO KEMARIN", table: "data_di321_data4", pn: "pn_rm_dana", val: "avrg_balance", curr: "curr" },
  { label: "TAB YTD", table: "data_di319_data1", pn: "pn_rm_dana_mantri", val: "average_balance", curr: "curr_code" },
  { label: "TAB MTD", table: "data_di319_data2", pn: "pn_rm_dana_mantri", val: "average_balance", curr: "curr_code" },
  { label: "TAB DTD", table: "data_di319_data3", pn: "pn_rm_dana_mantri", val: "average_balance", curr: "curr_code" },
  { label: "TAB KEMARIN", table: "data_di319_data4", pn: "pn_rm_dana_mantri", val: "average_balance", curr: "curr_code" },
] as const;

export function AverageGiroView() {
  const { isAdmin: canEdit } = useRole();
  const [loading, setLoading] = useState(true);
  const [viewRows, setViewRows] = useState<ViewRow[]>([]);
  const rowsRef = useRef<ViewRow[]>([]);
  const [nameToPn, setNameToPn] = useState<Map<string, string>>(new Map());
  const [pnToName, setPnToName] = useState<Map<string, string>>(new Map());
  const [busy, setBusy] = useState<string | null>(null);
  const [periods, setPeriods] = useState<{ tgl1: string; tgl2: string; tgl3: string; tgl4: string }>({
    tgl1: "",
    tgl2: "",
    tgl3: "",
    tgl4: "",
  });
  const [addOpen, setAddOpen] = useState(false);
  const [rmValue, setRmValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 0. Periode header tgl1-4 dari DI319
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
      const [p1, p2, p3, p4] = await Promise.all([
        fetchPeriode("data_di319_data1"),
        fetchPeriode("data_di319_data2"),
        fetchPeriode("data_di319_data3"),
        fetchPeriode("data_di319_data4"),
      ]);
      setPeriods({ tgl1: p1, tgl2: p2, tgl3: p3, tgl4: p4 });

      // 1. RM dari rka_avg_giro
      const { data: avgData } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("rka_avg_giro" as any)
        .select("id,rm,jg")
        .order("id");
      const avgRows = (avgData ?? []) as unknown as AvgRow[];

      // 2. Mapping nama <-> PN dari data_produktivitas_rmft
      const { data: prodData } = await supabase
        .from("data_produktivitas_rmft")
        .select("rm");
      const nm = new Map<string, string>();
      const pnMap = new Map<string, string>();
      for (const r of (prodData ?? []) as { rm: string | null }[]) {
        const raw = String(r.rm ?? "").trim();
        const pn = raw.split("-")[0]!.trim();
        const name = rmName(raw);
        if (pn && name) {
          nm.set(name, pn);
          pnMap.set(pn, raw);
        }
      }
      setNameToPn(nm);
      setPnToName(pnMap);

      // 3. Hasil hitung terakhir yang tersimpan (tidak menghitung ulang dari DI321/DI319)
      const { data: cacheRow } = await supabase
        .from("settings")
        .select("value")
        .eq("key", CACHE_KEY)
        .maybeSingle();
      const cache = parseCache(cacheRow?.value);

      // 4. Bangun 3 baris DPK per RM
      const built: ViewRow[] = [];
      for (const a of avgRows) {
        const name = rmName(a.rm);
        const pn = nm.get(name) ?? "";
        for (const dpk of DPK_ORDER) {
          const c = cache[`${a.id}-${dpk}`];
          built.push({
            key: `${a.id}-${dpk}`,
            rm: pnMap.get(pn) ?? a.rm ?? name,
            pn,
            dpk,
            tgl1: c?.tgl1 ?? 0,
            tgl2: c?.tgl2 ?? 0,
            tgl3: c?.tgl3 ?? 0,
            tgl4: c?.tgl4 ?? 0,
            rka: c?.rka ?? "",
            rka_bulan: c?.rka_bulan ?? "",
          });
        }
      }
      rowsRef.current = built;
      setViewRows(built);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Simpan hasil hitung & pilihan RKA ke tabel settings (hanya admin). */
  async function persist(rows: ViewRow[]) {
    if (!canEdit) return;
    const cache: Record<string, CacheRow> = {};
    for (const r of rows) {
      cache[r.key] = {
        tgl1: r.tgl1,
        tgl2: r.tgl2,
        tgl3: r.tgl3,
        tgl4: r.tgl4,
        rka: r.rka,
        rka_bulan: r.rka_bulan,
      };
    }
    const { error } = await supabase
      .from("settings")
      .upsert(
        { key: CACHE_KEY, value: JSON.stringify({ v: 1, rows: cache }), updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) toast.error(`Gagal menyimpan hasil: ${error.message}`);
  }

  /** Tambah RM baru ke rka_avg_giro. */
  async function addRm() {
    const rm = rmValue.trim();
    if (!rm) {
      toast.error("Nama RM wajib diisi.");
      return;
    }
    setBusy("add");
    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("rka_avg_giro" as any)
      .insert({ rm, jg: "" } as never);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("RM ditambahkan.");
    setAddOpen(false);
    setRmValue("");
    void load();
  }

  /** Hapus RM dari rka_avg_giro berdasarkan nama. */
  async function deleteRm(rm: string) {
    const target = rmName(rm);
    const { data, error: findErr } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("rka_avg_giro" as any)
      .select("id,rm");
    if (findErr) {
      toast.error(findErr.message);
      return;
    }
    const match = ((data ?? []) as unknown as { id: number; rm: string | null }[]).find(
      (r) => rmName(r.rm) === target,
    );
    if (!match) {
      toast.error("RM tidak ditemukan.");
      return;
    }
    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("rka_avg_giro" as any)
      .delete()
      .eq("id", match.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("RM dihapus.");
    void load();
  }

  /** Compare: ambil nilai (average/avrg balance) dari DI321/DI319 berdasarkan PN, isi tgl1-4. */
  async function runCompare(src: {
    table: string;
    pnColumn: string;
    valueColumn: string;
    target: "tgl1" | "tgl2" | "tgl3" | "tgl4";
    dpk: string;
  }) {
    setBusy(`cmp-${src.target}-${src.dpk}`);
    try {
      const sums = await sumByPn(src.table, src.pnColumn, src.valueColumn);
      const next = rowsRef.current.map((r) => {
        if (r.dpk !== src.dpk) return r;
        const value = sums.get(pnKey(r.pn)) ?? 0;
        return { ...r, [src.target]: value };
      });
      rowsRef.current = next;
      setViewRows(next);
      await persist(next);
      toast.success(`${src.dpk} ${src.target.toUpperCase()} selesai.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses data.");
    } finally {
      setBusy(null);
    }
  }

  /** Pilih bulan RKA: ambil nilai dari rka_avg_giro untuk RM tersebut. */
  async function selectRkaMonth(row: ViewRow, monthKey: string) {
    setBusy(row.key);
    try {
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("rka_avg_giro" as any)
        .select(`rm,${monthKey}`);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as Record<string, unknown>[];
      const row2 = rows.find((r) => rmName(r["rm"] as string | null) === rmName(row.rm));
      const value = row2?.[monthKey];
      if (value === null || value === undefined || value === "") {
        toast.error(`Nilai Average ${monthKey.toUpperCase()} tidak ditemukan.`);
        return;
      }
      const next = rowsRef.current.map((r) =>
        r.key === row.key ? { ...r, rka: String(value), rka_bulan: monthKey } : r,
      );
      rowsRef.current = next;
      setViewRows(next);
      await persist(next);
      toast.success(`Average ${monthKey.toUpperCase()} dimuat.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat Average.");
    } finally {
      setBusy(null);
    }
  }

  const groups = useMemo(() => {
    const map = new Map<string, ViewRow[]>();
    for (const r of viewRows) {
      map.set(r.rm, [...(map.get(r.rm) ?? []), r]);
    }
    return [...map.entries()].map(([rm, items]) => ({
      rm,
      items: [...items].sort(
        (a, b) =>
          DPK_ORDER.indexOf(String(a.dpk) as never) - DPK_ORDER.indexOf(String(b.dpk) as never),
      ),
    }));
  }, [viewRows]);

  function exportExcel() {
    exportTableCsv(
      viewRows.map((r) => ({
        RM: r.rm,
        DPK: r.dpk,
        RKA: r.rka,
        "RKA Bulan": r.rka_bulan,
        "tgl 1": r.tgl1,
        "tgl 2": r.tgl2,
        "tgl 3": r.tgl3,
        "tgl 4": r.tgl4,
        DTD: r.tgl3 - r.tgl4,
        MTD: r.tgl3 - r.tgl2,
        YTD: r.tgl3 - r.tgl1,
        "Penc. RKA": r.tgl3 - num(r.rka),
      })) as unknown as Record<string, unknown>[],
      "average_giro.xlsx",
    );
  }

  /** Unduh semua baris sumber (DI321 / DI319 DATA1-4) milik RM di tabel ini + ringkasan per PN. */
  async function exportRincian() {
    setBusy("rincian");
    try {
      const pnSet = new Set(viewRows.map((r) => pnKey(r.pn)).filter(Boolean));
      const nameByPn = new Map<string, string>();
      for (const [k, v] of pnToName) nameByPn.set(pnKey(k), v);
      const detail: Record<string, unknown>[] = [];
      const sums = new Map<string, Record<string, unknown>>();
      for (const s of DETAIL_SRC) {
        for (let page = 0; page < 100; page += 1) {
          const { data, error } = await supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from(s.table as any)
            .select(`id,periode,account_number,short_name,${s.curr},${s.pn},${s.val}`)
            .order("id", { ascending: true })
            .range(page * 1000, page * 1000 + 999);
          if (error) throw new Error(`${s.label}: ${error.message}`);
          const rows = (data ?? []) as unknown as Record<string, unknown>[];
          for (const r of rows) {
            const pnRaw = String(r[s.pn] ?? "").trim();
            const pn = pnKey(pnRaw.split("-")[0]!.trim());
            if (!pn || !pnSet.has(pn)) continue;
            const nilai = num(r[s.val]);
            detail.push({
              Sumber: s.label,
              Periode: r["periode"] ?? "",
              PN: pn,
              "Nama RM": nameByPn.get(pn) ?? "",
              "PN (isi asli)": pnRaw,
              "Account Number": r["account_number"] ?? "",
              "Short Name": r["short_name"] ?? "",
              Curr: r[s.curr] ?? "",
              "Nilai (teks asli)": r[s.val] ?? "",
              "Nilai (dihitung)": nilai,
              "Baris ke (id)": r["id"] ?? "",
            });
            const k = `${s.label}|${pn}`;
            const cur = sums.get(k) ?? {
              Sumber: s.label,
              Periode: r["periode"] ?? "",
              PN: pn,
              "Nama RM": nameByPn.get(pn) ?? "",
              "Jumlah Baris": 0,
              "Total (dihitung)": 0,
            };
            cur["Jumlah Baris"] = Number(cur["Jumlah Baris"]) + 1;
            cur["Total (dihitung)"] = Number(cur["Total (dihitung)"]) + nilai;
            sums.set(k, cur);
          }
          if (rows.length < 1000) break;
        }
      }
      if (!detail.length) {
        toast.error("Tidak ada baris yang cocok dengan RM di tabel.");
        return;
      }
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([...sums.values()]), "Ringkasan");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), "Rincian");
      XLSX.writeFile(wb, "average_giro_rincian.xlsx");
      toast.success(`${detail.length.toLocaleString("id-ID")} baris rincian diunduh.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunduh rincian.");
    } finally {
      setBusy(null);
    }
  }

  const deltaCell = (value: number) => (
    <td
      className={cn(
        "whitespace-nowrap px-4 py-2.5 text-right tabular-nums",
        value < 0 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success",
      )}
    >
      <span className="inline-flex items-center gap-1">
        {fmt(value)}
        {value < 0 ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
      </span>
    </td>
  );

  return (
    <div className="mt-10 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-lg font-bold tracking-tight">AVERAGE GIRO DAN TABUNGAN</h2>
        {canEdit && (
          <>
          <Button className="bg-action-1 text-action-foreground hover:opacity-90" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 size-4" /> Tambah RM
          </Button>
          <Button className="bg-action-2 text-action-foreground hover:opacity-90" onClick={() => runCompare({ table: "data_di321_data1", pnColumn: "pn_rm_dana", valueColumn: "avrg_balance", target: "tgl1", dpk: "Giro" })}>GIRO YTD</Button>
          <Button className="bg-action-3 text-action-foreground hover:opacity-90" onClick={() => runCompare({ table: "data_di321_data2", pnColumn: "pn_rm_dana", valueColumn: "avrg_balance", target: "tgl2", dpk: "Giro" })}>GIRO MTD</Button>
          <Button className="bg-action-4 text-action-foreground hover:opacity-90" onClick={() => runCompare({ table: "data_di321_data3", pnColumn: "pn_rm_dana", valueColumn: "avrg_balance", target: "tgl3", dpk: "Giro" })}>GIRO DTD</Button>
          <Button className="bg-action-5 text-action-foreground hover:opacity-90" onClick={() => runCompare({ table: "data_di319_data1", pnColumn: "pn_rm_dana_mantri", valueColumn: "average_balance", target: "tgl1", dpk: "Tabungan" })}>TAB YTD</Button>
          <Button className="bg-action-6 text-action-foreground hover:opacity-90" onClick={() => runCompare({ table: "data_di319_data2", pnColumn: "pn_rm_dana_mantri", valueColumn: "average_balance", target: "tgl2", dpk: "Tabungan" })}>TAB MTD</Button>
          <Button className="bg-action-7 text-action-foreground hover:opacity-90" onClick={() => runCompare({ table: "data_di319_data3", pnColumn: "pn_rm_dana_mantri", valueColumn: "average_balance", target: "tgl3", dpk: "Tabungan" })}>TAB DTD</Button>
          <Button className="bg-action-2 text-action-foreground hover:opacity-90" onClick={() => runCompare({ table: "data_di321_data4", pnColumn: "pn_rm_dana", valueColumn: "avrg_balance", target: "tgl4", dpk: "Giro" })}>GIRO KEMARIN</Button>
          <Button className="bg-action-5 text-action-foreground hover:opacity-90" onClick={() => runCompare({ table: "data_di319_data4", pnColumn: "pn_rm_dana_mantri", valueColumn: "average_balance", target: "tgl4", dpk: "Tabungan" })}>TAB KEMARIN</Button>
          </>
        )}
        <Button variant="secondary" onClick={exportExcel}>
          <Download className="mr-1.5 size-4" /> Export Excel
        </Button>
        {canEdit && (
          <Button variant="secondary" onClick={exportRincian} disabled={busy === "rincian"}>
            <Download className="mr-1.5 size-4" /> {busy === "rincian" ? "Mengunduh…" : "Export Rincian"}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="card-elevated p-8 text-center text-sm text-muted-foreground">
          Tidak ada data.
        </p>
      ) : (
        <div className="card-elevated overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-table-head text-table-head-foreground">
                <th className="px-4 py-3 text-left font-semibold">RM</th>
                <th className="px-4 py-3 text-left font-semibold">DPK</th>
                {canEdit && <th className="px-4 py-3 text-left font-semibold">RKA</th>}
                <th className="px-4 py-3 text-right font-semibold">Nilai RKA</th>
                <th className="px-4 py-3 text-right font-semibold">{periods.tgl1 || "tgl 1"}</th>
                <th className="px-4 py-3 text-right font-semibold">{periods.tgl2 || "tgl 2"}</th>
                <th className="px-4 py-3 text-right font-semibold">{periods.tgl3 || "tgl 3"}</th>
                <th className="px-4 py-3 text-right font-semibold">{periods.tgl4 || "tgl 4"}</th>
                <th className="bg-table-accent px-4 py-3 text-right font-semibold">DTD</th>
                <th className="bg-table-accent px-4 py-3 text-right font-semibold">MTD</th>
                <th className="bg-table-accent px-4 py-3 text-right font-semibold">YTD</th>
                <th className="bg-table-accent px-4 py-3 text-right font-semibold">Penc. RKA</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            {groups.map((g) => {
              const total = g.items.reduce(
                (acc, r) => ({
                  tgl1: acc.tgl1 + r.tgl1,
                  tgl2: acc.tgl2 + r.tgl2,
                  tgl3: acc.tgl3 + r.tgl3,
                  tgl4: acc.tgl4 + r.tgl4,
                  rka: acc.rka + num(r.rka),
                }),
                { tgl1: 0, tgl2: 0, tgl3: 0, tgl4: 0, rka: 0 },
              );
              return (
                <tbody key={g.rm} className="border-t-4 border-background">
                  {g.items.map((r, i) => (
                    <tr key={r.key} className="border-t">
                      {i === 0 && (
                        <td rowSpan={g.items.length + 1} className="px-4 py-2.5 align-top font-medium">
                          {g.rm}
                        </td>
                      )}
                      <td className="whitespace-nowrap px-4 py-2.5">{r.dpk}</td>
                      {canEdit && (
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <select
                            value={r.rka_bulan}
                            disabled={busy === r.key}
                            onChange={(e) => {
                              if (e.target.value) void selectRkaMonth(r, e.target.value);
                            }}
                            className="h-8 rounded-md border border-input bg-card px-2 text-sm text-foreground"
                          >
                            <option value="">Pilih bulan…</option>
                            {MONTHS.map((m) => (
                              <option key={m.key} value={m.key}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                        {r.rka ? (
                          <span className="inline-flex items-center gap-1.5">
                            {r.rka_bulan && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium uppercase text-muted-foreground">
                                {monthLabel(r.rka_bulan)}
                              </span>
                            )}
                            {fmt(num(r.rka))}
                          </span>
                        ) : (
                          "–"
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmt(r.tgl1)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmt(r.tgl2)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmt(r.tgl3)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmt(r.tgl4)}</td>
                      {deltaCell(r.tgl3 - r.tgl4)}
                      {deltaCell(r.tgl3 - r.tgl2)}
                      {deltaCell(r.tgl3 - r.tgl1)}
                      {deltaCell(r.tgl3 - num(r.rka))}
                      {i === 0 && (
                        <td rowSpan={g.items.length + 1} className="px-4 py-2.5 text-right align-top">
                          {canEdit && (
                            <button
                              type="button"
                              className="text-sm text-destructive hover:underline"
                              onClick={() => deleteRm(g.rm)}
                            >
                              Hapus
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/50 font-semibold">
                    <td className="px-4 py-2.5">Jumlah</td>
                    {canEdit && <td className="px-4 py-2.5" />}
                    <td className="px-4 py-2.5" />
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmt(total.tgl1)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmt(total.tgl2)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmt(total.tgl3)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmt(total.tgl4)}</td>
                    {deltaCell(total.tgl3 - total.tgl4)}
                    {deltaCell(total.tgl3 - total.tgl2)}
                    {deltaCell(total.tgl3 - total.tgl1)}
                    {deltaCell(total.tgl3 - total.rka)}
                    <td className="px-4 py-2.5" />
                  </tr>
                </tbody>
              );
            })}
          </table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah RM</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="avg-rm">Nama RM</Label>
            <Input
              id="avg-rm"
              value={rmValue}
              onChange={(e) => setRmValue(e.target.value)}
              placeholder="Nama RM"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Batal
            </Button>
            <Button onClick={addRm} disabled={busy === "add"}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
