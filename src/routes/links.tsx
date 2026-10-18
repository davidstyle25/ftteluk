import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Pencil, Plus, Trash2, ExternalLink, Search, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/lib/use-role";
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

export const Route = createFileRoute("/links")({
  head: () => ({
    meta: [
      { title: "Links — BO Teluk Betung" },
      { name: "description", content: "Kumpulan tautan kerja cepat untuk tim RMFT Teluk Betung." },
      { property: "og:title", content: "Links — BO Teluk Betung" },
      { property: "og:description", content: "Kumpulan tautan kerja cepat tim RMFT Teluk Betung." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LinksPage,
});

type LinkRow = { id: number; nama: string; url: string };
type ImportRow = { nama: string; url: string };

const normUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

function LinksPage() {
  const { isAdmin } = useRole();
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [editing, setEditing] = useState<LinkRow | null>(null);
  const [open, setOpen] = useState(false);
  const [nama, setNama] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LinkRow | null>(null);
  const [term, setTerm] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importSkipped, setImportSkipped] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.nama.toLowerCase().includes(q) || r.url.toLowerCase().includes(q),
    );
  }, [rows, term]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("links").select("id,nama,url").order("id");
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportExcel() {
    if (filtered.length === 0) {
      toast.error("Tidak ada data untuk diexport.");
      return;
    }
    const XLSX = await import("xlsx");
    const aoa = [["No", "Nama", "URL"], ...filtered.map((r, i) => [i + 1, r.nama, r.url])];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 6 }, { wch: 32 }, { wch: 70 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Links");
    const tgl = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `links-${tgl}.xlsx`);
    toast.success(`${filtered.length} link diexport.`);
  }

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]!];
      const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet!, { header: 1, defval: "", raw: false });
      const cell = (v: unknown) => String(v ?? "").trim();
      const head = (grid[0] ?? []).map((v) => cell(v).toLowerCase());
      let iNama = head.findIndex((h) => ["nama", "name", "judul"].includes(h));
      let iUrl = head.findIndex((h) => ["url", "link", "tautan"].includes(h));
      let start = 1;
      if (iNama < 0 || iUrl < 0) {
        iNama = 0;
        iUrl = 1;
        start = 0; // tanpa header: baris pertama ikut dibaca
      }
      const seen = new Set(rows.map((r) => r.url.trim().toLowerCase()));
      const valid: ImportRow[] = [];
      let skipped = 0;
      for (const r of grid.slice(start)) {
        const nama = cell(r[iNama]);
        const url = cell(r[iUrl]);
        if (!nama && !url) continue;
        if (!nama || !url) {
          skipped++;
          continue;
        }
        const u = normUrl(url);
        const key = u.toLowerCase();
        if (seen.has(key)) {
          skipped++;
          continue;
        }
        seen.add(key);
        valid.push({ nama, url: u });
      }
      if (valid.length === 0) {
        toast.error(
          skipped > 0
            ? `Tidak ada link baru (${skipped} baris kosong/duplikat dilewati).`
            : "Tidak ada data yang bisa diimport. Pastikan ada kolom nama dan url.",
        );
        return;
      }
      setImportRows(valid);
      setImportSkipped(skipped);
      setImportOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membaca file.");
    }
  }

  async function confirmImport() {
    setImporting(true);
    const { error } = await supabase.from("links").insert(importRows);
    setImporting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${importRows.length} link diimport.`);
    setImportOpen(false);
    setImportRows([]);
    void load();
  }

  function openCreate() {
    setEditing(null);
    setNama("");
    setUrl("");
    setOpen(true);
  }

  function openEdit(row: LinkRow) {
    setEditing(row);
    setNama(row.nama);
    setUrl(row.url);
    setOpen(true);
  }

  async function save() {
    if (!nama.trim() || !url.trim()) {
      toast.error("Nama dan URL wajib diisi.");
      return;
    }
    setSaving(true);
    const payload = { nama: nama.trim(), url: url.trim() };
    const { error } = editing
      ? await supabase.from("links").update(payload).eq("id", editing.id)
      : await supabase.from("links").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Link diperbarui." : "Link ditambahkan.");
    setOpen(false);
    void load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from("links").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Link dihapus.");
    void load();
  }

  return (
    <AppLayout>
      <PageHeader
        title="System Links"
        description="Manage external URLs and resources."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void exportExcel()}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            {isAdmin && (
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Import
              </Button>
            )}
            {isAdmin && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Tambah Link
              </Button>
            )}
          </div>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => void onPickFile(e)}
      />

      <div className="relative mb-4 w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search..."
          className="pl-9"
        />
      </div>

      <div className="card-elevated overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Nama</th>
              <th className="px-4 py-3 text-left font-semibold">URL</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-t transition-colors hover:bg-muted/40">
                <td className="px-4 py-3 font-medium">{l.nama}</td>
                <td className="px-4 py-3">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 break-all text-primary hover:underline"
                  >
                    {l.url}
                    <ExternalLink className="size-3.5 shrink-0" />
                  </a>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {isAdmin ? (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Edit"
                          onClick={() => openEdit(l)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Hapus"
                          className="text-destructive"
                          onClick={() => setDeleteTarget(l)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-sm text-muted-foreground">
                  Tidak ada data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Link" : "Tambah Link"}</DialogTitle>
            <DialogDescription>Isi nama tautan dan alamat URL lengkap.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="nama">Nama</Label>
              <Input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: BRISPOT" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="url">URL</Label>
              <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import {importRows.length} link?</DialogTitle>
            <DialogDescription>
              Link ditambahkan ke daftar yang sudah ada (data lama tidak dihapus).
              {importSkipped > 0 && ` ${importSkipped} baris dilewati karena kosong atau URL sudah ada.`}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-auto rounded-md border text-xs">
            <table className="w-full">
              <tbody>
                {importRows.map((r, i) => (
                  <tr key={i} className="border-t first:border-t-0">
                    <td className="px-3 py-1.5 font-medium">{r.nama}</td>
                    <td className="break-all px-3 py-1.5 text-muted-foreground">{r.url}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Batal
            </Button>
            <Button onClick={confirmImport} disabled={importing}>
              {importing ? "Mengimport..." : `Import ${importRows.length} link`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus link ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.nama} akan dihapus permanen dari daftar.
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