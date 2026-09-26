// Toegang via persoonlijke links. De beheerder maakt in het beheerpaneel een link
// aan (…/?login=<code>) en deelt die zelf. De app bewaart de code en stuurt hem mee
// in de header X-PW-Token. In de database staat alleen een hash van de code.
const crypto = require('crypto');
const kv = require('./kv');

// Eigen sleutelnamen: in de productiedatabase gaven de sleutels auth:* een
// WRONGTYPE-fout (er stond al een ander soort waarde onder). Die blijven onaangeroerd.
const K_GEBRUIKERS = 'pw:gebruikers'; // id -> gebruiker
const K_CODES = 'pw:codes';           // sha256(code) -> gebruiker-id
const ROLLEN = ['gebruiker', 'beheerder'];

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

// De ingelogde gebruiker, of null. Ingetrokken gebruikers hebben geen toegang meer.
async function gebruiker(req) {
  const code = req.headers['x-pw-token'];
  if (!code || typeof code !== 'string' || code.length < 20 || code.length > 100) return null;
  try {
    const id = await kv.cmd('HGET', K_CODES, hash(code));
    if (!id) return null;
    const g = kv.parse(await kv.cmd('HGET', K_GEBRUIKERS, id));
    if (!g || g.ingetrokken) return null;
    return { id: g.id, naam: g.naam, rol: g.rol };
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

// Maakt een gebruiker aan (of geeft een bestaande gebruiker een nieuwe link).
// Geeft de code één keer terug; daarna is alleen de hash bekend.
async function maakLink({ id, naam, rol, door }) {
  const alle = await alleGebruikers();
  const code = nieuweCode();
  const cmds = [];
  let g;
  if (id) {
    g = alle[id];
    if (!g) throw new Error('Gebruiker niet gevonden');
    if (g.codeHash) cmds.push(['HDEL', K_CODES, g.codeHash]);
    g = Object.assign({}, g, { codeHash: hash(code), ingetrokken: false, linkGemaakt: new Date().toISOString(), linkGemaaktDoor: door });
  } else {
    g = {
      id: 'g_' + crypto.randomBytes(6).toString('hex'), naam, rol,
      codeHash: hash(code), ingetrokken: false,
      aangemaakt: new Date().toISOString(), aangemaaktDoor: door,
      linkGemaakt: new Date().toISOString(), linkGemaaktDoor: door
    };
  }
  // Eerst de code, dan de gebruiker: mislukt het halverwege, dan ontstaat er geen
  // gebruiker (of beheerder) zonder werkende link.
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
  return zonderGeheim(nieuw);
}

function zonderGeheim(g) {
  const k = Object.assign({}, g);
  delete k.codeHash;
  return k;
}

module.exports = { ROLLEN, K_GEBRUIKERS, K_CODES, gebruiker, beheerder, heeftActieveBeheerder, maakLink, intrekken, alleGebruikers, zonderGeheim, gelijk };
