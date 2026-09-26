// Kennisbank: losse, gecontroleerde feiten in de database (hash kb:feiten).
// Elk feit heeft een bron, controledatum, type (bepaalt de vervaldatum),
// zichtbaarheid (openbaar/intern) en status (actief/ingetrokken).
const crypto = require('crypto');
const kv = require('./kv');
const { vandaagISO, nlMaand } = require('./http');
const { STANDAARD_SITES } = require('./sites');
const seed = require('./seed');

const ONDERWERPEN = [
  { slug: 'naam', titel: 'Naam & historie' },
  { slug: 'gebied', titel: 'Gebied & landschap' },
  { slug: 'wolf', titel: 'Wolf' },
  { slug: 'soorten', titel: 'Planten & dieren' },
  { slug: 'vee', titel: 'Vee & begrazing' },
  { slug: 'beheer', titel: 'Beheer & werkzaamheden' },
  { slug: 'routes', titel: 'Plekken & routes' },
  { slug: 'bezoek', titel: 'Praktisch bezoek' },
  { slug: 'veiligheid', titel: 'Veiligheid' },
  { slug: 'nm', titel: 'Natuurmonumenten & activiteiten' },
  { slug: 'contact', titel: 'Contact & meldingen' },
  { slug: 'seizoen', titel: 'Seizoenskalender' },
  { slug: 'overig', titel: 'Overig' }
];

const DEELGEBIEDEN = [
  { slug: 'heel', titel: 'Hele gebied' },
  { slug: 'wolfheze', titel: 'Wolfheze & Wolfhezerheide' },
  { slug: 'mossel', titel: 'Mossel & Mosselse Zand' },
  { slug: 'reemst', titel: 'Oud & Nieuw Reemst' },
  { slug: 'buunderkamp', titel: 'Buunderkamp' },
  { slug: 'oude-hout', titel: 'Oude Hout' }
];

// Vervaltermijn per type (vraag 11): vast 3 jaar, jaarlijks en seizoen 12 maanden,
// tijdelijk tot de eigen einddatum.
const TYPES = {
  vast: { titel: 'Vast', maanden: 36 },
  jaarlijks: { titel: 'Jaarlijks', maanden: 12 },
  seizoen: { titel: 'Seizoen', maanden: 12 },
  tijdelijk: { titel: 'Tijdelijk', maanden: null }
};

const K_FEITEN = 'kb:feiten';
const K_VOORSTELLEN = 'kb:voorstellen';
const K_SITES = 'cfg:sites';
const K_SEEDVERSIE = 'kb:seedversie';

// sterk: langer willekeurig deel, voor id's die de melder zelf bewaart (niet te raden)
function nieuwId(prefix, sterk) {
  return prefix + '_' + Date.now().toString(36) + crypto.randomBytes(sterk ? 8 : 3).toString('hex');
}

function plusMaanden(iso, n) {
  const d = new Date(iso.length === 7 ? iso + '-01' : iso);
  if (isNaN(d.getTime())) return null;
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

// Vervaldatum: handmatig ingesteld, of afgeleid van type en controledatum.
function vervaldatum(f) {
  if (f.vervaltOp) return f.vervaltOp;
  if (f.type === 'tijdelijk') return f.einddatum || null;
  const t = TYPES[f.type] || TYPES.jaarlijks;
  return f.gecontroleerdOp ? plusMaanden(f.gecontroleerdOp, t.maanden) : null;
}

// Hoe een feit er vandaag voor staat.
function beoordeel(f, vandaag) {
  vandaag = vandaag || vandaagISO();
  const verval = vervaldatum(f);
  const afgelopen = f.type === 'tijdelijk' && !!f.einddatum && f.einddatum < vandaag;
  const nogNiet = f.type === 'tijdelijk' && !!f.startdatum && f.startdatum > vandaag;
  const verlopen = !afgelopen && (!verval || verval < vandaag);
  return { verval, afgelopen, nogNiet, verlopen };
}

// Feiten die de assistent vandaag mag gebruiken (vraag 12: verlopen feiten blijven
// in gebruik met een waarschuwing; afgelopen tijdelijke feiten niet).
// alleMaanden: seizoensfeiten van het hele jaar (voor het overzicht per gebied).
function bruikbareFeiten(feiten, { ingelogd, maand, vandaag, alleMaanden } = {}) {
  maand = maand || nlMaand();
  vandaag = vandaag || vandaagISO();
  return Object.values(feiten).filter(f => {
    if (f.status !== 'actief') return false;
    if (f.zichtbaarheid === 'intern' && !ingelogd) return false;
    const b = beoordeel(f, vandaag);
    if (b.afgelopen || b.nogNiet) return false;
    // Seizoensfeiten alleen in de maanden waarvoor ze gelden (plus de maand erna, om vooruit te kunnen kijken)
    if (!alleMaanden && f.type === 'seizoen' && Array.isArray(f.maanden) && f.maanden.length > 0) {
      const volgende = maand === 12 ? 1 : maand + 1;
      if (!f.maanden.includes(maand) && !f.maanden.includes(volgende)) return false;
    }
    return true;
  });
}

function nlKort(iso) {
  if (!iso) return 'onbekend';
  const [j, m, d] = iso.split('-');
  return d ? `${d}-${m}-${j}` : `${m}-${j}`;
}

function dgTitel(slug) {
  const d = DEELGEBIEDEN.find(x => x.slug === slug);
  return d ? d.titel : 'Hele gebied';
}

const MAANDNAMEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

// Eén document per onderwerp, één blok per feit. De volgorde is vast, zodat de
// prompt-cache bruikbaar blijft en citaties terug te leiden zijn naar feiten.
function bouwDocumenten(feiten, vandaag) {
  vandaag = vandaag || vandaagISO();
  const docs = [];
  const meta = [];
  for (const o of ONDERWERPEN) {
    const lijst = feiten.filter(f => (f.onderwerp || 'overig') === o.slug)
      .sort((a, b) => (a.deelgebied || '').localeCompare(b.deelgebied || '') || a.id.localeCompare(b.id));
    if (lijst.length === 0) continue;
    const blokken = [];
    const fm = [];
    for (const f of lijst) {
      const b = beoordeel(f, vandaag);
      const labels = [`Deelgebied: ${dgTitel(f.deelgebied)}`, `gecontroleerd ${nlKort(f.gecontroleerdOp)}`];
      if (f.type === 'tijdelijk' && f.einddatum) labels.push(`geldt t/m ${nlKort(f.einddatum)}`);
      if (f.type === 'seizoen' && Array.isArray(f.maanden) && f.maanden.length) labels.push(`maanden: ${f.maanden.map(m => MAANDNAMEN[m - 1]).join(', ')}`);
      if (b.verlopen) labels.push('MOGELIJK VEROUDERD');
      blokken.push({ type: 'text', text: `[${labels.join(' · ')}] ${f.tekst}` });
      fm.push({
        id: f.id, onderwerp: o.titel, deelgebied: dgTitel(f.deelgebied),
        gecontroleerdOp: f.gecontroleerdOp || null, verouderd: b.verlopen,
        bron: f.bron || '', bronUrl: f.bronUrl || '', intern: f.zichtbaarheid === 'intern', plekId: f.plekId || undefined
      });
    }
    docs.push({
      type: 'document',
      source: { type: 'content', content: blokken },
      title: `Kennisbank: ${o.titel}`,
      context: 'Door de beheerder gecontroleerde feiten over Planken Wambuis. Elk blok is één feit; de tekst tussen [ ] is metadata (deelgebied, controledatum, geldigheid).',
      citations: { enabled: true }
    });
    meta.push({ titel: o.titel, feiten: fm });
  }
  return { docs, meta };
}

// Platte tekst (voor de aanvulronde, zonder citaties).
function alsTekst(feiten, vandaag) {
  const { docs } = bouwDocumenten(feiten, vandaag);
  const body = docs.map(d => `## ${d.title.replace('Kennisbank: ', '')}\n` +
    d.source.content.map(b => `- ${b.text}`).join('\n')).join('\n\n');
  return `<kennisbank>\n${body}\n</kennisbank>`;
}

async function alleFeiten() {
  await zorgVoorSeed();
  return kv.hgetallJSON(K_FEITEN);
}

async function alleVoorstellen() {
  return kv.hgetallJSON(K_VOORSTELLEN);
}

async function getSites() {
  try {
    const s = await kv.getJSON(K_SITES, null);
    return Array.isArray(s) && s.length > 0 ? s : STANDAARD_SITES.slice();
  } catch (e) { return STANDAARD_SITES.slice(); }
}

// Domeinnaam normaliseren en valideren (alleen hostnamen, zoals de zoektool vereist).
function normaliseerSite(s) {
  if (typeof s !== 'string') return null;
  let h = s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h)) return null;
  return h;
}

function metHistorie(f, door, actie, extra) {
  const h = Array.isArray(f.historie) ? f.historie.slice(-19) : [];
  h.push(Object.assign({ datum: new Date().toISOString(), door: door || 'onbekend', actie }, extra || {}));
  f.historie = h;
  return f;
}

// Eenmalige import van de oude kennisbank en correcties, plus nieuwe seed-items
// (feiten en voorstellen) wanneer de seedversie omhooggaat. Oude sleutels blijven staan.
let seedGecontroleerd = false;
async function zorgVoorSeed() {
  if (seedGecontroleerd) return;
  const huidig = Number(await kv.cmd('GET', K_SEEDVERSIE)) || 0;
  if (huidig >= seed.versie) { seedGecontroleerd = true; return; }
  const lock = await kv.cmd('SET', 'kb:seedlock', '1', 'NX', 'EX', '60');
  if (lock !== 'OK') return; // een ander verzoek is al bezig

  const vandaag = vandaagISO();
  const bestaandeFeiten = await kv.hgetallJSON(K_FEITEN);
  const bestaandeVoorstellen = await kv.hgetallJSON(K_VOORSTELLEN);
  const nieuweFeiten = [];
  const nieuweVoorstellen = [];

  if (huidig === 0) {
    const overrides = (await kv.getJSON('kennisbank', {})) || {};
    const approved = (await kv.getJSON('approved', [])) || [];
    const pending = (await kv.getJSON('pending', [])) || [];
    const aangepast = new Set();
    for (const [slug, o] of Object.entries(overrides)) {
      if (!o || !o.tekst || /^\(Nog in te vullen/.test(o.tekst)) continue;
      aangepast.add(slug);
      const onderwerp = seed.sectieOnderwerp[slug] || 'overig';
      nieuweFeiten.push({
        id: 'oud_' + slug, onderwerp, deelgebied: 'heel', tekst: o.tekst,
        type: onderwerp === 'naam' ? 'vast' : 'jaarlijks',
        bron: 'Beheerpaneel (oude kennisbank' + (o.titel ? ', ' + o.titel : '') + ')',
        gecontroleerdOp: o.gecontroleerd || vandaag, gecontroleerdDoor: 'beheerder (oud systeem)'
      });
    }
    for (const f of seed.feiten) {
      if (f.sectie && aangepast.has(f.sectie)) continue;
      nieuweFeiten.push(f);
    }
    approved.filter(x => typeof x === 'string' && x.trim()).forEach((tekst, i) => {
      nieuweFeiten.push({
        id: 'corr_' + i, onderwerp: 'overig', deelgebied: 'heel', tekst, type: 'jaarlijks',
        bron: 'Goedgekeurde correctie (oud systeem)', gecontroleerdOp: vandaag, gecontroleerdDoor: 'beheerder (oud systeem)'
      });
    });
    pending.filter(x => typeof x === 'string' && x.trim()).forEach((tekst, i) => {
      nieuweVoorstellen.push({ id: 'sugg_' + i, soort: 'nieuw', tekst, herkomst: 'gebruiker', toelichting: 'Openstaande suggestie uit het oude systeem.' });
    });
  }
  // Seed-items die nieuwer zijn dan de huidige versie
  for (const f of seed.feiten) if ((f.sinds || 1) > huidig && huidig > 0) nieuweFeiten.push(f);
  for (const v of seed.voorstellen) if ((v.sinds || 1) > huidig) nieuweVoorstellen.push(v);

  const cmds = [];
  for (const f of nieuweFeiten) {
    if (bestaandeFeiten[f.id]) continue;
    const feit = Object.assign({ deelgebied: 'heel', zichtbaarheid: 'openbaar', status: 'actief', aangemaakt: new Date().toISOString() }, f);
    delete feit.sectie; delete feit.sinds;
    metHistorie(feit, 'import', 'geïmporteerd');
    cmds.push(['HSET', K_FEITEN, feit.id, JSON.stringify(feit)]);
  }
  for (const v of nieuweVoorstellen) {
    if (bestaandeVoorstellen[v.id]) continue;
    const vs = Object.assign({ soort: 'nieuw', deelgebied: 'heel', type: 'jaarlijks', zichtbaarheid: 'openbaar', aangemaakt: new Date().toISOString() }, v);
    delete vs.sinds;
    cmds.push(['HSET', K_VOORSTELLEN, vs.id, JSON.stringify(vs)]);
  }
  cmds.push(['SET', K_SEEDVERSIE, String(seed.versie)]);
  cmds.push(['DEL', 'kb:seedlock']);
  await kv.pipeline(cmds);
  seedGecontroleerd = true;
}

module.exports = {
  ONDERWERPEN, DEELGEBIEDEN, TYPES, K_FEITEN, K_VOORSTELLEN, K_SITES,
  nieuwId, vervaldatum, beoordeel, bruikbareFeiten, bouwDocumenten, alsTekst,
  alleFeiten, alleVoorstellen, getSites, normaliseerSite, metHistorie, zorgVoorSeed,
  _reset() { seedGecontroleerd = false; }
};
