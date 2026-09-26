// Back-ups van de kennisbank, voorstellen, kaart en instellingen in de database
// (wekelijks automatisch, 10 weken bewaard) en als download in het beheerpaneel.
const kv = require('./kv');
const kb = require('./kennisbank');
const auth = require('./auth');
const kaart = require('./kaart');
const { vandaagISO } = require('./http');

const BEWAAR = 70 * 86400;

async function maakInhoud() {
  const [feiten, voorstellen, sites, nmPaginas, gebruikers, plekken, routes, gebieden, grenzen] = await Promise.all([
    kv.hgetallJSON(kb.K_FEITEN), kv.hgetallJSON(kb.K_VOORSTELLEN), kb.getSites(),
    kv.getJSON('cfg:nmpaginas', null), auth.alleGebruikers(),
    kaart.plekken(), kaart.routes(), kaart.gebiedInstellingen(), kaart.grenzen()
  ]);
  return {
    soort: 'planken-wambuis-backup', versie: 2, tijd: new Date().toISOString(),
    feiten, voorstellen, sites, nmPaginas, plekken, routes, gebieden, grenzen,
    // Zonder codes: na terugzetten krijgen gebruikers eventueel een nieuwe link
    gebruikers: Object.values(gebruikers).map(auth.zonderGeheim)
  };
}

async function maak(label) {
  const inhoud = await maakInhoud();
  const id = vandaagISO() + (label ? '-' + label : '');
  await kv.pipeline([
    ['SET', 'backup:' + id, JSON.stringify(inhoud), 'EX', BEWAAR],
    ['SET', 'backup:laatste', vandaagISO()]
  ]);
  return { id, feiten: Object.keys(inhoud.feiten).length };
}

async function lijst() {
  const sleutels = ((await kv.cmd('KEYS', 'backup:2*')) || []).sort().reverse();
  return sleutels.map(k => k.slice('backup:'.length));
}

async function get(id) {
  if (!/^\d{4}-\d{2}-\d{2}[a-z0-9-]*$/.test(String(id || ''))) return null;
  return kv.parse(await kv.cmd('GET', 'backup:' + id));
}

// Zet kennisbank, voorstellen en websites terug (gebruikers niet: zo sluit niemand zichzelf buiten).
async function terugzetten(id) {
  const b = await get(id);
  if (!b || b.soort !== 'planken-wambuis-backup') throw new Error('Back-up niet gevonden');
  await maak('voor-terugzetten');
  const cmds = [['DEL', kb.K_FEITEN], ['DEL', kb.K_VOORSTELLEN]];
  for (const f of Object.values(b.feiten || {})) cmds.push(['HSET', kb.K_FEITEN, f.id, JSON.stringify(f)]);
  for (const v of Object.values(b.voorstellen || {})) cmds.push(['HSET', kb.K_VOORSTELLEN, v.id, JSON.stringify(v)]);
  if (Array.isArray(b.sites) && b.sites.length) cmds.push(['SET', kb.K_SITES, JSON.stringify(b.sites)]);
  // Kaart (vanaf back-upversie 2); oudere back-ups laten de kaart ongemoeid
  if (b.plekken && b.routes) {
    cmds.push(['DEL', kaart.K_PLEKKEN], ['DEL', kaart.K_ROUTES]);
    for (const p of Object.values(b.plekken)) cmds.push(['HSET', kaart.K_PLEKKEN, p.id, JSON.stringify(p)]);
    for (const r of Object.values(b.routes)) cmds.push(['HSET', kaart.K_ROUTES, r.id, JSON.stringify(r)]);
    if (b.gebieden) cmds.push(['SET', kaart.K_GEBIEDEN, JSON.stringify(b.gebieden)]);
    for (const d of kb.DEELGEBIEDEN) {
      if (d.slug === 'heel') continue;
      const g = b.grenzen && b.grenzen[d.slug];
      cmds.push(g ? ['SET', kaart.K_GRENS + d.slug, JSON.stringify(g)] : ['DEL', kaart.K_GRENS + d.slug]);
    }
  }
  await kv.pipeline(cmds);
  return { feiten: Object.keys(b.feiten || {}).length };
}

// Wekelijks: als de laatste back-up 7 dagen of ouder is
async function wekelijks() {
  const laatste = await kv.cmd('GET', 'backup:laatste');
  if (laatste) {
    const dagen = (new Date(vandaagISO()) - new Date(laatste)) / 86400000;
    if (dagen < 7) return { overgeslagen: true, laatste };
  }
  return maak();
}

module.exports = { maak, maakInhoud, lijst, get, terugzetten, wekelijks };
