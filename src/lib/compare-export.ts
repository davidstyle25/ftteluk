import { supabase } from "@/integrations/supabase/client";

const LIMIT = 100_000_000;
const NUM_FMT = '_-* #,##0.00_-;\\-* #,##0.00_-;_-* "-"??_-;_-@_-';

export const COMPARE_SHEETS = [
  { slug: "mtd_tab", label: "MTD TAB", jenis: "TABUNGAN", src: "data_di319_data2", base: "data_di319_data3" },
  { slug: "ytd_tab", label: "YTD TAB", jenis: "TABUNGAN", src: "data_di319_data1", base: "data_di319_data3" },
  { slug: "mtd_giro", label: "MTD GIRO", jenis: "GIRO", src: "data_di321_data2", base: "data_di321_data3" },
  { slug: "ytd_giro", label: "YTD GIRO", jenis: "GIRO", src: "data_di321_data1", base: "data_di321_data3" },
  { slug: "dtd_tab", label: "DTD TAB", jenis: "TABUNGAN", src: "data_di319_data4", base: "data_di319_data3" },
  { slug: "dtd_giro", label: "DTD GIRO", jenis: "GIRO", src: "data_di321_data4", base: "data_di321_data3" },
] as const;

type Item = { norek: string; nama: string; v1: number; v2: number; rm: string };

const toNum = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

async function fetchAll(table: string): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  const chunk = 1000;
  for (let i = 0; i < 1000; i++) {
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(table as any)
      .select("*")
      .order("id", { ascending: true })
      .range(i * chunk, i * chunk + chunk - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const part = (data ?? []) as unknown as Record<string, unknown>[];
    all.push(...part);
    if (part.length < chunk) break;
  }
  return all;
}

async function fetchPeriode(table: string): Promise<string> {
  const { data, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from(table as any)
    .select("periode")
    .limit(1);
  if (error) return "";
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return String(rows[0]?.["periode"] ?? "");
}

const toItems = (rows: Record<string, unknown>[]): Item[] =>
  rows.map((r) => ({
    norek: String(r["norek"] ?? ""),
    nama: String(r["nama_nasabah"] ?? "").trim(),
    v1: toNum(r["tgl1"]),
    v2: toNum(r["tgl2"]),
    rm: String(r["rm_pengelola"] ?? ""),
  }));

/** Satu file Excel berisi satu sheet per MTD/YTD/DTD (TURUN <= -100 juta, NAIK >= 100 juta). */
export async function exportAllCompare(): Promise<{ sheets: number; rows: number }> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  let totalRows = 0;
  let sheets = 0;

  for (const cfg of COMPARE_SHEETS) {
    const table = `data_${cfg.slug}`;
    const [upRows, downRows, p1, p2] = await Promise.all([
      fetchAll(`${table}_kenaikan`),
      fetchAll(`${table}_penurunan`),
      fetchPeriode(cfg.src),
      fetchPeriode(cfg.base),
    ]);
    const delta = (x: Item) => Math.round((x.v2 - x.v1) * 100) / 100;
    const turun = toItems(downRows)
      .filter((x) => delta(x) <= -LIMIT)
      .sort((a, b) => delta(a) - delta(b));
    const naik = toItems(upRows)
      .filter((x) => delta(x) >= LIMIT)
      .sort((a, b) => delta(b) - delta(a));
    const h1 = p1 || "tgl 1";
    const h2 = p2 || "tgl 2";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws: Record<string, any> = {};
    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
    const put = (r: number, c: number, cell: Record<string, unknown>) => {
      ws[XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })] = cell;
    };
    const str = (v: string) => ({ t: "s", v });
    const num = (v: number, f?: string) => ({ t: "n", v, z: NUM_FMT, ...(f ? { f } : {}) });

    let row = 1;
    const block = (title: string, items: Item[]) => {
      put(row, 1, str(title));
      merges.push({ s: { r: row - 1, c: 0 }, e: { r: row - 1, c: 6 } });
      row += 1;
      ["NO", "Norek", "NAMA NASABAH", h1, h2, "DELTA", "RM PENGELOLA"].forEach((h, i) =>
        put(row, i + 1, str(h)),
      );
      row += 1;
      const first = row;
      items.forEach((x, i) => {
        put(row, 1, { t: "n", v: i + 1 });
        put(row, 2, str(x.norek));
        put(row, 3, str(x.nama));
        put(row, 4, num(x.v1));
        put(row, 5, num(x.v2));
        put(row, 6, num(delta(x), `E${row}-D${row}`));
        put(row, 7, str(x.rm));
        row += 1;
      });
      const last = row - 1;
      put(row, 1, str("Total"));
      if (items.length > 0) {
        put(row, 4, num(items.reduce((a, x) => a + x.v1, 0), `SUM(D${first}:D${last})`));
        put(row, 5, num(items.reduce((a, x) => a + x.v2, 0), `SUM(E${first}:E${last})`));
        put(row, 6, num(items.reduce((a, x) => a + delta(x), 0), `SUM(F${first}:F${last})`));
      }
      row += 3;
    };
    block(`${cfg.jenis} TURUN KC`, turun);
    block(`${cfg.jenis} NAIK KC`, naik);

    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row - 3, c: 6 } });
    ws["!merges"] = merges;
    ws["!cols"] = [{ wch: 5 }, { wch: 20 }, { wch: 28 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, ws, cfg.label);
    sheets += 1;
    totalRows += turun.length + naik.length;
  }

  if (totalRows === 0) throw new Error("Tidak ada data. Jalankan Compare Data lebih dulu.");
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  XLSX.writeFile(wb, `NOMINATIF_MTD_YTD_${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}.xlsx`);
  return { sheets, rows: totalRows };
}