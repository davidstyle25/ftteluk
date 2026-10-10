# Panduan Migrasi: cPanel (PostgreSQL) → Supabase di Coolify

Ikuti urut dari atas ke bawah. Tanda 🖥️ = jalankan di VPS (SSH root), 🏠 = di server/cPanel lama, 🌐 = di dashboard Coolify.

## Gambaran
| Dulu (cPanel) | Sekarang |
|---|---|
| API palsu `/api/public/auth`, `/rest` + PostgreSQL langsung | Supabase asli (Kong → GoTrue + PostgREST + Postgres) |
| Tabel `app_users`, bcrypt, JWT buatan sendiri | Supabase Auth; user `username@app.local`; id & password lama dipertahankan |
| Cek admin di kode | RLS + fungsi `has_role` di database |

---

## Langkah 0 — Pastikan instance Supabase khusus untuk project ini
🖥️
```bash
DB=$(docker ps --format '{{.Names}}' | grep -E '^supabase-db-' | head -n1); echo $DB
docker exec -i $DB psql -U postgres -d postgres -c "select tablename from pg_tables where schemaname='public' order by 1;"
docker exec -i $DB psql -U postgres -d postgres -c "select count(*) as jumlah_user_auth from auth.users;"
```
Idealnya schema `public` kosong (atau hanya tabel bawaan) dan `auth.users` = 0. Bila sudah ada tabel/user project lain, **berhenti dulu** — `01_schema.sql` membuat tabel bernama umum (`users`, `settings`, `links`, dst.) dan bisa bentrok.

## Langkah 1 — Atur environment Supabase di Coolify
🌐 Coolify → Service **Supabase** → Environment Variables, pastikan/tambahkan:
- `DISABLE_SIGNUP=true` (pendaftaran publik dimatikan; user hanya dibuat admin)
- `ENABLE_EMAIL_AUTOCONFIRM=true` (email `@app.local` tidak bisa menerima email konfirmasi)
- `PGRST_DB_MAX_ROWS=10000` (default 1000 akan memotong data)
- Domain publik untuk **Supabase Kong** (mis. `https://api.domainanda.com`) — ini yang jadi `SUPABASE_URL`.

Simpan, lalu **Redeploy** service Supabase dan tunggu semua container healthy.
Catat dari tab Environment: `SERVICE_SUPABASEANON_KEY` (anon) dan `SERVICE_SUPABASESERVICE_KEY` (service role).

## Langkah 2 — Salin project ke VPS
🏠/komputer Anda:
```bash
scp -r supabase scripts root@IP_VPS:/root/bo-migrasi/
```
(Atau `git clone` repo project ke VPS.) Selanjutnya bekerja di 🖥️ `cd /root/bo-migrasi`.

## Langkah 3 — Buat skema & keamanan
🖥️
```bash
DB=$(docker ps --format '{{.Names}}' | grep -E '^supabase-db-' | head -n1)
docker exec -i $DB psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/01_schema.sql
docker exec -i $DB psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/02_security.sql
```
Cek keamanan — hasil query ini harus **kosong** (semua tabel sudah RLS):
```bash
docker exec -i $DB psql -U postgres -d postgres -c "select tablename from pg_tables where schemaname='public' and not rowsecurity;"
```

## Langkah 4 — Ekspor dari database lama
🏠 (Terminal cPanel / tempat yang bisa `psql` ke DB lama), di folder project:
```bash
export PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=nama_db PGUSER=nama_user
export PGPASSWORD='password-db-lama'
bash scripts/export-old-db.sh
scp -r export root@IP_VPS:/root/bo-migrasi/
```
Hasil: folder `export/` (`users.json`, `data.sql`, `columns-old.tsv`, `schema-old.sql`).

## Langkah 5 — Impor data ke Supabase
🖥️
```bash
cd /root/bo-migrasi
bash scripts/import-to-supabase.sh ./export
```
- Skrip mengecek kolom lama vs skema baru. Jika ada yang tidak cocok, skrip berhenti dan menampilkan daftarnya (`FORCE=1` untuk memaksa).
- Impor ulang: `WIPE=1 bash scripts/import-to-supabase.sh ./export`.
- Di akhir tampil jumlah baris per tabel — bandingkan dengan database lama.

## Langkah 6 — Pindahkan user (password tetap sama)
🖥️ (Node tidak perlu di-install; pakai Docker)
```bash
cd /root/bo-migrasi
export SUPABASE_URL='https://api.domainanda.com'
export SUPABASE_SERVICE_ROLE_KEY='ISI_SERVICE_ROLE_KEY'

# uji dulu tanpa menulis apa pun
docker run --rm -e SUPABASE_URL -e SUPABASE_SERVICE_ROLE_KEY -v "$PWD":/w -w /w node:22-alpine \
  node scripts/migrate-users.mjs ./export/users.json --dry-run

# jalankan sungguhan
docker run --rm -e SUPABASE_URL -e SUPABASE_SERVICE_ROLE_KEY -v "$PWD":/w -w /w node:22-alpine \
  node scripts/migrate-users.mjs ./export/users.json
```
Aman diulang (user yang sudah ada dilewati). User nonaktif dibuat tetapi di-ban.
Jika hash lama ditolak GoTrue / login gagal, buat admin baru lalu atur ulang password user dari menu Pengguna di aplikasi:
```bash
docker run --rm -e SUPABASE_URL -e SUPABASE_SERVICE_ROLE_KEY -v "$PWD":/w -w /w node:22-alpine \
  node scripts/migrate-users.mjs --create-admin admin 'PasswordBaruYangKuat!'
```

## Langkah 7 — Deploy aplikasi di Coolify
🌐 Coolify → **New Resource → Public/Private Repository** (repo project ini) →
1. **Build Pack: Dockerfile**, Port **3000**.
2. Environment Variables:
   - **Build Variable** (centang "Build Variable"): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (= anon key), `VITE_SUPABASE_PROJECT_ID=default`.
   - **Runtime** (jangan centang build): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (anon), `SUPABASE_SERVICE_ROLE_KEY` (service role), opsional `GOOGLE_SHEETS_API_KEY`, `SHOW_ERROR_DETAILS=false`.
   - ⚠️ Service role key **tidak boleh** jadi Build Variable.
3. Domain aplikasi (mis. `https://bo.domainanda.com`) → **Deploy**.

> Catatan: `VITE_*` ditanam saat build. Jika mengubahnya, **Redeploy** (rebuild), bukan sekadar restart.

## Langkah 8 — Verifikasi
- Login dengan user lama (username, bukan email).
- Buka halaman data EDC/QRIS, kartu statistik, popup tabel, fitur compare (admin).
- Login sebagai `viewer`: tidak boleh bisa mengubah data / membuka Pengguna.
- Menu Pengguna (admin): tambah, ubah, hapus user.

## Langkah 9 — Bersih-bersih keamanan
🖥️ dan 🏠
```bash
rm -rf /root/bo-migrasi/export        # berisi hash password & data bisnis
```
- Hapus folder `export/` juga di server lama.
- **Ganti password database PostgreSQL lama** (sebelumnya tertulis di `.env.example` pada zip) dan matikan akses ke sana bila tak dipakai lagi.
- **Ganti password default `admin/admin123`** bila masih ada.
- Jangan commit `.env` / `export/` ke Git.

## Opsional
Setelah aplikasi berjalan, dependensi lama tidak terpakai lagi:
`npm uninstall pg bcryptjs jose @types/pg` (lalu commit `package-lock.json` baru).
