import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Conditionally load Replit plugins only when running on Replit
const getReplitPlugins = async () => {
  if (process.env.REPL_ID) {
    try {
      const [errorModal, cartographer] = await Promise.all([
        import("@replit/vite-plugin-runtime-error-modal").then(m => m.default()),
        import("@replit/vite-plugin-cartographer").then(m => m.cartographer()),
      ]);
      return [errorModal, cartographer];
    } catch {
      return [];
    }
  }
  return [];
};

export default defineConfig({
  plugins: [
    react(),
    ...(await getReplitPlugins()),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
