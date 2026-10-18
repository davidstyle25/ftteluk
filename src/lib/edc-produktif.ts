// Tabel "EDC PRODUKTIF" di halaman Data Categories > EDC.
// Rumus (sama dengan permintaan / sheet):
//   TOTAL PRODUKTIF      = SUDAH PRODUKTIF + EDC PRODUKTIF (tanggal terbaru)
//   GAP THD RKA          = TOTAL PRODUKTIF - RKA
//   % THD RKA            = TOTAL PRODUKTIF / RKA x 100
//   ASPIRASI 110%        = RKA x 110%
//   GAP THD RKA 110%     = TOTAL PRODUKTIF - ASPIRASI 110%
//   % THD RKA 110%       = TOTAL PRODUKTIF / ASPIRASI 110% x 100

export type EdcRow = {
  nama: string;
  populasi: number | null;
  rka: number | null;
  sudah: number | null; // sudah produktif s/d tanggal tertentu
  edc: number | null; // EDC produktif tanggal terbaru
};

export type EdcProdukCfg = {
  title: string;
  /** 12 judul kolom (bisa diedit admin). */
  headers: string[];
  rows: EdcRow[];
};

export const EDC_PRODUK_KEY = "ui_edc_produktif";

export const DEFAULT_CFG: EdcProdukCfg = {
  title: "EDC PRODUKTIF",
  headers: [
    "NO",
    "BO TELUK BETUNG",
    "POPULASI",
    "RKA SEPT 2026",
    "SUDAH PRODUKTIF S/D 20 SEPTEMBER 2026",
    "EDC PRODUKTIF 23 SEPT 2026",
    "TOTAL PRODUKTIF",
    "GAP THD RKA SEPT 2026",
    "% THD RKA SEPT 2026",
    "GAP THD RKA SEPT 110%",
    "% THD RKA SEPT 110%",
    "Aspirasi 110%",
  ],
  rows: [{ nama: "CABANG ONLY", populasi: 518, rka: 242, sudah: 211, edc: null }],
};

export type EdcCalc = {
  populasi: number;
  rka: number;
  sudah: number;
  edc: number;
  total: number;
  gapRka: number;
  pctRka: number; // persen
  aspirasi: number;
  gap110: number;
  pct110: number; // persen
};

const n = (v: number | null | undefined) => (Number.isFinite(v as number) ? (v as number) : 0);

export function calcFromTotals(populasi: number, rka: number, sudah: number, edc: number): EdcCalc {
  const total = sudah + edc;
  const aspirasi = rka * 1.1;
  return {
    populasi,
    rka,
    sudah,
    edc,
    total,
    gapRka: total - rka,
    pctRka: rka > 0 ? (total / rka) * 100 : 0,
    aspirasi,
    gap110: total - aspirasi,
    pct110: aspirasi > 0 ? (total / aspirasi) * 100 : 0,
  };
}

export function calcRow(r: EdcRow): EdcCalc {
  return calcFromTotals(n(r.populasi), n(r.rka), n(r.sudah), n(r.edc));
}

export function calcTotal(rows: EdcRow[]): EdcCalc {
  const sum = (k: "populasi" | "rka" | "sudah" | "edc") => rows.reduce((s, r) => s + n(r[k]), 0);
  return calcFromTotals(sum("populasi"), sum("rka"), sum("sudah"), sum("edc"));
}

/** Gabungkan data tersimpan dengan default supaya aman bila formatnya berbeda. */
export function parseCfg(raw: string | null | undefined): EdcProdukCfg {
  if (!raw) return DEFAULT_CFG;
  try {
    const o = JSON.parse(raw) as Partial<EdcProdukCfg>;
    const headers = DEFAULT_CFG.headers.map((h, i) =>
      typeof o.headers?.[i] === "string" ? (o.headers[i] as string) : h,
    );
    const rows = Array.isArray(o.rows)
      ? o.rows.map((r) => ({
          nama: String(r?.nama ?? ""),
          populasi: typeof r?.populasi === "number" ? r.populasi : null,
          rka: typeof r?.rka === "number" ? r.rka : null,
          sudah: typeof r?.sudah === "number" ? r.sudah : null,
          edc: typeof r?.edc === "number" ? r.edc : null,
        }))
      : DEFAULT_CFG.rows;
    return { title: typeof o.title === "string" ? o.title : DEFAULT_CFG.title, headers, rows };
  } catch {
    return DEFAULT_CFG;
  }
}