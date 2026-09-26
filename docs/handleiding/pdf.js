// Zet handleiding.html om in een A4-pdf met paginanummers.
const { chromium } = require('playwright');
const path = require('path');
const installeerFonts = require('./fonts');

(async () => {
  const uit = process.argv[2] || path.join(__dirname, '..', 'handleiding-boswachter-assistent.pdf');
  const browser = await chromium.launch({ args: ['--lang=nl-NL'] });
  const context = await browser.newContext();
  await installeerFonts(context);
  const page = await context.newPage();
  await page.goto('file://' + path.join(__dirname, 'handleiding.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: uit,
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-size:7.5pt;color:#767676;padding:0 17mm;display:flex;justify-content:space-between;font-family:sans-serif">' +
      '<span>Handleiding Boswachter Assistent Planken Wambuis</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>'
  });
  await browser.close();
  console.log('pdf:', uit);
})().catch(e => { console.error(e); process.exit(1); });
