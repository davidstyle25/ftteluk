#!/usr/bin/env node
// ============================================================================
// migrate-users.mjs — pindahkan user lama (export/users.json) ke Supabase Auth (GoTrue)
//
// - id user dipertahankan, hash bcrypt lama ($2b$...) dipakai langsung -> password TIDAK berubah
// - username "budi" -> email "budi@app.local" (sama dengan aturan di aplikasi)
// - role disimpan di tabel public.user_roles
// - user nonaktif dibuat tetapi di-ban (tidak bisa login)
// - aman dijalankan ulang: user yang sudah ada dilewati
//
// Pemakaian:
//   export SUPABASE_URL=https://api.domainanda.com
//   export SUPABASE_SERVICE_ROLE_KEY='eyJ...'      # service role key (RAHASIA)
//   node scripts/migrate-users.mjs ./export/users.json
//   node scripts/migrate-users.mjs ./export/users.json --dry-run
//
// Buat admin baru (bila tidak ada users.json):
//   node scripts/migrate-users.mjs --create-admin admin 'PasswordKuat123!'
// ============================================================================
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const caIdx = args.indexOf("--create-admin");
const file = args.find((a, i) => !a.startsWith("--") && (caIdx < 0 || i < caIdx));

const BASE = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!BASE || !KEY) {
  console.error("Set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dulu.");
  process.exit(1);
}

const toEmail = (u) => {
  const v = String(u).trim().toLowerCase();
  return v.includes("@") ? v : `${v}@app.local`;
};

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function call(method, path, body, extra = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...headers, ...extra },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* bukan JSON */
  }
  return { ok: res.ok, status: res.status, json, text };
}

async function listExisting() {
  const byEmail = new Map();
  for (let page = 1; page < 1000; page++) {
    const r = await call("GET", `/auth/v1/admin/users?page=${page}&per_page=200`);
    if (!r.ok) throw new Error(`Gagal membaca daftar user (${r.status}): ${r.text}`);
    const users = r.json?.users ?? [];
    for (const u of users) byEmail.set(String(u.email).toLowerCase(), u);
    if (users.length < 200) break;
  }
  return byEmail;
}

async function setRole(userId, role) {
  if (dryRun) return;
  const r = await call(
    "POST",
    "/rest/v1/user_roles?on_conflict=user_id,role",
    { user_id: userId, role },
    { Prefer: "resolution=merge-duplicates,return=minimal" },
  );
  if (!r.ok) throw new Error(`Gagal set role (${r.status}): ${r.text}`);
}

async function createAdmin(username, password) {
  const email = toEmail(username);
  const existing = await listExisting();
  let id = existing.get(email)?.id;
  if (id) {
    console.log(`= ${email} sudah ada, hanya memastikan role admin`);
  } else {
    const r = await call("POST", "/auth/v1/admin/users", {
      email,
      password,
      email_confirm: true,
      user_metadata: { nama: username, username },
    });
    if (!r.ok) throw new Error(`Gagal membuat admin (${r.status}): ${r.text}`);
    id = r.json.id;
    console.log(`+ ${email} dibuat`);
  }
  await setRole(id, "admin");
  console.log("Selesai. Role admin terpasang.");
}

async function migrate(path) {
  const users = JSON.parse(readFileSync(path, "utf8"));
  const existing = await listExisting();
  let created = 0, skipped = 0, failed = 0;

  for (const u of users) {
    const email = toEmail(u.username);
    const role = u.role === "admin" ? "admin" : "viewer";
    const found = existing.get(email);

    if (found) {
      console.log(`= ${email} sudah ada -> dilewati (role dipastikan ${role})`);
      try { await setRole(found.id, role); } catch (e) { console.error(`  ! ${e.message}`); failed++; continue; }
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(`~ [dry-run] akan membuat ${email} (${role}${u.is_active === false ? ", nonaktif" : ""})`);
      continue;
    }

    const body = {
      id: u.id,
      email,
      password_hash: u.password_hash,
      email_confirm: true,
      user_metadata: { nama: u.nama || u.username, username: u.username },
    };
    if (u.is_active === false) body.ban_duration = "876000h"; // ~100 tahun

    const r = await call("POST", "/auth/v1/admin/users", body);
    if (!r.ok) {
      console.error(`! ${email} GAGAL (${r.status}): ${r.text}`);
      failed++;
      continue;
    }
    try {
      await setRole(r.json?.id ?? u.id, role);
    } catch (e) {
      console.error(`! ${email} dibuat, tapi ${e.message}`);
      failed++;
      continue;
    }
    console.log(`+ ${email} dibuat (${role}${u.is_active === false ? ", nonaktif" : ""})`);
    created++;
  }
  console.log(`\nRingkasan: dibuat=${created}, dilewati=${skipped}, gagal=${failed}${dryRun ? " (dry-run)" : ""}`);
  if (failed) process.exit(2);
}

try {
  if (caIdx >= 0) {
    const [username, password] = args.slice(caIdx + 1);
    if (!username || !password) throw new Error("Pakai: --create-admin <username> <password>");
    await createAdmin(username, password);
  } else {
    if (!file) throw new Error("Pakai: node scripts/migrate-users.mjs ./export/users.json [--dry-run]");
    await migrate(file);
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
