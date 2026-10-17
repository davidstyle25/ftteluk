import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
   import { DepositoCalculator } from "@/components/DepositoCalculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — BO Teluk Betung" },
      {
        name: "description",
        content:
          "Kalender agenda dan pengingat nasabah untuk tim RMFT BO Teluk Betung dalam satu dashboard.",
      },
      { property: "og:title", content: "Dashboard — BO Teluk Betung" },
      {
        property: "og:description",
        content: "Kalender agenda dan pengingat nasabah tim RMFT BO Teluk Betung.",
      },
    ],
  }),
  component: DashboardPage,
});

const DAYS = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

type CalendarEvent = { id: number; tanggal: string; judul: string; warna: string | null };
type ActivityNote = {
  id: number;
  tanggal: string;
  nasabah: string | null;
  catatan: string;
  warna: string | null;
  username: string | null;
  created_at: string;
};

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#14b8a6",
  "#6366f1",
  "#e11d48",
];

const DOT: Record<string, string> = {
  amber: "bg-warning",
  green: "bg-success",
  pink: "bg-destructive",
  blue: "bg-primary",
};

/** Format Date -> YYYY-MM-DD (lokal). */
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function DashboardPage() {
  const today = new Date();
  const { user } = useAuth();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notes, setNotes] = useState<ActivityNote[]>([]);
  const [selected, setSelected] = useState<Date | null>(null);

  const loadEvents = () => {
    supabase
      .from("calendar_events")
      .select("id,tanggal,judul,warna")
      .order("tanggal")
      .then(({ data }) => setEvents((data ?? []) as CalendarEvent[]));
  };

  const loadNotes = () => {
    supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("activity_notes" as any)
      .select("id,tanggal,nasabah,catatan,warna,username,created_at")
      .order("created_at", { ascending: true })
      .then(({ data }) => setNotes((data ?? []) as unknown as ActivityNote[]));
  };

  useEffect(() => {
    loadEvents();
    loadNotes();
  }, []);

  const cells = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = new Date(start);
    gridStart.setDate(1 - start.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = e.tanggal.slice(5); // MM-DD, agenda berulang tiap tahun
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [events]);

  const notesByDate = useMemo(() => {
    const map = new Map<string, ActivityNote[]>();
    for (const n of notes) {
      // Normalisasi ke YYYY-MM-DD lokal (nilai bisa berupa timestamp UTC).
      const d = new Date(n.tanggal);
      const key = Number.isNaN(d.getTime())
        ? String(n.tanggal).slice(0, 10)
        : isoDate(d);
      map.set(key, [...(map.get(key) ?? []), n]);
    }
    return map;
  }, [notes]);

  const key = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  return (
    <AppLayout>
      <div className="card-elevated mb-4 flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            ← Sebelumnya
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
          >
            Hari Ini
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            Selanjutnya →
          </Button>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-card">
          {DAYS.map((d) => (
            <div
              key={d}
              className="px-3 py-3 text-center text-xs font-semibold tracking-widest text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const dayEvents = byDate.get(key(d)) ?? [];
            const dayNotes = notesByDate.get(isoDate(d)) ?? [];
            const isToday = isSameDay(d, today);
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(d)}
                className={cn(
                  "min-h-[100px] border-b border-r p-2 text-left transition-colors last:border-r-0 hover:bg-muted/40",
                  !inMonth && "bg-muted/40 text-muted-foreground",
                  dayEvents.length > 0 && inMonth && "bg-warning/10",
                  isToday && "bg-primary/5",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-sm font-medium",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                >
                  {d.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {dayEvents.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-1.5 truncate rounded border bg-card px-1.5 py-0.5 text-[11px]"
                    >
                      <span
                        className={cn("size-1.5 shrink-0 rounded-full", DOT[e.warna ?? "blue"] ?? "bg-primary")}
                      />
                      <span className="truncate">{e.judul}</span>
                    </div>
                  ))}
                  {dayNotes.length > 0 && (
                    <div className="truncate rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                      {dayNotes.length} catatan
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
         <DepositoCalculator />
      {selected && (
        <NotesDialog
          date={selected}
          notes={notesByDate.get(isoDate(selected)) ?? []}
          username={
            (user?.user_metadata?.["nama"] as string) || user?.email?.split("@")[0] || "user"
          }
          onClose={() => setSelected(null)}
          onChanged={loadNotes}
        />
      )}
    </AppLayout>
  );
}

function NotesDialog({
  date,
  notes,
  username,
  onClose,
  onChanged,
}: {
  date: Date;
  notes: ActivityNote[];
  username: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [nasabah, setNasabah] = useState("");
  const [catatan, setCatatan] = useState("");
  const [warna, setWarna] = useState(COLORS[0]!);
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const iso = isoDate(date);

  const resetForm = () => {
    setNasabah("");
    setCatatan("");
    setWarna(COLORS[0]!);
    setEditId(null);
  };

  const startEdit = (n: ActivityNote) => {
    setEditId(n.id);
    setNasabah(n.nasabah ?? "");
    setCatatan(n.catatan ?? "");
    setWarna(n.warna || COLORS[0]!);
  };

  const save = async () => {
    if (!nasabah.trim()) {
      toast.error("Nama nasabah wajib diisi.");
      return;
    }
    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = supabase.from("activity_notes" as any) as any;
    const payload = {
      tanggal: iso,
      nasabah: nasabah.trim(),
      catatan: catatan.trim(),
      warna,
      username,
    };
    const { error } = editId
      ? await table.update(payload).eq("id", editId)
      : await table.insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editId ? "Catatan diperbarui." : "Catatan ditambahkan.");
    resetForm();
    onChanged();
  };

  const remove = async (id: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("activity_notes" as any) as any).delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Catatan dihapus.");
    if (editId === id) resetForm();
    onChanged();
  };

  const label = `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catatan Nasabah · {label}</DialogTitle>
        </DialogHeader>

        {/* Daftar catatan tanggal ini */}
        <div className="max-h-60 space-y-2 overflow-y-auto">
          {notes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Belum ada catatan untuk tanggal ini.
            </p>
          ) : (
            notes.map((n) => (
              <div
                key={n.id}
                className="flex items-start justify-between gap-3 rounded-md border bg-card px-3 py-2"
              >
                <div className="flex min-w-0 gap-2">
                  <span
                    className="mt-1 size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: n.warna || COLORS[0] }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{n.nasabah || "(tanpa nama)"}</p>
                    {n.catatan && (
                      <p className="text-sm break-words text-muted-foreground">{n.catatan}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {n.username || "user"} ·{" "}
                      {new Date(n.created_at).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit catatan"
                    onClick={() => startEdit(n)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Hapus catatan"
                    className="text-destructive"
                    onClick={() => remove(n.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Form tambah/edit */}
        <div className="space-y-3 border-t pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="note-nasabah">Nama Nasabah</Label>
            <Input
              id="note-nasabah"
              value={nasabah}
              onChange={(e) => setNasabah(e.target.value)}
              placeholder="Masukkan nama nasabah"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-catatan">Catatan</Label>
            <Textarea
              id="note-catatan"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Masukkan catatan"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Warna</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setWarna(c)}
                  className={
                    "size-7 rounded-full ring-offset-2 transition-all " +
                    (warna === c ? "ring-2 ring-foreground" : "")
                  }
                  style={{ backgroundColor: c }}
                  aria-label={`Warna ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            {editId !== null && (
              <Button variant="outline" onClick={resetForm} disabled={busy}>
                Batal
              </Button>
            )}
            <Button onClick={save} disabled={busy}>
              <Plus className="mr-1.5 size-4" /> {editId ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
