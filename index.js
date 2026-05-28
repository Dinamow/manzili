require('dotenv/config');
const express = require('express');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SERVICE_NAME = process.env.SERVICE_NAME || 'manzili-backend';

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ service: SERVICE_NAME, message: 'hello from manzili backend' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${SERVICE_NAME}] listening on :${PORT}`);
});
