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
