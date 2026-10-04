import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare({ remoteBindings: false })],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  define: {
    // Dev/test default is the Cloudflare Turnstile always-passes site key.
    // Production builds set VITE_TURNSTILE_SITE_KEY in the environment.
    "import.meta.env.VITE_TURNSTILE_SITE_KEY": JSON.stringify(
      process.env.VITE_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA",
    ),
  },
  build: {
    // Public source maps expose the full unminified source and add ~3.9 MB to
    // the deployed asset set; keep them local-only unless explicitly requested.
    sourcemap: process.env.SHIP60_SOURCEMAPS === "1",
  },
  optimizeDeps: {
    // Pre-bundle the admin chart so the dev server never re-optimizes mid-e2e
    // (a dependency re-optimization triggers a full page reload and can clear a
    // form that a Playwright test is filling).
    include: ["recharts"],
  },
});
