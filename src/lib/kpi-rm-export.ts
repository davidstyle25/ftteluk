// Export tabel KPI RM ke Excel (.xlsx). Nilai yang diexport = nilai yang tampil di layar
// (otomatis atau manual), berupa angka asli sehingga bisa dihitung ulang di Excel.
import { KPI_COLUMNS, computeRow, computeTotals, type KpiRow } from "@/lib/kpi-rm";

export type KpiExportView = { nama: string; periode: string; rows: KpiRow[] };

type Cell = string | number | null;

function buildAoa(v: KpiExportView): Cell[][] {
  const totals = computeTotals(v.rows);
  const aoa: Cell[][] = [
    ["Nama", v.nama],
    ["Periode", v.periode],
    [],
    [
      KPI_COLUMNS.no,
      KPI_COLUMNS.deskripsi,
      `${KPI_COLUMNS.bobot} (%)`,
      KPI_COLUMNS.target,
      KPI_COLUMNS.pencapaian,
      `${KPI_COLUMNS.achievement} (%)`,
      KPI_COLUMNS.scoreGoal,
      KPI_COLUMNS.scoreBobot,
    ],
  ];
  v.rows.forEach((r, i) => {
    const c = computeRow(r);
    aoa.push([
      i + 1,
      r.deskripsi,
      r.bobot,
      r.target,
      r.pencapaian,
      Math.round(c.achievement * 100) / 100,
      Math.round(c.scoreGoal * 100) / 100,
      Math.round(c.scoreBobot * 100) / 100,
    ]);
  });
  aoa.push(["TOTAL", "", totals.bobot, null, null, null, null, Math.round(totals.scoreBobot * 100) / 100]);
  return aoa;
}

const safeSheetName = (s: string, used: Set<string>) => {
  const base = (s.replace(/[\\/?*[\]:]/g, " ").trim() || "KPI").slice(0, 31);
  let name = base;
  let n = 2;
  while (used.has(name.toLowerCase())) {
    const suf = ` (${n++})`;
    name = base.slice(0, 31 - suf.length) + suf;
  }
  used.add(name.toLowerCase());
  return name;
};

/** Export satu atau beberapa RM. Banyak RM -> satu file, satu sheet per RM. */
export async function exportKpiRm(views: KpiExportView[], filename: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const v of views) {
    const ws = XLSX.utils.aoa_to_sheet(buildAoa(v));
    ws["!cols"] = [{ wch: 8 }, { wch: 48 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(v.nama, used));
  }
  XLSX.writeFile(wb, filename);
}