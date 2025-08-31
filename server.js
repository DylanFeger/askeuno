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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Euno server up');
  console.log(`Server listening on port ${PORT}`);
});