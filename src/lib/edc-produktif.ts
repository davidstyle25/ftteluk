// Tabel "EDC PRODUKTIF" dan "QRIS PRODUKTIF" di halaman Data Categories.
// Rumus (sama dengan permintaan / sheet):
//   TOTAL PRODUKTIF      = SUDAH PRODUKTIF + EDC/QRIS PRODUKTIF (tanggal terbaru)
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
  edc: number | null; // EDC/QRIS produktif tanggal terbaru
  /** true = Populasi & Sudah Produktif diambil otomatis dari statistik data. */
  auto?: boolean;
  /** Khusus QRIS: sumber angka otomatis = baris Cabang (branch 285) atau Mikro (selain itu). */
  src?: "cabang" | "mikro";
};

export type EdcProdukCfg = {
  title: string;
  /** 12 judul kolom (bisa diedit admin). */
  headers: string[];
  rows: EdcRow[];
};

export const EDC_PRODUK_KEY = "ui_edc_produktif";
export const QRIS_PRODUK_KEY = "ui_qris_produktif";

export const DEFAULT_CFG: EdcProdukCfg = {
  title: "EDC PRODUKTIF",
  headers: [
    "NO",
    "BO TELUK BETUNG",
    "POPULASI",
    "RKA SEPT 2026",
    "SUDAH PRODUKTIF S/D {posisi}",
    "EDC PRODUKTIF 23 SEPT 2026",
    "TOTAL PRODUKTIF",
    "GAP THD RKA SEPT 2026",
    "% THD RKA SEPT 2026",
    "GAP THD RKA SEPT 110%",
    "% THD RKA SEPT 110%",
    "Aspirasi 110%",
  ],
  rows: [{ nama: "CABANG ONLY", populasi: 518, rka: 242, sudah: 211, edc: null, auto: true }],
};

export const QRIS_DEFAULT_CFG: EdcProdukCfg = {
  title: "QRIS PRODUKTIF",
  headers: [
    "NO",
    "BO TELUK BETUNG",
    "POPULASI",
    "RKA SEPT 2026",
    "SUDAH PRODUKTIF S/D {posisi}",
    "QRIS PRODUKTIF 23 SEPT 2026",
    "TOTAL PRODUKTIF",
    "GAP THD RKA SEPT 2026",
    "% THD RKA SEPT 2026",
    "GAP THD RKA 110%",
    "% THD RKA SEPT 110%",
    "Aspirasi 110%",
  ],
  rows: [
    { nama: "CABANG ONLY", populasi: 4881, rka: 1127, sudah: 805, edc: null, auto: true, src: "cabang" },
    { nama: "MIKRO", populasi: 13599, rka: 2744, sudah: 2862, edc: null, auto: true, src: "mikro" },
  ],
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
export function parseCfg(raw: string | null | undefined, def: EdcProdukCfg = DEFAULT_CFG): EdcProdukCfg {
  if (!raw) return def;
  try {
    const o = JSON.parse(raw) as Partial<EdcProdukCfg>;
    const headers = def.headers.map((h, i) =>
      typeof o.headers?.[i] === "string" ? (o.headers[i] as string) : h,
    );
    const rows = Array.isArray(o.rows)
      ? o.rows.map((r, i) => {
          const d = def.rows[i];
          // Data yang disimpan sebelum ada kolom "src": ikuti default (QRIS: Cabang/Mikro otomatis).
          const legacy = !!d?.src && !r?.src;
          return {
            auto: legacy ? true : typeof r?.auto === "boolean" ? r.auto : i === 0,
            src:
              r?.src === "cabang" || r?.src === "mikro" ? r.src : legacy ? d!.src : undefined,
            nama: String(r?.nama ?? ""),
            populasi: typeof r?.populasi === "number" ? r.populasi : null,
            rka: typeof r?.rka === "number" ? r.rka : null,
            sudah: typeof r?.sudah === "number" ? r.sudah : null,
            edc: typeof r?.edc === "number" ? r.edc : null,
          };
        })
      : def.rows;
    return { title: typeof o.title === "string" ? o.title : def.title, headers, rows };
  } catch {
    return def;
  }
}

// ---------------------------------------------------------------------------
// Tanggal dari kolom "posisi" data -> "20 SEPTEMBER 2026"
// ---------------------------------------------------------------------------
const BULAN = [
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER",
];
const BULAN_KEY: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2, pebruari: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, agt: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10,
  nov: 11, november: 11, nop: 11,
  des: 12, desember: 12, dec: 12, december: 12,
};

const fullYear = (y: number) => (y < 100 ? 2000 + y : y);

function validDmy(d: number, m: number, y: number) {
  return d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2200;
}

/** Ubah teks tanggal dari kolom posisi menjadi "20 SEPTEMBER 2026". null bila tidak terbaca. */
export function formatPosisi(raw: string | null | undefined): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const out = (d: number, m: number, y: number) =>
    validDmy(d, m, y) ? `${d} ${BULAN[m - 1]} ${y}` : null;

  // 2026-09-20 / 2026/09/20 (boleh diikuti jam)
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return out(Number(m[3]), Number(m[2]), Number(m[1]));

  // 20/09/2026, 20-09-2026, 20.09.26 (hari/bulan/tahun); bila bulan > 12 dianggap bulan/hari
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    let d = Number(m[1]);
    let mo = Number(m[2]);
    if (mo > 12 && d <= 12) [d, mo] = [mo, d];
    return out(d, mo, fullYear(Number(m[3])));
  }

  // 20 Sep 2026, 20-Sep-26, 20 September 2026
  m = t.match(/^(\d{1,2})[\s-]+([A-Za-z]+)[\s,.-]+(\d{2,4})/);
  if (m) {
    const mo = BULAN_KEY[m[2]!.toLowerCase()];
    if (mo) return out(Number(m[1]), mo, fullYear(Number(m[3])));
  }

  // Sep 20, 2026
  m = t.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const mo = BULAN_KEY[m[1]!.toLowerCase()];
    if (mo) return out(Number(m[2]), mo, Number(m[3]));
  }

  // Nomor seri tanggal Excel (mis. 46285)
  if (/^\d{5}(\.\d+)?$/.test(t)) {
    const serial = Math.floor(Number(t));
    if (serial > 20000 && serial < 80000) {
      const dt = new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
      return out(dt.getUTCDate(), dt.getUTCMonth() + 1, dt.getUTCFullYear());
    }
  }

  return t.toUpperCase(); // format tak dikenal: tampilkan apa adanya
}

/** Ganti {posisi} pada judul kolom dengan tanggal dari data. */
export function resolveHeader(h: string, posisi: string | null | undefined): string {
  return h.replace(/\{posisi\}/gi, posisi ?? "…");
}