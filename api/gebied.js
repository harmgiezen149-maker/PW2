// Openbaar: gegevens voor de tabbladen Meldingen, Gebieden en Kaart. Alles komt uit
// dezelfde gecontroleerde kennisbank als de chat; interne feiten alleen voor wie is ingelogd.
const kb = require('./_lib/kennisbank');
const auth = require('./_lib/auth');
const { setSecurityHeaders, checkRateLimit, vandaagISO, nlMaand } = require('./_lib/http');

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
  if (f.type === 'tijdelijk') { uit.einddatum = f.einddatum || null; if (f.startdatum) uit.startdatum = f.startdatum; }
  if (f.type === 'seizoen') uit.maanden = f.maanden || [];
  return uit;
}

// Datum waarop een feit uit de nm.nl-controle is goedgekeurd (of null)
function nmGoedgekeurd(f) {
  const h = (f.historie || []).find(x => x.herkomst === 'nm.nl' && /via voorstel/.test(x.actie || ''));
  return h ? String(h.datum).slice(0, 10) : null;
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
      default:
        return res.status(400).json({ error: 'Onbekende actie' });
    }
  } catch (e) {
    return res.status(503).json({ error: 'De gegevens zijn even niet bereikbaar. Probeer het zo opnieuw.' });
  }
};

module.exports.actueel = actueel;
module.exports.publiek = publiek;
