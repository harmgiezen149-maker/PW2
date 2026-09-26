// Screenshots voor de handleiding: de echte pagina's uit de repository, met
// nagebootste API-antwoorden (voorbeeldgegevens, geen echte of interne gegevens).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const installeerFonts = require('./fonts');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, 'shots');
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
    { id: 'f2', deelgebied: 'Oud & Nieuw Reemst', gecontroleerdOp: NU, verouderd: false, bron: 'natuurmonumenten.nl', bronUrl: 'https://www.natuurmonumenten.nl/natuurgebieden/planken-wambuis' },
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

// ---------------------------------------------------------------- routes
const TYPES_MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

async function installeer(context, opties) {
  await context.route(/wikipedia\.org|wikimedia\.org|xeno-canto/, r => r.abort());
  await context.route(ORIGIN + '/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    let body = {};
    try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
    const json = (o, status) => route.fulfill({ status: status || 200, contentType: 'application/json', body: JSON.stringify(o) });
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

async function nieuweContext(browser, viewport, opties) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, serviceWorkers: 'block', locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  await installeerFonts(context);
  await installeer(context, opties || {});
  if (opties && opties.token) {
    await context.addInitScript(() => { try { localStorage.setItem('pw_token', 'voorbeeldtoken'); } catch (e) {} });
  }
  return context;
}

async function knip(page, selector, naam, marge) {
  const el = typeof selector === 'string' ? await page.$(selector) : selector;
  const box = await el.boundingBox();
  const m = marge == null ? 8 : marge;
  const vp = page.viewportSize();
  await page.screenshot({ path: path.join(OUT, naam), fullPage: true,
    clip: { x: Math.max(0, box.x - m), y: Math.max(0, box.y - m), width: Math.min(vp.width, box.width + 2 * m), height: box.height + 2 * m } });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--lang=nl-NL'] });

  // ---------------- App (telefoonformaat)
  const MOBIEL = { width: 400, height: 860 };
  const MOBIEL_LANG = { width: 400, height: 2600 };
  let ctx = await nieuweContext(browser, MOBIEL, { gebruiker: { naam: 'Els (voorbeeld)', rol: 'gebruiker' }, token: true });
  let page = await ctx.newPage();
  await page.goto(ORIGIN + '/');
  await page.waitForLoadState('networkidle');
  await page.click('#knoppenToggle');
  await wacht(600);
  await page.screenshot({ path: path.join(OUT, 'app-start.png') });

  // Instellingen (⚙️)
  await page.click('.hdr-right button');
  await wacht(500);
  await knip(page, '.beheer-panel', 'app-instellingen.png', 0);
  await page.click('.beheer-close');

  await ctx.close();

  // Antwoord met voetnoten + aanvulling (hoge viewport, zodat het hele antwoord zichtbaar is)
  ctx = await nieuweContext(browser, MOBIEL_LANG, { gebruiker: { naam: 'Els (voorbeeld)', rol: 'gebruiker' }, token: true });
  page = await ctx.newPage();
  await page.goto(ORIGIN + '/');
  await page.waitForLoadState('networkidle');
  await page.fill('#txt', 'Welke wandelroutes zijn er en waar kan ik parkeren?');
  await page.click('#btn');
  await page.waitForSelector('.bronnen');
  await page.waitForSelector('.aanvul-inline', { timeout: 10000 });
  await wacht(800);
  const berichten = await page.$$('#chat .msg');
  // vraag + antwoord samen
  const eerste = await berichten[0].boundingBox();
  const laatste = await berichten[1].boundingBox();
  await page.screenshot({ path: path.join(OUT, 'app-antwoord.png'), fullPage: true,
    clip: { x: 0, y: eerste.y - 8, width: MOBIEL.width, height: laatste.y + laatste.height - eerste.y + 16 } });
  // In twee delen, geknipt vlak boven het kopje "Regels in het gebied"
  const knipY = await page.evaluate(() => {
    const kop = [...document.querySelectorAll('#chat .bh')].find(e => /Regels/.test(e.textContent));
    return kop.getBoundingClientRect().top + window.scrollY - 10;
  });
  await page.screenshot({ path: path.join(OUT, 'app-antwoord-1.png'), fullPage: true,
    clip: { x: 0, y: eerste.y - 8, width: MOBIEL.width, height: knipY - eerste.y + 8 } });
  await page.screenshot({ path: path.join(OUT, 'app-antwoord-2.png'), fullPage: true,
    clip: { x: 0, y: knipY, width: MOBIEL.width, height: laatste.y + laatste.height + 8 - knipY } });

  // Klopt niet
  await page.click('.klopt-knop');
  await page.fill('.klopt-niet textarea', 'Ik mis de wandelroute bij Wolfheze in dit antwoord. Staat die niet in de kennisbank?');
  await wacht(300);
  const bron = await page.$('.bronnen');
  const kn = await page.$('.klopt-niet');
  const b1 = await bron.boundingBox(), b2 = await kn.boundingBox();
  await page.screenshot({ path: path.join(OUT, 'app-kloptniet.png'), fullPage: true,
    clip: { x: b1.x - 10, y: b1.y - 10, width: b1.width + 20, height: b2.y + b2.height - b1.y + 20 } });
  await ctx.close();

  // "Weet ik niet"
  ctx = await nieuweContext(browser, MOBIEL_LANG, {});
  page = await ctx.newPage();
  await page.goto(ORIGIN + '/');
  await page.waitForLoadState('networkidle');
  await page.fill('#txt', 'Hoeveel boommarters leven er in Planken Wambuis?');
  await page.click('#btn');
  await page.waitForSelector('.bronnen');
  await page.waitForFunction(() => !document.querySelector('.aanvul-indicator'));
  await wacht(600);
  const bm = await page.$$('#chat .msg');
  const e1 = await bm[0].boundingBox(), e2 = await bm[1].boundingBox();
  await page.screenshot({ path: path.join(OUT, 'app-weetniet.png'), fullPage: true,
    clip: { x: 0, y: e1.y - 8, width: MOBIEL.width, height: e2.y + e2.height - e1.y + 16 } });
  await ctx.close();

  // ---------------- Beheerpaneel (laptopformaat)
  const LAPTOP = { width: 860, height: 900 };
  // Eerste keer: geen beheerder
  ctx = await nieuweContext(browser, LAPTOP, { bestaatBeheerder: false });
  page = await ctx.newPage();
  await page.route(ORIGIN + '/api/beheer', r => r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Niet ingelogd"}' }));
  await page.goto(ORIGIN + '/beheer.html');
  await page.waitForSelector('#startVak', { state: 'visible' });
  await wacht(400);
  const sv = await (await page.$('#startVak')).boundingBox();
  await page.screenshot({ path: path.join(OUT, 'beheer-start.png'), clip: { x: 200, y: sv.y - 150, width: 460, height: sv.height + 170 } });
  await ctx.close();

  ctx = await nieuweContext(browser, LAPTOP, { gebruiker: BEHEERDER, token: true, bestaatBeheerder: true });
  page = await ctx.newPage();
  await page.goto(ORIGIN + '/beheer.html');
  await page.waitForSelector('.stats');
  await wacht(500);
  await knip(page, '#app', 'beheer-overzicht.png', 0);

  async function tab(naam) {
    await page.click('.tab >> text=' + naam);
    await wacht(700);
  }

  await tab('Voorstellen');
  const kaart = await page.$('.section .card:not([style])');
  const sec = await page.$('.section');
  const s1 = await sec.boundingBox(), k1 = await kaart.boundingBox();
  await page.screenshot({ path: path.join(OUT, 'beheer-voorstellen.png'), fullPage: true,
    clip: { x: s1.x, y: s1.y - 2, width: s1.width, height: k1.y + k1.height - s1.y + 18 } });

  await tab('Kennisbank');
  {
    const kaarten = await page.$$('#inhoud .card');
    const a = await (await page.$('#app')).boundingBox(), k = await kaarten[1].boundingBox();
    await page.screenshot({ path: path.join(OUT, 'beheer-kennisbank.png'), fullPage: true,
      clip: { x: a.x, y: a.y, width: a.width, height: k.y + k.height - a.y + 14 } });
  }

  await tab('Klopt niet');
  await knip(page, '#inhoud .section', 'beheer-kloptniet.png', 0);

  await tab('Logboek');
  await knip(page, '#inhoud .section', 'beheer-logboek.png', 0);

  await tab('Websites & controle');
  await knip(page, (await page.$$('#inhoud .section'))[1], 'beheer-websites.png', 0);

  await tab('Gebruikers');
  await page.fill('#inhoud input', 'Joris (vrijwilliger, voorbeeld)');
  await page.click('text=+ Link maken');
  await wacht(700);
  await knip(page, '#inhoud .section', 'beheer-gebruikers.png', 0);

  await tab('Back-up');
  await knip(page, '#inhoud .section', 'beheer-backup.png', 0);

  await ctx.close();
  await browser.close();
  console.log('klaar', fs.readdirSync(OUT));
})().catch(e => { console.error(e); process.exit(1); });
