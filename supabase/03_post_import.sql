-- ============================================================================
-- 03_post_import.sql  —  Jalankan SETELAH data lama diimpor (scripts/import-to-supabase.sh
-- menjalankannya otomatis). Menyelaraskan counter id (identity) dengan id tertinggi di tiap
-- tabel supaya INSERT berikutnya tidak bentrok "duplicate key". Aman dijalankan ulang.
-- ============================================================================

set client_min_messages = warning;

do $$
declare
  r record;
  seq text;
  mx bigint;
begin
  -- Hanya tabel biasa di schema public yang punya kolom "id". Pengecekan sequence dilakukan
  -- di dalam loop (bukan di query) supaya tidak ikut dievaluasi untuk tabel schema lain.
  for r in
    select c.relname::text as table_name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'id'
                         and a.attnum > 0 and not a.attisdropped
     where c.relkind in ('r', 'p')
     order by 1
  loop
    seq := pg_get_serial_sequence(format('public.%I', r.table_name), 'id');
    continue when seq is null;
    execute format('select coalesce(max(id), 0) from public.%I', r.table_name) into mx;
    if mx > 0 then
      perform setval(seq, mx, true);
    else
      perform setval(seq, 1, false);
    end if;
  end loop;
end $$;

-- Ringkasan jumlah baris per tabel.
with public_tables as materialized (
  select c.relname::text as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
   where c.relkind in ('r', 'p')
)
select table_name,
       (xpath('/row/c/text()',
              query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::int as jumlah_baris
  from public_tables
 order by table_name;
