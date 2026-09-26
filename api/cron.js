// Wekelijkse taak (Vercel Cron, zie vercel.json): nm.nl controleren, back-up en
// het logboek opruimen. Draait op zaterdag om 07:00 Nederlandse tijd; de boswachters
// zijn alleen in het weekend actief. Vercel Cron rekent in UTC, daarom staan er twee
// tijden in vercel.json (05:00 en 06:00 UTC) en kiest deze functie de juiste
// (zomer- of wintertijd). Draait maximaal één keer per dag.
const kv = require('./_lib/kv');
const nmcheck = require('./_lib/nmcheck');
const backup = require('./_lib/backup');
const logboek = require('./_lib/logboek');
const meldstatus = require('./_lib/meldstatus');
const { vandaagISO } = require('./_lib/http');

// Weekdag en uur in Nederland
function nlNu() {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', weekday: 'short', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date());
  return { dag: p.find(x => x.type === 'weekday').value, uur: Number(p.find(x => x.type === 'hour').value) };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).end();
  const nu = nlNu();
  if (nu.dag !== 'Sat' || nu.uur < 7) return res.status(200).json({ overgeslagen: 'alleen op zaterdag vanaf 07:00' });
  const lock = await kv.cmd('SET', 'cron:dag:' + vandaagISO(), '1', 'NX', 'EX', '172800');
  if (lock !== 'OK') return res.status(200).json({ overgeslagen: 'vandaag al uitgevoerd' });

  const status = { tijd: new Date().toISOString() };
  try { status.nm = await nmcheck.controleer(); } catch (e) { status.nm = { fout: e.message }; }
  try { status.backup = await backup.wekelijks(); } catch (e) { status.backup = { fout: e.message }; }
  try { await logboek.opruimen(); } catch (e) { status.logboekFout = e.message; }
  try { await meldstatus.opruimen(); } catch (e) { status.meldstatusFout = e.message; }
  await kv.setJSON('cron:status', status);
  return res.status(200).json(status);
};
