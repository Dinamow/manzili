require('dotenv/config');
const { validateEnv, env } = require('./src/config/env');
const { configureCloudinary } = require('./src/config/cloudinary');
const { createApp } = require('./src/app');

validateEnv();
configureCloudinary();

const app = createApp();
const PORT = env.PORT;
const SERVICE_NAME = process.env.SERVICE_NAME || 'manzili-backend';

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${SERVICE_NAME}] listening on :${PORT}`);
});
