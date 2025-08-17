// server/index.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// --- Health check (super useful on Railway) ---
app.get("/health", (_req, res) => res.status(200).send("ok"));

// TODO: Put your API routes ABOVE the static handlers, e.g.:
// app.get("/api/ping", (_req, res) => res.json({ ok: true }));

// --- Serve built frontend in production ---
if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), "dist");

  // Serve static assets from dist/
  app.use(express.static(distPath));

  // SPA fallback: send dist/index.html for any non-API route
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// --- Start server: MUST use Railway's port + 0.0.0.0 ---
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`listening on ${PORT}`);
});
