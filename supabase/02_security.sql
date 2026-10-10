-- ============================================================================
-- 02_security.sql  —  Fungsi, hak akses (GRANT) dan Row Level Security (RLS)
--
-- Jalankan SETELAH 01_schema.sql, sebagai role "postgres". Aman dijalankan ulang.
--
-- Aturan akses (sama dengan perilaku aplikasi):
--   * Semua tabel data (data_*, rka_*)  : semua user login boleh BACA, hanya admin boleh TULIS
--   * data_pivot_multi                  : semua user login boleh baca & tulis
--   * activity_logs                     : user login boleh baca & menambah log, hanya admin boleh hapus
--   * links, settings, calendar_events  : semua baca, hanya admin tulis
--   * activity_notes                    : semua user login boleh baca & tulis
--   * user_roles                        : user hanya melihat role miliknya (admin melihat semua);
--                                         perubahan role hanya lewat server (service_role)
--   * Pengunjung tanpa login (anon)     : tidak punya akses apa pun
-- ============================================================================

set client_min_messages = warning;

-- ----------------------------------------------------------------- fungsi ----

-- Cek role user. SECURITY DEFINER agar bisa dipakai di dalam kebijakan RLS.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Nilai "nol / kosong" pada kolom teks angka (dipakai kartu statistik EDC).
create or replace function public.is_zero_amount(v text)
returns boolean
language sql
immutable
as $$
  select case
    when nullif(regexp_replace(coalesce(v, ''), '[^0-9.-]', '', 'g'), '') is null then true
    when nullif(regexp_replace(coalesce(v, ''), '[^0-9.-]', '', 'g'), '') !~ '^-?[0-9]+(\.[0-9]+)?$' then true
    else nullif(regexp_replace(coalesce(v, ''), '[^0-9.-]', '', 'g'), '')::numeric = 0
  end
$$;

-- Compare data: bandingkan saldo antar tabel lalu isi tabel kenaikan/penurunan.
-- Otorisasi dilakukan DI DALAM fungsi (admin saja), karena fungsi berjalan sebagai pemilik.
create or replace function public.run_compare(_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  src_table text; base_table text; bal_col text; rm_col text;
  up_table text; down_table text; sql text; n_up int; n_down int;
begin
  if not (
    coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
    or public.has_role(auth.uid(), 'admin')
  ) then
    raise exception 'Hanya admin yang dapat menjalankan compare data.' using errcode = '42501';
  end if;

  if _kind = 'mtd_giro' then
    src_table := 'data_di321_data2'; base_table := 'data_di321_data3';
    bal_col := 'balance'; rm_col := 'pn_rm_dana';
    up_table := 'data_mtd_giro_kenaikan'; down_table := 'data_mtd_giro_penurunan';
  elsif _kind = 'ytd_giro' then
    src_table := 'data_di321_data1'; base_table := 'data_di321_data3';
    bal_col := 'balance'; rm_col := 'pn_rm_dana';
    up_table := 'data_ytd_giro_kenaikan'; down_table := 'data_ytd_giro_penurunan';
  elsif _kind = 'mtd_tab' then
    src_table := 'data_di319_data2'; base_table := 'data_di319_data3';
    bal_col := 'balance'; rm_col := 'pn_rm_dana_mantri';
    up_table := 'data_mtd_tab_kenaikan'; down_table := 'data_mtd_tab_penurunan';
  elsif _kind = 'ytd_tab' then
    src_table := 'data_di319_data1'; base_table := 'data_di319_data3';
    bal_col := 'balance'; rm_col := 'pn_rm_dana_mantri';
    up_table := 'data_ytd_tab_kenaikan'; down_table := 'data_ytd_tab_penurunan';
  else
    raise exception 'unknown compare kind %', _kind;
  end if;

  execute format('delete from public.%I', up_table);
  execute format('delete from public.%I', down_table);

  sql := format(
    'with j as (select b.account_number as norek, coalesce(b.short_name, s.short_name) as nama,'
    ' coalesce(nullif(regexp_replace(s.%1$I, ''[^0-9.-]'', '''', ''g''), '''')::numeric, 0) as v1,'
    ' coalesce(nullif(regexp_replace(b.%1$I, ''[^0-9.-]'', '''', ''g''), '''')::numeric, 0) as v2,'
    ' coalesce(b.%2$I, s.%2$I) as rm'
    ' from public.%3$I b join public.%4$I s on s.account_number = b.account_number)'
    ' insert into public.%5$I (norek, nama_nasabah, tgl1, tgl2, rm_pengelola)'
    ' select norek, nama, v1::text, v2::text, rm from j where v2 > v1',
    bal_col, rm_col, base_table, src_table, up_table);
  execute sql;
  get diagnostics n_up = row_count;

  sql := format(
    'with j as (select b.account_number as norek, coalesce(b.short_name, s.short_name) as nama,'
    ' coalesce(nullif(regexp_replace(s.%1$I, ''[^0-9.-]'', '''', ''g''), '''')::numeric, 0) as v1,'
    ' coalesce(nullif(regexp_replace(b.%1$I, ''[^0-9.-]'', '''', ''g''), '''')::numeric, 0) as v2,'
    ' coalesce(b.%2$I, s.%2$I) as rm'
    ' from public.%3$I b join public.%4$I s on s.account_number = b.account_number)'
    ' insert into public.%5$I (norek, nama_nasabah, tgl1, tgl2, rm_pengelola)'
    ' select norek, nama, v1::text, v2::text, rm from j where v2 < v1',
    bal_col, rm_col, base_table, src_table, down_table);
  execute sql;
  get diagnostics n_down = row_count;

  return jsonb_build_object('ok', true, 'kenaikan', n_up, 'penurunan', n_down);
end;
$$;

-- Statistik kartu EDC/QRIS. SECURITY INVOKER: berjalan sebagai user pemanggil, jadi RLS berlaku.
-- Tabel dibatasi ke whitelist dan nama kolom divalidasi sebelum dipakai di SQL dinamis.
create or replace function public.field_value_counts(_table text, _field text)
returns table (value text, count bigint)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if _table not in ('data_edc', 'data_qris') then
    raise exception 'Tabel tidak diizinkan: %', _table;
  end if;
  if not exists (
    select 1 from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = _table and c.column_name = _field
  ) then
    raise exception 'Invalid field';
  end if;
  return query execute format(
    'select %I::text, count(*)::bigint from public.%I group by %I order by count(*) desc',
    _field, _table, _field);
end;
$$;

create or replace function public.field_zero_count(_table text)
returns bigint
language plpgsql
stable
security invoker
set search_path = public
as $$
declare n bigint;
begin
  if _table not in ('data_edc', 'data_qris') then
    raise exception 'Tabel tidak diizinkan: %', _table;
  end if;
  if not exists (
    select 1 from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = _table and c.column_name = 'sales_volume'
  ) then
    raise exception 'Invalid field';
  end if;
  execute format('select count(*) from public.%I where public.is_zero_amount(sales_volume)', _table)
    into n;
  return n;
end;
$$;

-- Daftar baris untuk popup (maks 5000 baris), dikembalikan sebagai satu JSON
-- {columns: [...], rows: [...]} supaya tidak terpotong batas PGRST_DB_MAX_ROWS.
create or replace function public.field_rows(_table text, _field text, _value text default null)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  cols text[];
  where_sql text := '';
  result jsonb;
begin
  if _table not in ('data_edc', 'data_qris') then
    raise exception 'Tabel tidak diizinkan: %', _table;
  end if;

  select array_agg(c.column_name::text order by c.ordinal_position) into cols
    from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = _table;

  if _field = 'sales_volume_zero' then
    if not ('sales_volume' = any (cols)) then raise exception 'Invalid field'; end if;
    where_sql := ' where public.is_zero_amount(sales_volume)';
  elsif _field = '__total__' then
    where_sql := '';
  else
    if not (_field = any (cols)) then raise exception 'Invalid field'; end if;
    if _value is not null then
      where_sql := format(' where %I = %L', _field, _value);
    end if;
  end if;

  execute format(
    'select jsonb_build_object(''columns'', to_jsonb($1), ''rows'', coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb))'
    ' from (select * from public.%I%s limit 5000) t',
    _table, where_sql)
    into result using cols;

  return result;
end;
$$;

-- Hak eksekusi fungsi: hanya user login (dan service_role), tidak untuk anon.
revoke all on function public.has_role(uuid, public.app_role)        from public, anon;
revoke all on function public.is_zero_amount(text)                   from public, anon;
revoke all on function public.run_compare(text)                      from public, anon;
revoke all on function public.field_value_counts(text, text)         from public, anon;
revoke all on function public.field_zero_count(text)                 from public, anon;
revoke all on function public.field_rows(text, text, text)           from public, anon;
grant execute on function public.has_role(uuid, public.app_role)     to authenticated, service_role;
grant execute on function public.is_zero_amount(text)                to authenticated, service_role;
grant execute on function public.run_compare(text)                   to authenticated, service_role;
grant execute on function public.field_value_counts(text, text)      to authenticated, service_role;
grant execute on function public.field_zero_count(text)              to authenticated, service_role;
grant execute on function public.field_rows(text, text, text)        to authenticated, service_role;

-- ------------------------------------------------------- hak akses tabel ----
grant usage on schema public to anon, authenticated, service_role;

revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all                            on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- --------------------------------------------------------------- RLS --------
-- Helper sementara untuk membuat kebijakan (dihapus di akhir file).
create or replace function public._bo_set_policy(_tbl text, _cmd text, _using text, _check text)
returns void
language plpgsql
as $$
declare
  pname text := 'bo_' || lower(_cmd);
begin
  execute format('alter table public.%I enable row level security', _tbl);
  execute format('drop policy if exists %I on public.%I', pname, _tbl);
  if _cmd in ('SELECT', 'DELETE') then
    execute format('create policy %I on public.%I for %s to authenticated using (%s)',
                   pname, _tbl, _cmd, _using);
  elsif _cmd = 'INSERT' then
    execute format('create policy %I on public.%I for insert to authenticated with check (%s)',
                   pname, _tbl, _check);
  else
    execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
                   pname, _tbl, _using, _check);
  end if;
end;
$$;

do $$
declare
  t text;
  is_admin constant text := '(select public.has_role((select auth.uid()), ''admin''))';
  any_user constant text := 'true';
begin
  -- A. Tabel data & RKA: baca = semua user login, tulis = admin.
  for t in
    select tablename from pg_tables
     where schemaname = 'public'
       and (tablename like 'data\_%' or tablename like 'rka\_%')
       and tablename <> 'data_pivot_multi'
  loop
    perform public._bo_set_policy(t, 'SELECT', any_user, null);
    perform public._bo_set_policy(t, 'INSERT', null,     is_admin);
    perform public._bo_set_policy(t, 'UPDATE', is_admin, is_admin);
    perform public._bo_set_policy(t, 'DELETE', is_admin, null);
  end loop;

  -- B. Pivot Multi: semua user login boleh kelola.
  if to_regclass('public.data_pivot_multi') is not null then
    perform public._bo_set_policy('data_pivot_multi', 'SELECT', any_user, null);
    perform public._bo_set_policy('data_pivot_multi', 'INSERT', null,     any_user);
    perform public._bo_set_policy('data_pivot_multi', 'UPDATE', any_user, any_user);
    perform public._bo_set_policy('data_pivot_multi', 'DELETE', any_user, null);
  end if;

  -- C. Activity log: semua baca & tambah, admin hapus.
  perform public._bo_set_policy('activity_logs', 'SELECT', any_user, null);
  perform public._bo_set_policy('activity_logs', 'INSERT', null,     any_user);
  perform public._bo_set_policy('activity_logs', 'DELETE', is_admin, null);

  -- D. Links, settings, kalender: semua baca, admin tulis.
  foreach t in array array['links', 'settings', 'calendar_events'] loop
    perform public._bo_set_policy(t, 'SELECT', any_user, null);
    perform public._bo_set_policy(t, 'INSERT', null,     is_admin);
    perform public._bo_set_policy(t, 'UPDATE', is_admin, is_admin);
    perform public._bo_set_policy(t, 'DELETE', is_admin, null);
  end loop;

  -- E. Catatan aktivitas: semua user login.
  perform public._bo_set_policy('activity_notes', 'SELECT', any_user, null);
  perform public._bo_set_policy('activity_notes', 'INSERT', null,     any_user);
  perform public._bo_set_policy('activity_notes', 'UPDATE', any_user, any_user);
  perform public._bo_set_policy('activity_notes', 'DELETE', any_user, null);

  -- F. user_roles: lihat role sendiri (admin: semua). Tidak ada kebijakan tulis untuk klien.
  perform public._bo_set_policy(
    'user_roles', 'SELECT',
    '(user_id = (select auth.uid())) or ' || is_admin, null);

  -- G. Jaring pengaman: tabel lain di schema public yang belum RLS -> aktifkan (default tolak semua).
  for t in select tablename from pg_tables where schemaname = 'public' and not rowsecurity loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

drop function public._bo_set_policy(text, text, text, text);

notify pgrst, 'reload schema';
