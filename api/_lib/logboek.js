// Logboek: vragen en antwoorden 90 dagen bewaren (vraag 19), zonder persoonsgegevens:
// geen IP-adres en geen naam, alleen of de vraag van een ingelogde gebruiker kwam.
const crypto = require('crypto');
const kv = require('./kv');

const BEWAAR = 90 * 86400;
const K_INDEX = 'log:index';

// Schatting van de kosten van één aanroep, met de prijs van het model dat antwoordde
// (dollars per miljoen tokens; platform.claude.com/docs/en/about-claude/pricing, oktober 2026).
// Een cache-schrijfactie (5 minuten) kost 1,25x de invoerprijs, een cache-treffer een fractie.
const PRIJZEN = {
  'claude-opus-5-5': { input: 4, output: 20, cacheSchrijven: 5, cacheLezen: 0.2 },
  'claude-opus-5': { input: 5, output: 25, cacheSchrijven: 6.25, cacheLezen: 0.5 },
  'claude-opus-4-8': { input: 5, output: 25, cacheSchrijven: 6.25, cacheLezen: 0.5 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheSchrijven: 2.5, cacheLezen: 0.1 },
  'claude-sonnet-5': { input: 2, output: 10, cacheSchrijven: 2.5, cacheLezen: 0.2 }
};
const ZOEKACTIE = 0.01;   // web search: $10 per 1.000 zoekacties

// usage: één usage-object of een lijst (bij een vervolgronde na pause_turn). Onbekend model: Opus 5-prijs.
function kosten(usage, model) {
  if (!usage) return 0;
  if (Array.isArray(usage)) return usage.reduce((t, u) => t + kosten(u, model), 0);
  const u = usage;
  const p = PRIJZEN[String(model || '').replace(/-\d{8}$/, '')] || PRIJZEN['claude-opus-5'];
  const zoek = (u.server_tool_use && u.server_tool_use.web_search_requests) || 0;
  return ((u.input_tokens || 0) * p.input + (u.output_tokens || 0) * p.output +
    (u.cache_creation_input_tokens || 0) * p.cacheSchrijven + (u.cache_read_input_tokens || 0) * p.cacheLezen) / 1e6 +
    zoek * ZOEKACTIE;
}

async function schrijf(entry) {
  const id = 'log_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  const nu = Date.now();
  const e = Object.assign({ id, tijd: new Date(nu).toISOString() }, entry);
  await kv.pipeline([
    ['SET', 'log:' + id, JSON.stringify(e), 'EX', BEWAAR],
    ['ZADD', K_INDEX, nu, id],
    ['ZREMRANGEBYSCORE', K_INDEX, 0, nu - BEWAAR * 1000]
  ]);
  return id;
}

async function get(id) {
  if (!/^log_[a-z0-9]+$/.test(String(id || ''))) return null;
  return kv.parse(await kv.cmd('GET', 'log:' + id));
}

async function aanvullen(id, aanvulling) {
  const e = await get(id);
  if (!e) return;
  e.aanvulling = aanvulling;
  await kv.cmd('SET', 'log:' + id, JSON.stringify(e), 'KEEPTTL');
}

// Nieuwste eerst
async function lijst(vanaf, aantal) {
  const ids = (await kv.cmd('ZREVRANGE', K_INDEX, vanaf, vanaf + aantal - 1)) || [];
  if (ids.length === 0) return [];
  const raw = await kv.cmd('MGET', ...ids.map(i => 'log:' + i));
  return raw.map(kv.parse).filter(Boolean);
}

async function aantal() {
  return (await kv.cmd('ZCARD', K_INDEX)) || 0;
}

async function opruimen() {
  return kv.cmd('ZREMRANGEBYSCORE', K_INDEX, 0, Date.now() - BEWAAR * 1000);
}

module.exports = { schrijf, get, aanvullen, lijst, aantal, opruimen, kosten };
