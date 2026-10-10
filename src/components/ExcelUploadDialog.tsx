import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TABLE_COLUMNS } from "@/lib/table-columns";
import { cn } from "@/lib/utils";

const norm = (s: string) =>
  s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

function parseCsv(text: string) {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/)[0] ?? "";
  const counts: Array<[string, number]> = [
    [",", (firstLine.match(/,/g) ?? []).length],
    [";", (firstLine.match(/;/g) ?? []).length],
    ["\t", (firstLine.match(/\t/g) ?? []).length],
    ["|", (firstLine.match(/\|/g) ?? []).length],
  ];
  const sep = counts.sort((a, b) => b[1] - a[1])[0]![0];

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]!;
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

function buildCsvRows(text: string, table: string) {
  const grid = parseCsv(text);
  const header = grid.shift();
  if (!header) throw new Error("File CSV kosong.");
  const allowed = TABLE_COLUMNS[table] ?? [];
  const allowedSet = new Set(allowed);
  const mapped: Record<string, string>[] = [];
  const unknown = new Set<string>();

  for (const line of grid) {
    const out: Record<string, string> = {};
    header.forEach((h, idx) => {
      const col = norm(h);
      if (!allowedSet.has(col)) {
        if (h.trim()) unknown.add(h.trim());
        return;
      }
      out[col] = (line[idx] ?? "").trim();
    });
    if (Object.values(out).some((v) => v !== "")) mapped.push(out);
  }
  return { rows: mapped, unknown: [...unknown], allowed };
}

function buildRows(file: ArrayBuffer, table: string) {
  const wb = XLSX.read(file, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("File Excel tidak memiliki sheet.");
  const sheet = wb.Sheets[sheetName]!;
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  const allowed = TABLE_COLUMNS[table] ?? [];
  const allowedSet = new Set(allowed);

  const mapped: Record<string, string>[] = [];
  const unknown = new Set<string>();

  for (const row of raw) {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const col = norm(key);
      if (!allowedSet.has(col)) {
        if (key.trim()) unknown.add(key.trim());
        continue;
      }
      out[col] =
        value instanceof Date
          ? value.toISOString().slice(0, 10)
          : value === null || value === undefined
            ? ""
            : String(value).trim();
    }
    if (Object.values(out).some((v) => v !== "")) mapped.push(out);
  }

  return { rows: mapped, unknown: [...unknown], allowed };
}

export function ExcelUploadDialog({
  open,
  onOpenChange,
  table,
  label,
  onImported,
  mode = "excel",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  table: string;
  label: string;
  onImported?: () => void;
  mode?: "excel" | "csv";
}) {
  const isCsv = mode === "csv";
  const accept = isCsv ? ".csv" : ".xls,.xlsx";
  const pattern = isCsv ? /\.csv$/i : /\.(xlsx|xls)$/i;
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [replace, setReplace] = useState(false);

  const reset = () => {
    setFile(null);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!pattern.test(f.name)) {
      toast.error(isCsv ? "Hanya file CSV (.csv) yang didukung." : "Hanya file Excel (.xls, .xlsx) yang didukung.");
      return;
    }
    setFile(f);
  };

  const doImport = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const { rows, unknown } = isCsv
        ? buildCsvRows(await file.text(), table)
        : buildRows(await file.arrayBuffer(), table);
      if (!rows.length) {
        toast.error("Tidak ada baris data yang cocok dengan kolom tabel.");
        setBusy(false);
        return;
      }

      if (replace) {
        const { error } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(table as any)
          .delete()
          .gte("id", 0);
        if (error) throw new Error(error.message);
      }

      const chunk = 500;
      for (let i = 0; i < rows.length; i += chunk) {
        const { error } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(table as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(rows.slice(i, i + chunk) as any);
        if (error) throw new Error(error.message);
      }

      toast.success(
        `${rows.length.toLocaleString("id-ID")} baris berhasil diimpor ke ${label}.` +
          (unknown.length ? ` ${unknown.length} kolom tidak dikenal diabaikan.` : ""),
      );
      onImported?.();
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengimpor file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) {
          onOpenChange(v);
          if (!v) reset();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isCsv ? "Upload CSV Data" : "Upload Excel Data"}</DialogTitle>
          <DialogDescription>
            {isCsv
              ? `Unggah file .csv untuk mengimpor data ke ${label}.`
              : `Unggah file .xls atau .xlsx untuk mengimpor data ke ${label}.`}
          </DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
          )}
        >
          <FileUp className="size-8 text-muted-foreground" />
          <span className="text-sm font-medium">
            {file ? file.name : "Klik untuk memilih atau tarik file ke sini"}
          </span>
          <span className="text-xs text-muted-foreground">
            {isCsv ? "Hanya file CSV (.csv)" : "Hanya file Excel (.xls, .xlsx)"}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
            className="size-4 rounded border-input"
          />
          Hapus data lama sebelum impor
        </label>

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={!file || busy} onClick={doImport}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Import Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
