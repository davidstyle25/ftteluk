import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Download,
  File as FileIcon,
  Folder,
  FolderPlus,
  HardDrive,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
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
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/use-role";

export const Route = createFileRoute("/drive")({
  head: () => ({
    meta: [
      { title: "Drive — BO Teluk Betung" },
      { name: "description", content: "Penyimpanan file dan folder bersama." },
    ],
  }),
  component: DrivePage,
});

const BUCKET = "drive";

// Tabel drive_items belum ada di types.ts hasil generate -> longgarkan tipe.
const db = supabase as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

type Item = {
  id: string;
  parent_id: string | null;
  name: string;
  is_folder: boolean;
  storage_path: string | null;
  size: number;
  mime: string | null;
  created_by: string | null;
  created_by_email: string | null;
  created_at: string;
};
type Crumb = { id: string | null; name: string };

function fmtSize(n: number) {
  if (!n) return "-";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString("id-ID", { maximumFractionDigits: i === 0 ? 0 : 1 })} ${u[i]}`;
}

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function DrivePage() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const [path, setPath] = useState<Crumb[]>([{ id: null, name: "Drive" }]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const current = path[path.length - 1]!;

  const load = useCallback(async () => {
    setLoading(true);
    let q = db.from("drive_items").select("*");
    q = current.id ? q.eq("parent_id", current.id) : q.is("parent_id", null);
    const { data, error } = await q.order("is_folder", { ascending: false }).order("name", { ascending: true });
    if (error) {
      toast.error(`Gagal memuat Drive: ${error.message}`);
      setItems([]);
    } else {
      setItems((data ?? []) as Item[]);
    }
    setLoading(false);
  }, [current.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const canDelete = (it: Item) => isAdmin || (!!user && it.created_by === user.id);

  async function createFolder() {
    const name = folderName.trim();
    if (!name) return toast.error("Nama folder tidak boleh kosong.");
    const { error } = await db.from("drive_items").insert({
      parent_id: current.id,
      name,
      is_folder: true,
      created_by_email: user?.email ?? null,
    });
    if (error) return toast.error(error.message);
    setFolderName("");
    setShowNew(false);
    await load();
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i]!;
      setUploading(`Mengupload ${i + 1}/${files.length}: ${f.name}`);
      const id = crypto.randomUUID();
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(id, f, { contentType: f.type || "application/octet-stream", upsert: false });
      if (upErr) {
        toast.error(`${f.name}: ${upErr.message}`);
        continue;
      }
      const { error } = await db.from("drive_items").insert({
        id,
        parent_id: current.id,
        name: f.name,
        is_folder: false,
        storage_path: id,
        size: f.size,
        mime: f.type || null,
        created_by_email: user?.email ?? null,
      });
      if (error) {
        await supabase.storage.from(BUCKET).remove([id]);
        toast.error(`${f.name}: ${error.message}`);
        continue;
      }
      ok++;
    }
    setUploading(null);
    if (ok > 0) toast.success(`${ok} file berhasil diupload.`);
    if (fileRef.current) fileRef.current.value = "";
    await load();
  }

  async function download(it: Item) {
    if (!it.storage_path) return;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(it.storage_path, 120, { download: it.name });
    if (error || !data) return toast.error(error?.message ?? "Gagal membuat link unduhan.");
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = it.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /** Kumpulkan path file di dalam folder (semua level). */
  async function collectFilePaths(folderId: string): Promise<string[]> {
    const paths: string[] = [];
    let ids = [folderId];
    while (ids.length > 0) {
      const { data, error } = await db
        .from("drive_items")
        .select("id,is_folder,storage_path")
        .in("parent_id", ids);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Pick<Item, "id" | "is_folder" | "storage_path">[];
      for (const r of rows) if (!r.is_folder && r.storage_path) paths.push(r.storage_path);
      ids = rows.filter((r) => r.is_folder).map((r) => r.id);
    }
    return paths;
  }

  async function doDelete(it: Item) {
    setDeleting(null);
    try {
      let paths: string[] = [];
      if (it.is_folder) {
        paths = await collectFilePaths(it.id);
        if (paths.length > 0 && !isAdmin) {
          toast.error("Folder berisi file. Kosongkan dulu, atau minta admin menghapusnya.");
          return;
        }
      } else if (it.storage_path) {
        paths = [it.storage_path];
      }
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await supabase.storage.from(BUCKET).remove(paths.slice(i, i + 100));
        if (error) throw new Error(error.message);
      }
      const { error } = await db.from("drive_items").delete().eq("id", it.id);
      if (error) throw new Error(error.message);
      toast.success(`${it.name} dihapus.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus.");
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Drive"
        description="Simpan dan bagikan file apa pun. Semua pengguna dapat mengupload; hapus hanya oleh pengunggah atau admin."
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void uploadFiles(Array.from(e.dataTransfer.files));
        }}
        className={`rounded-lg border bg-card shadow-card transition-colors ${dragOver ? "border-primary bg-primary/5" : ""}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            <HardDrive className="mr-1 size-4 text-muted-foreground" />
            {path.map((c, i) => (
              <span key={`${c.id ?? "root"}-${i}`} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground" />}
                <button
                  type="button"
                  className={i === path.length - 1 ? "font-semibold" : "text-primary hover:underline"}
                  onClick={() => setPath(path.slice(0, i + 1))}
                >
                  {c.name}
                </button>
              </span>
            ))}
          </nav>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowNew((v) => !v)}>
              <FolderPlus className="mr-2 size-4" />
              Folder Baru
            </Button>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void uploadFiles(Array.from(e.target.files ?? []))}
            />
            <Button size="sm" disabled={!!uploading} onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 size-4" />
              Upload File
            </Button>
          </div>
        </div>

        {showNew && (
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
            <input
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void createFolder()}
              placeholder="Nama folder"
              className="w-64 rounded border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
            />
            <Button size="sm" onClick={() => void createFolder()}>
              Buat
            </Button>
          </div>
        )}

        {uploading && (
          <div className="border-b bg-primary/5 px-4 py-2 text-sm text-primary">{uploading}</div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
              <th className="px-4 py-2 text-left">Nama</th>
              <th className="hidden px-3 py-2 text-right sm:table-cell">Ukuran</th>
              <th className="hidden px-3 py-2 text-left md:table-cell">Pengunggah</th>
              <th className="hidden px-3 py-2 text-left md:table-cell">Tanggal</th>
              <th className="w-24 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Memuat…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Folder kosong. Seret file ke sini atau klik Upload File.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-2">
                    {it.is_folder ? (
                      <button
                        type="button"
                        className="flex items-center gap-2 font-medium hover:underline"
                        onClick={() => setPath([...path, { id: it.id, name: it.name }])}
                      >
                        <Folder className="size-4 shrink-0 fill-amber-300 text-amber-500" />
                        {it.name}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left hover:underline"
                        onClick={() => void download(it)}
                      >
                        <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="break-all">{it.name}</span>
                      </button>
                    )}
                  </td>
                  <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">
                    {it.is_folder ? "-" : fmtSize(it.size)}
                  </td>
                  <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">
                    {it.created_by_email ?? "-"}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2 text-muted-foreground md:table-cell">
                    {fmtDate(it.created_at)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!it.is_folder && (
                      <button
                        type="button"
                        aria-label={`Unduh ${it.name}`}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => void download(it)}
                      >
                        <Download className="size-4" />
                      </button>
                    )}
                    {canDelete(it) && (
                      <button
                        type="button"
                        aria-label={`Hapus ${it.name}`}
                        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleting(it)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleting?.is_folder ? "folder" : "file"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name}
              {deleting?.is_folder ? " beserta seluruh isinya akan dihapus permanen." : " akan dihapus permanen."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && void doDelete(deleting)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}