import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportTableCsv } from "@/components/DataTableView";

type FieldCount = { value: string | null; count: number };
type Tone = "green" | "red" | "orange" | "blue" | "indigo" | "primary" | "teal" | "slate";

const TONES: Record<Tone, string> = {
  green: "bg-green-50 border-green-200 text-green-700",
  red: "bg-red-50 border-red-200 text-red-700",
  orange: "bg-orange-50 border-orange-200 text-orange-700",
  blue: "bg-blue-50 border-blue-200 text-blue-700",
  indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
  teal: "bg-teal-50 border-teal-200 text-teal-700",
  slate: "bg-slate-50 border-slate-200 text-slate-700",
  primary: "bg-primary/5 border-primary/25 text-primary",
};

const NUMBER_TONES: Record<Tone, string> = {
  green: "text-green-600",
  red: "text-red-600",
  orange: "text-orange-600",
  blue: "text-blue-600",
  indigo: "text-indigo-600",
  teal: "text-teal-600",
  slate: "text-slate-600",
  primary: "text-primary",
};

type FixedStat = { label: string; field: string; match: string | null; tone: Tone };
type Card = { label: string; count: number; tone: Tone; field: string; value: string | null };

const EDC_FIXED: FixedStat[] = [
  { label: "EDC Produktif", field: "status_edc", match: "Produktif", tone: "green" },
  { label: "EDC Tidak Produktif", field: "status_edc", match: "Tidak Produktif", tone: "red" },
  { label: "Sales Volume 0", field: "sales_volume_zero", match: null, tone: "orange" },
];

const QRIS_FIXED: FixedStat[] = [
  { label: "Status · Aktif", field: "status", match: "AKTIF", tone: "green" },
  { label: "Status · Belum Aktif", field: "status", match: "Belum aktif", tone: "red" },
  { label: "Merchant · Dinamis", field: "merchant_type", match: "DINAMIS", tone: "blue" },
  { label: "Merchant · Statis", field: "merchant_type", match: "STATIS", tone: "indigo" },
];

const TIER_TONES: Tone[] = ["orange", "blue", "teal", "green", "indigo", "slate", "red"];
const TIER_ORDER: Record<string, number> = {
  "0": 0,
  "1 - <1jt": 1,
  "1jt - <15jt": 2,
  "15jt - <50jt": 3,
  ">=50jt": 4,
};

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function fetchFieldStats(cat: string, field: string): Promise<FieldCount[] | FieldCount> {
  const res = await fetch(`/api/public/field-stats?cat=${cat}&field=${field}`, {
    method: "GET",
    headers: await authHeaders(),
  });
  if (!res.ok) return [];
  return (await res.json()) as FieldCount[] | FieldCount;
}

async function fetchRows(
  cat: string,
  field: string,
  value: string | null,
): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const params = new URLSearchParams({ cat, field, rows: "1" });
  if (value !== null) params.set("value", value);
  const res = await fetch(`/api/public/field-stats?${params.toString()}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) return { columns: [], rows: [] };
  return (await res.json()) as { columns: string[]; rows: Record<string, unknown>[] };
}

// QRIS: kolom branch bernilai 285 = Cabang, selain itu = Mikro.
const isCabang = (v: string | null) => /^285(\.0+)?$/.test((v ?? "").trim());

function findCount(rows: FieldCount[], match: string | null): number {
  if (match === null) return 0;
  const row = rows.find((r) => (r.value ?? "").trim().toLowerCase() === match.trim().toLowerCase());
  return row?.count ?? 0;
}

export function CategoryStats({ slug }: { slug: string }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [total, setTotal] = useState<{ count: number; field: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Card | null>(null);

  const fixed = slug === "edc" ? EDC_FIXED : slug === "qris" ? QRIS_FIXED : [];
  const showTiers = slug === "edc";
  const showBranch = slug === "qris";

  useEffect(() => {
    let cancelled = false;
    if (!fixed.length) {
      setLoading(false);
      return;
    }
    setLoading(true);

    Promise.all([
      ...fixed.map((def) =>
        fetchFieldStats(slug, def.field).then((res) => ({ def, res })),
      ),
      fetchFieldStats(slug, "__total__"),
      showTiers ? fetchFieldStats(slug, "tiering_sales_volume") : Promise.resolve([]),
      showBranch ? fetchFieldStats(slug, "branch") : Promise.resolve([]),
      showBranch ? fetchFieldStats(slug, "__qris_split__") : Promise.resolve([]),
    ])
      .then((results) => {
        if (cancelled) return;
        const fixedResults = results.slice(0, fixed.length) as {
          def: FixedStat;
          res: FieldCount[] | FieldCount;
        }[];
        const totalRes = results[fixed.length] as FieldCount;
        const tierRes = results[fixed.length + 1] as FieldCount[] | FieldCount;
        const branchRes = results[fixed.length + 2] as FieldCount[] | FieldCount;
        const splitRes = results[fixed.length + 3] as unknown as
          | { cabang?: number; mikro?: number; cabangProduktif?: number; mikroProduktif?: number }
          | unknown[];
        const split: { cabang?: number; mikro?: number; cabangProduktif?: number; mikroProduktif?: number } =
          Array.isArray(splitRes) ? {} : splitRes;
        const totalCount = Array.isArray(totalRes) ? 0 : totalRes.count;

        const baseCards: Card[] = fixedResults.map(({ def, res }) => {
          const count =
            def.field === "sales_volume_zero"
              ? Array.isArray(res)
                ? 0
                : res.count
              : findCount(Array.isArray(res) ? res : [], def.match);
          return { label: def.label, count, tone: def.tone, field: def.field, value: def.match };
        });

        const tierCards: Card[] = Array.isArray(tierRes)
          ? tierRes
              .filter((r) => r.value)
              .sort((a, b) => (TIER_ORDER[a.value ?? ""] ?? 99) - (TIER_ORDER[b.value ?? ""] ?? 99))
              .map((r, i) => ({
                label: `Tiering · ${r.value}`,
                count: r.count,
                tone: TIER_TONES[i % TIER_TONES.length]!,
                field: "tiering_sales_volume",
                value: r.value,
              }))
          : [];

        const branchCards: Card[] = [];
        if (showBranch) {
          const cabang =
            split.cabang ??
            (Array.isArray(branchRes)
              ? branchRes.filter((r) => isCabang(r.value)).reduce((a, r) => a + Number(r.count), 0)
              : 0);
          branchCards.push(
            { label: "Total QRIS Cabang", count: cabang, tone: "teal", field: "__qris_cabang__", value: null },
            { label: "Total QRIS Mikro", count: split.mikro ?? Math.max(totalCount - cabang, 0), tone: "slate", field: "__qris_mikro__", value: null },
            { label: "QRIS Cabang Produktif", count: split.cabangProduktif ?? 0, tone: "green", field: "__qris_cabang_produktif__", value: null },
            { label: "QRIS Mikro Produktif", count: split.mikroProduktif ?? 0, tone: "blue", field: "__qris_mikro_produktif__", value: null },
          );
        }

        setCards([...baseCards, ...branchCards, ...tierCards]);
        setTotal({
          count: totalCount,
          field: "__total__",
        });
      })
      .catch(() => {
        if (!cancelled)
          setCards(fixed.map((def) => ({ label: def.label, count: 0, tone: def.tone, field: def.field, value: def.match })));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!fixed.length) return null;

  return (
    <div className="mb-5 flex flex-wrap gap-4">
      {cards.map((card) => (
        <button
          key={card.label}
          type="button"
          onClick={() => setSelected(card)}
          className={`min-w-64 cursor-pointer rounded-lg border px-5 py-4 text-left transition-shadow hover:shadow-md ${TONES[card.tone]}`}
        >
          <span className="text-sm font-medium">{card.label}</span>
          <span className={`mt-1 block text-3xl font-bold ${NUMBER_TONES[card.tone]}`}>
            {loading ? "…" : card.count.toLocaleString("id-ID")}
          </span>
        </button>
      ))}
      {total !== null && (
        <button
          type="button"
          onClick={() =>
            setSelected({
              label: slug === "edc" ? "Total EDC" : "Total QRIS",
              count: total.count,
              tone: "primary",
              field: total.field,
              value: null,
            })
          }
          className="min-w-64 cursor-pointer rounded-lg border border-primary/25 bg-primary/5 px-5 py-4 text-left text-primary transition-shadow hover:shadow-md"
        >
          <span className="text-sm font-medium">{slug === "edc" ? "Total EDC" : "Total QRIS"}</span>
          <span className="mt-1 block text-3xl font-bold text-primary">
            {total.count.toLocaleString("id-ID")}
          </span>
        </button>
      )}

      {selected && (
        <StatsRowsDialog
          cat={slug}
          card={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function StatsRowsDialog({
  cat,
  card,
  onClose,
}: {
  cat: string;
  card: Card;
  onClose: () => void;
}) {
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRows(cat, card.field, card.value)
      .then((res) => {
        if (cancelled) return;
        setColumns(res.columns);
        setRows(res.rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cat, card.field, card.value]);

  const exportNow = () => {
    const ordered = rows.map((r) => {
      const o: Record<string, unknown> = {};
      for (const c of columns) o[c] = r[c] ?? "";
      return o;
    });
    exportTableCsv(ordered, `${cat}-${card.label.replace(/[^a-z0-9]+/gi, "_")}.xlsx`);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4 pr-6">
            <span>
              {card.label} · {card.count.toLocaleString("id-ID")} baris
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={exportNow} disabled={!rows.length}>
            <Download className="mr-2 size-4" /> Export Excel
          </Button>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Memuat data…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada data.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-semibold">NO</th>
                  {columns.map((c) => (
                    <th key={c} className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t hover:bg-muted/40">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{i + 1}</td>
                    {columns.map((c) => (
                      <td key={c} className="whitespace-nowrap px-3 py-2">
                        {r[c] === null || r[c] === undefined ? "" : String(r[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}