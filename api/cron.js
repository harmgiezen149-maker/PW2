// Dagelijkse taak (Vercel Cron, zie vercel.json): nm.nl controleren, wekelijkse
// back-up en het logboek opruimen. Draait maximaal één keer per dag.
const kv = require('./_lib/kv');
const nmcheck = require('./_lib/nmcheck');
const backup = require('./_lib/backup');
const logboek = require('./_lib/logboek');
const { vandaagISO } = require('./_lib/http');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).end();
  const lock = await kv.cmd('SET', 'cron:dag:' + vandaagISO(), '1', 'NX', 'EX', '172800');
  if (lock !== 'OK') return res.status(200).json({ overgeslagen: 'vandaag al uitgevoerd' });

  const status = { tijd: new Date().toISOString() };
  try { status.nm = await nmcheck.controleer(); } catch (e) { status.nm = { fout: e.message }; }
  try { status.backup = await backup.wekelijks(); } catch (e) { status.backup = { fout: e.message }; }
  try { await logboek.opruimen(); } catch (e) { status.logboekFout = e.message; }
  await kv.setJSON('cron:status', status);
  return res.status(200).json(status);
};
