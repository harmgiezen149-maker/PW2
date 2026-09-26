// Screenshots voor de handleiding: de echte pagina's uit de repository, met
// nagebootste API-antwoorden (zie mock.js; voorbeeldgegevens, geen echte of interne gegevens).
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
