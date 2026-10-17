// Perhitungan kalkulator deposito (fungsi murni, mudah diuji).
//
// Rumus bunga per periode: bunga = pokok x suku bunga x hari / basis hari (365 atau 360).
// Pajak: PPh final atas bunga (default 20%), hanya jika nominal di atas batas bebas pajak
// (default Rp 7.500.000, sesuai ketentuan PPh final bunga deposito).

export type Metode = "akhir" | "bulanan" | "aro";

export const METODE_LABEL: Record<Metode, string> = {
  akhir: "Bunga dibayar di akhir (jatuh tempo)",
  bulanan: "Bunga dibayar tiap bulan (pokok tetap)",
  aro: "ARO pokok + bunga (bunga berbunga tiap bulan)",
};

export type DepositoInput = {
  nominal: number; // Rp
  tenorBulan: number; // bulan (bilangan bulat >= 1)
  bungaTahunan: number; // % per tahun, mis. 4.5
  mulai: Date; // tanggal penempatan
  metode: Metode;
  kenaPajak: boolean;
  tarifPajak: number; // %, mis. 20
  batasBebasPajak: number; // Rp, mis. 7_500_000
  basisHari: 360 | 365;
};

export type Baris = {
  no: number;
  dari: Date;
  sampai: Date;
  hari: number;
  pokok: number; // saldo pokok yang dihitung bunganya pada periode ini
  bungaKotor: number;
  pajak: number;
  bungaBersih: number;
  saldoAkhir: number; // saldo setelah periode (khusus ARO bertambah; lainnya = pokok)
};

export type HasilDeposito = {
  jatuhTempo: Date;
  totalHari: number;
  pajakBerlaku: boolean;
  baris: Baris[];
  bungaKotor: number;
  pajak: number;
  bungaBersih: number;
  totalAkhir: number; // pokok + bunga bersih yang diterima saat jatuh tempo
  rataBungaBersihPerBulan: number;
  /** Hasil bersih efektif setahun (%), memperhitungkan lama penempatan sebenarnya. */
  yieldEfektifTahunan: number;
};

/** Tambah bulan; bila tanggal tidak ada di bulan tujuan (mis. 31 Jan + 1 bulan) dipakai hari terakhir bulan itu. */
export function addMonths(d: Date, n: number): Date {
  const y = d.getFullYear();
  const m = d.getMonth() + n;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(d.getDate(), lastDay));
}

/** Selisih hari kalender (abaikan jam & DST). */
export function daysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

export function hitungDeposito(inp: DepositoInput): HasilDeposito {
  const nominal = Math.max(0, inp.nominal);
  const tenor = Math.max(1, Math.floor(inp.tenorBulan));
  const rate = Math.max(0, inp.bungaTahunan) / 100;
  const taxRate = Math.max(0, inp.tarifPajak) / 100;
  const pajakBerlaku = inp.kenaPajak && nominal > inp.batasBebasPajak;

  const hitungPajak = (kotor: number) => (pajakBerlaku ? Math.round(kotor * taxRate) : 0);

  const jatuhTempo = addMonths(inp.mulai, tenor);
  const totalHari = daysBetween(inp.mulai, jatuhTempo);
  const baris: Baris[] = [];

  if (inp.metode === "akhir") {
    // Bunga dihitung sekali untuk seluruh masa penempatan; rincian bulanan hanya akrual.
    const kotorTotal = Math.round((nominal * rate * totalHari) / inp.basisHari);
    const pajakTotal = hitungPajak(kotorTotal);
    let akumulasiKotor = 0;
    for (let i = 1; i <= tenor; i++) {
      const dari = addMonths(inp.mulai, i - 1);
      const sampai = addMonths(inp.mulai, i);
      const hari = daysBetween(dari, sampai);
      const kotor =
        i === tenor ? kotorTotal - akumulasiKotor : Math.round((nominal * rate * hari) / inp.basisHari);
      akumulasiKotor += kotor;
      const pajak = i === tenor ? pajakTotal : 0;
      baris.push({
        no: i,
        dari,
        sampai,
        hari,
        pokok: nominal,
        bungaKotor: kotor,
        pajak,
        bungaBersih: kotor - pajak,
        saldoAkhir: nominal,
      });
    }
  } else {
    let saldo = nominal;
    for (let i = 1; i <= tenor; i++) {
      const dari = addMonths(inp.mulai, i - 1);
      const sampai = addMonths(inp.mulai, i);
      const hari = daysBetween(dari, sampai);
      const kotor = Math.round((saldo * rate * hari) / inp.basisHari);
      const pajak = hitungPajak(kotor);
      const bersih = kotor - pajak;
      const pokok = saldo;
      if (inp.metode === "aro") saldo += bersih;
      baris.push({
        no: i,
        dari,
        sampai,
        hari,
        pokok,
        bungaKotor: kotor,
        pajak,
        bungaBersih: bersih,
        saldoAkhir: inp.metode === "aro" ? saldo : nominal,
      });
    }
  }

  const bungaKotor = baris.reduce((s, b) => s + b.bungaKotor, 0);
  const pajak = baris.reduce((s, b) => s + b.pajak, 0);
  const bungaBersih = bungaKotor - pajak;
  const totalAkhir = nominal + bungaBersih;
  const yieldEfektifTahunan =
    nominal > 0 && totalHari > 0 ? (Math.pow(totalAkhir / nominal, 365 / totalHari) - 1) * 100 : 0;

  return {
    jatuhTempo,
    totalHari,
    pajakBerlaku,
    baris,
    bungaKotor,
    pajak,
    bungaBersih,
    totalAkhir,
    rataBungaBersihPerBulan: bungaBersih / tenor,
    yieldEfektifTahunan,
  };
}