import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
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
import type { DataColumn } from "@/lib/data-catalog";
import { cn } from "@/lib/utils";

type Row = Record<string, unknown> & { id?: number };

const PAGE_SIZES = [10, 25, 50, 100];

const NUMERIC = new Set(["decimal", "int", "bigint"]);

// DI319 & DI321: kolom balance bertipe text -> urut angka lewat kolom turunan balance_num
// (dibuat oleh supabase/07_di319_balance_sort.sql dan 08_di321_balance_sort.sql).
const NUM_SORT_TABLE = /^data_di(319|321)_data[1-4]$/;
// Tabel hasil Compare Data (MTD/YTD/DTD GIRO & TAB, Kenaikan/Penurunan): hanya DELTA yang bisa diurutkan
const COMPARE_TABLE = /^data_(mtd|ytd|dtd)_(giro|tab)_(kenaikan|penurunan)$/;

/** Nama kolom angka turunan untuk urut numerik; null bila kolom diurut biasa (teks). */
function numericSortCol(table: string, col: string): string | null {
  if (col === "balance" && NUM_SORT_TABLE.test(table)) return "balance_num";
  if (COMPARE_TABLE.test(table) && col === "delta") return "delta_num";
  return null;
}

/**
 * Teks -> angka. Default: format Indonesia (titik = ribuan, koma = desimal).
 * dotDecimal: titik = desimal, sama seperti Compare Data di database (tgl1/tgl2 disimpan "236591212.2").
 */
function toNumber(value: unknown, dotDecimal = false) {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value);
  const n = dotDecimal
    ? Number(raw.replace(/[^0-9.-]/g, ""))
    : Number(raw.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function formatCell(value: unknown, type: DataColumn["type"], dotDecimal = false) {
  if (value === null || value === undefined || value === "") return "";
  if (NUMERIC.has(type)) {
    const n = toNumber(value, dotDecimal);
    return n === null ? String(value) : n.toLocaleString("id-ID");
  }
  // Tanggal tanpa jam: "2026/8/31 0:00" -> "2026/8/31"
  return String(value).replace(/^(\d{4}[/-]\d{1,2}[/-]\d{1,2})\s+0{1,2}:00(:00)?$/, "$1");
}

export function DataTableView({
  table,
  columns,
  title,
  showDelta,
  canEdit = false,
  canAdd = canEdit,
  onChanged,
  headerOverrides,
}: {
  table: string;
  columns: DataColumn[];
  title?: string;
  showDelta?: boolean;
  canEdit?: boolean;
  canAdd?: boolean;
  onChanged?: () => void;
  headerOverrides?: Record<string, string>;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ col: string; asc: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  // Pencarian mencakup SEMUA kolom teks (sebelumnya hanya 4 kolom pertama, sehingga kolom
  // seperti Short Name / Account Number di DI321 tidak ikut dicari).
  const searchColumns = useMemo(
    () => columns.filter((c) => c.type === "string").slice(0, 16).map((c) => c.field),
    [columns],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(term);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      let req = supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(table as any)
        .select("*", { count: "exact" })
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (query && searchColumns.length) {
        // Nilai dibungkus tanda kutip agar koma/kurung/titik di teks pencarian tidak merusak filter.
        const q = query.trim().replace(/[\\"]/g, "\\$&");
        req = req.or(searchColumns.map((c) => `${c}.ilike."%${q}%"`).join(","));
      }
      if (sort) {
        req = req.order(numericSortCol(table, sort.col) ?? sort.col, {
          ascending: sort.asc,
          nullsFirst: false,
        });
      } else req = req.order("id", { ascending: true });
      const { data, error, count } = await req;
      if (cancelled) return;
      if (error)
        toast.error(
          sort && numericSortCol(table, sort.col)
            ? "Gagal memuat data. Jalankan SQL urut angka di Supabase Studio (07/08 untuk Balance DI319/DI321, 11_compare_sort.sql untuk Kenaikan/Penurunan)."
            : "Gagal memuat data",
        );
      else {
        setRows((data ?? []) as unknown as Row[]);
        setTotal(count ?? 0);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [table, page, pageSize, query, sort, searchColumns, tick]);

  const refresh = () => {
    setTick((t) => t + 1);
    onChanged?.();
  };

  // Tabel Kenaikan/Penurunan: kolom RM Pengelola dipindah ke setelah DELTA.
  const afterDelta =
    showDelta && COMPARE_TABLE.test(table) ? columns.filter((c) => c.field === "rm_pengelola") : [];
  const isCompareTable = COMPARE_TABLE.test(table);
  const mainCols = afterDelta.length ? columns.filter((c) => c.field !== "rm_pengelola") : columns;

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, page * pageSize + rows.length);

  const save = async () => {
    if (!editing) return;
    const payload: Record<string, unknown> = {};
    for (const c of columns) payload[c.field] = editing[c.field] ?? null;
    const isNew = editing["id"] === undefined;
    const { error } = isNew
      ? await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(table as any)
          .insert(payload as never)
      : await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(table as any)
          .update(payload)
          .eq("id", editing["id"] as number);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isNew ? "Data ditambahkan." : "Data diperbarui.");
    setEditing(null);
    refresh();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(table as any)
      .delete()
      .eq("id", deleting["id"] as number);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Data dihapus.");
    setDeleting(null);
    refresh();
  };

  return (
    <div className="space-y-4">
      {title && <h2 className="text-xl font-bold tracking-tight">{title}</h2>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {NUM_SORT_TABLE.test(table) && (
            <>
              <span>Balance</span>
              <select
                value={sort?.col === "balance" ? (sort.asc ? "asc" : "desc") : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setPage(0);
                  setSort(v ? { col: "balance", asc: v === "asc" } : null);
                }}
                className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"
              >
                <option value="">Urutan awal</option>
                <option value="desc">Descending (terbesar → terkecil)</option>
                <option value="asc">Ascending (terkecil → terbesar)</option>
              </select>
            </>
          )}
          {COMPARE_TABLE.test(table) && (
            <>
              <span>DELTA</span>
              <select
                value={sort?.col === "delta" ? (sort.asc ? "asc" : "desc") : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setPage(0);
                  setSort(v ? { col: "delta", asc: v === "asc" } : null);
                }}
                className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"
              >
                <option value="">Urutan awal</option>
                <option value="desc">Descending (terbesar → terkecil)</option>
                <option value="asc">Ascending (terkecil → terbesar)</option>
              </select>
            </>
          )}
          {canAdd && (
            <Button onClick={() => setEditing({} as Row)}>
              <Plus className="mr-2 size-4" /> Add Data
            </Button>
          )}
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
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
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Tidak ada data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">NO</th>
                {mainCols.map((c) => (
                  <th key={c.field} className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                    {COMPARE_TABLE.test(table) ? (
                      <span>{headerOverrides?.[c.field] ?? c.label}</span>
                    ) : (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() =>
                        setSort((s) =>
                          s && s.col === c.field
                            ? { col: c.field, asc: !s.asc }
                            : { col: c.field, asc: true },
                        )
                      }
                    >
                      {headerOverrides?.[c.field] ?? c.label}
                      {sort?.col === c.field ? (
                        sort.asc ? (
                          <ChevronUp className="size-3.5 text-primary" />
                        ) : (
                          <ChevronDown className="size-3.5 text-primary" />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                      )}
                    </button>
                    )}
                  </th>
                ))}
                {showDelta && (
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      title="Urutkan DELTA"
                      onClick={() =>
                        setSort((s) =>
                          s && s.col === "delta"
                            ? { col: "delta", asc: !s.asc }
                            : { col: "delta", asc: false },
                        )
                      }
                    >
                      DELTA
                      {sort?.col === "delta" ? (
                        sort.asc ? (
                          <ChevronUp className="size-3.5 text-primary" />
                        ) : (
                          <ChevronDown className="size-3.5 text-primary" />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </th>
                )}
                {afterDelta.map((c) => (
                  <th key={c.field} className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                    {headerOverrides?.[c.field] ?? c.label}
                  </th>
                ))}
                {canEdit && (
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const delta = showDelta
                  ? Math.round(((toNumber(r["tgl2"], true) ?? 0) - (toNumber(r["tgl1"], true) ?? 0)) * 100) / 100
                  : 0;
                return (
                  <tr key={i} className="border-t transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3 text-muted-foreground">{page * pageSize + i + 1}</td>
                    {mainCols.map((c) => (
                      <td
                        key={c.field}
                        className={cn(
                          "whitespace-nowrap px-4 py-3",
                          NUMERIC.has(c.type) && "text-right tabular-nums",
                        )}
                      >
                        {formatCell(r[c.field], c.type, isCompareTable)}
                      </td>
                    ))}
                    {showDelta && (
                      <td
                        className={cn(
                          "whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums",
                          delta < 0 ? "text-destructive" : "text-success",
                        )}
                      >
                        {delta.toLocaleString("id-ID")}
                      </td>
                    )}
                    {afterDelta.map((c) => (
                      <td key={c.field} className="whitespace-nowrap px-4 py-3">
                        {formatCell(r[c.field], c.type)}
                      </td>
                    ))}
                    {canEdit && (
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit"
                            onClick={() => setEditing({ ...r })}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Hapus"
                            className="text-destructive"
                            onClick={() => setDeleting(r)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {from} to {to} of {total.toLocaleString("id-ID")} entries
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.["id"] === undefined ? "Tambah Data" : "Edit Data"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {columns.map((c) => (
              <div key={c.field} className="space-y-1.5">
                <Label htmlFor={`f-${c.field}`}>{c.label}</Label>
                <Input
                  id={`f-${c.field}`}
                  value={String(editing?.[c.field] ?? "")}
                  onChange={(e) =>
                    setEditing((s) => (s ? { ...s, [c.field]: e.target.value } : s))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button onClick={save}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus data ini?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function exportTableCsv(rows: Row[], filename: string) {
  if (!rows.length) {
    toast.error("Tidak ada data.");
    return;
  }
  void (async () => {
    const XLSX = await import("xlsx");
    const columns = Object.keys(rows[0]!);
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => Object.fromEntries(columns.map((c) => [c, r[c] ?? ""]))),
      { header: columns },
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const name = filename.replace(/\.(csv|xlsx?)$/i, "") + ".xlsx";
    XLSX.writeFile(wb, name);
  })();
}