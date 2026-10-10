// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// `npm run build:node` sets BUILD_TARGET=node to produce a standalone Node.js
// server in .output/ for cPanel (Passenger). Inside Lovable the default target
// is kept untouched.
const selfHostNode = process.env["BUILD_TARGET"] === "node";

export default defineConfig({
  ...(selfHostNode
    ? {
        // Pastikan build self-host selalu memakai React versi production.
        // Kalau NODE_ENV bukan production, React memakai jsx-dev-runtime dan
        // bundel Node gagal dengan "jsxDEV is not a function" saat SSR.
        vite: {
          define: { "process.env.NODE_ENV": JSON.stringify("production") },
          // Force Vite 8/Oxc to emit react/jsx-runtime instead of
          // react/jsx-dev-runtime for the standalone Node SSR bundle.
          oxc: { jsx: { development: false } },
        },
      }
    : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },

  ...(selfHostNode
    ? {
        nitro: {
          preset: "node-server",
          // Folder TIDAK diawali titik supaya kelihatan di Finder/File Manager.
          output: {
            dir: "build-node",
            serverDir: "build-node/server",
            publicDir: "build-node/public",
          },
        } as const,
      }
    : {}),

});

