import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/lib/use-role";
import {
  DEFAULT_PERIODE,
  KPI_COLUMNS,
  computeRow,
  computeTotals,
  defaultRows,
  type KpiRow,
  type KpiView,
} from "@/lib/kpi-rm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/kpi-rm")({
  head: () => ({
    meta: [
      { title: "KPI RM — BO Teluk Betung" },
      { name: "description", content: "Key Performance Indicator Relationship Manager." },
    ],
  }),
  component: KpiRmPage,
});

// Tabel kpi_rm_views belum ada di types.ts hasil generate -> longgarkan tipe.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

const fmtInt = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 2 });
const fmt2 = (v: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v: number) => `${fmt2(v)}%`;
const fmtBobot = (v: number) => `${fmtInt(v)}%`;
const rawText = (v: number | null | undefined) =>
  v == null ? "" : String(Math.round(v * 1e6) / 1e6);

// ---------------------------------------------------------------------------
// Sel angka yang bisa diedit (tampil terformat, saat fokus tampil angka mentah).
// ---------------------------------------------------------------------------
function NumCell({
  value,
  format,
  readOnly,
  onCommit,
  className = "",
}: {
  value: number | null;
  format: (v: number) => string;
  readOnly: boolean;
  onCommit: (v: number | null) => void;
  className?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const cancelled = useRef(false);

  if (readOnly) {
    return <span className="block px-2 py-1 text-right">{value == null ? "" : format(value)}</span>;
  }

  const shown = text ?? (value == null ? "" : format(value));

  function finish() {
    if (cancelled.current) {
      cancelled.current = false;
      setText(null);
      return;
    }
    if (text === null) return;
    const original = rawText(value);
    const cleaned = text.replace(/[%\s,]/g, "");
    setText(null);
    if (cleaned === original) return;
    if (cleaned === "") {
      onCommit(null);
      return;
    }
    const n = Number(cleaned);
    if (Number.isFinite(n)) onCommit(n);
    else toast.error("Isi harus berupa angka.");
  }

  return (
    <input
      inputMode="decimal"
      value={shown}
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
      className={`w-full rounded border border-transparent bg-transparent px-2 py-1 text-right outline-none hover:border-border focus:border-primary focus:bg-background ${className}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Satu view tabel (satu RM)
// ---------------------------------------------------------------------------
function ViewCard({
  view,
  isAdmin,
  onSaved,
  onDelete,
}: {
  view: KpiView;
  isAdmin: boolean;
  onSaved: () => void;
  onDelete: (v: KpiView) => void;
}) {
  const [nama, setNama] = useState(view.nama);
  const [periode, setPeriode] = useState(view.periode);
  const [rows, setRows] = useState<KpiRow[]>(view.rows);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sinkron bila data dari server berubah (setelah simpan / muat ulang) dan tidak ada edit tertunda.
  useEffect(() => {
    if (!dirty) {
      setNama(view.nama);
      setPeriode(view.periode);
      setRows(view.rows);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const totals = useMemo(() => computeTotals(rows), [rows]);

  function patchRow(i: number, patch: Partial<KpiRow>, resetManual = false) {
    setRows((prev) =>
      prev.map((r, idx) =>
        idx === i
          ? {
              ...r,
              ...(resetManual
                ? { achievementManual: null, scoreGoalManual: null, scoreBobotManual: null }
                : {}),
              ...patch,
            }
          : r,
      ),
    );
    setDirty(true);
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { deskripsi: "", bobot: null, target: null, pencapaian: null, cap110: false },
    ]);
    setDirty(true);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
    setDirty(true);
  }

  async function save() {
    if (!nama.trim()) {
      toast.error("Nama RM wajib diisi.");
      return;
    }
    setSaving(true);
    const { error } = await db
      .from("kpi_rm_views")
      .update({
        nama: nama.trim(),
        periode: periode.trim() || DEFAULT_PERIODE,
        rows,
        updated_at: new Date().toISOString(),
      })
      .eq("id", view.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Tabel KPI disimpan.");
    setDirty(false);
    onSaved();
  }

  const th = "border border-black/70 bg-[#92CDDC] px-2 py-2 text-center font-bold text-black";
  const td = "border border-black/70 p-0";

  return (
    <section className="mb-8 overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Nama</span>
          {isAdmin ? (
            <Input
              value={nama}
              onChange={(e) => {
                setNama(e.target.value);
                setDirty(true);
              }}
              className="h-8 w-64 max-w-full"
            />
          ) : (
            <span className="text-base font-bold">{nama}</span>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {dirty && <span className="text-xs text-amber-600">Belum disimpan</span>}
            <Button size="sm" variant="outline" onClick={addRow}>
              <Plus className="mr-1 h-4 w-4" /> Tambah baris
            </Button>
            <Button size="sm" onClick={save} disabled={!dirty || saving}>
              <Save className="mr-1 h-4 w-4" /> {saving ? "Menyimpan…" : "Simpan"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => onDelete(view)}
              aria-label="Hapus view"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr>
              <th rowSpan={2} className={`${th} w-12`}>
                {KPI_COLUMNS.no}
              </th>
              <th rowSpan={2} className={th}>
                {KPI_COLUMNS.deskripsi}
              </th>
              <th rowSpan={2} className={`${th} w-20`}>
                {KPI_COLUMNS.bobot}
              </th>
              <th colSpan={5} className={th}>
                {isAdmin ? (
                  <input
                    value={periode}
                    onChange={(e) => {
                      setPeriode(e.target.value);
                      setDirty(true);
                    }}
                    className="w-full bg-transparent text-center font-bold outline-none"
                  />
                ) : (
                  periode
                )}
              </th>
              {isAdmin && (
                <th rowSpan={2} className={`${th} w-20 text-xs`}>
                  Maks 110
                </th>
              )}
              {isAdmin && <th rowSpan={2} className={`${th} w-10`} />}
            </tr>
            <tr>
              <th className={`${th} w-28`}>{KPI_COLUMNS.target}</th>
              <th className={`${th} w-28`}>{KPI_COLUMNS.pencapaian}</th>
              <th className={`${th} w-28`}>{KPI_COLUMNS.achievement}</th>
              <th className={`${th} w-24`}>{KPI_COLUMNS.scoreGoal}</th>
              <th className={`${th} w-24`}>{KPI_COLUMNS.scoreBobot}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const c = computeRow(r);
              return (
                <tr key={i}>
                  <td className={`${td} text-center`}>{i + 1}</td>
                  <td className={td}>
                    {isAdmin ? (
                      <input
                        value={r.deskripsi}
                        onChange={(e) => patchRow(i, { deskripsi: e.target.value })}
                        className="w-full bg-transparent px-2 py-1 outline-none focus:bg-background"
                      />
                    ) : (
                      <span className="block px-2 py-1">{r.deskripsi}</span>
                    )}
                  </td>
                  <td className={td}>
                    <NumCell
                      value={r.bobot}
                      format={fmtBobot}
                      readOnly={!isAdmin}
                      onCommit={(v) => patchRow(i, { bobot: v }, true)}
                    />
                  </td>
                  <td className={td}>
                    <NumCell
                      value={r.target}
                      format={fmtInt}
                      readOnly={!isAdmin}
                      onCommit={(v) => patchRow(i, { target: v }, true)}
                    />
                  </td>
                  <td className={td}>
                    <NumCell
                      value={r.pencapaian}
                      format={fmtInt}
                      readOnly={!isAdmin}
                      onCommit={(v) => patchRow(i, { pencapaian: v }, true)}
                    />
                  </td>
                  <td className={td}>
                    <NumCell
                      value={c.achievement}
                      format={fmtPct}
                      readOnly={!isAdmin}
                      onCommit={(v) => patchRow(i, { achievementManual: v })}
                    />
                  </td>
                  <td className={td}>
                    <NumCell
                      value={c.scoreGoal}
                      format={fmt2}
                      readOnly={!isAdmin}
                      onCommit={(v) => patchRow(i, { scoreGoalManual: v })}
                    />
                  </td>
                  <td className={td}>
                    <NumCell
                      value={c.scoreBobot}
                      format={fmt2}
                      readOnly={!isAdmin}
                      onCommit={(v) => patchRow(i, { scoreBobotManual: v })}
                    />
                  </td>
                  {isAdmin && (
                    <td className={`${td} text-center`}>
                      <input
                        type="checkbox"
                        checked={r.cap110}
                        onChange={(e) => patchRow(i, { cap110: e.target.checked }, true)}
                        aria-label="Batasi Score Goal maksimal 110"
                      />
                    </td>
                  )}
                  {isAdmin && (
                    <td className={`${td} text-center`}>
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
              );
            })}
            <tr className="bg-[#92D050] font-bold text-black">
              <td className="border border-black/70 px-2 py-2" colSpan={2}>
                TOTAL
              </td>
              <td className="border border-black/70 px-2 py-2 text-right">
                {fmtBobot(totals.bobot)}
              </td>
              <td className="border border-black/70" colSpan={4} />
              <td className="border border-black/70 px-2 py-2 text-right">
                {fmt2(totals.scoreBobot)}
              </td>
              {isAdmin && <td className="border border-black/70" colSpan={2} />}
            </tr>
          </tbody>
        </table>
      </div>
      {isAdmin && (
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          Klik sel untuk mengedit. Achievement, Score Goal, dan Score Bobot dihitung otomatis dari
          Target, Pencapaian, dan Bobot (dapat ditimpa manual; mengubah Target/Pencapaian/Bobot
          mengembalikannya ke otomatis). Kosongkan sel lalu Enter untuk kembali otomatis.
          Jangan lupa klik Simpan.
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Halaman
// ---------------------------------------------------------------------------
function KpiRmPage() {
  const { isAdmin } = useRole();
  const [views, setViews] = useState<KpiView[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [nama, setNama] = useState("");
  const [periode, setPeriode] = useState(DEFAULT_PERIODE);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KpiView | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await db
      .from("kpi_rm_views")
      .select("id,nama,periode,rows")
      .order("id");
    if (error) {
      toast.error(
        error.message.includes("kpi_rm_views")
          ? "Tabel kpi_rm_views belum dibuat. Jalankan supabase/04_kpi_rm.sql."
          : error.message,
      );
      setViews([]);
    } else {
      setViews((data ?? []) as KpiView[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return q ? views.filter((v) => v.nama.toLowerCase().includes(q)) : views;
  }, [views, term]);

  async function create() {
    if (!nama.trim()) {
      toast.error("Nama RM wajib diisi.");
      return;
    }
    setCreating(true);
    const { error } = await db.from("kpi_rm_views").insert({
      nama: nama.trim(),
      periode: periode.trim() || DEFAULT_PERIODE,
      rows: defaultRows(),
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("View tabel ditambahkan.");
    setOpen(false);
    setNama("");
    void load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { error } = await db.from("kpi_rm_views").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("View tabel dihapus.");
    void load();
  }

  return (
    <AppLayout>
      <PageHeader
        title="KPI RM"
        description="Tabel KPI per Relationship Manager."
        actions={
          isAdmin ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Tambah View Tabel
            </Button>
          ) : undefined
        }
      />

      {views.length > 1 && (
        <div className="relative mb-4 w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama RM…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
          {views.length === 0
            ? isAdmin
              ? "Belum ada tabel. Klik “Tambah View Tabel” untuk membuat tabel KPI RM."
              : "Belum ada tabel KPI RM."
            : "Tidak ada RM yang cocok."}
        </div>
      ) : (
        filtered.map((v) => (
          <ViewCard
            key={v.id}
            view={v}
            isAdmin={isAdmin}
            onSaved={() => void load()}
            onDelete={setDeleteTarget}
          />
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah View Tabel</DialogTitle>
            <DialogDescription>
              Tabel baru berisi kolom dan baris default. Isinya bisa diedit setelah dibuat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="kpi-nama">Nama RM</Label>
              <Input id="kpi-nama" value={nama} onChange={(e) => setNama(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kpi-periode">Judul periode</Label>
              <Input
                id="kpi-periode"
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={create} disabled={creating}>
              {creating ? "Menyimpan…" : "Buat Tabel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus tabel {deleteTarget?.nama}?</AlertDialogTitle>
            <AlertDialogDescription>
              Seluruh isi tabel KPI RM ini akan dihapus dan tidak bisa dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
