// Kalkulator Reward Program (Cuan Hadiah) — port dari file calculator_program.xlsx
// (sheet "Kalkulator Program NEW" + tabel "Data Program NEW"). Rumus & urutan pengecekan
// dibuat sama dengan rumus sel di Excel (C18, C21, C22, I21, D21, E21, B12–B14, dst).

export type Tenor = "1 Bulan" | "3 Bulan" | "6 Bulan";
export type Jenis = "Tabungan Biasa (BritAma/Simpedes)" | "Junio/Kerjasama/Lainnya" | "VM" | "VQ";
export type Hadiah = "Cashback" | "Barang" | "Trip ke Barcelona";

export const TENOR_LIST: Tenor[] = ["1 Bulan", "3 Bulan", "6 Bulan"];
export const JENIS_LIST: Jenis[] = [
  "Tabungan Biasa (BritAma/Simpedes)",
  "Junio/Kerjasama/Lainnya",
  "VM",
  "VQ",
];
export const HADIAH_LIST: Hadiah[] = ["Cashback", "Barang", "Trip ke Barcelona"];

/** Daftar rate untuk nominal > Rp1 Miliar (kolom T di Excel: Tenor1 / Tenor3 / Tenor6). */
export const RATE_TENOR: Record<Tenor, number[]> = {
  "1 Bulan": [0.055, 0.0575, 0.06, 0.0625, 0.065, 0.0675, 0.07],
  "3 Bulan": [0.055, 0.0575, 0.06, 0.0625, 0.065, 0.0675, 0.07, 0.0725, 0.075],
  "6 Bulan": [0.055, 0.0575, 0.06, 0.0625, 0.065, 0.0675, 0.07, 0.0725, 0.075, 0.0775],
};
const RATE_MAKS: Record<Tenor, number> = { "1 Bulan": 0.07, "3 Bulan": 0.075, "6 Bulan": 0.0775 };
const BULAN: Record<Tenor, number> = { "1 Bulan": 1, "3 Bulan": 3, "6 Bulan": 6 };

type Pasang = { reward: number; bunga: number };
type Tier = {
  min: number;
  kategori: string;
  program: string;
  segmen: string;
  brit: Pasang; // Britama/Simpedes
  vq: Pasang | null;
  junio: Pasang;
};

// 'Data Program NEW'!B5:N12
const TIER: Tier[] = [
  { min: 5_000_000, kategori: "Rural", program: "Rural", segmen: "Rp5jt s.d < Rp50jt", brit: { reward: 0.04, bunga: 0 }, vq: null, junio: { reward: 0.04, bunga: 0 } },
  { min: 50_000_000, kategori: "Rural", program: "Rural", segmen: "Rp50jt s.d < Rp250jt", brit: { reward: 0.04, bunga: 0.001 }, vq: null, junio: { reward: 0.04, bunga: 0.001 } },
  { min: 250_000_000, kategori: "Urban", program: "Urban", segmen: "Rp250jt s.d < Rp500jt", brit: { reward: 0.035, bunga: 0.001 }, vq: { reward: 0.0075, bunga: 0.0375 }, junio: { reward: 0.035, bunga: 0.001 } },
  { min: 500_000_000, kategori: "Urban", program: "Urban", segmen: "Rp500jt s.d 1M", brit: { reward: 0.035, bunga: 0.006 }, vq: { reward: 0.0075, bunga: 0.0375 }, junio: { reward: 0.035, bunga: 0.006 } },
  { min: 1_000_000_001, kategori: "Urban", program: "Urban", segmen: "> Rp1M s.d Rp10M", brit: { reward: 0.0575, bunga: 0.006 }, vq: { reward: 0.04, bunga: 0.0375 }, junio: { reward: 0.0575, bunga: 0.006 } },
  { min: 10_000_000_001, kategori: "Urban", program: "Urban", segmen: "> Rp10M s.d Rp100M", brit: { reward: 0.0575, bunga: 0.007 }, vq: { reward: 0.04, bunga: 0.0375 }, junio: { reward: 0.0575, bunga: 0.006 } },
  { min: 100_000_000_001, kategori: "Urban", program: "Urban", segmen: "> Rp100M s.d 300M", brit: { reward: 0.0575, bunga: 0.007 }, vq: { reward: 0.035, bunga: 0.0425 }, junio: { reward: 0.0575, bunga: 0.006 } },
  { min: 300_000_000_001, kategori: "Urban", program: "Urban", segmen: "> Rp300M", brit: { reward: 0.0575, bunga: 0.007 }, vq: { reward: 0.0275, bunga: 0.05 }, junio: { reward: 0.0575, bunga: 0.006 } },
];

// 'Data Program NEW'!B15:H20 (skema VM; baris Rural kosong)
const VM_TIER: { min: number; reward: number; bunga: number }[] = [
  { min: 5_000_000, reward: 0, bunga: 0 },
  { min: 50_000_000, reward: 0, bunga: 0 },
  { min: 250_000_000, reward: 0.035, bunga: 0.01 },
  { min: 1_000_000_001, reward: 0.0575, bunga: 0.02 },
  { min: 10_000_000_001, reward: 0.0575, bunga: 0.02 },
  { min: 100_000_000_001, reward: 0.0575, bunga: 0.02 },
];

/** VLOOKUP(..., TRUE): baris terakhir yang nilai minimumnya <= nilai yang dicari. */
function cari<T extends { min: number }>(tabel: T[], nilai: number): T | undefined {
  let hasil: T | undefined;
  for (const r of tabel) if (r.min <= nilai) hasil = r;
  return hasil;
}

const floorTo = (n: number, k: number) => Math.floor(n / k) * k;
const fmt = (n: number) => Math.round(n).toLocaleString("id-ID");
const fmtPct = (n: number) =>
  `${(n * 100).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

export type ProgramInput = {
  nominal: number; // Rp (C6)
  tenor: Tenor; // C7
  jenis: Jenis; // C8
  hadiah: Hadiah; // C9
  rateDiAtas1M: number; // C11, mis. 0.075 (dipakai bila nominal efektif > Rp1 Miliar)
};

export type BarisHasil = {
  item: string;
  rate: number; // % p.a (desimal)
  gross: number;
  pajak: number;
  nett: number;
  nominalPa: number; // nominal p.a (1 tahun)
  ratePeriode: number; // rate tenor (desimal)
};

export type HasilProgram = {
  nominalEfektif: number; // C18
  kategori: string; // C16
  program: string; // E16
  segmen: string; // C17
  pesanNominal: string; // B14
  nominalValid: boolean;
  pesanRate: string; // B13
  pesanTrip: string; // B12
  catatanRateBawah: string; // E10
  catatanRateAtas: string; // E11
  labelReward: string; // B21
  labelBunga: string; // B22
  totalRatePa: number; // C10 / C23
  reward: BarisHasil; // baris 21
  bunga: BarisHasil; // baris 22
  total: BarisHasil; // baris 23
  rewardNett: number; // B27
};

const PAJAK = 0.2;

export function hitungProgram(inp: ProgramInput): HasilProgram {
  const c6 = inp.nominal;
  const c7 = inp.tenor;
  const c8 = inp.jenis;
  const c9 = inp.hadiah;
  const c11 = inp.rateDiAtas1M;

  // C18 — nominal efektif
  const c18 = c6 >= 250_000_000 ? Math.max(floorTo(c6, 100_000_000), 250_000_000) : floorTo(c6, 1_000_000);

  const tier = cari(TIER, c18);
  const kategori = tier?.kategori ?? "-"; // C16
  const program = tier?.program ?? "-"; // E16
  const segmen = tier?.segmen ?? "-"; // C17

  // B14 — validasi nominal
  let pesanNominal: string;
  if (c6 < 5_000_000) {
    pesanNominal = "Nominal di bawah minimum program (Rp5.000.000)";
  } else if ((c8 === "VQ" || c8 === "VM") && c6 < 250_000_000) {
    pesanNominal = `Skema ${c8} hanya berlaku untuk penempatan mulai Rp250 juta (segmen Urban)`;
  } else if (c6 >= 250_000_000) {
    if (c6 === 250_000_000 || c6 % 100_000_000 === 0) {
      pesanNominal = "Nominal valid";
    } else {
      const a = c6 < 300_000_000 ? 250_000_000 : floorTo(c6, 100_000_000);
      const b = c6 < 300_000_000 ? 300_000_000 : floorTo(c6, 100_000_000) + 100_000_000;
      pesanNominal = `⚠️ Nominal Rp${fmt(c6)} tidak bisa ditempatkan. Untuk segmen Urban, nominal harus Rp250.000.000 atau kelipatan Rp100 juta (Rp300jt, Rp400jt, dst). Silakan pilih Rp${fmt(a)} atau Rp${fmt(b)}`;
    }
  } else if (c6 % 1_000_000 === 0) {
    pesanNominal = "Nominal valid";
  } else {
    const a = floorTo(c6, 1_000_000);
    pesanNominal = `⚠️ Nominal Rp${fmt(c6)} tidak bisa ditempatkan. Untuk segmen Rural, nominal harus kelipatan Rp1 juta. Silakan pilih Rp${fmt(a)} atau Rp${fmt(a + 1_000_000)}`;
  }
  const nominalValid = pesanNominal === "Nominal valid";

  // B13 — validasi rate (hanya nominal efektif > Rp1 Miliar)
  let pesanRate = "";
  if (c18 > 1_000_000_000) {
    const ada = RATE_TENOR[c7].some((r) => Math.abs(r - c11) < 1e-9);
    if (!ada) {
      pesanRate = `⚠️ Rate ${fmtPct(c11)} tidak tersedia untuk tenor ${c7}. Pilih salah satu rate 5,50% s.d. ${fmtPct(RATE_MAKS[c7])} dengan kelipatan 0,25%.`;
    }
  }

  // B12 — pesan Trip ke Barcelona
  let pesanTrip = "";
  if (c9 === "Trip ke Barcelona") {
    const ok = "✈️ Hadiah akan dikonversi dalam bentuk Trip ke Barcelona (bukan cashback/barang), senilai estimasi reward di bawah.";
    if (c7 === "1 Bulan") {
      pesanTrip = "❌ Trip ke Barcelona tidak tersedia untuk tenor 1 Bulan. Pilih tenor 3 Bulan atau 6 Bulan.";
    } else if (c7 === "3 Bulan") {
      pesanTrip =
        c6 >= 30_000_000_000
          ? ok
          : `❌ Belum bisa pilih Trip ke Barcelona. Untuk tenor 3 Bulan, minimal penempatan Rp30 Miliar. Nominal Anda Rp${fmt(c6)} masih kurang Rp${fmt(30_000_000_000 - c6)}.`;
    } else {
      pesanTrip =
        c6 >= 15_000_000_000
          ? ok
          : `❌ Belum bisa pilih Trip ke Barcelona. Untuk tenor 6 Bulan, minimal penempatan Rp15 Miliar. Nominal Anda Rp${fmt(c6)} masih kurang Rp${fmt(15_000_000_000 - c6)}.`;
    }
  }

  // C21 / C22 — rate reward & bunga tabungan
  const tripTidakBerlaku =
    c9 === "Trip ke Barcelona" &&
    (c7 === "1 Bulan" || (c7 === "3 Bulan" && c6 < 30_000_000_000) || (c7 === "6 Bulan" && c6 < 15_000_000_000));
  const vmVq = c8 === "VQ" || c8 === "VM";
  const nol = !nominalValid || pesanRate !== "" || tripTidakBerlaku || (vmVq && c6 < 250_000_000) || !tier;

  const vm = cari(VM_TIER, c18);
  let c21 = 0;
  let c22 = 0;
  if (!nol && tier) {
    if (c18 > 1_000_000_000) {
      c21 = c8 === "VQ" ? c11 - (tier.vq?.bunga ?? 0) : c11 - 0.02;
    } else if (c8 === "VM") c21 = vm?.reward ?? 0;
    else if (c8 === "VQ") c21 = tier.vq?.reward ?? 0;
    else if (c8 === "Junio/Kerjasama/Lainnya") c21 = tier.junio.reward;
    else c21 = tier.brit.reward;

    if (c8 === "VQ") c22 = tier.vq?.bunga ?? 0;
    else if (c8 === "VM") c22 = vm?.bunga ?? 0;
    else if (c8 === "Junio/Kerjasama/Lainnya") c22 = tier.junio.bunga;
    else c22 = tier.brit.bunga;
  }

  const bulan = BULAN[c7];
  const baris = (item: string, rate: number): BarisHasil => {
    const ratePeriode = (rate * bulan) / 12; // I21
    const gross = c18 * ratePeriode; // D21
    const pajak = PAJAK * gross; // E21
    return { item, rate, gross, pajak, nett: gross - pajak, nominalPa: c18 * rate, ratePeriode };
  };

  const sufiks = c8 === "Tabungan Biasa (BritAma/Simpedes)" ? "" : ` (${c8})`;
  const reward = baris("% Reward Program Include Pajak" + sufiks, c21);
  const bunga = baris("% Bunga Tabungan" + sufiks, c22);
  const total: BarisHasil = {
    item: "Total Reward + Bunga Tabungan",
    rate: c21 + c22,
    gross: reward.gross + bunga.gross,
    pajak: PAJAK * (reward.gross + bunga.gross),
    nett: reward.gross + bunga.gross - PAJAK * (reward.gross + bunga.gross),
    nominalPa: reward.nominalPa + bunga.nominalPa,
    ratePeriode: reward.ratePeriode + bunga.ratePeriode,
  };

  return {
    nominalEfektif: c18,
    kategori,
    program,
    segmen,
    pesanNominal,
    nominalValid,
    pesanRate,
    pesanTrip,
    catatanRateBawah:
      c18 <= 1_000_000_000
        ? "Rate ini yang berlaku untuk penempatan Anda saat ini."
        : "Tidak berlaku - nominal Anda >Rp1 Miliar, lihat baris di bawah.",
    catatanRateAtas:
      c18 <= 1_000_000_000
        ? "Tidak berlaku - nominal Anda ≤Rp1 Miliar, lihat baris di atas."
        : "Pilih salah satu rate dari dropdown sesuai tenor yang dipilih (lihat tabel reward tenor).",
    labelReward: reward.item,
    labelBunga: bunga.item,
    totalRatePa: c21 + c22,
    reward,
    bunga,
    total,
    rewardNett: reward.nett,
  };
}