// Logboek: vragen en antwoorden 90 dagen bewaren (vraag 19), zonder persoonsgegevens:
// geen IP-adres en geen naam, alleen of de vraag van een ingelogde gebruiker kwam.
const crypto = require('crypto');
const kv = require('./kv');

const BEWAAR = 90 * 86400;
const K_INDEX = 'log:index';

// Globale schatting van de kosten per vraag (Claude Opus 5, prijzen per miljoen tokens).
const PRIJS = { input: 5, output: 25, cacheSchrijven: 6.25, cacheLezen: 0.5, zoekactie: 0.01 };

function kosten(usage) {
  if (!usage) return 0;
  const u = usage;
  const zoek = (u.server_tool_use && u.server_tool_use.web_search_requests) || 0;
  return ((u.input_tokens || 0) * PRIJS.input + (u.output_tokens || 0) * PRIJS.output +
    (u.cache_creation_input_tokens || 0) * PRIJS.cacheSchrijven + (u.cache_read_input_tokens || 0) * PRIJS.cacheLezen) / 1e6 +
    zoek * PRIJS.zoekactie;
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
