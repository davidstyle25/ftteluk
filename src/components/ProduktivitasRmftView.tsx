import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Download, TrendingDown, TrendingUp } from "lucide-react";
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

type Row = {
  id: number;
  rm: string | null;
  dpk: string | null;
  tgl1: string | null;
  tgl2: string | null;
  tgl3: string | null;
  tgl4: string | null;
  rka: string | null;
  rka_bulan: string | null;
};

const DPK_ORDER = ["Giro", "Tabungan", "Deposito"] as const;

const MONTHS = [
  { key: "jan", label: "Jan" },
  { key: "feb", label: "Feb" },
  { key: "mar", label: "Mar" },
  { key: "apr", label: "Apr" },
  { key: "mei", label: "Mei" },
  { key: "jun", label: "Jun" },
  { key: "jul", label: "Jul" },
  { key: "agu", label: "Ags" },
  { key: "sep", label: "Sep" },
  { key: "okt", label: "Okt" },
  { key: "nov", label: "Nov" },
  { key: "des", label: "Des" },
] as const;

/** Nama RM tanpa awalan PN, mis. "00135655 - David Kurniawan" -> "David Kurniawan". */
function rmName(rm: string | null): string {
  const s = String(rm ?? "").trim();
  return (s.includes(" - ") ? s.split(" - ").slice(1).join(" - ") : s).trim().toLowerCase();
}

/** Label bulan dari key, mis. "jan" -> "Jan". */
function monthLabel(key: string | null): string {
  if (key === "manual") return "Manual";
  const found = MONTHS.find((m) => m.key === key);
  return found?.label ?? "";
}

/** Tabel sumber RKA berdasarkan jenis DPK. */
function rkaTable(dpk: string | null): string | null {
  const d = String(dpk ?? "").toLowerCase();
  if (d === "tabungan") return "rka_tabungan";
  if (d === "giro") return "rka_giro";
  if (d === "deposito") return "rka_deposito";
  return null;
}

/** Sumber data per tombol aksi di toolbar. */
type Source = {
  key: string;
  label: string;
  tone: string;
  table: string;
  pnColumn: string;
  valueColumn: string;
  dpk: (typeof DPK_ORDER)[number];
  target: "tgl1" | "tgl2" | "tgl3" | "tgl4";
};

const SOURCES: Source[] = [
  { key: "giro1", label: "GIRO YTD", tone: "bg-action-2", table: "data_di321_data1", pnColumn: "pn_rm_dana", valueColumn: "balance", dpk: "Giro", target: "tgl1" },
  { key: "giro2", label: "GIRO MTD", tone: "bg-action-3", table: "data_di321_data2", pnColumn: "pn_rm_dana", valueColumn: "balance", dpk: "Giro", target: "tgl2" },
  { key: "giro3", label: "GIRO DTD", tone: "bg-action-4", table: "data_di321_data3", pnColumn: "pn_rm_dana", valueColumn: "balance", dpk: "Giro", target: "tgl3" },
  { key: "tab1", label: "TAB YTD", tone: "bg-action-5", table: "data_di319_data1", pnColumn: "pn_rm_dana_mantri", valueColumn: "balance", dpk: "Tabungan", target: "tgl1" },
  { key: "tab2", label: "TAB MTD", tone: "bg-action-6", table: "data_di319_data2", pnColumn: "pn_rm_dana_mantri", valueColumn: "balance", dpk: "Tabungan", target: "tgl2" },
  { key: "tab3", label: "TAB DTD", tone: "bg-action-7", table: "data_di319_data3", pnColumn: "pn_rm_dana_mantri", valueColumn: "balance", dpk: "Tabungan", target: "tgl3" },
  { key: "dep1", label: "DEPO YTD", tone: "bg-action-8", table: "data_depo_data1", pnColumn: "pn_rm_dana", valueColumn: "principal_amount", dpk: "Deposito", target: "tgl1" },
  { key: "dep2", label: "DEPO MTD", tone: "bg-action-9", table: "data_depo_data2", pnColumn: "pn_rm_dana", valueColumn: "principal_amount", dpk: "Deposito", target: "tgl2" },
  { key: "dep3", label: "DEPO DTD", tone: "bg-action-4", table: "data_depo_data3", pnColumn: "pn_rm_dana", valueColumn: "principal_amount", dpk: "Deposito", target: "tgl3" },
  { key: "giro4", label: "GIRO KEMARIN", tone: "bg-action-2", table: "data_di321_data4", pnColumn: "pn_rm_dana", valueColumn: "balance", dpk: "Giro", target: "tgl4" },
  { key: "tab4", label: "TAB KEMARIN", tone: "bg-action-5", table: "data_di319_data4", pnColumn: "pn_rm_dana_mantri", valueColumn: "balance", dpk: "Tabungan", target: "tgl4" },
  { key: "dep4", label: "DEPO KEMARIN", tone: "bg-action-8", table: "data_depo_data4", pnColumn: "pn_rm_dana", valueColumn: "principal_amount", dpk: "Deposito", target: "tgl4" },
];

function num(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number) {
  return n.toLocaleString("id-ID");
}

/** PN pengelola diambil dari awalan kolom RM, mis. "00280983 - Nama". */
function pnOf(rm: string | null) {
  const s = String(rm ?? "").trim();
  const pn = s.split("-")[0]!.trim();
  return pn;
}

async function sumByPn(table: string, pnColumn: string, valueColumn: string) {
  const map = new Map<string, number>();
  const size = 1000;
  for (let page = 0; page < 60; page += 1) {
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(table as any)
      .select(`${pnColumn},${valueColumn}`)
      .range(page * size, page * size + size - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    for (const r of rows) {
      // Relasikan berdasarkan PN (angka sebelum "-"), konsisten dengan pnOf(rm).
      const pn = pnOf(String(r[pnColumn] ?? ""));
      if (!pn) continue;
      map.set(pn, (map.get(pn) ?? 0) + num(r[valueColumn]));
    }
    if (rows.length < size) break;
  }
  return map;
}

export function ProduktivitasRmftView({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
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
    const { data, error } = await supabase
      .from("data_produktivitas_rmft")
      .select("id,rm,dpk,tgl1,tgl2,tgl3,tgl4,rka,rka_bulan")
      .order("id");
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }, []);

  /** Ambil periode (tgl) dari tabel sumber DI319/DI321 untuk header kolom. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fetchPeriode = async (table: string): Promise<string> => {
        const { data, error } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(table as any)
          .select("periode")
          .limit(1);
        if (error) return "";
        const rowsData = (data ?? []) as unknown as Record<string, unknown>[];
        return String(rowsData[0]?.["periode"] ?? "");
      };
      const [p1, p2, p3, p4] = await Promise.all([
        fetchPeriode("data_di319_data1"),
        fetchPeriode("data_di319_data2"),
        fetchPeriode("data_di319_data3"),
        fetchPeriode("data_di319_data4"),
      ]);
      if (!cancelled) setPeriods({ tgl1: p1, tgl2: p2, tgl3: p3, tgl4: p4 });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const key = String(r.rm ?? "-");
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()].map(([rm, items]) => ({
      rm,
      items: [...items].sort(
        (a, b) =>
          DPK_ORDER.indexOf(String(a.dpk) as never) - DPK_ORDER.indexOf(String(b.dpk) as never),
      ),
    }));
  }, [rows]);

  async function addRm() {
    const rm = rmValue.trim();
    if (!rm) {
      toast.error("Nama RM wajib diisi.");
      return;
    }
    const payload = DPK_ORDER.map((dpk) => ({ rm, dpk, tgl1: "0", tgl2: "0", tgl3: "0", tgl4: "0" }));
    const { error } = await supabase.from("data_produktivitas_rmft").insert(payload as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("RM ditambahkan.");
    setAddOpen(false);
    setRmValue("");
    void load();
  }

  async function deleteRm(rm: string) {
    const { error } = await supabase.from("data_produktivitas_rmft").delete().eq("rm", rm);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("RM dihapus.");
    void load();
  }

  async function runSource(src: Source) {
    setBusy(src.key);
    try {
      const sums = await sumByPn(src.table, src.pnColumn, src.valueColumn);
      const targets = rows.filter((r) => String(r.dpk) === src.dpk);
      if (!targets.length) {
        toast.error(`Belum ada baris ${src.dpk}.`);
        return;
      }
      for (const r of targets) {
        const value = sums.get(pnOf(r.rm)) ?? 0;
        const patch = { [src.target]: String(value) };
        const { error } = await supabase
          .from("data_produktivitas_rmft")
          .update(patch as never)
          .eq("id", r.id);
        if (error) throw new Error(error.message);
      }
      toast.success(`${src.label} selesai.`);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses data.");
    } finally {
      setBusy(null);
    }
  }

  /** Ambil nilai RKA (tabungan/giro) per nama RM untuk bulan tertentu. */
  async function fetchRkaByRm(table: string, monthKey: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(table as any)
      .select(`rm,${monthKey}`);
    if (error) throw new Error(error.message);
    const rowsData = (data ?? []) as unknown as Record<string, unknown>[];
    for (const r of rowsData) {
      const key = rmName(r["rm"] as string | null);
      if (!key) continue;
      const val = r[monthKey];
      if (val === null || val === undefined || val === "") continue;
      map.set(key, String(val));
    }
    return map;
  }

  /** Saat bulan RKA dipilih untuk sebuah baris DPK, isi kolom RKA dari rka_tabungan/rka_giro. */
  async function selectRkaMonth(row: Row, monthKey: string) {
    const table = rkaTable(row.dpk);
    if (!table) {
      toast.error(`RKA tidak tersedia untuk DPK ${row.dpk}.`);
      return;
    }
    setBusy(`rka-${row.id}`);
    try {
      const map = await fetchRkaByRm(table, monthKey);
      const value = map.get(rmName(row.rm));
      if (value === undefined) {
        toast.error(`Nilai RKA tidak ditemukan untuk ${rmName(row.rm)}.`);
      }
      const { error } = await supabase
        .from("data_produktivitas_rmft")
        .update({ rka: value ?? "", rka_bulan: monthKey } as never)
        .eq("id", row.id);
      if (error) throw new Error(error.message);
      if (value !== undefined) toast.success(`RKA ${monthKey.toUpperCase()} dimuat.`);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat RKA.");
    } finally {
      setBusy(null);
    }
  }

  function exportExcel() {
    exportTableCsv(
      rows.map((r) => ({
        RM: r.rm,
        DPK: r.dpk,
        RKA: r.rka ?? "",
        "RKA Bulan": r.rka_bulan ?? "",
        "tgl 1": num(r.tgl1),
        "tgl 2": num(r.tgl2),
        "tgl 3": num(r.tgl3),
        "tgl 4": num(r.tgl4),
        MTD: num(r.tgl3) - num(r.tgl2),
        YTD: num(r.tgl3) - num(r.tgl1),
      })) as unknown as Record<string, unknown>[],
      "produktivitas_rmft.xlsx",
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-lg font-bold tracking-tight">PRODUKTIVITAS RMFT</h2>
        {canEdit && (
          <Button className="bg-action-1 text-action-foreground hover:opacity-90" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 size-4" /> Tambah RM
          </Button>
        )}
        {canEdit &&
          SOURCES.map((s) => (
            <Button
              key={s.key}
              disabled={busy !== null}
              onClick={() => runSource(s)}
              className={cn(s.tone, "text-action-foreground hover:opacity-90")}
            >
              {busy === s.key ? "Memproses…" : s.label}
            </Button>
          ))}
        <Button variant="secondary" onClick={exportExcel}>
          <Download className="mr-1.5 size-4" /> Export Excel
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
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
                <th className="px-4 py-3 text-right font-semibold">
                  {periods.tgl1 || "tgl 1"}
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  {periods.tgl2 || "tgl 2"}
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  {periods.tgl3 || "tgl 3"}
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  {periods.tgl4 || "tgl 4"}
                </th>
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
                  tgl1: acc.tgl1 + num(r.tgl1),
                  tgl2: acc.tgl2 + num(r.tgl2),
                  tgl3: acc.tgl3 + num(r.tgl3),
                  tgl4: acc.tgl4 + num(r.tgl4),
                  rka: acc.rka + num(r.rka),
                }),
                { tgl1: 0, tgl2: 0, tgl3: 0, tgl4: 0, rka: 0 },
              );
              return (
                <tbody key={g.rm} className="border-t-4 border-background">
                  {g.items.map((r, i) => (
                    <tr key={r.id} className="border-t">
                      {i === 0 && (
                        <td rowSpan={g.items.length + 1} className="px-4 py-2.5 align-top font-medium">
                          {g.rm}
                        </td>
                      )}
                      <td className="whitespace-nowrap px-4 py-2.5">{r.dpk}</td>
                      {canEdit && (
                        <td className="whitespace-nowrap px-4 py-2.5">
                          {rkaTable(r.dpk) ? (
                            <select
                              value={r.rka_bulan ?? ""}
                              disabled={busy === `rka-${r.id}`}
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
                          ) : (
                            <span className="text-muted-foreground">–</span>
                          )}
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
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmt(num(r.tgl1))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmt(num(r.tgl2))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmt(num(r.tgl3))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmt(num(r.tgl4))}</td>
                      {deltaCell(num(r.tgl3) - num(r.tgl4))}
                      {deltaCell(num(r.tgl3) - num(r.tgl2))}
                      {deltaCell(num(r.tgl3) - num(r.tgl1))}
                      {deltaCell(num(r.tgl3) - num(r.rka))}
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
            <Label htmlFor="rm">Nama RM</Label>
            <Input
              id="rm"
              value={rmValue}
              onChange={(e) => setRmValue(e.target.value)}
              placeholder="00280983 - Nama RM"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Batal
            </Button>
            <Button onClick={addRm}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
