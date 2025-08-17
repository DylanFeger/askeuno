// server/index.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// --- Health check endpoints ---
app.get("/health", (_req, res) => res.status(200).send("ok"));
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// TODO: Put your API routes ABOVE the static handlers, e.g.:
// app.get("/api/ping", (_req, res) => res.json({ ok: true }));

// --- Serve frontend ---
async function setupFrontend() {
  if (process.env.NODE_ENV === "production") {
    // Production: Serve built frontend from dist/
    const distPath = path.resolve(process.cwd(), "dist");
    
    // Serve static assets
    app.use(express.static(distPath));
    
    // SPA fallback: send index.html for non-API routes
    app.get("*", (req, res) => {
      // Don't serve index.html for API routes or healthz
      if (req.path.startsWith("/api/") || req.path === "/healthz") {
        return res.status(404).send("Not found");
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    // Development: Use Vite middleware
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Use Vite's middleware to handle all requests
    app.use(vite.middlewares);
  }
}

// --- Start server ---
async function startServer() {
  // Set up frontend handling
  await setupFrontend();
  
  // Use PORT from environment with fallback to 5000 for Replit
  const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`listening on ${PORT}`);
  });
}

// Start the server
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
