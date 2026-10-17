import { useMemo, useState } from "react";
import { Calculator, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  METODE_LABEL,
  hitungDeposito,
  type DepositoInput,
  type Metode,
} from "@/lib/deposito";

const TENOR_PRESET = [1, 3, 6, 12, 24];
const NOMINAL_PRESET = [10_000_000, 50_000_000, 100_000_000, 500_000_000, 1_000_000_000];

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const pct = (n: number, d = 2) => `${n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
const tgl = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "1.250.000" / "1250000" -> 1250000 */
const parseRupiah = (s: string) => Number(s.replace(/\D/g, "")) || 0;
/** "4,5" / "4.5" -> 4.5 */
const parseDecimal = (s: string) => {
  const n = Number(s.replace(",", ".").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const DEFAULTS = {
  nominal: 100_000_000,
  tenor: 12,
  bunga: "4,5",
  metode: "akhir" as Metode,
  kenaPajak: true,
  tarif: "20",
  batas: 7_500_000,
  basis: 365 as 360 | 365,
};

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "primary" | "green" | "red";
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        tone === "primary" && "border-primary/25 bg-primary/5",
        tone === "green" && "border-green-200 bg-green-50",
        tone === "red" && "border-red-200 bg-red-50",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-bold tabular-nums sm:text-xl",
          tone === "primary" && "text-primary",
          tone === "green" && "text-green-700",
          tone === "red" && "text-red-700",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Kalkulator deposito: nominal, tenor, suku bunga, pajak, dan 3 metode pembayaran bunga. */
export function DepositoCalculator() {
  const [nominal, setNominal] = useState(DEFAULTS.nominal);
  const [tenor, setTenor] = useState(DEFAULTS.tenor);
  const [bunga, setBunga] = useState(DEFAULTS.bunga);
  const [mulai, setMulai] = useState(() => isoDate(new Date()));
  const [metode, setMetode] = useState<Metode>(DEFAULTS.metode);
  const [kenaPajak, setKenaPajak] = useState(DEFAULTS.kenaPajak);
  const [tarif, setTarif] = useState(DEFAULTS.tarif);
  const [batas, setBatas] = useState(DEFAULTS.batas);
  const [basis, setBasis] = useState<360 | 365>(DEFAULTS.basis);
  const [showDetail, setShowDetail] = useState(true);

  const tanggalMulai = useMemo(() => {
    const [y, m, d] = mulai.split("-").map(Number);
    return y && m && d ? new Date(y, m - 1, d) : new Date();
  }, [mulai]);

  const input: DepositoInput = {
    nominal,
    tenorBulan: tenor,
    bungaTahunan: parseDecimal(bunga),
    mulai: tanggalMulai,
    metode,
    kenaPajak,
    tarifPajak: parseDecimal(tarif),
    batasBebasPajak: batas,
    basisHari: basis,
  };

  const valid = nominal > 0 && tenor >= 1 && tenor <= 120 && parseDecimal(bunga) > 0;
  const hasil = useMemo(() => hitungDeposito(input), [
    nominal,
    tenor,
    bunga,
    tanggalMulai,
    metode,
    kenaPajak,
    tarif,
    batas,
    basis,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Perbandingan ketiga metode dengan input yang sama.
  const banding = useMemo(
    () =>
      (Object.keys(METODE_LABEL) as Metode[]).map((m) => ({
        metode: m,
        hasil: hitungDeposito({ ...input, metode: m }),
      })),
    [nominal, tenor, bunga, tanggalMulai, kenaPajak, tarif, batas, basis], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const reset = () => {
    setNominal(DEFAULTS.nominal);
    setTenor(DEFAULTS.tenor);
    setBunga(DEFAULTS.bunga);
    setMulai(isoDate(new Date()));
    setMetode(DEFAULTS.metode);
    setKenaPajak(DEFAULTS.kenaPajak);
    setTarif(DEFAULTS.tarif);
    setBatas(DEFAULTS.batas);
    setBasis(DEFAULTS.basis);
  };

  const selectCls =
    "h-9 w-full rounded-md border border-input bg-card px-2 text-sm text-foreground";

  return (
    <section className="card-elevated mt-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Calculator className="size-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Kalkulator Deposito</h2>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="mr-2 size-4" /> Reset
        </Button>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* ------------------------------ Input ------------------------------ */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dep-nominal">Nominal Deposito (Rp)</Label>
            <Input
              id="dep-nominal"
              inputMode="numeric"
              value={nominal ? nominal.toLocaleString("id-ID") : ""}
              onChange={(e) => setNominal(parseRupiah(e.target.value))}
              placeholder="100.000.000"
              className="text-right tabular-nums"
            />
            <div className="flex flex-wrap gap-1.5">
              {NOMINAL_PRESET.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNominal(n)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:bg-muted",
                    nominal === n && "border-primary bg-primary/10 text-primary",
                  )}
                >
                  {n >= 1_000_000_000 ? `${n / 1_000_000_000} M` : `${n / 1_000_000} jt`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dep-tenor">Jangka Waktu (bulan)</Label>
            <Input
              id="dep-tenor"
              inputMode="numeric"
              value={tenor || ""}
              onChange={(e) => setTenor(Math.min(120, parseRupiah(e.target.value)))}
              placeholder="12"
              className="text-right tabular-nums"
            />
            <div className="flex flex-wrap gap-1.5">
              {TENOR_PRESET.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTenor(t)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:bg-muted",
                    tenor === t && "border-primary bg-primary/10 text-primary",
                  )}
                >
                  {t} bln
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dep-bunga">Suku Bunga (% / tahun)</Label>
              <Input
                id="dep-bunga"
                inputMode="decimal"
                value={bunga}
                onChange={(e) => setBunga(e.target.value)}
                placeholder="4,5"
                className="text-right tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dep-mulai">Tanggal Mulai</Label>
              <Input
                id="dep-mulai"
                type="date"
                value={mulai}
                onChange={(e) => setMulai(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dep-metode">Pembayaran Bunga</Label>
            <select
              id="dep-metode"
              value={metode}
              onChange={(e) => setMetode(e.target.value as Metode)}
              className={selectCls}
            >
              {(Object.keys(METODE_LABEL) as Metode[]).map((m) => (
                <option key={m} value={m}>
                  {METODE_LABEL[m]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dep-basis">Basis Hari</Label>
            <select
              id="dep-basis"
              value={basis}
              onChange={(e) => setBasis(Number(e.target.value) as 360 | 365)}
              className={selectCls}
            >
              <option value={365}>365 hari / tahun</option>
              <option value={360}>360 hari / tahun</option>
            </select>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="dep-pajak" className="cursor-pointer">
                Kenakan pajak bunga (PPh final)
              </Label>
              <Switch id="dep-pajak" checked={kenaPajak} onCheckedChange={setKenaPajak} />
            </div>
            {kenaPajak && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dep-tarif" className="text-xs">
                    Tarif (%)
                  </Label>
                  <Input
                    id="dep-tarif"
                    inputMode="decimal"
                    value={tarif}
                    onChange={(e) => setTarif(e.target.value)}
                    className="text-right tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dep-batas" className="text-xs">
                    Bebas pajak s.d. (Rp)
                  </Label>
                  <Input
                    id="dep-batas"
                    inputMode="numeric"
                    value={batas.toLocaleString("id-ID")}
                    onChange={(e) => setBatas(parseRupiah(e.target.value))}
                    className="text-right tabular-nums"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------ Hasil ------------------------------ */}
        <div className="min-w-0 space-y-5">
          {!valid ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Isi nominal, jangka waktu (1–120 bulan), dan suku bunga untuk melihat hasil perhitungan.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Stat label="Total Diterima di Jatuh Tempo" value={rp(hasil.totalAkhir)} tone="primary" />
                <Stat label="Bunga Bersih" value={rp(hasil.bungaBersih)} tone="green" />
                <Stat
                  label="Pajak Bunga"
                  value={rp(hasil.pajak)}
                  tone="red"
                  hint={
                    !kenaPajak
                      ? "Pajak tidak dikenakan"
                      : hasil.pajakBerlaku
                        ? `${tarif}% dari bunga kotor`
                        : `Nominal ≤ ${rp(batas)} (bebas pajak)`
                  }
                />
                <Stat label="Bunga Kotor" value={rp(hasil.bungaKotor)} />
                <Stat
                  label="Rata-rata Bunga Bersih / Bulan"
                  value={rp(hasil.rataBungaBersihPerBulan)}
                />
                <Stat
                  label="Hasil Bersih Efektif / Tahun"
                  value={pct(hasil.yieldEfektifTahunan)}
                  hint={`Bunga ${pct(parseDecimal(bunga))} p.a. sebelum pajak`}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                Penempatan <strong className="text-foreground">{tgl(tanggalMulai)}</strong> sampai
                jatuh tempo <strong className="text-foreground">{tgl(hasil.jatuhTempo)}</strong> (
                {hasil.totalHari.toLocaleString("id-ID")} hari, {tenor} bulan).
              </p>

              {/* Perbandingan metode */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Perbandingan metode pembayaran bunga</h3>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-xs">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Metode</th>
                        <th className="px-3 py-2 text-right font-semibold">Bunga Bersih</th>
                        <th className="px-3 py-2 text-right font-semibold">Total Diterima</th>
                        <th className="px-3 py-2 text-right font-semibold">Efektif / Tahun</th>
                      </tr>
                    </thead>
                    <tbody>
                      {banding.map(({ metode: m, hasil: h }) => (
                        <tr
                          key={m}
                          className={cn("border-t", m === metode && "bg-primary/5 font-medium")}
                        >
                          <td className="px-3 py-2">{METODE_LABEL[m]}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{rp(h.bungaBersih)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{rp(h.totalAkhir)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {pct(h.yieldEfektifTahunan)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rincian per bulan */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Rincian per bulan</h3>
                  <button
                    type="button"
                    onClick={() => setShowDetail((v) => !v)}
                    className="text-xs text-primary hover:underline"
                  >
                    {showDetail ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </div>
                {showDetail && (
                  <div className="max-h-96 overflow-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/90">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Bln</th>
                          <th className="px-3 py-2 text-left font-semibold">Periode</th>
                          <th className="px-3 py-2 text-right font-semibold">Hari</th>
                          <th className="px-3 py-2 text-right font-semibold">Pokok</th>
                          <th className="px-3 py-2 text-right font-semibold">Bunga Kotor</th>
                          <th className="px-3 py-2 text-right font-semibold">Pajak</th>
                          <th className="px-3 py-2 text-right font-semibold">Bunga Bersih</th>
                          <th className="px-3 py-2 text-right font-semibold">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hasil.baris.map((b) => (
                          <tr key={b.no} className="border-t">
                            <td className="px-3 py-1.5">{b.no}</td>
                            <td className="whitespace-nowrap px-3 py-1.5">
                              {tgl(b.dari)} – {tgl(b.sampai)}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{b.hari}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">
                              {Math.round(b.pokok).toLocaleString("id-ID")}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums">
                              {b.bungaKotor.toLocaleString("id-ID")}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums">
                              {b.pajak.toLocaleString("id-ID")}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums">
                              {b.bungaBersih.toLocaleString("id-ID")}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums">
                              {Math.round(b.saldoAkhir).toLocaleString("id-ID")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="sticky bottom-0 bg-muted/90 font-semibold">
                        <tr className="border-t">
                          <td className="px-3 py-2" colSpan={4}>
                            Total
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {hasil.bungaKotor.toLocaleString("id-ID")}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {hasil.pajak.toLocaleString("id-ID")}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {hasil.bungaBersih.toLocaleString("id-ID")}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {Math.round(hasil.totalAkhir).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                {metode === "akhir" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Pada metode “bunga dibayar di akhir”, kolom bunga per bulan hanya akrual; bunga dan
                    pajak dibayarkan sekaligus pada bulan terakhir.
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Perhitungan bersifat simulasi: bunga = pokok × suku bunga × hari ÷ {basis}. Nilai di
                bank dapat berbeda sedikit karena pembulatan, kebijakan pajak, dan ketentuan produk.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}