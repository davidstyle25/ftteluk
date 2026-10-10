#!/usr/bin/env bash
# ============================================================================
# import-to-supabase.sh — impor data lama ke database Supabase di VPS (Coolify)
#
# Jalankan DI VPS (SSH sebagai root), dari folder project ini, SETELAH
# supabase/01_schema.sql dan supabase/02_security.sql dijalankan:
#
#   bash scripts/import-to-supabase.sh ./export
#
# Opsi lewat variabel lingkungan:
#   DB_CONTAINER=nama-container   (default: otomatis mencari container "supabase-db-...")
#   WIPE=1                        kosongkan tabel tujuan dulu (untuk impor ulang)
#   FORCE=1                       lanjut walau ada kolom lama yang tidak ada di skema baru
# ============================================================================
set -euo pipefail

DIR="${1:-./export}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_DIR="$HERE/../supabase"

[ -f "$DIR/data.sql" ]        || { echo "File $DIR/data.sql tidak ditemukan." >&2; exit 1; }
[ -f "$DIR/columns-old.tsv" ] || { echo "File $DIR/columns-old.tsv tidak ditemukan." >&2; exit 1; }

DB_CONTAINER="${DB_CONTAINER:-$(docker ps --format '{{.Names}}' | grep -E '^supabase-db-' | head -n1 || true)}"
if [ -z "$DB_CONTAINER" ]; then
  echo "Container database Supabase tidak ditemukan. Cek: docker ps --format '{{.Names}}' | grep supabase-db" >&2
  echo "Lalu jalankan ulang dengan: DB_CONTAINER=<nama> bash scripts/import-to-supabase.sh $DIR" >&2
  exit 1
fi
echo "Container database : $DB_CONTAINER"

psql_db() { docker exec -i "$DB_CONTAINER" psql -X -q -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"; }

# ---- 1. Pastikan skema baru sudah memuat semua tabel/kolom lama --------------------------------
echo "==> 1/5 Cek kecocokan skema (kolom lama vs skema baru)"
psql_db -A -t -F $'\t' -c "
select table_name, column_name
  from information_schema.columns
 where table_schema = 'public'
 order by 1, 2;" | sort > /tmp/columns-new.tsv
sort "$DIR/columns-old.tsv" > /tmp/columns-old.sorted.tsv
MISSING="$(comm -23 /tmp/columns-old.sorted.tsv /tmp/columns-new.tsv || true)"
if [ -n "$MISSING" ]; then
  echo "PERINGATAN: kolom berikut ada di database lama tapi TIDAK ada di skema baru:"
  echo "$MISSING" | sed 's/^/   /'
  if [ "${FORCE:-0}" != "1" ]; then
    echo "Impor dihentikan. Tambahkan kolom/tabel itu ke skema (atau kirim daftar ini ke pengembang)," >&2
    echo "atau jalankan ulang dengan FORCE=1 (impor akan GAGAL bila tabel itu ikut di data.sql)." >&2
    exit 1
  fi
else
  echo "    OK — semua tabel & kolom lama ada di skema baru."
fi

# ---- 2. Pastikan tabel tujuan kosong (atau WIPE=1) ---------------------------------------------
echo "==> 2/5 Cek tabel tujuan"
TABLES="$(psql_db -A -t -c "
select string_agg(format('public.%I', tablename), ', ' order by tablename)
  from pg_tables
 where schemaname = 'public' and tablename <> 'user_roles';")"
if [ "${WIPE:-0}" = "1" ]; then
  echo "    WIPE=1 -> mengosongkan semua tabel data tujuan"
  psql_db -c "truncate table $TABLES restart identity;"
else
  NONEMPTY="$(psql_db -A -t -c "
select count(*) from (
  (select 1 from public.data_edc limit 1)
  union all (select 1 from public.data_qris limit 1)
  union all (select 1 from public.links limit 1)
  union all (select 1 from public.settings limit 1)
  union all (select 1 from public.activity_logs limit 1)
) x;")"
  if [ "$NONEMPTY" != "0" ]; then
    echo "Tabel tujuan sudah berisi data. Jalankan ulang dengan WIPE=1 bila ingin menimpa." >&2
    exit 1
  fi
  echo "    OK — tabel tujuan masih kosong."
fi

# ---- 3. Impor data -----------------------------------------------------------------------------
# Saringan: buang perintah yang tidak dikenali server lama / yang ditangani 03_post_import.sql.
echo "==> 3/5 Mengimpor $DIR/data.sql (satu transaksi; gagal = dibatalkan semua)"
sed -E '/^\\(un)?restrict /d; /^SET transaction_timeout/d; /^SELECT pg_catalog\.setval/d' "$DIR/data.sql" \
  | psql_db --single-transaction -o /dev/null
echo "    Impor selesai."

# ---- 4. Samakan counter id + ringkasan --------------------------------------------------------
echo "==> 4/5 Menyamakan counter id & ringkasan jumlah baris"
psql_db -A -F ' | ' < "$SQL_DIR/03_post_import.sql" | grep -v '^$' | grep -E '\|' | grep -vE '^table_name' || true

echo "==> 5/5 Selesai."
echo "Langkah berikutnya: pindahkan user dengan scripts/migrate-users.mjs (lihat panduan)."
