// Screenshots voor de handleiding: de echte pagina's uit de repository, met
// nagebootste API-antwoorden (zie mock.js; voorbeeldgegevens, geen echte of interne gegevens).
// De kaartondergrond (PDOK) wordt vervangen door een lichte rastertegel.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { ORIGIN, BEHEERDER, nieuweContext, wacht } = require('./mock');

const OUT = path.join(__dirname, 'shots');

async function knip(page, selector, naam, marge) {
  const el = typeof selector === 'string' ? await page.$(selector) : selector;
  const box = await el.boundingBox();
  const m = marge == null ? 8 : marge;
  const vp = page.viewportSize();
  await page.screenshot({ path: path.join(OUT, naam), fullPage: true,
    clip: { x: Math.max(0, box.x - m), y: Math.max(0, box.y - m), width: Math.min(vp.width, box.width + 2 * m), height: box.height + 2 * m } });
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--lang=nl-NL'] });
  const ELS = { gebruiker: { naam: 'Els (voorbeeld)', rol: 'gebruiker' }, token: true };

  // ---------------- App (telefoonformaat)
  const MOBIEL = { width: 390, height: 844 };
  let ctx = await nieuweContext(browser, MOBIEL, ELS);
  let page = await ctx.newPage();
  await page.goto(ORIGIN + '/');
  await page.waitForLoadState('networkidle');
  await wacht(600);
  await page.screenshot({ path: path.join(OUT, 'app-start.png') });

  // Profiel
  await page.click('#tabbalk a[data-tab="profiel"]');
  await wacht(500);
  await page.screenshot({ path: path.join(OUT, 'app-profiel.png') });

  // Gebieden en een gebied
  await page.click('#tabbalk a[data-tab="gebieden"]');
  await wacht(600);
  await page.screenshot({ path: path.join(OUT, 'app-gebieden.png') });

  // Meldingen
  await page.click('#tabbalk a[data-tab="meldingen"]');
  await wacht(600);
  await page.screenshot({ path: path.join(OUT, 'app-meldingen.png') });

  // Kaart met een gekozen plek
  await page.click('#tabbalk a[data-tab="kaart"]');
  await wacht(1200);
  await page.click('.leaflet-marker-icon[title^="Parkeerplaats"]');
  await wacht(1000);
  await page.screenshot({ path: path.join(OUT, 'app-kaart.png') });

  // Iets melden en Mijn meldingen
  await page.goto(ORIGIN + '/#meldingen');
  await page.waitForLoadState('networkidle');
  await page.click('#ietsMelden');
  await page.fill('#meldTekst', 'Bij de ingang staat een nieuw bord met andere openingstijden.');
  await wacht(300);
  await page.click('.blad .knop-oranje');
  await wacht(400);
  await page.click('text=Naar mijn meldingen');
  await wacht(700);
  await knip(page, '#meldingenInhoud', 'app-mijnmeldingen.png', 0);
  await ctx.close();

  // Antwoord met voetnoten, kaartje en aanvulling (hoge viewport, zodat het hele antwoord zichtbaar is)
  ctx = await nieuweContext(browser, { width: 390, height: 2800 }, ELS);
  page = await ctx.newPage();
  await page.goto(ORIGIN + '/');
  await page.waitForLoadState('networkidle');
  await page.fill('#txt', 'Welke wandelroutes zijn er en waar kan ik parkeren?');
  await page.click('#btn');
  await page.waitForSelector('.bronnen');
  await page.waitForSelector('.aanvul-inline', { timeout: 10000 });
  await page.waitForSelector('.antwoord-kaart', { timeout: 10000 });
  await wacht(1200);
  const berichten = await page.$$('#chatInhoud .msg');
  const eerste = await berichten[0].boundingBox();
  const laatste = await berichten[1].boundingBox();
  // In twee delen, geknipt vlak boven het kopje "Regels in het gebied"
  const knipY = await page.evaluate(() => {
    const kop = [...document.querySelectorAll('#chatInhoud .bh')].find(e => /Regels/.test(e.textContent));
    return kop.getBoundingClientRect().top + window.scrollY - 10;
  });
  await page.screenshot({ path: path.join(OUT, 'app-antwoord-1.png'), fullPage: true,
    clip: { x: 0, y: eerste.y - 8, width: 390, height: knipY - eerste.y + 8 } });
  const scrollKnop = await (await page.$('.terug-boven')).boundingBox();
  await page.screenshot({ path: path.join(OUT, 'app-antwoord-2.png'), fullPage: true,
    clip: { x: 0, y: knipY, width: 390, height: Math.min(laatste.y + laatste.height, scrollKnop.y + scrollKnop.height + 12) - knipY } });

  // Klopt niet
  await page.click('.klopt-knop');
  await page.fill('.klopt-niet textarea', 'Ik mis de wandelroute bij Wolfheze in dit antwoord. Staat die niet in de kennisbank?');
  await wacht(300);
  const kn = await (await page.$('.klopt-niet')).boundingBox();
  const bron = await (await page.$('.bronnen')).boundingBox();
  await page.screenshot({ path: path.join(OUT, 'app-kloptniet.png'), fullPage: true,
    clip: { x: bron.x - 10, y: bron.y - 10, width: bron.width + 20, height: kn.y + kn.height - bron.y + 20 } });
  await ctx.close();

  // "Weet ik niet"
  ctx = await nieuweContext(browser, { width: 390, height: 2200 }, {});
  page = await ctx.newPage();
  await page.goto(ORIGIN + '/');
  await page.waitForLoadState('networkidle');
  await page.fill('#txt', 'Hoeveel boommarters leven er in Planken Wambuis?');
  await page.click('#btn');
  await page.waitForSelector('.bronnen');
  await page.waitForFunction(() => !document.querySelector('.aanvul-indicator'));
  await wacht(600);
  const bm = await page.$$('#chatInhoud .msg');
  const e1 = await bm[0].boundingBox(), e2 = await bm[1].boundingBox();
  await page.screenshot({ path: path.join(OUT, 'app-weetniet.png'), fullPage: true,
    clip: { x: 0, y: e1.y - 8, width: 390, height: e2.y + e2.height - e1.y + 16 } });
  await ctx.close();

  // ---------------- Beheerpaneel (laptopformaat)
  const LAPTOP = { width: 1280, height: 860 };
  // Eerste keer: geen beheerder
  ctx = await nieuweContext(browser, { width: 900, height: 860 }, { bestaatBeheerder: false });
  page = await ctx.newPage();
  await page.route(ORIGIN + '/api/beheer', r => r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Niet ingelogd"}' }));
  await page.goto(ORIGIN + '/beheer.html');
  await page.waitForSelector('#startVak', { state: 'visible' });
  await wacht(400);
  const sv = await (await page.$('#startVak')).boundingBox();
  await page.screenshot({ path: path.join(OUT, 'beheer-start.png'), clip: { x: 230, y: sv.y - 190, width: 440, height: sv.height + 210 } });
  await ctx.close();

  ctx = await nieuweContext(browser, LAPTOP, Object.assign({ bestaatBeheerder: true }, { gebruiker: BEHEERDER, token: true }));
  page = await ctx.newPage();
  await page.goto(ORIGIN + '/beheer.html');
  await page.waitForSelector('.stats');
  await wacht(600);
  await page.screenshot({ path: path.join(OUT, 'beheer-overzicht.png') });

  async function tab(naam) {
    await page.click('.tab >> text=' + naam);
    await wacht(900);
  }

  await tab('Voorstellen');
  {
    const sec = await (await page.$('#inhoud .section')).boundingBox();
    const kaart = await (await page.$('#inhoud .section .card:not([style])')).boundingBox();
    await page.screenshot({ path: path.join(OUT, 'beheer-voorstellen.png'), fullPage: true,
      clip: { x: sec.x, y: sec.y, width: sec.width, height: kaart.y + kaart.height - sec.y + 16 } });
  }

  await tab('Kennisbank');
  {
    const sec = await (await page.$('#inhoud .section')).boundingBox();
    const kaarten = await page.$$('#inhoud .card');
    const k = await kaarten[1].boundingBox();
    await page.screenshot({ path: path.join(OUT, 'beheer-kennisbank.png'), fullPage: true,
      clip: { x: sec.x, y: sec.y, width: sec.width, height: k.y + k.height - sec.y + 14 } });
  }

  await tab('Klopt niet');
  await knip(page, '#inhoud .section', 'beheer-kloptniet.png', 0);

  await tab('Logboek');
  await knip(page, '#inhoud .section', 'beheer-logboek.png', 0);

  await tab('Websites & controle');
  await knip(page, (await page.$$('#inhoud .section'))[1], 'beheer-websites.png', 0);

  await tab('Kaart en plekken');
  await wacht(800);
  await page.click('.bk-rij:has-text("Parkeerplaats")');
  await wacht(800);
  {
    const a = await (await page.$('#inhoud .bk-segment')).boundingBox();
    const b = await (await page.$('#inhoud .bk-indeling')).boundingBox();
    await page.screenshot({ path: path.join(OUT, 'beheer-kaart.png'), fullPage: true,
      clip: { x: b.x, y: a.y - 6, width: b.width, height: Math.min(b.y + b.height, a.y + 660) - a.y + 6 } });
  }

  await tab('Gebruikers');
  await page.fill('#inhoud input', 'Joris (vrijwilliger, voorbeeld)');
  await page.click('text=+ Link maken');
  await wacht(700);
  await knip(page, '#inhoud .section', 'beheer-gebruikers.png', 0);

  await ctx.close();
  await browser.close();
  console.log('klaar', fs.readdirSync(OUT));
})().catch(e => { console.error(e); process.exit(1); });
