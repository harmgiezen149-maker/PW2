// Jaarkalender: per maand wat er in het gebied speelt, voor de publieksboswachter om aan
// bezoekers te vertellen. Komt uit de gecontroleerde kennisbank:
// - seizoensfeiten (type "seizoen", met maanden): elk jaar terugkerend, zoals bloei, bronst, trek;
// - tijdelijke feiten (type "tijdelijk", met datums): activiteiten, werkzaamheden, afsluitingen.
// Een feit kan een eigen kalendercategorie en korte titel hebben (Beheer → Jaarkalender);
// zonder categorie volgt die uit het onderwerp. Met categorie "geen" staat het niet in de kalender.
const { vandaagISO } = require('./http');

const CATEGORIEEN = [
  { slug: 'natuur', titel: 'Flora & fauna' },
  { slug: 'activiteit', titel: 'Activiteiten' },
  { slug: 'beheer', titel: 'Beheer & onderhoud' },
  { slug: 'overig', titel: 'Overig' }
];
const KEUZES = ['', 'geen'].concat(CATEGORIEEN.map(c => c.slug));
// Categorie als de beheerder er geen koos
const PER_ONDERWERP = { soorten: 'natuur', wolf: 'natuur', seizoen: 'natuur', vee: 'beheer', beheer: 'beheer', nm: 'activiteit' };
// Onderwerp voor een nieuw kalenderitem uit het beheerpaneel
const ONDERWERP_VOOR = { natuur: 'soorten', activiteit: 'nm', beheer: 'beheer', overig: 'seizoen' };
const MAANDNAMEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

function categorie(f) {
  if (f.kalender && f.kalender !== 'geen') return f.kalender;
  return PER_ONDERWERP[f.onderwerp] || 'overig';
}

// Hoort een feit in de kalender? Alleen met een moment: maanden (seizoen) of een einddatum (tijdelijk).
function inKalender(f) {
  if (!f || f.kalender === 'geen') return false;
  if (f.type === 'seizoen') return Array.isArray(f.maanden) && f.maanden.length > 0;
  if (f.type === 'tijdelijk') return !!f.einddatum;
  return false;
}

function pad(n) { return String(n).padStart(2, '0'); }
function laatsteDag(jaar, maand) { return new Date(Date.UTC(jaar, maand, 0)).getUTCDate(); }

// Twaalf maanden vanaf de huidige: { jaar, maand, begin, einde }
function periode(vandaag) {
  let jaar = Number(vandaag.slice(0, 4)), maand = Number(vandaag.slice(5, 7));
  const uit = [];
  for (let i = 0; i < 12; i++) {
    uit.push({ jaar, maand, begin: `${jaar}-${pad(maand)}-01`, einde: `${jaar}-${pad(maand)}-${pad(laatsteDag(jaar, maand))}` });
    maand++; if (maand > 12) { maand = 1; jaar++; }
  }
  return uit;
}

// feiten: object of lijst met alle feiten. publiek(f): wat de app van een feit mag zien.
// Geeft { maanden: [{ jaar, maand, naam, ids }], items: { id: {...} }, categorieen }.
function bouw(feiten, { vandaag, ingelogd, publiek }) {
  vandaag = vandaag || vandaagISO();
  const lijst = (Array.isArray(feiten) ? feiten : Object.values(feiten || {})).filter(f =>
    f && f.status === 'actief' && (f.zichtbaarheid !== 'intern' || ingelogd) && inKalender(f) &&
    !(f.type === 'tijdelijk' && f.einddatum < vandaag));
  const maanden = periode(vandaag).map(p => {
    const hier = lijst.filter(f => f.type === 'seizoen'
      ? f.maanden.includes(p.maand)
      : (f.startdatum || vandaag) <= p.einde && f.einddatum >= p.begin);
    // Eerst wat een datum heeft (op volgorde), dan de seizoenszaken per categorie
    hier.sort((a, b) => {
      const da = a.type === 'tijdelijk' ? (a.startdatum || vandaag) : '9', db = b.type === 'tijdelijk' ? (b.startdatum || vandaag) : '9';
      if (da !== db) return da < db ? -1 : 1;
      const ca = CATEGORIEEN.findIndex(c => c.slug === categorie(a)), cb = CATEGORIEEN.findIndex(c => c.slug === categorie(b));
      return ca - cb || String(a.titel || a.tekst).localeCompare(String(b.titel || b.tekst));
    });
    return { jaar: p.jaar, maand: p.maand, naam: MAANDNAMEN[p.maand - 1], ids: hier.map(f => f.id) };
  });
  const items = {};
  for (const m of maanden) for (const id of m.ids) {
    if (items[id]) continue;
    const f = lijst.find(x => x.id === id);
    items[id] = Object.assign(publiek ? publiek(f) : { id: f.id, tekst: f.tekst }, {
      categorie: categorie(f), titel: f.titel || '', type: f.type,
      maanden: f.type === 'seizoen' ? f.maanden : undefined,
      startdatum: f.type === 'tijdelijk' ? (f.startdatum || null) : undefined,
      einddatum: f.type === 'tijdelijk' ? f.einddatum : undefined
    });
  }
  return { van: maanden[0].jaar + '-' + pad(maanden[0].maand), maanden, items, categorieen: CATEGORIEEN };
}

// Controle van de kalendervelden van een feit (uit het beheerpaneel). Geeft een foutmelding of null.
function controleer(f) {
  if (f.kalender !== undefined && !KEUZES.includes(f.kalender)) return 'Onbekende kalendercategorie.';
  if (f.kalender && f.kalender !== 'geen' && !['seizoen', 'tijdelijk'].includes(f.type)) {
    return 'Een item in de jaarkalender komt elk jaar terug (type seizoen, met maanden) of heeft een datum (type tijdelijk).';
  }
  if (f.kalender && f.kalender !== 'geen' && f.type === 'seizoen' && !(Array.isArray(f.maanden) && f.maanden.length)) {
    return 'Kies in welke maanden dit elk jaar speelt.';
  }
  return null;
}

module.exports = { CATEGORIEEN, KEUZES, ONDERWERP_VOOR, MAANDNAMEN, categorie, inKalender, periode, bouw, controleer };
