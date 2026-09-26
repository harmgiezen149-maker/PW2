// Google Fonts via curl ophalen (Chromium kan niet door de proxy); met cache.
const { execFileSync } = require('child_process');
const cache = new Map();
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
module.exports = async function installeerFonts(context) {
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, async route => {
    const url = route.request().url();
    if (!cache.has(url)) cache.set(url, execFileSync('curl', ['-s', '--max-time', '20', '-A', UA, url], { maxBuffer: 20e6 }));
    const css = url.includes('googleapis');
    await route.fulfill({ status: 200, body: cache.get(url), contentType: css ? 'text/css' : 'font/woff2', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
};
