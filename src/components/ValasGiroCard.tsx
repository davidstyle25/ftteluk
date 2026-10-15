import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

// Tabel valas_giro & fungsi compare_valas belum ada di types.ts hasil generate -> longgarkan tipe.
const db = supabase as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: { message: string } | null }>;
};

type Kurs = { id: number; curr: string; kurs: number };

const fmtKurs = (v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 6 });

function parseKurs(text: string): number | null {
  // Terima "18000", "18.000" (ribuan) maupun "18000,5" / "18000.5" (desimal).
  let s = text.trim().replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, "");
  else if (/^\d{1,3}\.\d{3}$/.test(s)) s = s.replace(".", "");
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Sel teks/angka yang bisa diedit; disimpan saat fokus hilang atau Enter. */
function EditCell({
  value,
  readOnly,
  align,
  upper,
  onCommit,
}: {
  value: string;
  readOnly: boolean;
  align: "center" | "right";
  upper?: boolean;
  onCommit: (v: string) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const cancelled = useRef(false);
  const cls = align === "right" ? "text-right" : "text-center";

  if (readOnly) return <span className={`block px-2 py-1 ${cls}`}>{value}</span>;

  return (
    <input
      value={text ?? value}
      onFocus={(e) => {
        setText(value);
        e.currentTarget.select();
      }}
      onChange={(e) => setText(upper ? e.target.value.toUpperCase() : e.target.value)}
      onBlur={() => {
        if (cancelled.current) {
          cancelled.current = false;
          setText(null);
          return;
        }
        const next = text;
        setText(null);
        if (next !== null && next !== value) onCommit(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      className={`w-full rounded border border-transparent bg-transparent px-2 py-1 outline-none hover:border-border focus:border-primary focus:bg-background ${cls}`}
    />
  );
}

/**
 * Tabel kurs VALAS GIRO (CRUD) + tombol "Klik Compare" untuk data DI321.
 * Compare: VLOOKUP kolom CURR ke tabel kurs, balance = balance asli x kurs.
 */
export function ValasGiroCard({
  table,
  isAdmin,
  onCompared,
}: {
  table: string; // tabel DI321 yang sedang dibuka, mis. data_di321_data1
  isAdmin: boolean;
  onCompared: () => void;
}) {
  const [rows, setRows] = useState<Kurs[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCurr, setNewCurr] = useState("");
  const [newKurs, setNewKurs] = useState("");
  const [confirm, setConfirm] = useState<"compare" | "restore" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await db.from("valas_giro").select("id,curr,kurs").order("id");
    if (error) {
      toast.error(`Gagal memuat kurs: ${error.message}`);
      setRows([]);
    } else {
      setRows(
        ((data ?? []) as { id: number; curr: string; kurs: number | string }[]).map((r) => ({
          id: r.id,
          curr: r.curr,
          kurs: Number(r.kurs),
        })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveCurr(row: Kurs, value: string) {
    const curr = value.trim().toUpperCase();
    if (!curr) return toast.error("CURR tidak boleh kosong.");
    const { error } = await db.from("valas_giro").update({ curr }).eq("id", row.id);
    if (error) toast.error(error.message.includes("duplicate") ? `CURR ${curr} sudah ada.` : error.message);
    await load();
  }

  async function saveKurs(row: Kurs, value: string) {
    const kurs = parseKurs(value);
    if (kurs === null) return toast.error("Kurs harus berupa angka.");
    const { error } = await db.from("valas_giro").update({ kurs }).eq("id", row.id);
    if (error) toast.error(error.message);
    await load();
  }

  async function remove(row: Kurs) {
    const { error } = await db.from("valas_giro").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    await load();
  }

  async function add() {
    const curr = newCurr.trim().toUpperCase();
    const kurs = parseKurs(newKurs);
    if (!curr) return toast.error("Isi CURR dulu (mis. USD).");
    if (kurs === null) return toast.error("Kurs harus berupa angka.");
    const { error } = await db.from("valas_giro").insert({ curr, kurs });
    if (error) {
      toast.error(error.message.includes("duplicate") ? `CURR ${curr} sudah ada.` : error.message);
      return;
    }
    setNewCurr("");
    setNewKurs("");
    await load();
  }

  async function run(kind: "compare" | "restore") {
    setBusy(true);
    const { data, error } = await db.rpc(kind === "compare" ? "compare_valas" : "restore_valas", {
      _table: table,
    });
    setBusy(false);
    setConfirm(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (kind === "compare") {
      toast.success(
        `Compare selesai: ${Number(data?.dihitung ?? 0).toLocaleString("id-ID")} baris dikalikan kurs, ` +
          `${Number(data?.tanpa_kurs ?? 0).toLocaleString("id-ID")} baris tanpa kurs (tidak diubah).`,
      );
    } else {
      toast.success(`${Number(data?.dikembalikan ?? 0).toLocaleString("id-ID")} baris dikembalikan.`);
    }
    onCompared();
  }

  return (
    <div className="w-full overflow-hidden rounded-lg border bg-card shadow-card">
      <div className="border-b bg-muted/70 px-3 py-2 text-center text-sm font-bold tracking-wide">
        VALAS GIRO
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-xs font-semibold">
            <th className="w-12 px-2 py-1.5 text-center">No</th>
            <th className="px-2 py-1.5 text-center">CURR</th>
            <th className="px-2 py-1.5 text-center">KURS</th>
            {isAdmin && <th className="w-9" />}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={4} className="px-2 py-4 text-center text-xs text-muted-foreground">
                Memuat…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-2 py-4 text-center text-xs text-muted-foreground">
                Belum ada kurs.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={r.id} className="border-b last:border-b-0">
                <td className="px-2 py-1 text-center text-muted-foreground">{i + 1}</td>
                <td className="px-1 py-0.5">
                  <EditCell
                    value={r.curr}
                    readOnly={!isAdmin}
                    align="center"
                    upper
                    onCommit={(v) => void saveCurr(r, v)}
                  />
                </td>
                <td className="px-1 py-0.5">
                  <EditCell
                    value={fmtKurs(r.kurs)}
                    readOnly={!isAdmin}
                    align="right"
                    onCommit={(v) => void saveKurs(r, v)}
                  />
                </td>
                {isAdmin && (
                  <td className="px-1 text-center">
                    <button
                      type="button"
                      aria-label={`Hapus ${r.curr}`}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void remove(r)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
          {isAdmin && (
            <tr className="border-t bg-muted/20">
              <td className="px-2 py-1 text-center text-muted-foreground">
                <Plus className="mx-auto size-3.5" />
              </td>
              <td className="px-1 py-1">
                <input
                  value={newCurr}
                  onChange={(e) => setNewCurr(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && void add()}
                  placeholder="CURR"
                  className="w-full rounded border bg-background px-2 py-1 text-center text-sm outline-none focus:border-primary"
                />
              </td>
              <td className="px-1 py-1">
                <input
                  value={newKurs}
                  onChange={(e) => setNewKurs(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void add()}
                  inputMode="decimal"
                  placeholder="Kurs"
                  className="w-full rounded border bg-background px-2 py-1 text-right text-sm outline-none focus:border-primary"
                />
              </td>
              <td className="px-1 text-center">
                <button
                  type="button"
                  aria-label="Tambah kurs"
                  className="rounded p-1 text-primary hover:bg-primary/10"
                  onClick={() => void add()}
                >
                  <Plus className="size-4" />
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {isAdmin ? (
        <div className="flex">
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirm("compare")}
            className="flex-1 bg-green-300 px-3 py-2 text-sm font-semibold text-green-950 transition-colors hover:bg-green-400 disabled:opacity-60"
          >
            Klik Compare
          </button>
          <button
            type="button"
            disabled={busy}
            title="Kembalikan balance ke nilai asli"
            aria-label="Kembalikan balance ke nilai asli"
            onClick={() => setConfirm("restore")}
            className="border-l border-green-400 bg-green-200 px-3 text-green-950 transition-colors hover:bg-green-300 disabled:opacity-60"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      ) : (
        <div className="bg-green-100 px-3 py-2 text-center text-xs text-green-900">
          Compare hanya dapat dijalankan admin.
        </div>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "restore" ? "Kembalikan balance ke nilai asli?" : "Jalankan Compare?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "restore"
                ? "Kolom balance pada data ini dikembalikan ke nilai sebelum dikalikan kurs."
                : "Kolom CURR dicocokkan dengan tabel kurs (seperti VLOOKUP), lalu kolom balance diganti dengan balance asli × kurs. Baris yang CURR-nya tidak ada di tabel kurs (mis. IDR) tidak diubah. Balance asli disimpan, jadi aman ditekan berulang dan bisa dikembalikan."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && void run(confirm)}>
              {confirm === "restore" ? "Kembalikan" : "Jalankan Compare"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}