import { createFileRoute } from "@tanstack/react-router";

// Google Sheets API (v4) source for the "Time Series" category.
// Fetches values, background colors, merged cells, and hidden columns
// so the dashboard mirrors the sheet (including edits/deletions) near-realtime.

const SPREADSHEET_ID = "1Zq_yn7Zpcq4-_08h0NrHmtFGdYtb8vOf_zFRVMOJmBU";
const SHEET_NAME = "NEW TIME SERIES 2026";
const RANGE = `'${SHEET_NAME}'!B2:KU16`;

// Cache sederhana di memori agar tidak memanggil API Google tiap request.
const CACHE_TTL_MS = 20_000;
let cache: { at: number; body: string } | undefined;

type GridColor = { red?: number; green?: number; blue?: number } | null;
type ApiCellData = {
  formattedValue?: string;
  effectiveValue?: { stringValue?: string; numberValue?: number; boolValue?: boolean };
  effectiveFormat?: { backgroundColor?: GridColor };
};
type ApiRowData = { values?: ApiCellData[] };
type ApiColumnMetadata = { hiddenByUser?: boolean };
type ApiGridData = {
  rowData?: ApiRowData[];
  columnMetadata?: ApiColumnMetadata[];
  startRow?: number;
  startColumn?: number;
};
type ApiSheet = {
  properties?: { title?: string };
  data?: ApiGridData[];
  merges?: {
    startRowIndex?: number;
    endRowIndex?: number;
    startColumnIndex?: number;
    endColumnIndex?: number;
  }[];
};
type ApiResponse = { sheets?: ApiSheet[]; error?: { message?: string } };

type OutCell = { v: string | null; rgb: string | null };

function colorToHex(c: GridColor): string | null {
  if (!c) return null;
  const r = Math.round((c.red ?? 1) * 255);
  const g = Math.round((c.green ?? 1) * 255);
  const b = Math.round((c.blue ?? 1) * 255);
  if (r === 255 && g === 255 && b === 255) return null; // putih = tanpa warna
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function cellValue(c: ApiCellData | undefined): string | null {
  if (!c) return null;
  if (c.formattedValue !== undefined && c.formattedValue !== null) return String(c.formattedValue);
  const ev = c.effectiveValue;
  if (!ev) return null;
  if (ev.stringValue !== undefined) return ev.stringValue;
  if (ev.numberValue !== undefined) return String(ev.numberValue);
  if (ev.boolValue !== undefined) return String(ev.boolValue);
  return null;
}

function colLetter(idx: number): string {
  let s = "";
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function fetchGrid(apiKey: string): Promise<Response> {
  const fields = [
    "sheets(properties(title),merges,",
    "data(startRow,startColumn,columnMetadata(hiddenByUser),",
    "rowData(values(formattedValue,effectiveValue,effectiveFormat(backgroundColor)))))",
  ].join("");
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}` +
    `?includeGridData=true&ranges=${encodeURIComponent(RANGE)}` +
    `&fields=${encodeURIComponent(fields)}` +
    `&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) {
    let message = `Google Sheets API error (${res.status})`;
    try {
      const parsed = JSON.parse(text) as ApiResponse;
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      // ignore
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const data = JSON.parse(text) as ApiResponse;
  const sheet = data.sheets?.[0];
  if (!sheet) {
    return new Response(JSON.stringify({ error: "Sheet tidak ditemukan." }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const gridData = sheet.data?.[0];
  const apiRows = gridData?.rowData ?? [];
  const startRow = gridData?.startRow ?? 0;
  const startCol = gridData?.startColumn ?? 0;
  const colMeta = gridData?.columnMetadata ?? [];

  const rowCount = apiRows.length;
  let colCount = 0;
  for (const r of apiRows) colCount = Math.max(colCount, r.values?.length ?? 0);

  const cells: OutCell[][] = [];
  for (let r = 0; r < rowCount; r++) {
    const line: OutCell[] = [];
    for (let c = 0; c < colCount; c++) {
      const apiCell = apiRows[r]?.values?.[c];
      line.push({
        v: cellValue(apiCell),
        rgb: colorToHex(apiCell?.effectiveFormat?.backgroundColor ?? null),
      });
    }
    cells.push(line);
  }

  const colEmpty: boolean[] = [];
  for (let c = 0; c < colCount; c++) {
    let empty = true;
    for (let r = 0; r < rowCount; r++) {
      if (cells[r]?.[c]?.v) {
        empty = false;
        break;
      }
    }
    colEmpty.push(empty);
  }
  const rowEmpty: boolean[] = cells.map((line) => line.every((c) => !c.v));

  const merges = (sheet.merges ?? []).map((m) => ({
    r1: (m.startRowIndex ?? 0) - startRow,
    r2: (m.endRowIndex ?? 1) - startRow - 1,
    c1: (m.startColumnIndex ?? 0) - startCol,
    c2: (m.endColumnIndex ?? 1) - startCol - 1,
  }));

  const metadata = Array.from({ length: colCount }, (_, i) => ({
    letter: colLetter(startCol + i),
    hidden: colMeta[i]?.hiddenByUser === true,
    empty: colEmpty[i],
  }));

  return new Response(
    JSON.stringify({
      sheet: sheet.properties?.title ?? SHEET_NAME,
      startRow,
      startCol,
      cells,
      rowCount,
      colCount,
      rowEmpty,
      metadata,
      merges,
    }),
    { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } },
  );
}

export const Route = createFileRoute("/api/public/time-series")({
  server: {
    handlers: {
      GET: async () => {
        const apiKey = process.env["GOOGLE_SHEETS_API_KEY"];
        if (!apiKey) {
          return new Response(
            JSON.stringify({
              error:
                "GOOGLE_SHEETS_API_KEY belum diset. Buat API key Google Sheets lalu tambahkan ke environment server.",
            }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
        try {
          if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
            return new Response(cache.body, {
              status: 200,
              headers: { "content-type": "application/json", "cache-control": "no-store" },
            });
          }
          const res = await fetchGrid(apiKey);
          if (res.ok) {
            const body = await res.text();
            cache = { at: Date.now(), body };
            return new Response(body, {
              status: 200,
              headers: { "content-type": "application/json", "cache-control": "no-store" },
            });
          }
          return res;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
