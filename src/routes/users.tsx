import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useRole } from "@/lib/use-role";
import {
  createAppUser,
  deleteAppUser,
  listAppUsers,
  updateAppUser,
  type AppUserRow,
} from "@/lib/users.functions";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "System Users — BO Teluk Betung" },
      { name: "description", content: "Kelola akun dan hak akses pengguna aplikasi BO Teluk Betung." },
      { property: "og:title", content: "System Users — BO Teluk Betung" },
      {
        property: "og:description",
        content: "Kelola akun dan hak akses pengguna aplikasi BO Teluk Betung.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPage,
});

type FormState = {
  id: string | null;
  nama: string;
  username: string;
  password: string;
  role: "admin" | "viewer";
  active: boolean;
};

const emptyForm: FormState = {
  id: null,
  nama: "",
  username: "",
  password: "",
  role: "viewer",
  active: true,
};

function UsersPage() {
  const { role } = useRole();
  const isAdmin = role === "admin";
  const list = useServerFn(listAppUsers);
  const create = useServerFn(createAppUser);
  const update = useServerFn(updateAppUser);
  const remove = useServerFn(deleteAppUser);

  const [rows, setRows] = useState<AppUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<AppUserRow | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setRows(await list({}));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat pengguna");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) void refresh();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (form.id) {
        await update({
          data: {
            id: form.id,
            nama: form.nama,
            role: form.role,
            active: form.active,
            ...(form.password ? { password: form.password } : {}),
          },
        });
        toast.success("Pengguna diperbarui.");
      } else {
        await create({
          data: {
            nama: form.nama,
            username: form.username,
            password: form.password,
            role: form.role,
          },
        });
        toast.success("Pengguna dibuat.");
      }
      setOpen(false);
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pengguna");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await remove({ data: { id: toDelete.id } });
      toast.success("Pengguna dihapus.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus pengguna");
    } finally {
      setToDelete(null);
    }
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <PageHeader title="System Users" description="Manage accounts and role access." />
        <div className="card-elevated px-4 py-6 text-sm text-muted-foreground">
          Hanya admin yang dapat mengelola pengguna.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="System Users"
        description="Manage accounts and role access."
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" /> Tambah User
          </Button>
        }
      />

      <div className="card-elevated overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Memuat…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Belum ada pengguna.
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{u.nama}</td>
                  <td className="px-4 py-3">{u.username}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                        u.role === "admin"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground"
                      }`}
                    >
                      {u.role === "admin" ? "administrator" : "viewer"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.active ? (
                      <span className="inline-flex items-center gap-1.5 text-success">
                        <CheckCircle2 className="size-4" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <XCircle className="size-4" /> Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${u.username}`}
                        onClick={() => {
                          setForm({
                            id: u.id,
                            nama: u.nama,
                            username: u.username,
                            password: "",
                            role: u.role,
                            active: u.active,
                          });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Hapus ${u.username}`}
                        className="text-destructive hover:text-destructive"
                        onClick={() => setToDelete(u)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit User" : "Tambah User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama</Label>
              <Input
                id="nama"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="Nama lengkap"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                disabled={!!form.id}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="mis. rmft"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {form.id ? "Password baru (kosongkan bila tidak diubah)" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!form.id}
                minLength={form.id ? 0 : 6}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as "admin" | "viewer" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">administrator</SelectItem>
                    <SelectItem value="viewer">viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.active ? "active" : "inactive"}
                  onValueChange={(v) => setForm({ ...form, active: v === "active" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pengguna?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun {toDelete?.username} akan dihapus permanen.
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
