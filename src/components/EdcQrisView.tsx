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
import { formatPosisi } from "@/lib/edc-produktif";
import { useRole } from "@/lib/use-role";

type ViewRow = {
  key: string;
  rm: string;
  pn: string;
  kategori: string;
  tgl1: number;
  tgl2: number;
  tgl3: number;
  tgl4: number;
  rka: string;
  rka_bulan: string;
};

const KATEGORI = ["EDC", "QRIS"] as const;

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

type CatCfg = {
  rkaTable: string;
  tglTables: [string, string, string, string];
  pnColumn: string;
  valueColumn: string;
};

export const PROD_CFG: Record<"EDC" | "QRIS", CatCfg> = {
  EDC: {
    rkaTable: "rka_edc_produktif",
    tglTables: ["data_edc_data1", "data_edc_data2", "data_edc_data3", "data_edc_data4"],
    pnColumn: "pn_user_pemrakarsa",
    valueColumn: "sales_volume",
  },
  QRIS: {
    rkaTable: "rka_qris_produktif",
    tglTables: ["data_qris_data1", "data_qris_data2", "data_qris_data3", "data_qris_data4"],
    pnColumn: "pn",
    valueColumn: "akumulasi_sv_total",
  },
};

export const SV_CFG: Record<"EDC" | "QRIS", CatCfg> = {
  EDC: {
    rkaTable: "rka_sv_edc",
    tglTables: ["data_edc_data1", "data_edc_data2", "data_edc_data3", "data_edc_data4"],
    pnColumn: "pn_user_pemrakarsa",
    valueColumn: "sales_volume",
  },
  QRIS: {
    rkaTable: "rka_sv_qris",
    tglTables: ["data_qris_data1", "data_qris_data2", "data_qris_data3", "data_qris_data4"],
    pnColumn: "pn",
    valueColumn: "akumulasi_sv_total",
  },
};

function num(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number) {
  return n.toLocaleString("id-ID");
}

/** Normalisasi PN: hapus leading zero, lowercase. "00135655" -> "135655". */
function pnKey(v: string): string {
  const s = v.trim().replace(/^0+/, "");
  return s;
}

function rmName(rm: string | null): string {
  const s = String(rm ?? "").trim();
  return (s.includes(" - ") ? s.split(" - ").slice(1).join(" - ") : s).trim().toLowerCase();
}

/** "2026/8/31 0:00" -> "31 Agu 2026" (dari kolom posisi). */
function shortDate(raw: string): string {
  const f = formatPosisi(raw);
  if (!f) return "";
  const m = f.match(/^(\d{1,2}) ([A-Z]+) (\d{4})$/);
  if (!m) return f;
  const mon = m[2]!.slice(0, 3);
  return `${m[1]} ${mon[0]}${mon.slice(1).toLowerCase()} ${m[3]}`;
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
      const pn = pnKey(String(r[pnColumn] ?? ""));
      if (!pn) continue;
      map.set(pn, (map.get(pn) ?? 0) + num(r[valueColumn]));
    }
    if (rows.length < size) break;
  }
  return map;
}

type CacheRow = { tgl1?: number; tgl2?: number; tgl3?: number; tgl4?: number; rka?: string; rka_bulan?: string };

function parseCache(raw: unknown): Record<string, CacheRow> {
  try {
    const d = JSON.parse(String(raw ?? ""));
    const rows = d?.rows;
    return rows && typeof rows === "object" ? (rows as Record<string, CacheRow>) : {};
  } catch {
    return {};
  }
}

export function EdcQrisView({ cfg, title }: { cfg: Record<"EDC" | "QRIS", CatCfg>; title: string }) {
  const { isAdmin: canEdit } = useRole();
  const cacheKey = `ui_cache_${cfg.EDC.rkaTable}`;
  const rowsRef = useRef<ViewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewRows, setViewRows] = useState<ViewRow[]>([]);
  const [nameToPn, setNameToPn] = useState<Map<string, string>>(new Map());
  const [pnToName, setPnToName] = useState<Map<string, string>>(new Map());
  const [busy, setBusy] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [rmValue, setRmValue] = useState("");
  const [periods, setPeriods] = useState<{ tgl1: string; tgl2: string; tgl3: string; tgl4: string }>({
    tgl1: "",
    tgl2: "",
    tgl3: "",
    tgl4: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Mapping nama <-> PN dari data_produktivitas_rmft
      const { data: prodData } = await supabase.from("data_produktivitas_rmft").select("rm");
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

      // Tanggal header diambil dari kolom posisi data YTD / MTD / DTD / Kemarin (EDC, cadangan QRIS)
      const fetchPosisi = async (table: string): Promise<string> => {
        const { data, error } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(table as any)
          .select("posisi")
          .order("id", { ascending: true })
          .limit(1);
        if (error) return "";
        const rows = (data ?? []) as unknown as Record<string, unknown>[];
        return shortDate(String(rows[0]?.["posisi"] ?? ""));
      };
      const pos = await Promise.all(
        [0, 1, 2, 3].map(async (i) => {
          const e = await fetchPosisi(cfg.EDC.tglTables[i]!);
          return e || (await fetchPosisi(cfg.QRIS.tglTables[i]!));
        }),
      );
      setPeriods({ tgl1: pos[0]!, tgl2: pos[1]!, tgl3: pos[2]!, tgl4: pos[3]! });

      // Hasil hitungan tersimpan (diisi admin lewat tombol) -> tampil instan
      const { data: cacheRow } = await supabase
        .from("settings")
        .select("value")
        .eq("key", cacheKey)
        .maybeSingle();
      const cache = parseCache((cacheRow as { value?: string } | null)?.value);

      // RM dari rka_edc_produktif & rka_qris_produktif
      const { data: edcRka } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("rka_edc_produktif" as any)
        .select("id,rm")
        .order("id");
      const { data: qrisRka } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("rka_qris_produktif" as any)
        .select("id,rm")
        .order("id");

      const built: ViewRow[] = [];
      const addRows = (rkaRows: unknown, kategori: string) => {
        for (const a of (rkaRows as { id: number; rm: string | null }[] | null) ?? []) {
          const name = rmName(a.rm);
          const pn = nm.get(name) ?? "";
          const c = cache[`${kategori}-${a.id}`] ?? {};
          built.push({
            key: `${kategori}-${a.id}`,
            rm: pnMap.get(pn) ?? a.rm ?? name,
            pn,
            kategori,
            tgl1: num(c.tgl1),
            tgl2: num(c.tgl2),
            tgl3: num(c.tgl3),
            tgl4: num(c.tgl4),
            rka: c.rka ?? "",
            rka_bulan: c.rka_bulan ?? "",
          });
        }
      };
      addRows(edcRka as unknown, "EDC");
      addRows(qrisRka as unknown, "QRIS");

      rowsRef.current = built;
      setViewRows(built);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Simpan hasil hitungan ke settings (admin) supaya tampil instan saat dibuka. */
  async function persist(rows: ViewRow[]) {
    if (!canEdit) return;
    const out: Record<string, CacheRow> = {};
    for (const r of rows) {
      out[r.key] = { tgl1: r.tgl1, tgl2: r.tgl2, tgl3: r.tgl3, tgl4: r.tgl4, rka: r.rka, rka_bulan: r.rka_bulan };
    }
    const { error } = await supabase
      .from("settings")
      .upsert(
        { key: cacheKey, value: JSON.stringify({ v: 1, rows: out }), updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) toast.error(`Gagal menyimpan hasil: ${error.message}`);
  }

  /** Tambah RM baru ke rka_edc_produktif & rka_qris_produktif. */
  async function addRm() {
    const rm = rmValue.trim();
    if (!rm) {
      toast.error("Nama RM wajib diisi.");
      return;
    }
    setBusy("add");
    const e1 = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("rka_edc_produktif" as any)
      .insert({ rm, jg: "" } as never);
    const e2 = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("rka_qris_produktif" as any)
      .insert({ rm, jg: "" } as never);
    setBusy(null);
    if (e1.error || e2.error) {
      toast.error((e1.error ?? e2.error)!.message);
      return;
    }
    toast.success("RM ditambahkan.");
    setAddOpen(false);
    setRmValue("");
    void load();
  }

  /** Hapus RM dari rka_edc_produktif & rka_qris_produktif. */
  async function deleteRm(rm: string) {
    const target = rmName(rm);
    for (const table of ["rka_edc_produktif", "rka_qris_produktif"]) {
      const { data, error: fErr } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(table as any)
        .select("id,rm");
      if (fErr) {
        toast.error(fErr.message);
        return;
      }
      const match = ((data ?? []) as unknown as { id: number; rm: string | null }[]).find(
        (r) => rmName(r.rm) === target,
      );
      if (match) {
        const { error } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(table as any)
          .delete()
          .eq("id", match.id);
        if (error) {
          toast.error(error.message);
          return;
        }
      }
    }
    toast.success("RM dihapus.");
    void load();
  }

  /** Pilih bulan RKA: ambil dari rka_edc_produktif / rka_qris_produktif. */
  async function selectRkaMonth(row: ViewRow, monthKey: string) {
    setBusy(row.key);
    try {
      const table = cfg[row.kategori as "EDC" | "QRIS"].rkaTable;
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(table as any)
        .select(`rm,${monthKey}`);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as Record<string, unknown>[];
      const found = rows.find((r) => rmName(r["rm"] as string | null) === rmName(row.rm));
      const value = found?.[monthKey];
      if (value === null || value === undefined || value === "") {
        toast.error(`Nilai ${monthKey.toUpperCase()} tidak ditemukan.`);
        return;
      }
      const next = rowsRef.current.map((r) =>
        r.key === row.key ? { ...r, rka: String(value), rka_bulan: monthKey } : r,
      );
      rowsRef.current = next;
      setViewRows(next);
      await persist(next);
      toast.success(`${row.kategori} ${monthKey.toUpperCase()} dimuat.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat RKA.");
    } finally {
      setBusy(null);
    }
  }

  /** Compare: isi tgl1-4 dari data_edc_data1-4 / data_qris_data1-4. */
  async function runCompare(src: { kategori: string; target: "tgl1" | "tgl2" | "tgl3" | "tgl4" }) {
    const cfgRef = cfg[src.kategori as "EDC" | "QRIS"];
    const idx = src.target === "tgl1" ? 0 : src.target === "tgl2" ? 1 : src.target === "tgl3" ? 2 : 3;
    setBusy(`cmp-${src.kategori}-${src.target}`);
    try {
      const sums = await sumByPn(cfgRef.tglTables[idx]!, cfgRef.pnColumn, cfgRef.valueColumn);
      const next = rowsRef.current.map((r) => {
        if (r.kategori !== src.kategori) return r;
        const value = sums.get(pnKey(r.pn)) ?? 0;
        return { ...r, [src.target]: value };
      });
      rowsRef.current = next;
      setViewRows(next);
      await persist(next);
      toast.success(`${src.kategori} ${src.target.toUpperCase()} selesai.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses data.");
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
        (a, b) => KATEGORI.indexOf(String(a.kategori) as never) - KATEGORI.indexOf(String(b.kategori) as never),
      ),
    }));
  }, [viewRows]);

  function exportExcel() {
    exportTableCsv(
      viewRows.map((r) => ({
        RM: r.rm,
        Kategori: r.kategori,
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
      "edc_qris_produktif.xlsx",
    );
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
        <h2 className="mr-2 text-lg font-bold tracking-tight">{title}</h2>
        {canEdit && (
          <>
          <Button className="bg-action-1 text-action-foreground hover:opacity-90" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 size-4" /> Tambah RM
          </Button>
          <Button className="bg-action-2 text-action-foreground hover:opacity-90" onClick={() => runCompare({ kategori: "EDC", target: "tgl1" })}>EDC YTD</Button>
          <Button className="bg-action-3 text-action-foreground hover:opacity-90" onClick={() => runCompare({ kategori: "EDC", target: "tgl2" })}>EDC MTD</Button>
          <Button className="bg-action-4 text-action-foreground hover:opacity-90" onClick={() => runCompare({ kategori: "EDC", target: "tgl3" })}>EDC DTD</Button>
          <Button className="bg-action-5 text-action-foreground hover:opacity-90" onClick={() => runCompare({ kategori: "QRIS", target: "tgl1" })}>QRIS YTD</Button>
          <Button className="bg-action-6 text-action-foreground hover:opacity-90" onClick={() => runCompare({ kategori: "QRIS", target: "tgl2" })}>QRIS MTD</Button>
          <Button className="bg-action-7 text-action-foreground hover:opacity-90" onClick={() => runCompare({ kategori: "QRIS", target: "tgl3" })}>QRIS DTD</Button>
          <Button className="bg-action-2 text-action-foreground hover:opacity-90" onClick={() => runCompare({ kategori: "EDC", target: "tgl4" })}>EDC KEMARIN</Button>
          <Button className="bg-action-5 text-action-foreground hover:opacity-90" onClick={() => runCompare({ kategori: "QRIS", target: "tgl4" })}>QRIS KEMARIN</Button>
          </>
        )}
        <Button variant="secondary" onClick={exportExcel}>
          <Download className="mr-1.5 size-4" /> Export Excel
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="card-elevated p-8 text-center text-sm text-muted-foreground">Tidak ada data.</p>
      ) : (
        <div className="card-elevated overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-table-head text-table-head-foreground">
                <th className="px-4 py-3 text-left font-semibold">RM</th>
                <th className="px-4 py-3 text-left font-semibold">Kategori</th>
                {canEdit && <th className="px-4 py-3 text-left font-semibold">RKA</th>}
                <th className="px-4 py-3 text-right font-semibold">Nilai RKA</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">{periods.tgl1 || "tgl 1"}</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">{periods.tgl2 || "tgl 2"}</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">{periods.tgl3 || "tgl 3"}</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">{periods.tgl4 || "tgl 4"}</th>
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
                      <td className="whitespace-nowrap px-4 py-2.5">{r.kategori}</td>
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
            <Label htmlFor="edc-rm">Nama RM</Label>
            <Input
              id="edc-rm"
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