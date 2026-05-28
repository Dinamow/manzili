const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

function validateEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`[env] Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  const optional = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'BOSTA_INTEGRATION_ENABLED',
  ];

  // Check Bosta auth: either BOSTA_AUTHORIZATION or BOSTA_API_KEY must be set
  if (process.env.BOSTA_INTEGRATION_ENABLED === 'true') {
    if (!process.env.BOSTA_AUTHORIZATION && !process.env.BOSTA_API_KEY) {
      console.warn('[env] Bosta enabled but neither BOSTA_AUTHORIZATION nor BOSTA_API_KEY is set');
    }
  }

  const missingOptional = optional.filter((key) => !process.env[key]);
  if (missingOptional.length) {
    console.warn(`[env] Optional env vars not set: ${missingOptional.join(', ')}`);
  }
}

/**
 * Resolves Bosta Authorization header value.
 * Supports: BOSTA_AUTHORIZATION (direct), or BOSTA_API_KEY + optional BOSTA_AUTH_SCHEME.
 * Mirrors frontend/lib/bosta/client.js:getBostaAuthorizationHeader()
 */
function resolveBostaAuth() {
  const auth = process.env.BOSTA_AUTHORIZATION;
  if (auth && auth.trim()) return auth.trim();

  const apiKey = process.env.BOSTA_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;
  const scheme = process.env.BOSTA_AUTH_SCHEME;
  if (scheme && scheme.trim()) return `${scheme.trim()} ${apiKey.trim()}`;
  return apiKey.trim();
}

const env = {
  get PORT() { return Number(process.env.PORT) || 3000; },
  get DATABASE_URL() { return process.env.DATABASE_URL; },
  get JWT_SECRET() { return process.env.JWT_SECRET; },
  get JWT_REFRESH_SECRET() { return process.env.JWT_REFRESH_SECRET; },
  get JWT_EXPIRES_IN() { return process.env.JWT_EXPIRES_IN || '15m'; },
  get JWT_REFRESH_EXPIRES_IN() { return process.env.JWT_REFRESH_EXPIRES_IN || '7d'; },
  get CORS_ORIGIN() { return process.env.CORS_ORIGIN || '*'; },
  get APP_URL() { return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'; },

  // Cloudinary
  get CLOUDINARY_CLOUD_NAME() { return process.env.CLOUDINARY_CLOUD_NAME; },
  get CLOUDINARY_API_KEY() { return process.env.CLOUDINARY_API_KEY; },
  get CLOUDINARY_API_SECRET() { return process.env.CLOUDINARY_API_SECRET; },

  // Stripe
  get STRIPE_SECRET_KEY() { return process.env.STRIPE_SECRET_KEY; },
  get STRIPE_WEBHOOK_SECRET() { return process.env.STRIPE_WEBHOOK_SECRET; },
  get STRIPE_CURRENCY() { return process.env.STRIPE_CURRENCY || process.env.NEXT_PUBLIC_STRIPE_CURRENCY || 'egp'; },

  // Bosta
  get BOSTA_INTEGRATION_ENABLED() { return process.env.BOSTA_INTEGRATION_ENABLED === 'true'; },
  get BOSTA_BASE_URL() {
    const raw = process.env.BOSTA_BASE_URL || 'https://app.bosta.co/api/v2/';
    return raw.endsWith('/') ? raw : `${raw}/`;
  },
  get BOSTA_AUTHORIZATION() { return resolveBostaAuth(); },
  get BOSTA_BUSINESS_LOCATION_ID() { return process.env.BOSTA_BUSINESS_LOCATION_ID_DEFAULT; },
  get BOSTA_WEBHOOK_BASE_URL() { return process.env.BOSTA_WEBHOOK_BASE_URL; },
  get BOSTA_WEBHOOK_AUTH_HEADER_NAME() { return process.env.BOSTA_WEBHOOK_AUTH_HEADER_NAME; },
  get BOSTA_WEBHOOK_AUTH_HEADER_VALUE() { return process.env.BOSTA_WEBHOOK_AUTH_HEADER_VALUE; },

  // Admin
  get ADMIN_ACTIONS_SECRET() { return process.env.ADMIN_ACTIONS_SECRET; },
};

module.exports = { validateEnv, env };
