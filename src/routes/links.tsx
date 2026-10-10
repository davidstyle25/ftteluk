import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, ExternalLink, Search } from "lucide-react";
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
          isAdmin ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Link
            </Button>
          ) : undefined
        }
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
