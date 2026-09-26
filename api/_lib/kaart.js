// Kaart: plekken (parkeerplaatsen, uitkijkposten, ingangen …), routes en de positie of
// grens van de deelgebieden. Alles wordt door een beheerder vastgelegd en gecontroleerd;
// de informatie bij een plek komt uit de kennisbank (feiten met een plekId).
// Gevoelige plekken (wolven, nesten, burchten, rustgebieden) komen nooit op de kaart.
const kv = require('./kv');
const kb = require('./kennisbank');

const K_PLEKKEN = 'kb:plekken';
const K_ROUTES = 'kb:routes';
const K_GEBIEDEN = 'cfg:gebieden';
const K_GRENS = 'kaart:grens:';   // + slug: grens van een deelgebied (ringen van [lat, lon])

const SOORTEN = {
  parkeren: 'Parkeerplaats',
  uitkijk: 'Uitkijkpunt of observatiepost',
  ingang: 'Ingang of startpunt',
  bezoekerscentrum: 'Bezoekerscentrum of informatiepunt',
  horeca: 'Horeca',
  voorziening: 'Voorziening (bank, toilet, picknickplek)',
  overig: 'Overige plek'
};

// Ruim om Planken Wambuis heen (Ede, Otterlo, Arnhem-Noord); vangt verkeerd ingevoerde punten af.
const GRENZEN = { minLat: 51.93, maxLat: 52.16, minLon: 5.58, maxLon: 5.98 };
const MIDDEN = { lat: 52.04, lon: 5.77, zoom: 12 };
// Ook in samenstellingen (wolvenhol, vogelnest, dassenburcht), maar niet Wolfheze.
const GEVOELIG = /wolf(?!hez)|wolven|welp|roedel|nest(en)?\b|burcht|hol\b|rustgebied|rustplek|slaapplaats/i;

function binnenGebied(lat, lon) {
  return lat >= GRENZEN.minLat && lat <= GRENZEN.maxLat && lon >= GRENZEN.minLon && lon <= GRENZEN.maxLon;
}

function rond(x) { return Math.round(Number(x) * 1e6) / 1e6; }

function tekst(v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }

function valideerPlek(inv) {
  const p = {
    naam: tekst(inv.naam, 80), soort: inv.soort, lat: rond(inv.lat), lon: rond(inv.lon),
    deelgebied: inv.deelgebied || 'heel', zichtbaarheid: inv.zichtbaarheid === 'intern' ? 'intern' : 'openbaar',
    toelichting: tekst(inv.toelichting, 300)
  };
  if (p.naam.length < 2) return { fout: 'Geef de plek een naam.' };
  if (GEVOELIG.test(p.naam) || GEVOELIG.test(p.toelichting)) return { fout: 'Gevoelige plekken (wolven, nesten, burchten, rustgebieden) komen niet op de kaart.' };
  if (!SOORTEN[p.soort]) return { fout: 'Kies wat voor plek het is.' };
  if (!isFinite(p.lat) || !isFinite(p.lon) || !binnenGebied(p.lat, p.lon)) return { fout: 'De plek ligt niet in of bij Planken Wambuis. Klik de plek aan op de kaart.' };
  if (!kb.DEELGEBIEDEN.some(d => d.slug === p.deelgebied)) return { fout: 'Onbekend deelgebied.' };
  if (!p.toelichting) delete p.toelichting;
  return { plek: p };
}

// Afstand in km tussen twee punten (haversine)
function afstand(a, b) {
  const r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

function valideerPunten(punten, max) {
  if (!Array.isArray(punten) || punten.length < 2 || punten.length > max) return null;
  const uit = [];
  for (const pt of punten) {
    if (!Array.isArray(pt) || pt.length < 2) return null;
    const lat = rond(pt[0]), lon = rond(pt[1]);
    if (!isFinite(lat) || !isFinite(lon) || !binnenGebied(lat, lon)) return null;
    uit.push([lat, lon]);
  }
  return uit;
}

function valideerRoute(inv) {
  const r = {
    naam: tekst(inv.naam, 80), deelgebied: inv.deelgebied || 'heel',
    zichtbaarheid: inv.zichtbaarheid === 'intern' ? 'intern' : 'openbaar',
    bron: tekst(inv.bron, 200), bronUrl: tekst(inv.bronUrl, 500), feitId: tekst(inv.feitId, 60)
  };
  if (r.naam.length < 2) return { fout: 'Geef de route een naam.' };
  if (!kb.DEELGEBIEDEN.some(d => d.slug === r.deelgebied)) return { fout: 'Onbekend deelgebied.' };
  if (!r.bron) return { fout: 'Vul de bron in (bijv. de GPX van natuurmonumenten.nl).' };
  if (r.bronUrl && !/^https?:\/\/\S+$/.test(r.bronUrl)) return { fout: 'De bron-URL moet met http:// of https:// beginnen.' };
  const punten = valideerPunten(inv.punten, 3000);
  if (!punten) return { fout: 'De route heeft geen geldige punten in of bij Planken Wambuis (2 tot 3000 punten).' };
  r.punten = punten;
  let km = 0;
  for (let i = 1; i < punten.length; i++) km += afstand(punten[i - 1], punten[i]);
  r.lengteKm = Math.round(km * 10) / 10;
  if (!r.bronUrl) delete r.bronUrl;
  if (!r.feitId) delete r.feitId;
  return { route: r };
}

// Grens van een deelgebied: lijst van ringen, elke ring een lijst [lat, lon]
function valideerGrens(grens) {
  if (grens === null) return { grens: null };
  if (!Array.isArray(grens) || grens.length < 1 || grens.length > 20) return { fout: 'Ongeldige grens.' };
  const ringen = [];
  let totaal = 0;
  for (const ring of grens) {
    const p = valideerPunten(ring, 5000);
    if (!p || p.length < 3) return { fout: 'Ongeldige grens: elke ring heeft minstens 3 punten in of bij Planken Wambuis.' };
    totaal += p.length;
    ringen.push(p);
  }
  if (totaal > 8000) return { fout: 'De grens heeft te veel punten; vereenvoudig hem eerst.' };
  return { grens: ringen };
}

async function plekken() { return kv.hgetallJSON(K_PLEKKEN); }
async function routes() { return kv.hgetallJSON(K_ROUTES); }

async function gebiedInstellingen() {
  const c = await kv.getJSON(K_GEBIEDEN, null);
  return c && typeof c === 'object' ? c : {};
}

async function grenzen() {
  const slugs = kb.DEELGEBIEDEN.filter(d => d.slug !== 'heel').map(d => d.slug);
  const raw = await kv.cmd('MGET', ...slugs.map(s => K_GRENS + s));
  const uit = {};
  slugs.forEach((s, i) => { const g = kv.parse(raw[i]); if (g) uit[s] = g; });
  return uit;
}

module.exports = {
  K_PLEKKEN, K_ROUTES, K_GEBIEDEN, K_GRENS, SOORTEN, GRENZEN, MIDDEN, GEVOELIG,
  binnenGebied, valideerPlek, valideerRoute, valideerGrens, afstand,
  plekken, routes, gebiedInstellingen, grenzen
};
