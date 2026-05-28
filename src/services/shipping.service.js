const { bostaFetch } = require('./bosta/client');
const { env } = require('../config/env');

async function listCities() {
  const data = await bostaFetch('cities');
  return data;
}

async function listZones(cityId) {
  const data = await bostaFetch(`cities/${cityId}/zones`);
  return data;
}

async function listDistricts(cityId) {
  const data = await bostaFetch(`cities/${cityId}/districts`);
  return data;
}

async function estimateShipping(items) {
  // Simple estimation based on item count
  const baseRate = 50; // EGP
  const perItemRate = 10;
  const total = baseRate + (items.length - 1) * perItemRate;
  return { estimatedShipping: total, currency: 'EGP' };
}

module.exports = { listCities, listZones, listDistricts, estimateShipping };
