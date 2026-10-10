#!/usr/bin/env bash
# ============================================================================
# export-old-db.sh — ekspor data dari database PostgreSQL LAMA (cPanel) ke folder ./export
#
# Jalankan di tempat yang bisa menjalankan psql/pg_dump ke database lama
# (mis. Terminal cPanel). Set koneksi lewat variabel lingkungan standar libpq:
#
#   export PGHOST=127.0.0.1 PGPORT=5432
#   export PGDATABASE=nama_database PGUSER=nama_user
#   export PGPASSWORD='password-database'      # pakai tanda kutip tunggal
#   bash scripts/export-old-db.sh
#
# Hasil (folder ./export, atau OUT=/path/lain):
#   users.json       daftar user + hash password (untuk scripts/migrate-users.mjs)
#   data.sql         isi semua tabel data (tanpa tabel user lama)
#   columns-old.tsv  daftar tabel/kolom lama (dipakai import-to-supabase.sh untuk pengecekan)
#   schema-old.sql   skema lama, hanya untuk referensi
#
# PENTING: folder export berisi hash password & data bisnis. Jangan di-commit ke Git
# dan hapus setelah migrasi selesai.
# ============================================================================
set -euo pipefail

OUT="${OUT:-./export}"
mkdir -p "$OUT"

for v in PGDATABASE PGUSER; do
  if [ -z "${!v:-}" ]; then echo "Variabel $v belum diisi." >&2; exit 1; fi
done

echo "==> 1/4 Ekspor user ke $OUT/users.json"
psql -X -q -A -t -v ON_ERROR_STOP=1 -c "
select coalesce(json_agg(json_build_object(
         'id',            u.id,
         'username',      u.username,
         'nama',          u.nama,
         'password_hash', u.password_hash,
         'role',          coalesce((select r.role::text
                                      from public.user_roles r
                                     where r.user_id = u.id
                                     order by (r.role::text = 'admin') desc
                                     limit 1), u.role),
         'is_active',     u.is_active,
         'created_at',    u.created_at
       ) order by u.created_at), '[]'::json)
  from public.app_users u;" > "$OUT/users.json"

echo "==> 2/4 Ekspor data tabel ke $OUT/data.sql"
pg_dump --data-only --no-owner --no-privileges --schema=public \
  --exclude-table=public.app_users \
  --exclude-table=public.user_roles \
  --exclude-table=public.auth_refresh_tokens \
  --file="$OUT/data.sql"

echo "==> 3/4 Ekspor daftar kolom ke $OUT/columns-old.tsv"
psql -X -q -A -t -F $'\t' -v ON_ERROR_STOP=1 -c "
select table_name, column_name
  from information_schema.columns c
 where table_schema = 'public'
   and table_name not in ('app_users', 'user_roles', 'auth_refresh_tokens')
   and exists (select 1 from information_schema.tables t
                where t.table_schema = c.table_schema and t.table_name = c.table_name
                  and t.table_type = 'BASE TABLE')
 order by 1, 2;" > "$OUT/columns-old.tsv"

echo "==> 4/4 Ekspor skema lama (referensi) ke $OUT/schema-old.sql"
pg_dump --schema-only --no-owner --no-privileges --schema=public --file="$OUT/schema-old.sql"

echo
echo "Selesai. Isi folder $OUT:"
ls -la "$OUT"
echo
echo "Jumlah user terekspor: $(grep -o '"username"' "$OUT/users.json" | wc -l)"
echo "Langkah berikutnya: salin folder $OUT ke VPS (scp) lalu jalankan scripts/import-to-supabase.sh"
