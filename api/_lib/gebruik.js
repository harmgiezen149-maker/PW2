// Gebruik per gebruiker per maand: geschatte API-kosten en aantal vragen, met een maximum per
// gebruiker (Beheer → Gebruikers). Alleen maandtotalen per gebruiker; het logboek met de vragen
// zelf blijft zonder persoonsgegevens. Niet-ingelogde bezoekers tellen samen als "anoniem",
// de wekelijkse controle als "systeem".
const crypto = require('crypto');
const kv = require('./kv');
const { vandaagISO, getIp } = require('./http');

const WAARSCHUWING = 0.75;              // vanaf 75% van het maximum krijgt de gebruiker een waarschuwing
const BEWAAR = 400 * 86400;             // ruim een jaar
const sleutel = maand => 'gebruik:' + maand;
const K_MAX_ANONIEM = 'cfg:maxanoniem';   // maximum per maand voor alle niet-ingelogde bezoekers samen
const huidigeMaand = () => vandaagISO().slice(0, 7);

// Kosten (dollars) en eventueel één vraag optellen bij deze gebruiker in deze maand
async function registreer(id, kosten, { vraag = false } = {}) {
  if (!id) return;
  const k = sleutel(huidigeMaand());
  const cmds = [];
  if (kosten > 0) cmds.push(['HINCRBYFLOAT', k, id + ':kosten', String(Math.round(kosten * 1e6) / 1e6)]);
  if (vraag) cmds.push(['HINCRBY', k, id + ':vragen', '1']);
  if (!cmds.length) return;
  cmds.push(['EXPIRE', k, String(BEWAAR)]);
  try { await kv.pipeline(cmds); } catch (e) { /* tellen mag een antwoord nooit tegenhouden */ }
}

// { id: { kosten, vragen } } voor een maand ('jjjj-mm', standaard deze maand)
async function maandOverzicht(maand) {
  const h = await kv.cmd('HGETALL', sleutel(maand || huidigeMaand()));
  const uit = {};
  for (let i = 0; i + 1 < (h || []).length; i += 2) {
    const [id, soort] = String(h[i]).split(/:(?=[^:]+$)/);
    uit[id] = uit[id] || { kosten: 0, vragen: 0 };
    uit[id][soort] = Number(h[i + 1]) || 0;
  }
  return uit;
}

// Stand van één gebruiker tegenover zijn maximum (maxPerMaand in dollars; leeg = geen maximum)
async function stand(g) {
  const st = (await maandOverzicht())[g.id] || { kosten: 0, vragen: 0 };
  const max = Number(g.maxPerMaand) > 0 ? Number(g.maxPerMaand) : null;
  const procent = max ? Math.round(st.kosten / max * 100) : null;
  return {
    maand: huidigeMaand(), kosten: st.kosten, vragen: st.vragen, max, procent,
    waarschuwing: !!max && st.kosten >= max * WAARSCHUWING, op: !!max && st.kosten >= max
  };
}

// Niet-ingelogde bezoekers delen één maximum
async function maxAnoniem() {
  const v = Number(await kv.cmd('GET', K_MAX_ANONIEM));
  return v > 0 ? v : null;
}
async function zetMaxAnoniem(max) {
  if (max > 0) await kv.cmd('SET', K_MAX_ANONIEM, String(max)); else await kv.cmd('DEL', K_MAX_ANONIEM);
}
async function standAnoniem() {
  return Object.assign(await stand({ id: 'anoniem', maxPerMaand: await maxAnoniem() }), { anoniem: true });
}

// ---------------------------------------------------------------- vragen per dag per IP-adres
// Bezoekers zonder inlog mogen per IP-adres een beperkt aantal vragen per dag stellen (standaard 10,
// in te stellen bij Beheer → Gebruikers). Het IP-adres wordt niet bewaard: alleen een hash met een
// geheime, willekeurige peper, en de teller verdwijnt na twee dagen.
const K_MAX_IP = 'cfg:maxvragenip';
const STANDAARD_MAX_IP = 10;
async function maxVragenIp() {
  const v = await kv.cmd('GET', K_MAX_IP);
  if (v === null || v === undefined) return STANDAARD_MAX_IP;
  return Number(v) > 0 ? Math.floor(Number(v)) : null;   // 0 = geen maximum
}
async function zetMaxVragenIp(n) { await kv.cmd('SET', K_MAX_IP, String(n > 0 ? Math.floor(n) : 0)); }
async function ipSleutel(req) {
  let peper = await kv.cmd('GET', 'cfg:ippeper');
  if (!peper) {
    await kv.cmd('SET', 'cfg:ippeper', crypto.randomBytes(24).toString('hex'), 'NX');
    peper = await kv.cmd('GET', 'cfg:ippeper');
  }
  const h = crypto.createHash('sha256').update(peper + '|' + getIp(req)).digest('hex').slice(0, 32);
  return 'ipdag:' + vandaagISO() + ':' + h;
}
// Telt deze vraag mee. Geeft { max, aantal, over, op }; op = boven het maximum (vraag niet stellen).
async function telIpVraag(req) {
  const max = await maxVragenIp();
  if (!max) return { max: null, aantal: 0, over: null, op: false };
  const k = await ipSleutel(req);
  const [aantal] = await kv.pipeline([['INCR', k], ['EXPIRE', k, String(2 * 86400)]]);
  return { max, aantal, over: Math.max(0, max - aantal), op: aantal > max, sleutel: k };
}
// Een vraag die niet beantwoord kon worden, telt niet mee
async function ipVraagTerug(t) { if (t && t.sleutel) { try { await kv.cmd('DECR', t.sleutel); } catch (e) { /* niet erg */ } } }
const IP_OP_MELDING = max => `Je hebt vandaag het maximum van ${max} vragen zonder inlog bereikt. Morgen kun je weer vragen stellen. Boswachters en vrijwilligers kunnen inloggen (Profiel).`;

const OP_MELDING = 'Je hebt je maximum voor deze maand bereikt. Vanaf de eerste van de volgende maand kun je weer vragen stellen, of vraag de beheerder om je maximum te verhogen.';
const OP_MELDING_ANONIEM = 'De assistent is deze maand niet meer beschikbaar voor bezoekers zonder inlog. Boswachters en vrijwilligers kunnen inloggen (Profiel); vanaf de eerste van de volgende maand kan iedereen weer vragen stellen.';

module.exports = { STANDAARD_MAX_IP, maxVragenIp, zetMaxVragenIp, telIpVraag, ipVraagTerug, IP_OP_MELDING, WAARSCHUWING, registreer, maandOverzicht, stand, huidigeMaand, OP_MELDING, OP_MELDING_ANONIEM, maxAnoniem, zetMaxAnoniem, standAnoniem };
