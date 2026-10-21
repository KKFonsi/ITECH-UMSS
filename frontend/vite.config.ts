import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  // Discard any accidentally configured private or malformed key before bundling.
  const key = /^sb_publishable_[A-Za-z0-9_-]+$/.test(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "") ? env.VITE_SUPABASE_PUBLISHABLE_KEY : "";
  if (Object.entries(env).some(([name, value]) => value && (/DATABASE|(^|_)DB_|PASSWORD|SERVICE_ROLE|SECRET/.test(name) || /^(postgres(ql)?:\/\/|sb_secret_)/.test(value)))) {
    throw new Error("Private credentials must never use VITE_ environment variables");
  }
  return {
  define: { "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(key) },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: { output: { manualChunks: { supabase: ["@supabase/supabase-js"] } } },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    host: "0.0.0.0",
    proxy: { "/api": { target: "http://localhost:3000", changeOrigin: true } },
  },
  };
});
