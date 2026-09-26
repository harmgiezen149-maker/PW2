// Status van meldingen ("klopt niet") en suggesties, zodat de melder in de app onder
// "Mijn meldingen" kan zien wat ermee gebeurd is. De melder bewaart het id op het eigen
// apparaat; hier staat alleen id -> status en datum. Er wordt niets aan een persoon of
// gebruiker gekoppeld, en de tekst van de melding staat hier niet.
const kv = require('./kv');

const K_STATUS = 'kb:meldstatus';
const BEWAAR_DAGEN = 180;
const STATUSSEN = ['ontvangen', 'in-behandeling', 'verwerkt', 'afgehandeld', 'afgewezen'];
const ID = /^[a-z]+_[a-z0-9]{6,40}$/;

function geldigId(id) {
  return typeof id === 'string' && ID.test(id);
}

// Commando voor in een pipeline
function cmd(id, status) {
  if (!STATUSSEN.includes(status)) throw new Error('Onbekende status ' + status);
  return ['HSET', K_STATUS, id, JSON.stringify({ s: status, t: new Date().toISOString() })];
}

async function zet(id, status) {
  if (!geldigId(id)) return;
  await kv.pipeline([cmd(id, status)]);
}

// { id: { s, t } | null }
async function lees(ids) {
  const geldig = [...new Set((ids || []).filter(geldigId))].slice(0, 30);
  if (geldig.length === 0) return {};
  const raw = (await kv.cmd('HMGET', K_STATUS, ...geldig)) || [];
  const uit = {};
  geldig.forEach((id, i) => { uit[id] = kv.parse(raw[i]); });
  return uit;
}

// Wekelijks: statussen ouder dan een half jaar weggooien
async function opruimen() {
  const alle = await kv.hgetallJSON(K_STATUS);
  const grens = new Date(Date.now() - BEWAAR_DAGEN * 86400000).toISOString();
  const oud = Object.keys(alle).filter(id => !alle[id] || !alle[id].t || alle[id].t < grens);
  if (oud.length > 0) await kv.cmd('HDEL', K_STATUS, ...oud);
  return oud.length;
}

module.exports = { K_STATUS, STATUSSEN, geldigId, cmd, zet, lees, opruimen };
