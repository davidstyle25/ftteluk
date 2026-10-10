# BO Teluk Betung

Aplikasi TanStack Start (React) dengan backend **Supabase self-hosted di Coolify**.

- Auth: Supabase Auth (GoTrue). Username dipetakan ke email `username@app.local`.
- Data: PostgreSQL + RLS. Peran `admin` / `viewer` di tabel `public.user_roles`.
- Skema & keamanan: `supabase/01_schema.sql`, `supabase/02_security.sql`, `supabase/03_post_import.sql`.
- Migrasi data & user: `scripts/export-old-db.sh`, `scripts/import-to-supabase.sh`, `scripts/migrate-users.mjs`.
- **Panduan lengkap: `deploy/PANDUAN-MIGRASI-SUPABASE-COOLIFY.md`.**

## Pengembangan lokal

```bash
cp .env.example .env   # isi nilai Supabase
npm ci
npm run dev
```

## Build produksi (Docker / Coolify)

`Dockerfile` membangun server Node (`npm run build:node`) dan menjalankan `node app.js` di port 3000.
Variabel `VITE_*` harus diset sebagai *Build Variable*.
