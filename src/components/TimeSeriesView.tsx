import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Cell = { v: string | null; rgb: string | null };
type ColMeta = { letter: string; hidden: boolean; empty: boolean };
type Merge = { r1: number; r2: number; c1: number; c2: number };
type ApiData = {
  sheet: string;
  startRow: number;
  startCol: number;
  cells: Cell[][];
  rowCount: number;
  colCount: number;
  rowEmpty: boolean[];
  metadata: ColMeta[];
  merges: Merge[];
  error?: string;
};

type Span = { rowSpan?: number | undefined; colSpan?: number | undefined; hidden?: boolean | undefined };

function toCss(rgb: string | null): string | undefined {
  return rgb ?? undefined;
}

/** Kolom yang ditampilkan: tidak hidden dan tidak kosong. */
function visibleColumns(data: ApiData): number[] {
  return data.metadata
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => !m.hidden && !m.empty)
    .map(({ i }) => i);
}

/** Baris yang ditampilkan: tidak kosong. */
function visibleRows(data: ApiData): number[] {
  return data.rowEmpty.map((e, i) => ({ e, i })).filter(({ e }) => !e).map(({ i }) => i);
}

function buildMergeMap(data: ApiData, cols: number[], rows: number[]): Map<string, Span> {
  const colPos = new Map<number, number>();
  cols.forEach((c, i) => colPos.set(c, i));
  const rowPos = new Map<number, number>();
  rows.forEach((r, i) => rowPos.set(r, i));

  const spanMap = new Map<string, Span>();
  for (const m of data.merges) {
    const visColsIn = cols.filter((c) => c >= m.c1 && c <= m.c2);
    const visRowsIn = rows.filter((r) => r >= m.r1 && r <= m.r2);
    if (!visColsIn.length || !visRowsIn.length) continue;

    const startRowPos = rowPos.get(visRowsIn[0]!)!;
    const endRowPos = rowPos.get(visRowsIn[visRowsIn.length - 1]!)!;
    const startColPos = colPos.get(visColsIn[0]!)!;
    const endColPos = colPos.get(visColsIn[visColsIn.length - 1]!)!;

    const rowSpan = endRowPos - startRowPos + 1;
    const colSpan = endColPos - startColPos + 1;
    spanMap.set(`${startRowPos}:${startColPos}`, {
      rowSpan: rowSpan > 1 ? rowSpan : undefined,
      colSpan: colSpan > 1 ? colSpan : undefined,
    });
    for (let rr = startRowPos; rr <= endRowPos; rr++) {
      for (let cc = startColPos; cc <= endColPos; cc++) {
        const isTopLeft = rr === startRowPos && cc === startColPos;
        if (isTopLeft) continue;
        spanMap.set(`${rr}:${cc}`, { hidden: true });
      }
    }
  }
  return spanMap;
}

const HEADER_ROWS = 2;

export function TimeSeriesView() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/public/time-series")
      .then(async (r) => {
        const json = (await r.json()) as ApiData;
        if (cancelled) return;
        if (!r.ok || json.error) {
          setError(json.error ?? `Gagal memuat (${r.status})`);
          setData(null);
        } else {
          setData(json);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Sumber: Google Sheet "{data?.sheet ?? "NEW TIME SERIES 2026"}" · realtime
        </p>
        <Button variant="outline" size="sm" onClick={() => setTick((t) => t + 1)} disabled={loading}>
          <RefreshCw className={loading ? "mr-2 size-4 animate-spin" : "mr-2 size-4"} />
          Muat Ulang
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat data…</p>
      ) : data ? (
        <SheetTable data={data} />
      ) : null}
    </div>
  );
}

function SheetTable({ data }: { data: ApiData }) {
  const cols = visibleColumns(data);
  const rows = visibleRows(data);
  const mergeMap = buildMergeMap(data, cols, rows);

  const headerRowIdxs = rows.slice(0, HEADER_ROWS);
  const bodyRowIdxs = rows.slice(HEADER_ROWS);

  const cellAt = (rIdx: number, cIdx: number): Cell => data.cells[rIdx]?.[cIdx] ?? { v: null, rgb: null };

  return (
    <div className="overflow-auto rounded-lg border">
      <table className="border-collapse text-xs">
        <thead>
          {headerRowIdxs.map((rIdx, ri) => (
            <tr key={`h-${ri}`}>
              {cols.map((cIdx, ci) => {
                const span = mergeMap.get(`${ri}:${ci}`);
                if (span?.hidden) return null;
                return (
                  <th
                    key={ci}
                    rowSpan={span?.rowSpan}
                    colSpan={span?.colSpan}
                    style={{ backgroundColor: toCss(cellAt(rIdx, cIdx).rgb) }}
                    className="whitespace-nowrap border border-border px-2 py-1 text-center align-middle font-medium"
                  >
                    {cellAt(rIdx, cIdx).v ?? ""}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {bodyRowIdxs.map((rIdx, ri) => {
            const rowPos = ri + HEADER_ROWS;
            return (
              <tr key={ri}>
                {cols.map((cIdx, ci) => {
                  const span = mergeMap.get(`${rowPos}:${ci}`);
                  if (span?.hidden) return null;
                  return (
                    <td
                      key={ci}
                      rowSpan={span?.rowSpan}
                      colSpan={span?.colSpan}
                      style={{ backgroundColor: toCss(cellAt(rIdx, cIdx).rgb) }}
                      className="whitespace-nowrap border border-border px-2 py-1 text-right align-middle tabular-nums"
                    >
                      {cellAt(rIdx, cIdx).v ?? ""}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
