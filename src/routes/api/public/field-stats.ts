import { createFileRoute } from "@tanstack/react-router";

// Statistik distribusi nilai kolom + daftar baris terfilter.
// - /api/public/field-stats?cat=edc&field=status_edc               -> [{value,count}]
// - /api/public/field-stats?cat=edc&field=status_edc&value=Produktif&rows=1
//                                                                  -> {columns, rows}
//
// Perhitungan dilakukan di database lewat fungsi SQL (field_value_counts, field_zero_count,
// field_rows — lihat supabase/02_security.sql). Fungsi berjalan sebagai user pemanggil,
// jadi RLS tetap berlaku.

const CATEGORY_TABLE: Record<string, string> = {
  edc: "data_edc",
  qris: "data_qris",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

async function handle(request: Request): Promise<Response> {
  const { getUserClient } = await import("@/lib/api/supabase-user.server");
  const { supabase } = await getUserClient(request);

  const url = new URL(request.url);
  const cat = url.searchParams.get("cat") ?? "";
  const field = url.searchParams.get("field") ?? "";
  const value = url.searchParams.get("value");
  const wantRows = url.searchParams.get("rows") === "1";

  const table = CATEGORY_TABLE[cat];
  if (!table) return json({ error: "Kategori tidak dikenal" }, 400);

  // RPC yang belum ada di types.ts hasil generate -> longgarkan tipe pemanggilan.
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;

  // ---- QRIS: Cabang (branch = 285) / Mikro (selain itu), total & Produktif (status_qris) ----
  const QRIS_SPLIT: Record<string, { cabang: boolean; produktif: boolean }> = {
    __qris_cabang__: { cabang: true, produktif: false },
    __qris_mikro__: { cabang: false, produktif: false },
    __qris_cabang_produktif__: { cabang: true, produktif: true },
    __qris_mikro_produktif__: { cabang: false, produktif: true },
  };
  const isCabang = (v: unknown) => /^285(\.0+)?$/.test(String(v ?? "").trim());
  const isProduktif = (v: unknown) => String(v ?? "").trim().toLowerCase() === "produktif";

  // Hitung sekali baca (hanya 2 kolom): total Cabang/Mikro dan yang Produktif (status_qris).
  if (cat === "qris" && field === "__qris_split__") {
    let cabang = 0;
    let mikro = 0;
    let cabangProduktif = 0;
    let mikroProduktif = 0;
    const chunk = 1000;
    for (let i = 0; i < 1000; i++) {
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(table as any)
        .select("branch,status_qris")
        .order("id", { ascending: true })
        .range(i * chunk, i * chunk + chunk - 1);
      if (error) return json({ error: error.message }, 400);
      const part = (data ?? []) as unknown as Record<string, unknown>[];
      for (const r of part) {
        const prod = isProduktif(r["status_qris"]);
        if (isCabang(r["branch"])) {
          cabang++;
          if (prod) cabangProduktif++;
        } else {
          mikro++;
          if (prod) mikroProduktif++;
        }
      }
      if (part.length < chunk) break;
    }
    return json({ cabang, mikro, cabangProduktif, mikroProduktif });
  }

  // Daftar baris untuk popup.
  if (wantRows && cat === "qris" && QRIS_SPLIT[field]) {
    const want = QRIS_SPLIT[field]!;
    const picked: Record<string, unknown>[] = [];
    const chunk = 1000;
    for (let i = 0; i < 1000 && picked.length < 5000; i++) {
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(table as any)
        .select("*")
        .order("id", { ascending: true })
        .range(i * chunk, i * chunk + chunk - 1);
      if (error) return json({ error: error.message }, 400);
      const part = (data ?? []) as unknown as Record<string, unknown>[];
      for (const r of part) {
        if (isCabang(r["branch"]) !== want.cabang) continue;
        if (want.produktif && !isProduktif(r["status_qris"])) continue;
        picked.push(r);
      }
      if (part.length < chunk) break;
    }
    const rows = picked.slice(0, 5000);
    return json({ columns: rows[0] ? Object.keys(rows[0]) : [], rows });
  }

  // ---- Mode daftar baris (untuk popup datatable) ----
  if (wantRows) {
    const { data, error } = await rpc("field_rows", {
      _table: table,
      _field: field,
      _value: value,
    });
    if (error) return json({ error: error.message }, 400);
    const result = (data ?? { columns: [], rows: [] }) as {
      columns: string[];
      rows: Record<string, unknown>[];
    };
    return json(result);
  }

  // ---- Mode total ----
  if (field === "__total__") {
    const { count, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(table as any)
      .select("*", { count: "exact", head: true });
    if (error) return json({ error: error.message }, 400);
    return json({ value: "total", count: count ?? 0 });
  }

  // ---- Mode sales_volume_zero ----
  if (field === "sales_volume_zero") {
    const { data, error } = await rpc("field_zero_count", { _table: table });
    if (error) return json({ error: error.message }, 400);
    return json({ value: "sales_volume_zero", count: Number(data ?? 0) });
  }

  // ---- Mode distribusi nilai ----
  const { data, error } = await rpc("field_value_counts", { _table: table, _field: field });
  if (error) return json({ error: error.message }, 400);
  const rows = (data ?? []) as { value: string | null; count: number | string }[];
  return json(rows.map((r) => ({ value: r.value, count: Number(r.count) })));
}

export const Route = createFileRoute("/api/public/field-stats")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await handle(request);
        } catch (error) {
          if (error instanceof Response) return error;
          const message = error instanceof Error ? error.message : String(error);
          console.error("[field-stats]", message);
          return json({ error: message }, 400);
        }
      },
    },
  },
});