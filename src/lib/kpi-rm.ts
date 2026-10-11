// Struktur & hitungan tabel KPI RM (lihat halaman /kpi-rm).
// Kolom tabel bersifat default (tetap); isi tiap baris bisa diedit oleh admin.

export type KpiRow = {
  deskripsi: string;
  bobot: number | null; // persen, mis. 20 = 20%
  target: number | null;
  pencapaian: number | null;
  cap110: boolean; // true -> Score Goal dibatasi maksimal 110
  // Nilai manual (bila admin menimpa hasil hitung otomatis). null/undefined = otomatis.
  achievementManual?: number | null;
  scoreGoalManual?: number | null;
  scoreBobotManual?: number | null;
};

export type KpiView = {
  id: number;
  nama: string;
  periode: string;
  rows: KpiRow[];
};

export const DEFAULT_PERIODE = "MYCORE Juni 2026";

// Judul kolom default.
export const KPI_COLUMNS = {
  no: "NO",
  deskripsi: "DESKRIPSI",
  bobot: "BOBOT",
  target: "TARGET",
  pencapaian: "PENCAPAIAN",
  achievement: "Achievement",
  scoreGoal: "Score Goal",
  scoreBobot: "Score Bobot",
} as const;

// Baris default untuk RM baru (target & pencapaian dikosongkan, diisi manual).
const DEFAULT_ITEMS: { deskripsi: string; bobot: number; cap110?: boolean }[] = [
  { deskripsi: "Average Balance Tabungan", bobot: 20 },
  { deskripsi: "Posisi Tabungan", bobot: 10 },
  { deskripsi: "Average Balance Giro Total", bobot: 10 },
  { deskripsi: "Average Balance Dana Pihak Ketiga (DPK) Total", bobot: 10 },
  { deskripsi: "Akuisisi New Payroll Account", bobot: 10 },
  { deskripsi: "Jumlah Merchant (EDC & QRIS) Produktif", bobot: 10 },
  { deskripsi: "Average Balance CASA Merchant", bobot: 10, cap110: true },
  { deskripsi: "Sales Volume (EDC & QRIS) Merchant", bobot: 5, cap110: true },
  { deskripsi: "Jumlah User Aktif BRImo", bobot: 5 },
  { deskripsi: "Jumlah User Aktif Qlola", bobot: 5 },
  { deskripsi: "Product Holding Nasabah Kelolaan", bobot: 5 },
];

export function defaultRows(): KpiRow[] {
  return DEFAULT_ITEMS.map((i) => ({
    deskripsi: i.deskripsi,
    bobot: i.bobot,
    target: null,
    pencapaian: null,
    cap110: Boolean(i.cap110),
  }));
}

export function computeRow(row: KpiRow) {
  const t = row.target ?? 0;
  const p = row.pencapaian ?? 0;
  const b = row.bobot ?? 0;
  const achievement = row.achievementManual ?? (t > 0 ? (p / t) * 100 : 0);
  const scoreGoal = row.scoreGoalManual ?? (row.cap110 ? Math.min(achievement, 110) : achievement);
  const scoreBobot = row.scoreBobotManual ?? (scoreGoal * b) / 100;
  return { achievement, scoreGoal, scoreBobot };
}

export function computeTotals(rows: KpiRow[]) {
  let bobot = 0;
  let scoreBobot = 0;
  for (const r of rows) {
    bobot += r.bobot ?? 0;
    scoreBobot += computeRow(r).scoreBobot;
  }
  return { bobot, scoreBobot };
}
