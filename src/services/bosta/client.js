const { env } = require('../../config/env');
const { AppError } = require('../../utils/errors');

async function bostaFetch(path, { method = 'GET', query, body } = {}) {
  if (!env.BOSTA_AUTHORIZATION) throw new AppError('Bosta not configured', 503);

  const baseUrl = env.BOSTA_BASE_URL;
  const cleanPath = path.replace(/^\//, '');
  const url = new URL(cleanPath, baseUrl);

  if (query && typeof query === 'object') {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    Authorization: env.BOSTA_AUTHORIZATION,
    'Content-Type': 'application/json',
  };

  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }

      if (!res.ok) {
        throw new AppError(`Bosta API error: ${data?.message || res.statusText}`, res.status);
      }
      return data;
    } catch (err) {
      lastError = err;
      if (err instanceof AppError && err.statusCode < 500) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
}

module.exports = { bostaFetch };
