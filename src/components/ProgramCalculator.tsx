import { useMemo, useState, type ReactNode } from "react";
import { Gift, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  HADIAH_LIST,
  JENIS_LIST,
  RATE_TENOR,
  TENOR_LIST,
  hitungProgram,
  type Hadiah,
  type Jenis,
  type Tenor,
} from "@/lib/program";

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const num = (n: number) => Math.round(n).toLocaleString("id-ID");
const pct = (n: number) =>
  `${(n * 100).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const parseRupiah = (s: string) => Number(s.replace(/\D/g, "").slice(0, 15)) || 0;

const DEFAULTS = {
  nominal: 500_000_000,
  tenor: "6 Bulan" as Tenor,
  jenis: "Tabungan Biasa (BritAma/Simpedes)" as Jenis,
  hadiah: "Cashback" as Hadiah,
  rate: 0.075,
};

const selectCls = "h-9 w-full rounded-md border border-input bg-card px-2 text-sm text-foreground";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Kalkulator Reward Program (Cuan Hadiah) — hitungan sama dengan calculator_program.xlsx. */
export function ProgramCalculator() {
  const [nominal, setNominal] = useState(DEFAULTS.nominal);
  const [tenor, setTenor] = useState<Tenor>(DEFAULTS.tenor);
  const [jenis, setJenis] = useState<Jenis>(DEFAULTS.jenis);
  const [hadiah, setHadiah] = useState<Hadiah>(DEFAULTS.hadiah);
  const [rate, setRate] = useState(DEFAULTS.rate);

  const h = useMemo(
    () => hitungProgram({ nominal, tenor, jenis, hadiah, rateDiAtas1M: rate }),
    [nominal, tenor, jenis, hadiah, rate],
  );

  const di1M = h.nominalEfektif > 1_000_000_000;
  const opsiRate = RATE_TENOR[tenor];
  const rateAda = opsiRate.some((r) => Math.abs(r - rate) < 1e-9);

  const reset = () => {
    setNominal(DEFAULTS.nominal);
    setTenor(DEFAULTS.tenor);
    setJenis(DEFAULTS.jenis);
    setHadiah(DEFAULTS.hadiah);
    setRate(DEFAULTS.rate);
  };

  const rows = [h.reward, h.bunga, h.total];

  return (
    <section className="card-elevated mt-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Gift className="size-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Kalkulator Reward Program</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Isi nominal penempatan &amp; tenor untuk melihat estimasi reward
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="mr-2 size-4" /> Reset
        </Button>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* ------------------------------ Input ------------------------------ */}
        <div className="space-y-4">
          <Field
            label="Nominal Penempatan Dana (Rp)"
            hint="Minimum Rp5.000.000. Segmen Rural (< Rp250jt): kelipatan Rp1jt. Segmen Urban (≥ Rp250jt): Rp250jt atau kelipatan Rp100jt."
          >
            <Input
              inputMode="numeric"
              value={nominal ? nominal.toLocaleString("id-ID") : ""}
              onChange={(e) => setNominal(parseRupiah(e.target.value))}
              placeholder="500.000.000"
              className="text-right tabular-nums"
            />
          </Field>

          <Field label="Tenor Penempatan" hint="Pilih 1 Bulan, 3 Bulan, atau 6 Bulan">
            <select
              value={tenor}
              onChange={(e) => setTenor(e.target.value as Tenor)}
              className={selectCls}
            >
              {TENOR_LIST.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Jenis Tabungan"
            hint="VM memakai rate BritAma Bisnis. VQ khusus nominal ≥ Rp250jt."
          >
            <select
              value={jenis}
              onChange={(e) => setJenis(e.target.value as Jenis)}
              className={selectCls}
            >
              {JENIS_LIST.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Pilihan Hadiah"
            hint="Trip ke Barcelona: min. Rp30 Miliar tenor 3 Bulan / Rp15 Miliar tenor 6 Bulan."
          >
            <select
              value={hadiah}
              onChange={(e) => setHadiah(e.target.value as Hadiah)}
              className={selectCls}
            >
              {HADIAH_LIST.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </Field>

          {di1M && (
            <Field
              label="Total Reward + Bunga p.a (nominal > Rp1 Miliar)"
              hint="Pilih salah satu rate sesuai tenor yang dipilih."
            >
              <select
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className={selectCls}
              >
                {!rateAda && <option value={rate}>{pct(rate)} (tidak tersedia)</option>}
                {opsiRate.map((r) => (
                  <option key={r} value={r}>
                    {pct(r)}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {/* ------------------------------ Hasil ------------------------------ */}
        <div className="min-w-0 space-y-4">
          {/* Status validasi (B14, B13, B12) */}
          <div className="space-y-2">
            <p
              className={cn(
                "rounded-md border px-3 py-2 text-sm",
                h.nominalValid
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-amber-300 bg-amber-50 text-amber-900",
              )}
            >
              {h.pesanNominal}
            </p>
            {h.pesanRate && (
              <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {h.pesanRate}
              </p>
            )}
            {h.pesanTrip && (
              <p
                className={cn(
                  "rounded-md border px-3 py-2 text-sm",
                  h.pesanTrip.startsWith("✈️")
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800",
                )}
              >
                {h.pesanTrip}
              </p>
            )}
          </div>

          {/* Ringkasan kategori */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Kategori Program", h.kategori],
              ["Program", h.program],
              ["Segmen Nominal", h.segmen],
              ["Nominal Efektif (Rp)", num(h.nominalEfektif)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/30 px-3 py-2">
                <p className="text-[11px] font-medium text-muted-foreground">{k}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{v}</p>
              </div>
            ))}
          </div>

          {/* Rate total p.a (C10 / C11) */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border px-3 py-2">
              <p className="text-[11px] font-medium text-muted-foreground">
                Total Reward + Bunga p.a (Penempatan Rp5 juta – Rp1 Miliar)
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">{pct(h.totalRatePa)}</p>
              <p className="text-[11px] text-muted-foreground">{h.catatanRateBawah}</p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-[11px] font-medium text-muted-foreground">
                Total Reward + Bunga p.a (Penempatan &gt; Rp1 Miliar)
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">{pct(rate)}</p>
              <p className="text-[11px] text-muted-foreground">{h.catatanRateAtas}</p>
            </div>
          </div>

          {/* Tabel hasil (baris 19–23) */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/60">
                <tr>
                  <th rowSpan={2} className="px-3 py-2 text-left font-semibold">
                    Item
                  </th>
                  <th rowSpan={2} className="px-3 py-2 text-right font-semibold">
                    Rate p.a
                  </th>
                  <th colSpan={3} className="border-l px-3 py-1.5 text-center font-semibold">
                    Reward yang diterima Nasabah Sesuai Tenor
                  </th>
                  <th colSpan={2} className="border-l px-3 py-1.5 text-center font-semibold">
                    Perhitungan Secara p.a
                  </th>
                </tr>
                <tr className="border-t">
                  <th className="border-l px-3 py-1.5 text-right font-semibold">Nominal Gross</th>
                  <th className="px-3 py-1.5 text-right font-semibold">Pajak</th>
                  <th className="px-3 py-1.5 text-right font-semibold">Nominal Nett</th>
                  <th className="border-l px-3 py-1.5 text-right font-semibold">Nominal (Rp) – p.a (1 th)</th>
                  <th className="px-3 py-1.5 text-right font-semibold">Rate tenor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.item} className={cn("border-t", i === 2 && "bg-muted/40 font-semibold")}>
                    <td className="px-3 py-2">{r.item}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{pct(r.rate)}</td>
                    <td className="border-l px-3 py-2 text-right tabular-nums">{num(r.gross)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{num(r.pajak)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{num(r.nett)}</td>
                    <td className="border-l px-3 py-2 text-right tabular-nums">{num(r.nominalPa)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{pct(r.ratePeriode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-4 text-center">
            <p className="text-xs font-semibold tracking-wide text-primary">
              TOTAL REWARD PROGRAM YANG DITERIMA NASABAH (NETT)
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-primary sm:text-3xl">
              {rp(h.rewardNett)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Pajak 20% sudah dipotong. Hanya reward program (tidak termasuk bunga tabungan).
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Perhitungan Bunga Tabungan merupakan estimasi. Namun, pembayaran bunga mengacu pada sistem
            secara otomatis.
          </p>
        </div>
      </div>
    </section>
  );
}