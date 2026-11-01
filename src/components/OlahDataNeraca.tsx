import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Olah Data Neraca: import GI405 (Excel) -> ringkasan TAB / GIRO / DEPO per Ritel & Mikro
// (dalam juta rupiah) per tanggal. Hasil disimpan di tabel settings (tanpa tabel baru).
// ---------------------------------------------------------------------------

const KEY = "ui_olah_neraca";
const RITEL_BRANCH = new Set([285, 1544]);

type Prod = "tab" | "giro" | "depo";
type Seg = "ritel" | "mikro";
type DayVals = Record<`${Seg}_${Prod}`, number>;
type Store = {
  v: 1;
  days: Record<string, DayVals>; // "2026-10-30" -> nilai (juta rupiah)
  rka: Record<string, Partial<DayVals>>; // "2026-10" / "2026-12" -> RKA
};

const PRODS: { id: Prod; label: string; desc: string }[] = [
  { id: "tab", label: "TAB", desc: "tabungan" },
  { id: "giro", label: "GIRO", desc: "giro - pihak ke iii" },
  { id: "depo", label: "DEPO", desc: "deposito berjangka" },
];

const BULAN = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
const BULAN_KECIL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sept", "Okt", "Nov", "Des"];

const emptyStore = (): Store => ({ v: 1, days: {}, rka: {} });

function parseStore(raw: unknown): Store {
  try {
    const o = JSON.parse(String(raw ?? ""));
    if (o && o.v === 1 && o.days && o.rka) return o as Store;
  } catch {
    /* abaikan */
  }
  return emptyStore();
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** "30/10/2026" | Date | serial Excel -> "2026-10-30" */
function parsePeriode(v: unknown): string | null {
  if (v instanceof Date) return iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if (typeof v === "number" && v > 20000) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return iso(Number(m[3]), Number(m[2]), Number(m[1]));
  m = s.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}

const toNum = (v: unknown) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const norm = (h: unknown) => String(h ?? "").replace(/\s+/g, " ").trim().toUpperCase();

/**
 * Hitung ringkasan dari baris GI405.
 * - Nilai baris: mata uang IDR -> ENDING BALANCE; valas -> EQUIVALENTS IDR.
 * - Tiap description hanya diambil satu level supaya nominal yang sama tidak terhitung dua kali:
 *   *TOTAL1 bila ada, selain itu *POST.
 * - Ritel = branch 285 dan 1544; Mikro = branch lainnya. Saldo kewajiban (negatif) dibalik jadi positif.
 */
function summarize(rows: Record<string, unknown>[]): { date: string; vals: DayVals } {
  let date: string | null = null;
  type R = { desc: string; lvl: string; branch: number; val: number };
  const list: R[] = [];
  for (const raw of rows) {
    const r: Record<string, unknown> = {};
    for (const k of Object.keys(raw)) r[norm(k)] = raw[k];
    if (!date) date = parsePeriode(r["PERIODE"]);
    const desc = String(r["DESCRIPTION"] ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    if (!PRODS.some((p) => p.desc === desc)) continue;
    const cur = String(r["CURRENCY"] ?? "").trim().toUpperCase();
    const val = cur === "IDR" ? toNum(r["ENDING BALANCE"]) : toNum(r["EQUIVALENTS IDR"]);
    list.push({
      desc,
      lvl: String(r["POSTING CONTROL"] ?? "").trim().toUpperCase(),
      branch: Number(r["BRANCH"]),
      val,
    });
  }
  if (!date) throw new Error("Kolom PERIODE tidak terbaca. Pastikan ini file GI405.");
  if (list.length === 0) throw new Error("Tidak ada baris Tabungan / Giro - Pihak ke III / Deposito Berjangka.");

  const vals = {} as DayVals;
  for (const p of PRODS) {
    const x = list.filter((r) => r.desc === p.desc);
    const lvl = x.some((r) => r.lvl === "*TOTAL1") ? "*TOTAL1" : "*POST";
    const use = x.filter((r) => r.lvl === lvl);
    const sum = (ritel: boolean) =>
      use.filter((r) => RITEL_BRANCH.has(r.branch) === ritel).reduce((a, r) => a + r.val, 0);
    vals[`ritel_${p.id}`] = Math.round((-sum(true) / 1e6) * 1000) / 1000;
    vals[`mikro_${p.id}`] = Math.round((-sum(false) / 1e6) * 1000) / 1000;
  }
  return { date, vals };
}

const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? "-" : Math.round(n).toLocaleString("en-US");
const fmtPct = (n: number | null) => (n === null ? "-" : `${(n * 100).toFixed(2)}%`);

const dayLabel = (d: string) => {
  const [, m, dd] = d.split("-");
  return `${Number(dd)} ${BULAN_KECIL[Number(m) - 1]}`;
};

const sub = (a: number | null, b: number | null) => (a === null || b === null ? null : a - b);

type Line = {
  id: string;
  label: string;
  kind: "total" | "leaf";
  seg: Seg | "kons";
  prod?: Prod;
};
const LINES: Line[] = [
  { id: "kons", label: "KONSOLIDASI", kind: "total", seg: "kons" },
  { id: "ritel", label: "RITEL", kind: "total", seg: "ritel" },
  { id: "ritel_tab", label: "TAB", kind: "leaf", seg: "ritel", prod: "tab" },
  { id: "ritel_giro", label: "GIRO", kind: "leaf", seg: "ritel", prod: "giro" },
  { id: "ritel_depo", label: "DEPO", kind: "leaf", seg: "ritel", prod: "depo" },
  { id: "mikro", label: "MIKRO", kind: "total", seg: "mikro" },
  { id: "mikro_tab", label: "TAB", kind: "leaf", seg: "mikro", prod: "tab" },
  { id: "mikro_giro", label: "GIRO", kind: "leaf", seg: "mikro", prod: "giro" },
  { id: "mikro_depo", label: "DEPO", kind: "leaf", seg: "mikro", prod: "depo" },
];

/** Nilai satu baris pada satu set nilai harian / RKA (total = jumlah anak). */
function lineValue(line: Line, v: Partial<DayVals> | undefined): number | null {
  if (!v) return null;
  const get = (seg: Seg, prod: Prod) => v[`${seg}_${prod}`];
  if (line.kind === "leaf") return get(line.seg as Seg, line.prod!) ?? null;
  const segs: Seg[] = line.seg === "kons" ? ["ritel", "mikro"] : [line.seg];
  let total = 0;
  let any = false;
  for (const s of segs)
    for (const p of PRODS) {
      const x = get(s, p.id);
      if (x !== undefined && x !== null) {
        total += x;
        any = true;
      }
    }
  return any ? total : null;
}

const colorDelta = (n: number | null) =>
  n === null ? "" : n < 0 ? "bg-red-400/90 text-red-950" : n > 0 ? "bg-green-400/80 text-green-950" : "";
const colorPct = (n: number | null) =>
  n === null ? "" : n < 1 ? "bg-red-300/80 text-red-950" : "bg-green-300/80 text-green-950";

export function OlahDataNeraca({ isAdmin }: { isAdmin: boolean }) {
  const [store, setStore] = useState<Store>(emptyStore());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("settings").select("value").eq("key", KEY).maybeSingle();
    setStore(parseStore(data?.value));
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function save(next: Store) {
    setStore(next);
    const { error } = await supabase
      .from("settings")
      .upsert(
        { key: KEY, value: JSON.stringify(next), updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) toast.error(`Gagal menyimpan: ${error.message}`);
  }

  async function onFile(file: File) {
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]!];
      if (!ws) throw new Error("Sheet tidak ditemukan.");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
      const { date, vals } = summarize(rows);
      await save({ ...store, days: { ...store.days, [date]: vals } });
      toast.success(`Data ${dayLabel(date)} ${date.slice(0, 4)} berhasil diimport.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import gagal.");
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function removeDay(d: string) {
    const days = { ...store.days };
    delete days[d];
    await save({ ...store, days });
  }

  async function setRka(period: string, seg: Seg, prod: Prod, text: string) {
    const n = text.trim() === "" ? undefined : toNum(text);
    const cur = { ...(store.rka[period] ?? {}) };
    if (n === undefined) delete cur[`${seg}_${prod}`];
    else cur[`${seg}_${prod}`] = n;
    await save({ ...store, rka: { ...store.rka, [period]: cur } });
  }

  // ---- kolom tanggal: DES tahun lalu, akhir bulan lalu, dan 3 tanggal terakhir ----
  const dates = Object.keys(store.days).sort();
  const last3 = dates.slice(-3);
  const latest = dates[dates.length - 1] ?? null;
  const prev = dates.length >= 2 ? dates[dates.length - 2]! : null;
  let yearEnd: string | null = null;
  let monthEnd: string | null = null;
  let yearEndLabel = "DES";
  let monthEndLabel = "Bulan lalu";
  let rkaMonthKey = "";
  let rkaYearKey = "";
  let monthLabel = "BLN";
  if (latest) {
    const y = Number(latest.slice(0, 4));
    const m = Number(latest.slice(5, 7));
    // tanggal terakhir yang <= akhir periode pembanding
    const upTo = (limit: string) => [...dates].reverse().find((d) => d <= limit) ?? null;
    yearEnd = upTo(iso(y - 1, 12, 31));
    const lastDayPrevMonth = new Date(y, m - 1, 0);
    monthEnd = upTo(iso(lastDayPrevMonth.getFullYear(), lastDayPrevMonth.getMonth() + 1, lastDayPrevMonth.getDate()));
    // jangan pakai tanggal yang sama dengan bulan berjalan
    if (monthEnd && monthEnd.slice(0, 7) === latest.slice(0, 7)) monthEnd = null;
    if (yearEnd && yearEnd.slice(0, 4) === latest.slice(0, 4)) yearEnd = null;
    yearEndLabel = `DES ${String(y - 1).slice(2)}`;
    monthEndLabel = dayLabel(iso(lastDayPrevMonth.getFullYear(), lastDayPrevMonth.getMonth() + 1, lastDayPrevMonth.getDate()));
    rkaMonthKey = `${y}-${pad(m)}`;
    rkaYearKey = `${y}-12`;
    monthLabel = BULAN[m - 1]!;
  }
  const val = (d: string | null) => (d ? store.days[d] : undefined);
  const [showRkaInput, setShowRkaInput] = useState(false);

  // Kolom yang tidak punya data disembunyikan.
  const recent = [0, 1, 2].map((i) => last3[last3.length - 3 + i] ?? null).filter((d): d is string => d !== null);
  const dateCols: { d: string; label: string }[] = [];
  if (yearEnd) dateCols.push({ d: yearEnd, label: yearEndLabel });
  if (monthEnd) dateCols.push({ d: monthEnd, label: monthEndLabel });
  for (const d of recent) if (d !== yearEnd && d !== monthEnd) dateCols.push({ d, label: dayLabel(d) });
  const hasRkaM = LINES.some((l) => lineValue(l, store.rka[rkaMonthKey]) !== null);
  const hasRkaY = LINES.some((l) => lineValue(l, store.rka[rkaYearKey]) !== null);
  const showRkaM = hasRkaM || (isAdmin && showRkaInput);
  const showRkaY = hasRkaY || (isAdmin && showRkaInput);
  const showYtd = !!yearEnd;
  const showMtd = !!monthEnd;
  const showH1 = !!prev;
  const nRka = (showRkaM ? 1 : 0) + (showRkaY ? 1 : 0);
  const nThd = (hasRkaM ? 1 : 0) + (hasRkaY ? 1 : 0);

  const th = "border border-border px-2 py-1.5 text-center text-xs font-bold whitespace-nowrap";
  const td = "border border-border px-2 py-1 text-right text-sm tabular-nums whitespace-nowrap";
  const thBlue = `${th} bg-blue-200 text-blue-950`;
  const thOrange = `${th} bg-orange-400 text-orange-950`;
  const thYellow = `${th} bg-yellow-300 text-yellow-950`;

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Olah Data Neraca</h2>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            {latest && !hasRkaM && !hasRkaY && (
              <Button size="sm" variant="outline" onClick={() => setShowRkaInput((v) => !v)}>
                {showRkaInput ? "Sembunyikan Input RKA" : "Input RKA"}
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])}
            />
            <Button size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 size-4" />
              {busy ? "Memproses…" : "Import Data GI405 (Excel)"}
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : !latest ? (
        <p className="rounded-lg border bg-card px-4 py-6 text-sm text-muted-foreground">
          Belum ada data. {isAdmin ? "Klik Import Data GI405 dan pilih file Excel GI405." : "Admin perlu mengimport data GI405 lebih dulu."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th rowSpan={2} className={`${th} bg-white`} colSpan={2} />
                  {dateCols.map((c) => (
                    <th key={c.d} rowSpan={2} className={thBlue}>{c.label}</th>
                  ))}
                  {nRka > 0 && <th colSpan={nRka} className={thOrange}>RKA</th>}
                  {showYtd && <th rowSpan={2} className={thYellow}>YTD</th>}
                  {showMtd && <th rowSpan={2} className={thYellow}>MTD</th>}
                  {showH1 && <th rowSpan={2} className={thYellow}>H-1</th>}
                  {nThd > 0 && <th colSpan={nThd} className={thYellow}>THD RKA</th>}
                  {nThd > 0 && <th colSpan={nThd} className={thYellow}>% RKA</th>}
                </tr>
                <tr>
                  {showRkaM && <th className={thOrange}>{monthLabel}</th>}
                  {showRkaY && <th className={thOrange}>DES</th>}
                  {hasRkaM && <th className={thYellow}>{monthLabel}</th>}
                  {hasRkaY && <th className={thYellow}>DES</th>}
                  {hasRkaM && <th className={thYellow}>{monthLabel}</th>}
                  {hasRkaY && <th className={thYellow}>DES</th>}
                </tr>
              </thead>
              <tbody>
                {LINES.map((ln) => {
                  const total = ln.kind === "total";
                  const cur = lineValue(ln, val(latest));
                  const before = lineValue(ln, val(prev));
                  const rkaM = lineValue(ln, store.rka[rkaMonthKey]);
                  const rkaY = lineValue(ln, store.rka[rkaYearKey]);
                  const ytd = sub(cur, lineValue(ln, val(yearEnd)));
                  const mtd = sub(cur, lineValue(ln, val(monthEnd)));
                  const h1 = sub(cur, before);
                  const thdM = sub(cur, rkaM);
                  const thdY = sub(cur, rkaY);
                  const pctM = cur !== null && rkaM ? cur / rkaM : null;
                  const pctY = cur !== null && rkaY ? cur / rkaY : null;
                  const dateBg = total ? "bg-orange-300 font-bold" : "bg-sky-50";
                  const rkaCell = (period: string, v: number | null) =>
                    !total && isAdmin ? (
                      <input
                        key={`${period}-${v}`}
                        defaultValue={v === null ? "" : Math.round(v).toLocaleString("en-US")}
                        inputMode="numeric"
                        onBlur={(e) => {
                          if (e.target.value !== (v === null ? "" : Math.round(v).toLocaleString("en-US")))
                            void setRka(period, ln.seg as Seg, ln.prod!, e.target.value);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        className="w-24 rounded border border-transparent bg-transparent px-1 text-right outline-none hover:border-border focus:border-primary focus:bg-background"
                      />
                    ) : (
                      fmt(v)
                    );
                  return (
                    <tr key={ln.id}>
                      <td
                        colSpan={total ? 2 : 1}
                        className={`border border-border px-2 py-1 text-sm font-bold ${total ? "bg-green-400 text-green-950" : "bg-white"}`}
                      >
                        {total ? ln.label : ""}
                      </td>
                      {!total && <td className="border border-border bg-white px-2 py-1 text-sm">{ln.label}</td>}
                      {dateCols.map((c) => (
                        <td key={c.d} className={`${td} ${dateBg}`}>{fmt(lineValue(ln, val(c.d)))}</td>
                      ))}
                      {showRkaM && <td className={`${td} ${dateBg}`}>{rkaCell(rkaMonthKey, rkaM)}</td>}
                      {showRkaY && <td className={`${td} ${dateBg}`}>{rkaCell(rkaYearKey, rkaY)}</td>}
                      {showYtd && <td className={`${td} ${colorDelta(ytd)}`}>{fmt(ytd)}</td>}
                      {showMtd && <td className={`${td} ${colorDelta(mtd)}`}>{fmt(mtd)}</td>}
                      {showH1 && <td className={`${td} ${colorDelta(h1)}`}>{fmt(h1)}</td>}
                      {hasRkaM && <td className={`${td} ${colorDelta(thdM)}`}>{fmt(thdM)}</td>}
                      {hasRkaY && <td className={`${td} ${colorDelta(thdY)}`}>{fmt(thdY)}</td>}
                      {hasRkaM && <td className={`${td} font-semibold ${colorPct(pctM)}`}>{fmtPct(pctM)}</td>}
                      {hasRkaY && <td className={`${td} font-semibold ${colorPct(pctY)}`}>{fmtPct(pctY)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Dalam juta rupiah. Kolom yang belum punya data tidak ditampilkan. YTD = tanggal terakhir − {yearEndLabel}; MTD =
            tanggal terakhir − {monthEndLabel}; H-1 = tanggal terakhir − tanggal sebelumnya.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Tanggal tersimpan:</span>
            {dates.map((d) => (
              <span key={d} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5">
                {d.split("-").reverse().join("/")}
                {isAdmin && (
                  <button
                    type="button"
                    aria-label={`Hapus ${d}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => void removeDay(d)}
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}