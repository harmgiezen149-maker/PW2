// Openbaar: gegevens voor de tabbladen Meldingen, Gebieden en Kaart. Alles komt uit
// dezelfde gecontroleerde kennisbank als de chat; interne feiten alleen voor wie is ingelogd.
const kb = require('./_lib/kennisbank');
const auth = require('./_lib/auth');
const { setSecurityHeaders, checkRateLimit, vandaagISO, nlMaand } = require('./_lib/http');

const kaart = require('./_lib/kaart');
const MAANDNAMEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const NIEUWS_DAGEN = 60;

function dgTitel(slug) {
  const d = kb.DEELGEBIEDEN.find(x => x.slug === slug);
  return d ? d.titel : 'Hele gebied';
}

// Wat de app van een feit te zien krijgt (geen historie, geen namen van beheerders)
function publiek(f, vandaag) {
  const b = kb.beoordeel(f, vandaag);
  const uit = {
    id: f.id, tekst: f.tekst, onderwerp: f.onderwerp || 'overig', type: f.type,
    deelgebied: f.deelgebied || 'heel', deelgebiedTitel: dgTitel(f.deelgebied),
    gecontroleerdOp: f.gecontroleerdOp || null, verouderd: b.verlopen,
    bron: f.bron || '', intern: f.zichtbaarheid === 'intern'
  };
  if (f.bronUrl) uit.bronUrl = f.bronUrl;
  if (f.plekId) uit.plekId = f.plekId;
  if (f.foto) { uit.foto = f.foto; uit.fotoBron = f.fotoBron || ''; }
  if (f.type === 'tijdelijk') { uit.einddatum = f.einddatum || null; if (f.startdatum) uit.startdatum = f.startdatum; }
  if (f.type === 'seizoen') uit.maanden = f.maanden || [];
  return uit;
}

// Datum waarop een feit uit de nm.nl-controle is goedgekeurd (of null)
function nmGoedgekeurd(f) {
  const h = (f.historie || []).find(x => x.herkomst === 'nm.nl' && /via voorstel/.test(x.actie || ''));
  return h ? String(h.datum).slice(0, 10) : null;
}

// Buurgebieden: horen níet bij Planken Wambuis (ander beheer), zie ook prompts.js
const BUURGEBIEDEN = ['De Hoge Veluwe', 'Ginkelse Heide', 'Reijerscamp'];
const gebiedInstellingen = kaart.gebiedInstellingen; // per deelgebied: eigen beschrijving, foto, kaartpositie

// Eerste zin van een tekst, ingekort tot ongeveer max tekens
function eersteZin(t, max) {
  const zin = (String(t).match(/^.*?[.!?](\s|$)/) || [t])[0].trim();
  return zin.length <= max ? zin : zin.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

const VOLGORDE = kb.ONDERWERPEN.map(o => o.slug);
function sorteer(a, b) {
  return VOLGORDE.indexOf(a.onderwerp) - VOLGORDE.indexOf(b.onderwerp) || a.id.localeCompare(b.id);
}

function gebieden(feiten, cfg) {
  const lijst = kb.DEELGEBIEDEN.filter(d => d.slug !== 'heel').map(d => {
    const eigen = feiten.filter(f => f.deelgebied === d.slug);
    const c = cfg[d.slug] || {};
    const landschap = eigen.filter(f => f.onderwerp === 'gebied').sort(sorteer)[0];
    return {
      slug: d.slug, titel: d.titel, aantal: eigen.length,
      beschrijving: c.beschrijving || (landschap ? eersteZin(landschap.tekst, 110) : ''),
      foto: c.foto || null, fotoBron: c.fotoBron || null
    };
  });
  return { gebieden: lijst, buurgebieden: BUURGEBIEDEN, heelAantal: feiten.filter(f => (f.deelgebied || 'heel') === 'heel').length };
}

function gebied(feiten, cfg, slug, vandaag) {
  const d = kb.DEELGEBIEDEN.find(x => x.slug === slug);
  if (!d) return null;
  const c = cfg[slug] || {};
  const eigen = feiten.filter(f => (f.deelgebied || 'heel') === slug).sort(sorteer);
  const onderwerpTitel = s => (kb.ONDERWERPEN.find(o => o.slug === s) || { titel: 'Overig' }).titel;
  return {
    slug, titel: d.titel, beschrijving: c.beschrijving || '', foto: c.foto || null, fotoBron: c.fotoBron || null,
    feiten: eigen.filter(f => f.onderwerp !== 'routes').map(f => Object.assign(publiek(f, vandaag), { onderwerpTitel: onderwerpTitel(f.onderwerp) })),
    routes: eigen.filter(f => f.onderwerp === 'routes').map(f => Object.assign(publiek(f, vandaag), { onderwerpTitel: onderwerpTitel(f.onderwerp) }))
  };
}

// Kaartgegevens: alleen actieve plekken en routes (intern alleen voor wie is ingelogd);
// bij elke plek de feiten uit de kennisbank die eraan gekoppeld zijn.
function kaartGegevens(feiten, plekken, routes, cfg, grenzen, ingelogd, vandaag) {
  const zichtbaar = x => x && x.status !== 'ingetrokken' && (x.zichtbaarheid !== 'intern' || ingelogd);
  const perPlek = {};
  for (const f of feiten) if (f.plekId) (perPlek[f.plekId] = perPlek[f.plekId] || []).push(f);
  const feitenPer = {};
  for (const f of feiten) feitenPer[f.id] = f;
  return {
    midden: kaart.MIDDEN,
    plekken: Object.values(plekken).filter(zichtbaar).map(p => {
      const bij = (perPlek[p.id] || []).sort(sorteer).map(f => publiek(f, vandaag));
      return {
        id: p.id, naam: p.naam, soort: p.soort, soortTitel: kaart.SOORTEN[p.soort] || 'Plek', lat: p.lat, lon: p.lon,
        deelgebied: p.deelgebied, deelgebiedTitel: dgTitel(p.deelgebied), intern: p.zichtbaarheid === 'intern',
        toelichting: p.toelichting || '', gecontroleerdOp: p.gecontroleerdOp || null,
        feiten: bij, tijdelijk: bij.some(f => f.type === 'tijdelijk')
      };
    }).sort((a, b) => a.naam.localeCompare(b.naam)),
    routes: Object.values(routes).filter(zichtbaar).map(r => ({
      id: r.id, naam: r.naam, lengteKm: r.lengteKm, punten: r.punten, deelgebied: r.deelgebied, deelgebiedTitel: dgTitel(r.deelgebied),
      intern: r.zichtbaarheid === 'intern', bron: r.bron || '', bronUrl: r.bronUrl || '', gecontroleerdOp: r.gecontroleerdOp || null,
      feit: r.feitId && feitenPer[r.feitId] ? publiek(feitenPer[r.feitId], vandaag) : null
    })).sort((a, b) => a.naam.localeCompare(b.naam)),
    gebieden: kb.DEELGEBIEDEN.filter(d => d.slug !== 'heel').map(d => {
      const c = cfg[d.slug] || {};
      return { slug: d.slug, titel: d.titel, lat: c.lat || null, lon: c.lon || null, grens: grenzen[d.slug] || null };
    })
  };
}

function actueel(feiten, vandaag) {
  const maand = nlMaand();
  const grens = new Date(Date.parse(vandaag) - NIEUWS_DAGEN * 86400000).toISOString().slice(0, 10);
  const tijdelijk = feiten.filter(f => f.type === 'tijdelijk')
    .sort((a, b) => (a.einddatum || '').localeCompare(b.einddatum || ''))
    .map(f => publiek(f, vandaag));
  const seizoen = feiten.filter(f => f.type === 'seizoen' && Array.isArray(f.maanden) && f.maanden.includes(maand))
    .map(f => publiek(f, vandaag));
  const nieuws = feiten.filter(f => f.type !== 'tijdelijk')
    .map(f => ({ f, datum: nmGoedgekeurd(f) }))
    .filter(x => x.datum && x.datum >= grens)
    .sort((a, b) => b.datum.localeCompare(a.datum))
    .slice(0, 10)
    .map(x => Object.assign(publiek(x.f, vandaag), { goedgekeurdOp: x.datum }));
  return { maand: MAANDNAMEN[maand - 1], tijdelijk, seizoen, nieuws };
}

module.exports = async function handler(req, res) {
  setSecurityHeaders(res, req.headers.origin, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await checkRateLimit(req, 'gebied', 120, 3600))) return res.status(429).json({ error: 'Te veel verzoeken, probeer het over een uur opnieuw.' });

  const body = req.body || {};
  try {
    const gebruiker = await auth.gebruiker(req);
    const vandaag = vandaagISO();
    // Zelfde selectie als de chat: actief, niet afgelopen, intern alleen voor wie is ingelogd.
    // Seizoensfeiten van alle maanden, zodat Gebieden ze ook kan tonen.
    const bruikbaar = kb.bruikbareFeiten(await kb.alleFeiten(), { ingelogd: !!gebruiker, vandaag, alleMaanden: true });
    const basis = { bijgewerkt: new Date().toISOString(), ingelogd: !!gebruiker };

    switch (body.actie) {
      case 'actueel':
        return res.json(Object.assign(basis, actueel(bruikbaar, vandaag)));
      case 'gebieden':
        return res.json(Object.assign(basis, gebieden(bruikbaar, await gebiedInstellingen())));
      case 'kaart': {
        const [plekken, routes, cfg, grenzen] = await Promise.all([kaart.plekken(), kaart.routes(), gebiedInstellingen(), kaart.grenzen()]);
        return res.json(Object.assign(basis, kaartGegevens(bruikbaar, plekken, routes, cfg, grenzen, !!gebruiker, vandaag)));
      }
      case 'gebied': {
        const g = gebied(bruikbaar, await gebiedInstellingen(), String(body.slug || ''), vandaag);
        if (!g) return res.status(404).json({ error: 'Onbekend gebied' });
        return res.json(Object.assign(basis, g));
      }
      default:
        return res.status(400).json({ error: 'Onbekende actie' });
    }
  } catch (e) {
    return res.status(503).json({ error: 'De gegevens zijn even niet bereikbaar. Probeer het zo opnieuw.' });
  }
};

module.exports.actueel = actueel;
module.exports.gebieden = gebieden;
module.exports.BUURGEBIEDEN = BUURGEBIEDEN;
module.exports.publiek = publiek;
