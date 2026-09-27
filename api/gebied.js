// Openbaar: gegevens voor de tabbladen Meldingen, Gebieden en Kaart. Alles komt uit
// dezelfde gecontroleerde kennisbank als de chat; interne feiten alleen voor wie is ingelogd.
const kb = require('./_lib/kennisbank');
const auth = require('./_lib/auth');
const { setSecurityHeaders, checkRateLimit, vandaagISO, nlMaand } = require('./_lib/http');

const kaart = require('./_lib/kaart');
const beeld = require('./_lib/achtergrond');
const kalender = require('./_lib/kalender');
const MAANDNAMEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const NIEUWS_DAGEN = 60;

function dgTitel(slug) {
  const d = kb.DEELGEBIEDEN.find(x => x.slug === slug);
  return d ? d.titel : 'Hele gebied';
}

// Foto: een geüploade foto (Beheer → Foto's) gaat voor een eerder ingevulde link
function metFoto(uit, beelden, soort, link, linkBron) {
  const f = beeld.fotoVoor(beelden, soort);
  if (f) Object.assign(uit, f);
  else if (link) { uit.foto = link; uit.fotoBron = linkBron || ''; }
  return uit;
}

// Wat de app van een feit te zien krijgt (geen historie, geen namen van beheerders)
function publiek(f, vandaag, beelden) {
  const b = kb.beoordeel(f, vandaag);
  const uit = {
    id: f.id, tekst: f.tekst, onderwerp: f.onderwerp || 'overig', type: f.type,
    deelgebied: f.deelgebied || 'heel', deelgebiedTitel: dgTitel(f.deelgebied),
    gecontroleerdOp: f.gecontroleerdOp || null, verouderd: b.verlopen,
    bron: f.bron || '', intern: f.zichtbaarheid === 'intern'
  };
  if (f.bronUrl) uit.bronUrl = f.bronUrl;
  if (f.plekId) uit.plekId = f.plekId;
  metFoto(uit, beelden, 'feit-' + f.id, f.foto, f.fotoBron);
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
const BUURGEBIEDEN = ['De Hoge Veluwe', 'Ginkelse Heide'];
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

function gebieden(feiten, cfg, beelden) {
  const lijst = kb.DEELGEBIEDEN.filter(d => d.slug !== 'heel').map(d => {
    const eigen = feiten.filter(f => f.deelgebied === d.slug);
    const c = cfg[d.slug] || {};
    const landschap = eigen.filter(f => f.onderwerp === 'gebied').sort(sorteer)[0];
    return metFoto({
      slug: d.slug, titel: d.titel, aantal: eigen.length,
      beschrijving: c.beschrijving || (landschap ? eersteZin(landschap.tekst, 110) : ''),
      foto: null, fotoBron: null
    }, beelden, 'gebied-' + d.slug, c.foto, c.fotoBron);
  });
  return { gebieden: lijst, buurgebieden: BUURGEBIEDEN, heelAantal: feiten.filter(f => (f.deelgebied || 'heel') === 'heel').length };
}

// Routes op de kaart in dit deelgebied (uit Kaart en plekken), met het gekoppelde feit
function kaartRoutesVan(routes, feiten, slug, ingelogd, vandaag, beelden) {
  const perId = {};
  for (const f of feiten) perId[f.id] = f;
  return Object.values(routes || {})
    .filter(r => r && r.deelgebied === slug && r.status !== 'ingetrokken' && (r.zichtbaarheid !== 'intern' || ingelogd))
    .sort((a, b) => a.naam.localeCompare(b.naam))
    .map(r => ({
      id: r.id, naam: r.naam, lengteKm: r.lengteKm, intern: r.zichtbaarheid === 'intern',
      bron: r.bron || '', bronUrl: r.bronUrl || '', gecontroleerdOp: r.gecontroleerdOp || null,
      feit: r.feitId && perId[r.feitId] ? publiek(perId[r.feitId], vandaag, beelden) : null
    }));
}

function gebied(feiten, cfg, slug, vandaag, beelden, routes, ingelogd) {
  const d = kb.DEELGEBIEDEN.find(x => x.slug === slug);
  if (!d) return null;
  const c = cfg[slug] || {};
  const eigen = feiten.filter(f => (f.deelgebied || 'heel') === slug).sort(sorteer);
  const onderwerpTitel = s => (kb.ONDERWERPEN.find(o => o.slug === s) || { titel: 'Overig' }).titel;
  return Object.assign(metFoto({ slug, titel: d.titel, beschrijving: c.beschrijving || '', foto: null, fotoBron: null },
    beelden, 'gebied-' + slug, c.foto, c.fotoBron), {
    feiten: eigen.filter(f => f.onderwerp !== 'routes').map(f => Object.assign(publiek(f, vandaag, beelden), { onderwerpTitel: onderwerpTitel(f.onderwerp) })),
    routes: eigen.filter(f => f.onderwerp === 'routes').map(f => Object.assign(publiek(f, vandaag, beelden), { onderwerpTitel: onderwerpTitel(f.onderwerp) })),
    kaartRoutes: kaartRoutesVan(routes, feiten, slug, ingelogd, vandaag, beelden)
  });
}

// Kaartgegevens: alleen actieve plekken en routes (intern alleen voor wie is ingelogd);
// bij elke plek de feiten uit de kennisbank die eraan gekoppeld zijn.
function kaartGegevens(feiten, plekken, routes, cfg, grenzen, ingelogd, vandaag, beelden) {
  const zichtbaar = x => x && x.status !== 'ingetrokken' && (x.zichtbaarheid !== 'intern' || ingelogd);
  const perPlek = {};
  for (const f of feiten) if (f.plekId) (perPlek[f.plekId] = perPlek[f.plekId] || []).push(f);
  const feitenPer = {};
  for (const f of feiten) feitenPer[f.id] = f;
  return {
    midden: kaart.MIDDEN,
    plekken: Object.values(plekken).filter(zichtbaar).map(p => {
      const bij = (perPlek[p.id] || []).sort(sorteer).map(f => publiek(f, vandaag, beelden));
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
      feit: r.feitId && feitenPer[r.feitId] ? publiek(feitenPer[r.feitId], vandaag, beelden) : null
    })).sort((a, b) => a.naam.localeCompare(b.naam)),
    gebieden: kb.DEELGEBIEDEN.filter(d => d.slug !== 'heel').map(d => {
      const c = cfg[d.slug] || {};
      return { slug: d.slug, titel: d.titel, lat: c.lat || null, lon: c.lon || null, grens: grenzen[d.slug] || null };
    })
  };
}

function actueel(feiten, vandaag, beelden) {
  const maand = nlMaand();
  const grens = new Date(Date.parse(vandaag) - NIEUWS_DAGEN * 86400000).toISOString().slice(0, 10);
  const tijdelijk = feiten.filter(f => f.type === 'tijdelijk')
    .sort((a, b) => (a.einddatum || '').localeCompare(b.einddatum || ''))
    .map(f => publiek(f, vandaag, beelden));
  const seizoen = feiten.filter(f => f.type === 'seizoen' && Array.isArray(f.maanden) && f.maanden.includes(maand))
    .map(f => publiek(f, vandaag, beelden));
  const nieuws = feiten.filter(f => f.type !== 'tijdelijk')
    .map(f => ({ f, datum: nmGoedgekeurd(f) }))
    .filter(x => x.datum && x.datum >= grens)
    .sort((a, b) => b.datum.localeCompare(a.datum))
    .slice(0, 10)
    .map(x => Object.assign(publiek(x.f, vandaag, beelden), { goedgekeurdOp: x.datum }));
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
    const [alleFeiten, beelden] = await Promise.all([kb.alleFeiten(), beeld.meta().catch(() => ({}))]);
    const bruikbaar = kb.bruikbareFeiten(alleFeiten, { ingelogd: !!gebruiker, vandaag, alleMaanden: true });
    const basis = { bijgewerkt: new Date().toISOString(), ingelogd: !!gebruiker };

    switch (body.actie) {
      case 'actueel':
        return res.json(Object.assign(basis, actueel(bruikbaar, vandaag, beelden)));
      case 'kalender':
        // Ook wat nog moet beginnen: de kalender kijkt twaalf maanden vooruit
        return res.json(Object.assign(basis, kalender.bouw(alleFeiten, { vandaag, ingelogd: !!gebruiker, publiek: f => publiek(f, vandaag, beelden) })));
      case 'gebieden':
        return res.json(Object.assign(basis, gebieden(bruikbaar, await gebiedInstellingen(), beelden)));
      case 'kaart': {
        const [plekken, routes, cfg, grenzen] = await Promise.all([kaart.plekken(), kaart.routes(), gebiedInstellingen(), kaart.grenzen()]);
        return res.json(Object.assign(basis, kaartGegevens(bruikbaar, plekken, routes, cfg, grenzen, !!gebruiker, vandaag, beelden)));
      }
      case 'gebied': {
        const [cfg, routes] = await Promise.all([gebiedInstellingen(), kaart.routes().catch(() => ({}))]);
        const g = gebied(bruikbaar, cfg, String(body.slug || ''), vandaag, beelden, routes, !!gebruiker);
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
