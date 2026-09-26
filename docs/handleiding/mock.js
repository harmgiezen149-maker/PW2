// Nagebootste API voor de schermafbeeldingen en de UI-tests: de echte pagina's uit de
// repository, met voorbeeldgegevens (geen echte of interne gegevens).
const fs = require('fs');
const path = require('path');
const installeerFonts = require('./fonts');

const ROOT = path.join(__dirname, '..', '..');
const ORIGIN = 'https://pwpb2.vercel.app';

// ---------------------------------------------------------------- voorbeelddata
const NU = '2026-09-26';
const ONDERWERPEN = [
  ['naam', 'Naam & historie'], ['gebied', 'Gebied & landschap'], ['wolf', 'Wolf'], ['soorten', 'Planten & dieren'],
  ['vee', 'Vee & begrazing'], ['beheer', 'Beheer & werkzaamheden'], ['routes', 'Plekken & routes'], ['bezoek', 'Praktisch bezoek'],
  ['veiligheid', 'Veiligheid'], ['nm', 'Natuurmonumenten & activiteiten'], ['contact', 'Contact & meldingen'],
  ['seizoen', 'Seizoenskalender'], ['overig', 'Overig']
].map(([slug, titel]) => ({ slug, titel }));
const DEELGEBIEDEN = [
  ['heel', 'Hele gebied'], ['wolfheze', 'Wolfheze & Wolfhezerheide'], ['mossel', 'Mossel & Mosselse Zand'],
  ['reemst', 'Oud & Nieuw Reemst'], ['buunderkamp', 'Buunderkamp'], ['oude-hout', 'Oude Hout']
].map(([slug, titel]) => ({ slug, titel }));
const TYPES = [
  { slug: 'vast', titel: 'Vast', maanden: 36 }, { slug: 'jaarlijks', titel: 'Jaarlijks', maanden: 12 },
  { slug: 'seizoen', titel: 'Seizoen', maanden: 12 }, { slug: 'tijdelijk', titel: 'Tijdelijk', maanden: null }
];
const SITES = ['natuurmonumenten.nl', 'bij12.nl', 'gelderland.nl', 'ede.nl', 'rijksoverheid.nl', 'wolveninnederland.nl',
  'sovon.nl', 'vogelbescherming.nl', 'vlinderstichting.nl', 'ravon.nl', 'zoogdiervereniging.nl', 'waarneming.nl',
  'gld.nl', 'edestad.nl', 'barneveldsekrant.nl'];
const NM_PAGINAS = [
  'https://www.natuurmonumenten.nl/natuurgebieden/planken-wambuis',
  'https://www.natuurmonumenten.nl/natuurgebieden/planken-wambuis/nieuws',
  'https://www.natuurmonumenten.nl/natuurgebieden/planken-wambuis/agenda'
];
const BEHEERDER = { id: 'u1', naam: 'Beheerder (voorbeeld)', rol: 'beheerder' };

const OVERZICHT = {
  gebruiker: BEHEERDER,
  aantallen: { feiten: 64, actief: 61, verlopen: 3, afgelopen: 1, voorstellen: 12, meldingen: 1 },
  cronStatus: { tijd: '2026-09-26T05:01:12Z', nm: { paginas: 3, gewijzigd: 1, nieuweBerichten: 2, voorstellen: 3, fouten: [] }, backup: { id: '2026-09-26' } },
  nmPaginas: NM_PAGINAS, onderwerpen: ONDERWERPEN, deelgebieden: DEELGEBIEDEN, types: TYPES, sites: SITES
};

function feit(o) {
  return Object.assign({ status: 'actief', zichtbaarheid: 'openbaar', deelgebied: 'heel', type: 'vast',
    gecontroleerdOp: NU, gecontroleerdDoor: 'Beheerder (voorbeeld)',
    historie: [{ datum: NU, actie: 'aangemaakt', door: 'Beheerder (voorbeeld)' }] }, o);
}
const FEITEN = [
  feit({ id: 'f1', onderwerp: 'routes', tekst: 'Wandelroutes van Natuurmonumenten in het gebied zijn onder andere de route Mosselse Zand (2,5 km), de route Oud Reemst (3,5 km) en de route Planken Wambuis (8 km). Alle routes staan op natuurmonumenten.nl en in de app Natuur Routes.', bron: 'Gebiedsfolder Planken Wambuis', bronDatum: '2021-04-01', beoordeling: { verval: '2029-09-26' } }),
  feit({ id: 'f2', onderwerp: 'bezoek', deelgebied: 'reemst', type: 'jaarlijks', tekst: 'Op parkeerplaats Oud Reemst (Otterlo) betalen niet-leden een parkeerbijdrage van € 2,00 per uur, met een maximum van € 8,00 per dag. Leden van Natuurmonumenten parkeren gratis door hun ledenpas bij de automaat te scannen.', bron: 'natuurmonumenten.nl', bronUrl: 'https://www.natuurmonumenten.nl/natuurgebieden/planken-wambuis', beoordeling: { verval: '2027-09-26' } }),
  feit({ id: 'f3', onderwerp: 'bezoek', tekst: 'Planken Wambuis is toegankelijk van zonsopkomst tot zonsondergang.', bron: 'Gebiedsfolder Planken Wambuis', bronDatum: '2021-04-01', gecontroleerdOp: '2023-05-14', beoordeling: { verval: '2026-05-14', verlopen: true } }),
  feit({ id: 'f4', onderwerp: 'overig', zichtbaarheid: 'intern', type: 'jaarlijks', tekst: 'Voorbeeld van een intern feit: afspraken voor vrijwilligers staan in Kiek onder Kennisbank. Dit feit ziet alleen wie is ingelogd.', bron: 'Kiek, map Kennisbank', beoordeling: { verval: '2027-09-26' } })
];

const VOORSTELLEN = [
  { id: 'v1', herkomst: 'nm.nl', soort: 'wijziging', aangemaakt: NU, feitId: 'nm1',
    toelichting: 'Op de pagina van Natuurmonumenten staat een ander ledental dan in de kennisbank.',
    huidigFeit: { tekst: 'Natuurmonumenten heeft ruim 950.000 leden. (voorbeeld)', gecontroleerdOp: '2024-03-01', onderwerp: 'nm', type: 'jaarlijks' },
    tekst: 'Natuurmonumenten heeft ongeveer 977.000 leden en donateurs.', onderwerp: 'nm', deelgebied: 'heel', type: 'jaarlijks', zichtbaarheid: 'openbaar',
    bron: 'natuurmonumenten.nl', bronUrl: 'https://www.natuurmonumenten.nl/', bronDatum: NU }
];

const MELDINGEN = [
  { id: 'm1', tijd: '2026-09-26T10:14:00Z', toelichting: 'Ik mis de wandelroute bij Wolfheze in dit antwoord. Staat die niet in de kennisbank?',
    vraag: 'Welke wandelroutes zijn er en waar kan ik parkeren?', antwoord: 'Er zijn drie wandelroutes van Natuurmonumenten in het gebied …',
    feiten: ['f1', 'f2', 'f3'], web: [] }
];

const LOGBOEK = {
  samenvatting: { vragen30: 84, kosten30: 6.12 }, totaal: 3,
  items: [
    { tijd: '2026-09-26T10:12:00Z', rol: 'gebruiker', mode: 'normaal', feiten: ['f1', 'f2', 'f3', 'f5'], web: [], vraag: 'Welke wandelroutes zijn er en waar kan ik parkeren?', antwoord: '…', stop: 'end_turn' },
    { tijd: '2026-09-26T09:40:00Z', rol: 'anoniem', mode: 'storytelling', feiten: ['f7'], web: ['natuurmonumenten.nl'], vraag: 'Vertel iets over het Mosselse Zand', antwoord: '…', stop: 'end_turn' },
    { tijd: '2026-09-25T15:02:00Z', rol: 'beheerder', mode: 'normaal', feiten: [], web: [], vraag: 'Hoeveel boommarters leven er in Planken Wambuis?', antwoord: '…', stop: 'end_turn' }
  ]
};

let GEBRUIKERS = [
  { id: 'u1', naam: 'Beheerder (voorbeeld)', rol: 'beheerder', linkGemaakt: '2026-09-26' },
  { id: 'u3', naam: 'Tom (oud-vrijwilliger, voorbeeld)', rol: 'gebruiker', linkGemaakt: '2026-09-26', linkGemaaktDoor: 'Beheerder (voorbeeld)', ingetrokken: true, ingetrokkenOp: '2026-09-26' }
];

const BACKUPS = { laatste: NU, backups: ['2026-09-26', '2026-09-19', '2026-09-12'] };

const WEER = {
  current: { temperature_2m: 15, apparent_temperature: 13, precipitation: 0, weather_code: 2, wind_speed_10m: 12 },
  daily: { time: ['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30'], weather_code: [2, 3, 61, 1, 0],
    temperature_2m_max: [17, 16, 14, 16, 18], temperature_2m_min: [8, 9, 10, 7, 6], precipitation_sum: [0, 0, 3.2, 0, 0] }
};

// ---------------------------------------------------------------- chat-stream
function sse(events) { return events.map(e => 'data: ' + JSON.stringify(e) + '\n\n').join(''); }
function kb(doc, i) { return { type: 'content_block_location', document_index: doc, start_block_index: i, end_block_index: i + 1 }; }
function stream(blokken, extra) {
  const ev = [];
  if (extra && extra.meta) ev.push({ type: 'pw_meta', docs: extra.meta });
  blokken.forEach((b, i) => {
    if (b.zoek) {
      ev.push({ type: 'content_block_start', index: i, content_block: { type: 'server_tool_use' } });
      ev.push({ type: 'content_block_stop', index: i });
      return;
    }
    if (b.resultaten) {
      ev.push({ type: 'content_block_start', index: i, content_block: { type: 'web_search_tool_result', content: b.resultaten } });
      ev.push({ type: 'content_block_stop', index: i });
      return;
    }
    ev.push({ type: 'content_block_start', index: i, content_block: { type: 'text', text: '' } });
    (b.cit || []).forEach(c => ev.push({ type: 'content_block_delta', index: i, delta: { type: 'citations_delta', citation: c } }));
    ev.push({ type: 'content_block_delta', index: i, delta: { type: 'text_delta', text: b.t } });
    ev.push({ type: 'content_block_stop', index: i });
  });
  ev.push({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: {} });
  if (extra && extra.log) ev.push({ type: 'pw_log', id: extra.log });
  return sse(ev);
}

const META_ROUTES = [
  { titel: 'Plekken & routes', feiten: [{ id: 'f1', deelgebied: 'Hele gebied', gecontroleerdOp: NU, verouderd: false, bron: 'Gebiedsfolder Planken Wambuis (2021)' }] },
  { titel: 'Praktisch bezoek', feiten: [
    { id: 'f2', deelgebied: 'Oud & Nieuw Reemst', gecontroleerdOp: NU, verouderd: false, bron: 'natuurmonumenten.nl', bronUrl: 'https://www.natuurmonumenten.nl/natuurgebieden/planken-wambuis', plekId: 'p1' },
    { id: 'f5', deelgebied: 'Hele gebied', gecontroleerdOp: NU, verouderd: false, bron: 'natuurmonumenten.nl', bronUrl: 'https://www.natuurmonumenten.nl/natuurgebieden/planken-wambuis' },
    { id: 'f3', deelgebied: 'Hele gebied', gecontroleerdOp: '2023-05-14', verouderd: true, bron: 'Gebiedsfolder Planken Wambuis (2021)' }
  ] }
];
const ANTWOORD_ROUTES = [
  { t: 'Er zijn drie wandelroutes van Natuurmonumenten in het gebied, en bij Oud Reemst ligt een parkeerplaats.\n\n## 🥾 Wandelroutes\n- **Drie routes**\n  - ' },
  { t: 'Route Mosselse Zand (2,5 km), route Oud Reemst (3,5 km) en route Planken Wambuis (8 km); alle routes staan op natuurmonumenten.nl en in de app Natuur Routes.', cit: [kb(0, 0)] },
  { t: '\n\n## 🅿️ Parkeren\n- **Oud Reemst**\n  - ' },
  { t: 'Niet-leden betalen € 2,00 per uur, met een maximum van € 8,00 per dag. Leden parkeren gratis met hun ledenpas.', cit: [kb(1, 0)] },
  { t: '\n\n## 🐕 Regels in het gebied\n- **Honden**\n  - ' },
  { t: 'Honden moeten kort aangelijnd zijn.', cit: [kb(1, 1)] },
  { t: '\n- **Openingstijden**\n  - ' },
  { t: 'Het gebied is toegankelijk van zonsopkomst tot zonsondergang (mogelijk verouderd, laatst gecontroleerd op 14-05-2023).', cit: [kb(1, 2)] },
  { t: '\n\n## 💬 Gesprekstips\n- Vraag wandelaars hoeveel tijd ze hebben en kies samen een route die past.\n- Leden parkeren gratis: een natuurlijk moment om het lidmaatschap te noemen.\n{"soorten":[]}' }
];
const WEB = { type: 'web_search_result_location', url: 'https://www.natuurmonumenten.nl/natuurgebieden/planken-wambuis/nieuws', title: 'Nieuws Planken Wambuis | Natuurmonumenten' };
const AANVULLING_ROUTES = [
  { zoek: true },
  { resultaten: [{ url: WEB.url, page_age: 'september 2026' }] },
  { t: '## 🥾 Wandelroutes\n- ' },
  { t: 'Let op: een fiets- en wandelpad tussen Nieuw Reemst en Mossel is tijdelijk afgesloten, zodat de jonge wolven niet aan mensen wennen (natuurmonumenten.nl, september 2026).', cit: [WEB] }
];

const META_MARTER = [
  { titel: 'Planten & dieren', feiten: [{ id: 'f9', deelgebied: 'Wolfheze & Wolfhezerheide', gecontroleerdOp: NU, verouderd: false, bron: 'Faunaportalen A12 (2016)' }] }
];
const ANTWOORD_MARTER = [
  { t: 'Dat weet ik niet: er staat geen aantal boommarters voor Planken Wambuis in de kennisbank. Vraag het de boswachter of kijk op natuurmonumenten.nl.\n\n## 🌲 Wat wel bekend is\n- **Faunaportalen over de A12**\n  - ' },
  { t: 'Boven de A12 tussen Ede en knooppunt Grijsoord zijn in 2016 twee wegportalen ingericht als faunaportaal, zodat boommarters en eekhoorns via touwen en een goot veilig kunnen oversteken.', cit: [kb(0, 0)] },
  { t: '\n\n## 🐾 Over de boommarter (algemeen)\n- **Leefwijze**\n  - De boommarter leeft vooral in bossen met oude bomen en is vooral in de schemering en \'s nachts actief.\n- **Voedsel**\n  - Hij eet onder meer muizen, eekhoorns, vogels, eieren, bessen en vruchten.\n{"soorten":[]}' }
];

let chatTeller = 0;
function chatAntwoord(body) {
  const vraag = (body.messages && body.messages[0] && body.messages[0].content) || '';
  const marter = /boommarter/i.test(vraag);
  if (body.phase === 2) return marter ? stream([{ t: 'GEEN_AANVULLING' }]) : stream(AANVULLING_ROUTES);
  chatTeller++;
  return marter ? stream(ANTWOORD_MARTER, { meta: META_MARTER, log: 'log' + chatTeller })
                : stream(ANTWOORD_ROUTES, { meta: META_ROUTES, log: 'log' + chatTeller });
}


// ---------------------------------------------------------------- herontwerp: meldingen, gebieden, kaart
function item(o) {
  return Object.assign({ onderwerp: 'bezoek', deelgebied: 'heel', deelgebiedTitel: 'Hele gebied', gecontroleerdOp: NU, verouderd: false, bron: 'natuurmonumenten.nl', intern: false }, o);
}
const ACTUEEL = {
  bijgewerkt: '2026-09-26T12:03:00Z', ingelogd: true, maand: 'september',
  tijdelijk: [
    item({ id: 't1', type: 'tijdelijk', einddatum: '2026-10-15', deelgebied: 'reemst', deelgebiedTitel: 'Oud & Nieuw Reemst', plekId: 'p1', tekst: 'Het fiets- en wandelpad van Nieuw Reemst naar Mossel is afgesloten, zodat de jonge wolven niet aan mensen wennen. Volg de omleidingsroute (voorbeeld).', bronUrl: 'https://www.natuurmonumenten.nl/natuurgebieden/planken-wambuis/nieuws' }),
    item({ id: 't2', type: 'tijdelijk', einddatum: '2026-10-04', startdatum: '2026-10-03', onderwerp: 'nm', tekst: 'Voorbeeld van een activiteit: excursie "Heide in de herfst".', intern: true })
  ],
  seizoen: [item({ id: 's1', type: 'seizoen', onderwerp: 'seizoen', maanden: [9], tekst: 'Voorbeeld uit de seizoenskalender: in september bloeit de struikheide na en begint de bronst van het edelhert.' })],
  nieuws: [item({ id: 'n1', type: 'jaarlijks', onderwerp: 'nm', goedgekeurdOp: '2026-09-20', tekst: 'Natuurmonumenten heeft ongeveer 977.000 leden en donateurs.', bronUrl: 'https://www.natuurmonumenten.nl/over-natuurmonumenten' })]
};
const GEBIEDEN = {
  bijgewerkt: '2026-09-26T12:03:00Z', ingelogd: true, heelAantal: 40, buurgebieden: ['De Hoge Veluwe', 'Ginkelse Heide', 'Reijerscamp'],
  gebieden: [
    { slug: 'wolfheze', titel: 'Wolfheze & Wolfhezerheide', aantal: 9, beschrijving: 'De Wodanseiken in Laag Wolfheze waren in 2021 ruim 450 jaar oud en behoren tot de bekendste…' },
    { slug: 'mossel', titel: 'Mossel & Mosselse Zand', aantal: 4, beschrijving: 'Voorbeeld van een korte beschrijving van het Mosselse Zand.' },
    { slug: 'reemst', titel: 'Oud & Nieuw Reemst', aantal: 3, beschrijving: '' },
    { slug: 'buunderkamp', titel: 'Buunderkamp', aantal: 0, beschrijving: '' },
    { slug: 'oude-hout', titel: 'Oude Hout', aantal: 1, beschrijving: '' }
  ]
};
const GEBIED_WOLFHEZE = {
  bijgewerkt: '2026-09-26T12:03:00Z', slug: 'wolfheze', titel: 'Wolfheze & Wolfhezerheide', beschrijving: '',
  feiten: [
    { id: 'w1', onderwerp: 'naam', onderwerpTitel: 'Naam & historie', tekst: 'Voorbeeld: in Laag-Wolfheze liggen grafheuvels uit de prehistorie.', gecontroleerdOp: NU, bron: 'Boekje Laag-Wolfheze' },
    { id: 'w2', onderwerp: 'gebied', onderwerpTitel: 'Gebied & landschap', tekst: 'De Wodanseiken in Laag Wolfheze waren in 2021 ruim 450 jaar oud en behoren tot de bekendste bomen van Nederland.', gecontroleerdOp: NU, bron: 'Gebiedsfolder (2021)' },
    { id: 'w3', onderwerp: 'gebied', onderwerpTitel: 'Gebied & landschap', tekst: 'De Heelsumse Beek is een spreng uit 1550.', gecontroleerdOp: '2023-02-01', verouderd: true, bron: 'Gebiedsfolder (2021)' },
    { id: 'w4', onderwerp: 'overig', onderwerpTitel: 'Overig', intern: true, tekst: 'Voorbeeld van een intern feit: alleen zichtbaar voor wie is ingelogd.', gecontroleerdOp: NU, bron: 'Kiek' }
  ],
  routes: []
};
// Voorbeeldplekken met verzonnen coördinaten: alleen voor schermafbeeldingen en tests
const KAART = {
  bijgewerkt: '2026-09-26T12:03:00Z', midden: { lat: 52.04, lon: 5.77, zoom: 12 },
  plekken: [
    { id: 'p1', naam: 'Parkeerplaats (voorbeeld)', soort: 'parkeren', soortTitel: 'Parkeerplaats', lat: 52.064, lon: 5.793, deelgebied: 'reemst', deelgebiedTitel: 'Oud & Nieuw Reemst', gecontroleerdOp: NU, tijdelijk: true,
      feiten: [
        { id: 'f2', type: 'jaarlijks', tekst: 'Niet-leden betalen € 2,00 per uur, met een maximum van € 8,00 per dag. Leden parkeren gratis met hun ledenpas.', gecontroleerdOp: NU, bron: 'natuurmonumenten.nl', bronUrl: 'https://www.natuurmonumenten.nl/natuurgebieden/planken-wambuis', plekId: 'p1' },
        { id: 't1', type: 'tijdelijk', einddatum: '2026-10-15', tekst: 'Het fiets- en wandelpad naar Mossel is tijdelijk afgesloten (voorbeeld).', gecontroleerdOp: NU, bron: 'natuurmonumenten.nl', plekId: 'p1' }] },
    { id: 'p2', naam: 'Uitkijkpost (voorbeeld)', soort: 'uitkijk', soortTitel: 'Uitkijkpunt of observatiepost', lat: 52.056, lon: 5.757, deelgebied: 'mossel', deelgebiedTitel: 'Mossel & Mosselse Zand', gecontroleerdOp: NU, feiten: [] },
    { id: 'p3', naam: 'Ingang (voorbeeld)', soort: 'ingang', soortTitel: 'Ingang of startpunt', lat: 52.004, lon: 5.788, deelgebied: 'wolfheze', deelgebiedTitel: 'Wolfheze & Wolfhezerheide', gecontroleerdOp: NU, feiten: [] }
  ],
  routes: [{ id: 'r1', naam: 'Wandelroute (voorbeeld)', lengteKm: 3.5, deelgebied: 'reemst', deelgebiedTitel: 'Oud & Nieuw Reemst', bron: 'GPX natuurmonumenten.nl', bronUrl: 'https://www.natuurmonumenten.nl/natuurgebieden/planken-wambuis', gecontroleerdOp: NU,
    punten: [[52.064, 5.793], [52.068, 5.797], [52.072, 5.795], [52.074, 5.788], [52.070, 5.782], [52.066, 5.785], [52.064, 5.793]], feit: null }],
  gebieden: [
    { slug: 'reemst', titel: 'Oud & Nieuw Reemst', lat: 52.07, lon: 5.80, grens: [[[52.058, 5.775], [52.08, 5.775], [52.08, 5.815], [52.058, 5.815]]] },
    { slug: 'mossel', titel: 'Mossel & Mosselse Zand', lat: 52.052, lon: 5.755, grens: null },
    { slug: 'wolfheze', titel: 'Wolfheze & Wolfhezerheide', lat: 52.008, lon: 5.79, grens: null },
    { slug: 'buunderkamp', titel: 'Buunderkamp', lat: null, lon: null, grens: null },
    { slug: 'oude-hout', titel: 'Oude Hout', lat: null, lon: null, grens: null }
  ]
};
const SOORTEN = [['parkeren', 'Parkeerplaats'], ['uitkijk', 'Uitkijkpunt of observatiepost'], ['ingang', 'Ingang of startpunt'], ['bezoekerscentrum', 'Bezoekerscentrum of informatiepunt'],
  ['horeca', 'Horeca'], ['voorziening', 'Voorziening (bank, toilet, picknickplek)'], ['overig', 'Overige plek']].map(([slug, titel]) => ({ slug, titel }));
const BEHEER_KAART = {
  plekken: KAART.plekken.map(p => ({ id: p.id, naam: p.naam, soort: p.soort, lat: p.lat, lon: p.lon, deelgebied: p.deelgebied, zichtbaarheid: 'openbaar', status: 'actief',
    gecontroleerdOp: NU, gecontroleerdDoor: 'Beheerder (voorbeeld)', feiten: p.feiten.map(f => ({ id: f.id, tekst: f.tekst, type: f.type })) })),
  routes: KAART.routes.map(r => ({ id: r.id, naam: r.naam, lengteKm: r.lengteKm, punten: r.punten, deelgebied: r.deelgebied, zichtbaarheid: 'openbaar', bron: r.bron, gecontroleerdOp: NU })),
  gebieden: { reemst: { lat: 52.07, lon: 5.80 }, mossel: { lat: 52.052, lon: 5.755, beschrijving: 'Voorbeeld van een korte beschrijving.' }, wolfheze: { lat: 52.008, lon: 5.79 } },
  grenzen: { reemst: KAART.gebieden[0].grens },
  soorten: Object.fromEntries(SOORTEN.map(s => [s.slug, s.titel])), midden: KAART.midden
};
OVERZICHT.soorten = SOORTEN;
OVERZICHT.plekkenKort = KAART.plekken.map(p => ({ id: p.id, naam: p.naam, soort: p.soort }));
OVERZICHT.aantallen.plekken = KAART.plekken.length;
OVERZICHT.aantallen.routes = KAART.routes.length;
OVERZICHT.kaartMidden = KAART.midden;
let meldTeller = 0;
// Standaardantwoorden voor de nieuwe endpoints (opties.api kan ze overschrijven)
function herontwerpApi(pad, body, opties) {
  if (pad === '/api/gebied') {
    if (body.actie === 'actueel') return ACTUEEL;
    if (body.actie === 'gebieden') return GEBIEDEN;
    if (body.actie === 'gebied') return body.slug === 'wolfheze' ? GEBIED_WOLFHEZE
      : Object.assign({}, GEBIED_WOLFHEZE, { slug: body.slug, titel: (GEBIEDEN.gebieden.find(g => g.slug === body.slug) || { titel: 'Gebied' }).titel, feiten: [] });
    if (body.actie === 'kaart') return opties.legeKaart ? Object.assign({}, KAART, { plekken: [], routes: [] }) : KAART;
  }
  if (pad === '/api/feedback') {
    if (body.actie === 'status') {
      const s = {};
      (body.ids || []).forEach((id, i) => { s[id] = [{ s: 'verwerkt', t: '2026-09-26T10:00:00Z' }, { s: 'in-behandeling', t: '2026-09-26T10:00:00Z' }, { s: 'ontvangen', t: '2026-09-26T10:00:00Z' }][i % 3]; });
      return { statussen: s };
    }
    return { ok: true, id: 'meld_voorbeeld' + (++meldTeller) + 'abcdef' };
  }
  if (pad === '/api/beheer' && body.actie === 'kaart') return BEHEER_KAART;
  return undefined;
}

// ---------------------------------------------------------------- routes
const TYPES_MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css',
  '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.gpx': 'application/gpx+xml',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

async function installeer(context, opties) {
  await context.route(/wikipedia\.org|wikimedia\.org|xeno-canto/, r => r.abort());
  await context.route(ORIGIN + '/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    let body = {};
    try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
    const json = (o, status) => route.fulfill({ status: status || 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (opties.api) {
      const extra = opties.api(url.pathname, body, url);
      if (extra !== undefined) return json(extra);
    }
    const nieuw = herontwerpApi(url.pathname, body, opties);
    if (nieuw !== undefined) return json(nieuw);
    switch (url.pathname) {
      case '/api/weather': return json(WEER);
      case '/api/auth':
        if (body.actie === 'wie') return json({ gebruiker: opties.gebruiker || null });
        if (body.actie === 'status') return json({ beheerderAanwezig: !!opties.bestaatBeheerder });
        return json({});
      case '/api/feedback': return json({ ok: true });
      case '/api/chat': return route.fulfill({ status: 200, contentType: 'text/event-stream', body: chatAntwoord(body) });
      case '/api/beheer': {
        const a = body.actie;
        if (a === 'overzicht') return json(OVERZICHT);
        if (a === 'voorstellen') return json({ voorstellen: VOORSTELLEN });
        if (a === 'feiten') return json({ feiten: FEITEN });
        if (a === 'meldingen') return json({ meldingen: MELDINGEN });
        if (a === 'logboek') return json(LOGBOEK);
        if (a === 'backups') return json(BACKUPS);
        if (a === 'gebruikers') return json({ gebruikers: GEBRUIKERS });
        if (a === 'gebruiker-maken') {
          const g = { id: 'u4', naam: body.naam, rol: body.rol, linkGemaakt: NU, linkGemaaktDoor: 'Beheerder (voorbeeld)' };
          GEBRUIKERS = GEBRUIKERS.concat([g]);
          return json({ gebruiker: g, code: 'VOORBEELDCODE-niet-echt-0000000000' });
        }
        return json({ ok: true });
      }
    }
    let p = url.pathname === '/' ? '/index.html' : url.pathname;
    const f = path.join(ROOT, decodeURIComponent(p));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: TYPES_MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
}

const wacht = ms => new Promise(r => setTimeout(r, ms));

// Lichte vervangtegel voor de PDOK-ondergrond (256x256, rasterlijnen), zodat schermafbeeldingen zonder internet werken
const TEGEL = fs.readFileSync(path.join(__dirname, 'tegel.png'));

async function nieuweContext(browser, viewport, opties) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, serviceWorkers: 'block', locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  await installeerFonts(context);
  await installeer(context, opties || {});
  await context.route(/service\.pdok\.nl/, r => r.fulfill({ status: 200, contentType: 'image/png', body: opties && opties.tegel ? opties.tegel : TEGEL }));
  if (opties && opties.token) {
    await context.addInitScript(() => { try { localStorage.setItem('pw_token', 'voorbeeldtoken'); } catch (e) {} });
  }
  return context;
}

module.exports = { ROOT, ORIGIN, NU, ONDERWERPEN, DEELGEBIEDEN, TYPES, BEHEERDER, OVERZICHT, FEITEN, VOORSTELLEN, MELDINGEN, WEER,
  ACTUEEL, GEBIEDEN, GEBIED_WOLFHEZE, KAART, BEHEER_KAART, SOORTEN,
  feit, sse, kb, stream, installeer, nieuweContext, wacht };
