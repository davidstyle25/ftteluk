// Entry point server produksi (Docker/Coolify): menjalankan hasil build Nitro node-server.
// Variabel lingkungan dari Coolify; file .env (opsional) hanya dibaca bila ada.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// Muat .env secara manual (tanpa dependensi tambahan).
const envPath = join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

process.env.NODE_ENV = process.env.NODE_ENV || "production";

// Cari hasil build: build-node/ (baru, terlihat di File Manager) atau .output/ (lama).
const candidates = [
  join(root, "build-node", "server", "index.mjs"),
  join(root, ".output", "server", "index.mjs"),
];
const entry = candidates.find((f) => existsSync(f));
if (!entry) {
  console.error(
    "Build tidak ditemukan di build-node/server/index.mjs.\n" +
      "Jalankan `npm run build:node` lalu upload folder build-node/ ke server.",
  );
  process.exit(1);
}

// PENTING: jangan pakai top-level await di sini.
// Passenger/LiteSpeed (lsnode.js) memuat app.js lewat require(), dan require()
// menolak modul ESM yang punya top-level await (ERR_REQUIRE_ASYNC_MODULE).
import(entry).catch((err) => {
  console.error("Gagal memuat server:", err);
  process.exit(1);
});
