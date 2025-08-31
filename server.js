import express from 'express';
const app = express();

// GET endpoint for Lightspeed OAuth callback
app.get('/oauth/callback/lightspeed', (req, res) => {
  const code = req.query.code;
  console.log('Lightspeed OAuth callback received with code:', code);
  
  res.status(200).json({
    message: 'Euno callback OK',
    code: code
  });
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