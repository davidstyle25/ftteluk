import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Save, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CFG,
  EDC_PRODUK_KEY,
  calcRow,
  calcTotal,
  formatPosisi,
  parseCfg,
  resolveHeader,
  type EdcCalc,
  type EdcProdukCfg,
  type EdcRow,
} from "@/lib/edc-produktif";

// Warna header per kolom (mengikuti tabel di sheet).
const HEAD_BG = [
  "#A9E8E3", // NO
  "#A9E8E3", // BO TELUK BETUNG
  "#A9E8E3", // POPULASI
  "#FFFF00", // RKA
  "#00B050", // SUDAH PRODUKTIF
  "#FFE0A3", // EDC PRODUKTIF tgl terbaru
  "#8496B0", // TOTAL PRODUKTIF
  "#FFFF00", // GAP THD RKA
  "#FFFF00", // % THD RKA
  "#00B050", // GAP THD RKA 110%
  "#00B050", // % THD RKA 110%
  "#00B050", // Aspirasi 110%
];

const fmt = (v: number, max = 0, min = 0) =>
  v.toLocaleString("en-US", { minimumFractionDigits: min, maximumFractionDigits: max });

// Statistik EDC (sama dengan kartu di atas tabel): Total EDC, EDC Produktif, dan tanggal posisi data.
type EdcStats = { total: number; produktif: number; posisi: string | null };

type Counts = { value: string | null; count: number | string }[];
// RPC field_value_counts belum ada di types.ts hasil generate -> longgarkan tipe.
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

async function loadStats(): Promise<EdcStats> {
  const [tot, st, pos] = await Promise.all([
    supabase.from("data_edc").select("*", { count: "exact", head: true }),
    rpc("field_value_counts", { _table: "data_edc", _field: "status_edc" }),
    rpc("field_value_counts", { _table: "data_edc", _field: "posisi" }),
  ]);
  const statusRows = (st.data ?? []) as Counts;
  const produktif = statusRows
    .filter((r) => (r.value ?? "").trim().toLowerCase() === "produktif")
    .reduce((sum, r) => sum + Number(r.count), 0);
  // Tanggal posisi = nilai posisi yang paling banyak muncul (data EDC biasanya satu tanggal saja).
  const posRows = ((pos.data ?? []) as Counts).filter((r) => (r.value ?? "").trim() !== "");
  posRows.sort((a, b) => Number(b.count) - Number(a.count));
  return {
    total: tot.count ?? 0,
    produktif,
    posisi: formatPosisi(posRows[0]?.value ?? null),
  };
}

const rawText = (v: number | null) => (v == null ? "" : String(Math.round(v * 1e6) / 1e6));

// Sel angka yang bisa diedit: tampil terformat, saat fokus tampil angka mentah.
function NumInput({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const cancelled = useRef(false);

  function finish() {
    if (cancelled.current) {
      cancelled.current = false;
      setText(null);
      return;
    }
    if (text === null) return;
    const cleaned = text.replace(/[\s,]/g, "");
    setText(null);
    if (cleaned === rawText(value)) return;
    if (cleaned === "") {
      onCommit(null);
      return;
    }
    const num = Number(cleaned);
    if (Number.isFinite(num)) onCommit(num);
    else toast.error("Isi harus berupa angka.");
  }

  return (
    <input
      inputMode="decimal"
      value={text ?? (value == null ? "" : fmt(value, 2))}
      onFocus={(e) => {
        setText(rawText(value));
        e.currentTarget.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      className="w-full bg-transparent px-2 py-2 text-center outline-none focus:bg-background"
    />
  );
}

// Judul kolom yang bisa diedit. Saat diketik tampil teks mentah (termasuk {posisi});
// setelah selesai (klik di luar) tampil hasilnya, mis. "... S/D 20 SEPTEMBER 2026".
function HeaderEditor({
  value,
  resolved,
  onChange,
}: {
  value: string;
  resolved: string;
  onChange: (v: string) => void;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <textarea
      value={focus ? value : resolved}
      rows={3}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-none bg-transparent px-2 py-2 text-center text-[8pt] font-bold leading-tight text-black outline-none focus:bg-white/50"
    />
  );
}

// Sel hasil hitung: merah muda bila di bawah target, hijau bila sudah tercapai (seperti sheet).
function CalcCell({ value, text }: { value: number; text: string }) {
  const bad = value < 0;
  return (
    <td
      className={cn(
        "border border-black/70 px-2 py-2 text-center tabular-nums",
        bad ? "bg-[#FFC7CE] text-[#9C0006]" : "bg-[#C6EFCE] text-[#006100]",
      )}
    >
      {text}
    </td>
  );
}

function ResultCells({ c }: { c: EdcCalc }) {
  return (
    <>
      <td className="border border-black/70 px-2 py-2 text-center font-semibold tabular-nums">
        {fmt(c.total, 2)}
      </td>
      <CalcCell value={c.gapRka} text={fmt(c.gapRka, 2)} />
      <CalcCell value={c.gapRka} text={`${fmt(c.pctRka, 2, 2)}%`} />
      <CalcCell value={c.gap110} text={fmt(c.gap110, 2)} />
      <CalcCell value={c.gap110} text={`${fmt(c.pct110, 0)}%`} />
      <td className="border border-black/70 px-2 py-2 text-center tabular-nums">{fmt(c.aspirasi, 0)}</td>
    </>
  );
}

/** Tabel EDC PRODUKTIF: judul & isi bisa diedit admin, kolom hasil dihitung otomatis. */
export function EdcProduktifTable({ canEdit }: { canEdit: boolean }) {
  const [cfg, setCfg] = useState<EdcProdukCfg>(DEFAULT_CFG);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<EdcStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadStats()
      .then((r) => {
        if (!cancelled) setStats(r);
      })
      .catch(() => {
        if (!cancelled) setStats({ total: 0, produktif: 0, posisi: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("settings")
      .select("value")
      .eq("key", EDC_PRODUK_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.value) setCfg(parseCfg(data.value));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Baris "otomatis": Populasi = Total EDC, Sudah Produktif = EDC Produktif (dari statistik data EDC).
  const effRows = useMemo(
    () =>
      cfg.rows.map((r) =>
        r.auto ? { ...r, populasi: stats?.total ?? 0, sudah: stats?.produktif ?? 0 } : r,
      ),
    [cfg.rows, stats],
  );
  const calcs = useMemo(() => effRows.map(calcRow), [effRows]);
  const total = useMemo(() => calcTotal(effRows), [effRows]);

  function patch(next: Partial<EdcProdukCfg>) {
    setCfg((c) => ({ ...c, ...next }));
    setDirty(true);
  }
  function setHeader(i: number, v: string) {
    patch({ headers: cfg.headers.map((h, idx) => (idx === i ? v : h)) });
  }
  function setRow(i: number, p: Partial<EdcRow>) {
    patch({ rows: cfg.rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)) });
  }
  function addRow() {
    patch({ rows: [...cfg.rows, { nama: "", populasi: null, rka: null, sudah: null, edc: null, auto: false }] });
  }
  function removeRow(i: number) {
    patch({ rows: cfg.rows.filter((_, idx) => idx !== i) });
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("settings")
      .upsert(
        { key: EDC_PRODUK_KEY, value: JSON.stringify(cfg), updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Tabel EDC Produktif disimpan.");
    setDirty(false);
  }

  const cell = "border border-black/70";
  const colCount = 12 + (canEdit ? 1 : 0);

  return (
    <section className="mb-6 overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
        {canEdit ? (
          <input
            value={cfg.title}
            onChange={(e) => patch({ title: e.target.value })}
            className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none focus:bg-background"
          />
        ) : (
          <h3 className="text-base font-bold">{cfg.title}</h3>
        )}
        {canEdit && (
          <div className="flex items-center gap-2">
            {dirty && <span className="text-xs text-amber-600">Belum disimpan</span>}
            <Button size="sm" variant="outline" onClick={addRow}>
              <Plus className="mr-1 h-4 w-4" /> Tambah baris
            </Button>
            <Button size="sm" onClick={save} disabled={!dirty || saving}>
              <Save className="mr-1 h-4 w-4" /> {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr>
              {cfg.headers.map((h, i) => (
                <th
                  key={i}
                  className={cn(cell, "p-0 align-middle font-bold text-black", i === 0 && "w-12")}
                  style={{ backgroundColor: HEAD_BG[i] }}
                >
                  {canEdit ? (
                    <HeaderEditor
                      value={h}
                      resolved={resolveHeader(h, stats ? (stats.posisi ?? "-") : null)}
                      onChange={(v) => setHeader(i, v)}
                    />
                  ) : (
                    <span className="block whitespace-pre-line px-2 py-3 text-[8pt] leading-tight">
                      {resolveHeader(h, stats ? (stats.posisi ?? "-") : null)}
                    </span>
                  )}
                </th>
              ))}
              {canEdit && <th className={cn(cell, "w-16 bg-muted/40")} />}
            </tr>
          </thead>
          <tbody>
            {cfg.rows.map((r, i) => (
              <tr key={i}>
                <td className={cn(cell, "px-2 py-2 text-center")}>{i + 1}</td>
                <td className={cell}>
                  {canEdit ? (
                    <input
                      value={r.nama}
                      onChange={(e) => setRow(i, { nama: e.target.value })}
                      className="w-full bg-transparent px-2 py-2 outline-none focus:bg-background"
                    />
                  ) : (
                    <span className="block px-2 py-2">{r.nama}</span>
                  )}
                </td>
                {(["populasi", "rka", "sudah", "edc"] as const).map((k) => (
                  <td
                    key={k}
                    className={cn(cell, r.auto && (k === "populasi" || k === "sudah") && "bg-sky-50")}
                    title={r.auto && (k === "populasi" || k === "sudah") ? "Otomatis dari statistik EDC" : undefined}
                  >
                    {r.auto && (k === "populasi" || k === "sudah") ? (
                      <span className="block px-2 py-2 text-center tabular-nums">
                        {stats ? fmt(effRows[i]![k] ?? 0, 2) : "…"}
                      </span>
                    ) : canEdit ? (
                      <NumInput value={r[k]} onCommit={(v) => setRow(i, { [k]: v } as Partial<EdcRow>)} />
                    ) : (
                      <span className="block px-2 py-2 text-center tabular-nums">
                        {r[k] == null ? "" : fmt(r[k] as number, 2)}
                      </span>
                    )}
                  </td>
                ))}
                <ResultCells c={calcs[i]!} />
                {canEdit && (
                  <td className={cn(cell, "whitespace-nowrap px-1 text-center")}>
                    <button
                      type="button"
                      onClick={() => setRow(i, { auto: !r.auto })}
                      className={cn(
                        "p-1 hover:text-primary",
                        r.auto ? "text-primary" : "text-muted-foreground",
                      )}
                      title={
                        r.auto
                          ? "Populasi & Sudah Produktif otomatis dari statistik EDC (klik untuk isi manual)"
                          : "Klik agar Populasi & Sudah Produktif otomatis dari statistik EDC"
                      }
                      aria-label="Otomatis dari statistik EDC"
                    >
                      <Zap className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Hapus baris"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {cfg.rows.length > 1 && (
              <tr className="bg-muted/50 font-bold">
                <td className={cn(cell, "px-2 py-2")} colSpan={2}>
                  TOTAL
                </td>
                <td className={cn(cell, "px-2 py-2 text-center tabular-nums")}>{fmt(total.populasi, 2)}</td>
                <td className={cn(cell, "px-2 py-2 text-center tabular-nums")}>{fmt(total.rka, 2)}</td>
                <td className={cn(cell, "px-2 py-2 text-center tabular-nums")}>{fmt(total.sudah, 2)}</td>
                <td className={cn(cell, "px-2 py-2 text-center tabular-nums")}>{fmt(total.edc, 2)}</td>
                <ResultCells c={total} />
                {canEdit && <td className={cell} />}
              </tr>
            )}
            {cfg.rows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="p-6 text-center text-sm text-muted-foreground">
                  Belum ada baris.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          Judul, nama kolom, dan angka bisa diedit. Baris dengan ikon petir (biru): Populasi = Total EDC dan
          Sudah Produktif = EDC Produktif diambil otomatis dari statistik data EDC; klik ikon petir untuk
          mengisinya manual. Tulis {"{posisi}"} (dengan kurung kurawal) di judul kolom agar tanggalnya otomatis dari
          kolom Posisi data EDC; klik di luar kotak untuk melihat hasilnya. Kolom Total, Gap, %, dan Aspirasi dihitung otomatis. Jangan lupa klik Simpan.
        </p>
      )}
    </section>
  );
}