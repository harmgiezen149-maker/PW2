// Inloggen met gebruikersnaam en wachtwoord.
// - De beheerder nodigt iemand uit (Beheer → Gebruikers). De uitnodigingslink (…/?login=<code>)
//   werkt één keer: daarmee kiest de gebruiker zelf een gebruikersnaam en wachtwoord. Een gedeelde
//   link geeft dus geen blijvende toegang. Dezelfde soort link dient om een wachtwoord te herstellen.
// - Inloggen geeft een sessie per apparaat (token in X-PW-Token). In de database staan alleen een
//   hash van de sessie, van de uitnodigingscode en een gezouten scrypt-hash van het wachtwoord.
// - Oude persoonlijke links (van vóór de wachtwoorden) werken nog één keer als uitnodiging.
const crypto = require('crypto');
const kv = require('./kv');

// Eigen sleutelnamen: in de productiedatabase gaven de sleutels auth:* een
// WRONGTYPE-fout (er stond al een ander soort waarde onder). Die blijven onaangeroerd.
const K_GEBRUIKERS = 'pw:gebruikers'; // id -> gebruiker
const K_CODES = 'pw:codes';           // sha256(uitnodigingscode) -> gebruiker-id
const K_SESSIES = 'pw:sessies';       // sha256(sessietoken) -> { id, gemaakt, verloopt }
const K_NAMEN = 'pw:namen';           // gebruikersnaam -> gebruiker-id
const ROLLEN = ['gebruiker', 'beheerder'];
const SESSIE_DAGEN = 180;
const UITNODIGING_DAGEN = 14;
const NAAM_RE = /^[a-z0-9][a-z0-9._-]{2,39}$/;

function hash(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function gelijk(a, b) {
  return crypto.timingSafeEqual(Buffer.from(hash(a), 'hex'), Buffer.from(hash(b), 'hex'));
}

function nieuweCode() {
  return crypto.randomBytes(24).toString('base64url');
}

async function alleGebruikers() {
  return kv.hgetallJSON(K_GEBRUIKERS);
}

// De ingelogde gebruiker (via een geldige sessie), of null. Ingetrokken gebruikers hebben geen toegang meer.
async function gebruiker(req) {
  const token = req.headers['x-pw-token'];
  if (!token || typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
  try {
    const sessie = kv.parse(await kv.cmd('HGET', K_SESSIES, hash(token)));
    if (!sessie || !sessie.id || sessie.verloopt < Date.now()) return null;
    const g = kv.parse(await kv.cmd('HGET', K_GEBRUIKERS, sessie.id));
    if (!g || g.ingetrokken) return null;
    return { id: g.id, naam: g.naam, rol: g.rol, gebruikersnaam: g.gebruikersnaam || null, maxPerMaand: g.maxPerMaand || null };
  } catch (e) {
    return null;
  }
}

async function beheerder(req) {
  const g = await gebruiker(req);
  return g && g.rol === 'beheerder' ? g : null;
}

async function heeftActieveBeheerder() {
  const alle = await alleGebruikers();
  return Object.values(alle).some(g => g.rol === 'beheerder' && !g.ingetrokken);
}

// Maakt een gebruiker aan, of geeft een bestaande gebruiker een nieuwe uitnodiging (om een wachtwoord
// te kiezen of te herstellen). Geeft de code één keer terug; daarna is alleen de hash bekend.
async function maakLink({ id, naam, rol, door }) {
  const alle = await alleGebruikers();
  const code = nieuweCode();
  const cmds = [];
  let g;
  const nu = new Date();
  const verloopt = new Date(nu.getTime() + UITNODIGING_DAGEN * 86400000).toISOString();
  if (id) {
    g = alle[id];
    if (!g) throw new Error('Gebruiker niet gevonden');
    if (g.codeHash) cmds.push(['HDEL', K_CODES, g.codeHash]);
    g = Object.assign({}, g, { codeHash: hash(code), codeVerloopt: verloopt, linkGemaakt: nu.toISOString(), linkGemaaktDoor: door });
    // Heractiveren na intrekken: eerst opnieuw een wachtwoord kiezen
    if (g.ingetrokken) { delete g.wachtwoord; g.ingetrokken = false; }
  } else {
    g = {
      id: 'g_' + crypto.randomBytes(6).toString('hex'), naam, rol,
      codeHash: hash(code), codeVerloopt: verloopt, ingetrokken: false,
      aangemaakt: nu.toISOString(), aangemaaktDoor: door,
      linkGemaakt: nu.toISOString(), linkGemaaktDoor: door
    };
  }
  // Eerst de code, dan de gebruiker: mislukt het halverwege, dan ontstaat er geen
  // gebruiker (of beheerder) zonder werkende uitnodiging.
  cmds.push(['HSET', K_CODES, g.codeHash, g.id]);
  await kv.pipeline(cmds);
  await kv.cmd('HSET', K_GEBRUIKERS, g.id, JSON.stringify(g));
  return { gebruiker: zonderGeheim(g), code };
}

async function intrekken(id, door) {
  const alle = await alleGebruikers();
  const g = alle[id];
  if (!g) throw new Error('Gebruiker niet gevonden');
  const cmds = [];
  if (g.codeHash) cmds.push(['HDEL', K_CODES, g.codeHash]);
  const nieuw = Object.assign({}, g, { ingetrokken: true, codeHash: null, ingetrokkenOp: new Date().toISOString(), ingetrokkenDoor: door });
  cmds.push(['HSET', K_GEBRUIKERS, id, JSON.stringify(nieuw)]);
  await kv.pipeline(cmds);
  await sessiesWeg(id);
  return zonderGeheim(nieuw);
}

// ---------------------------------------------------------------- wachtwoorden en sessies
function wachtwoordHash(wachtwoord) {
  const zout = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(wachtwoord), zout, 32, { N: 16384, r: 8, p: 1 });
  return 'scrypt$16384$' + zout.toString('base64') + '$' + h.toString('base64');
}
function wachtwoordKlopt(wachtwoord, opgeslagen) {
  const [soort, n, zout, h] = String(opgeslagen || '').split('$');
  if (soort !== 'scrypt' || !zout || !h) return false;
  const verwacht = Buffer.from(h, 'base64');
  const echt = crypto.scryptSync(String(wachtwoord), Buffer.from(zout, 'base64'), verwacht.length, { N: Number(n), r: 8, p: 1 });
  return crypto.timingSafeEqual(echt, verwacht);
}
const NEP_HASH = wachtwoordHash(crypto.randomBytes(12).toString('hex'));
function controleerWachtwoord(w) {
  if (typeof w !== 'string' || w.length < 8) return 'Kies een wachtwoord van minstens 8 tekens.';
  if (w.length > 200) return 'Dat wachtwoord is te lang.';
  return null;
}
function normaalNaam(n) { return String(n || '').trim().toLowerCase(); }

async function nieuweSessie(id) {
  const token = nieuweCode();
  const nu = Date.now();
  await kv.cmd('HSET', K_SESSIES, hash(token), JSON.stringify({ id, gemaakt: new Date(nu).toISOString(), verloopt: nu + SESSIE_DAGEN * 86400000 }));
  return token;
}
// Alle sessies van een gebruiker beëindigen (behalve eventueel de huidige); verlopen sessies opruimen
async function sessiesWeg(id, behalveToken) {
  const alle = await kv.cmd('HGETALL', K_SESSIES) || [];
  const behalve = behalveToken ? hash(behalveToken) : null;
  const weg = [];
  for (let i = 0; i + 1 < alle.length; i += 2) {
    const s = kv.parse(alle[i + 1]);
    if (alle[i] === behalve) continue;
    if (!s || s.verloopt < Date.now() || (id && s.id === id)) weg.push(alle[i]);
  }
  if (weg.length) await kv.cmd('HDEL', K_SESSIES, ...weg);
}

// Gebruiker bij een uitnodigingscode (geldig, niet verlopen, niet ingetrokken), of null
async function bijUitnodiging(code) {
  if (!code || typeof code !== 'string' || code.length < 20 || code.length > 100) return null;
  const id = await kv.cmd('HGET', K_CODES, hash(code));
  if (!id) return null;
  const g = kv.parse(await kv.cmd('HGET', K_GEBRUIKERS, id));
  if (!g || g.ingetrokken || g.codeHash !== hash(code)) return null;
  if (g.codeVerloopt && g.codeVerloopt < new Date().toISOString()) return null;
  return g;
}

function naamVoorstel(naam) {
  const basis = String(naam || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(.*?\)/g, '')
    .trim().split(/\s+/)[0].replace(/[^a-z0-9._-]/g, '');
  return basis.length >= 3 ? basis.slice(0, 40) : (basis + 'gebruiker').slice(0, 40);
}

async function uitnodigingInfo(code) {
  const g = await bijUitnodiging(code);
  if (!g) return null;
  return { naam: g.naam, rol: g.rol, gebruikersnaam: g.gebruikersnaam || naamVoorstel(g.naam), herstel: !!g.gebruikersnaam };
}

// Gebruikersnaam (alleen bij de eerste keer) en wachtwoord instellen met een uitnodiging; geeft een sessie
async function activeren({ code, gebruikersnaam, wachtwoord }) {
  const g = await bijUitnodiging(code);
  if (!g) throw Object.assign(new Error('Deze link is niet (meer) geldig. Vraag de beheerder om een nieuwe.'), { status: 400 });
  const fout = controleerWachtwoord(wachtwoord);
  if (fout) throw Object.assign(new Error(fout), { status: 400 });
  const nieuw = Object.assign({}, g);
  if (!g.gebruikersnaam) {
    const n = normaalNaam(gebruikersnaam);
    if (!NAAM_RE.test(n)) throw Object.assign(new Error('Kies een gebruikersnaam van 3 tot 40 tekens: kleine letters, cijfers, punt, streepje of liggend streepje.'), { status: 400 });
    const bezet = await kv.cmd('HGET', K_NAMEN, n);
    if (bezet && bezet !== g.id) throw Object.assign(new Error('Die gebruikersnaam is al in gebruik. Kies een andere.'), { status: 409 });
    nieuw.gebruikersnaam = n;
  }
  nieuw.wachtwoord = wachtwoordHash(wachtwoord);
  nieuw.wachtwoordGezet = new Date().toISOString();
  nieuw.codeHash = null; delete nieuw.codeVerloopt;
  await kv.pipeline([['HSET', K_NAMEN, nieuw.gebruikersnaam, g.id], ['HDEL', K_CODES, g.codeHash], ['HSET', K_GEBRUIKERS, g.id, JSON.stringify(nieuw)]]);
  // Herstel: oude sessies (op andere apparaten) vervallen
  await sessiesWeg(g.id);
  return { token: await nieuweSessie(g.id), gebruiker: zonderGeheim(nieuw) };
}

async function inloggen({ gebruikersnaam, wachtwoord }) {
  const n = normaalNaam(gebruikersnaam);
  const fout = Object.assign(new Error('Gebruikersnaam of wachtwoord klopt niet.'), { status: 401 });
  if (!n || typeof wachtwoord !== 'string' || wachtwoord.length > 200) throw fout;
  // Te veel mislukte pogingen voor deze gebruikersnaam: 15 minuten wachten
  const kMis = 'pw:mislukt:' + hash(n).slice(0, 32);
  if (Number(await kv.cmd('GET', kMis)) >= 8) throw Object.assign(new Error('Te veel mislukte pogingen. Probeer het over 15 minuten opnieuw.'), { status: 429 });
  const id = await kv.cmd('HGET', K_NAMEN, n);
  const g = id && kv.parse(await kv.cmd('HGET', K_GEBRUIKERS, id));
  // Bij een onbekende naam toch een hash berekenen, zodat de reactietijd niet verraadt welke namen bestaan
  const klopt = wachtwoordKlopt(wachtwoord, (g && g.wachtwoord) || NEP_HASH);
  if (!g || g.ingetrokken || !g.wachtwoord || !klopt) {
    await kv.pipeline([['INCR', kMis], ['EXPIRE', kMis, 900]]);
    throw fout;
  }
  await kv.cmd('DEL', kMis);
  await sessiesWeg(null);   // verlopen sessies opruimen
  return { token: await nieuweSessie(g.id), gebruiker: zonderGeheim(g) };
}

async function uitloggen(token) {
  if (token && typeof token === 'string') await kv.cmd('HDEL', K_SESSIES, hash(token));
}

async function wachtwoordWijzigen({ id, token, oud, nieuw }) {
  const g = kv.parse(await kv.cmd('HGET', K_GEBRUIKERS, id));
  if (!g || !g.wachtwoord || !wachtwoordKlopt(oud, g.wachtwoord)) throw Object.assign(new Error('Je huidige wachtwoord klopt niet.'), { status: 401 });
  const fout = controleerWachtwoord(nieuw);
  if (fout) throw Object.assign(new Error(fout), { status: 400 });
  const n = Object.assign({}, g, { wachtwoord: wachtwoordHash(nieuw), wachtwoordGezet: new Date().toISOString() });
  await kv.cmd('HSET', K_GEBRUIKERS, id, JSON.stringify(n));
  await sessiesWeg(id, token);   // andere apparaten moeten opnieuw inloggen
}

function zonderGeheim(g) {
  const k = Object.assign({}, g);
  k.wachtwoordIngesteld = !!g.wachtwoord;
  k.uitnodigingOpen = !!g.codeHash;
  delete k.codeHash;
  delete k.wachtwoord;
  return k;
}

module.exports = { ROLLEN, K_GEBRUIKERS, K_CODES, K_SESSIES, K_NAMEN, NAAM_RE, gebruiker, beheerder, heeftActieveBeheerder, maakLink, intrekken, alleGebruikers, zonderGeheim, gelijk,
  uitnodigingInfo, activeren, inloggen, uitloggen, wachtwoordWijzigen, wachtwoordHash, controleerWachtwoord, nieuweSessie, normaalNaam };
