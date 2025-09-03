import express from 'express';
const app = express();

// GET endpoint for Lightspeed OAuth callback
app.get("/oauth/callback/lightspeed", (req, res) => {
  const code = req.query.code || "(no code)";
  console.log("Lightspeed OAuth callback hit. code =", code);
  res
    .status(200)
    .send(`<pre>Euno callback OK\ncode=${code}\nYou can close this.</pre>`);
});

// API endpoint for Lightspeed OAuth callback
app.get("/api/oauth/callback/lightspeed", (req, res) => {
  const code = req.query.code || "(no code)";
  console.log("Lightspeed OAuth callback hit (API prefix). code =", code);
  res
    .status(200)
    .send(`<pre>Euno callback OK\ncode=${code}\nYou can close this.</pre>`);
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

app.get('/euno-health', (req, res) => {
  res.status(200).send('euno-express-alive');
});

// Debug: list all registered routes
app.get("/routes", (_, res) => {
  const routes = [];
  (app._router?.stack || []).forEach((m) => {
    if (m.route && m.route.path) {
      const methods = Object.keys(m.route.methods)
        .filter(Boolean)
        .map((x) => x.toUpperCase());
      routes.push(`${methods.join(",")} ${m.route.path}`);
    }
  });
  res.json(routes);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Euno server up');
  console.log(`Server listening on port ${PORT}`);
});