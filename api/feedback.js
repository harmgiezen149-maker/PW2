// Openbaar: meldingen en suggesties van gebruikers. Ze komen bij de beheerder terecht
// en worden pas na goedkeuring gebruikt. De melder krijgt een id terug dat de app op het
// eigen apparaat bewaart, zodat onder "Mijn meldingen" de status te zien is (zie meldstatus.js).
const kv = require('./_lib/kv');
const kb = require('./_lib/kennisbank');
const logboek = require('./_lib/logboek');
const meldstatus = require('./_lib/meldstatus');
const { setSecurityHeaders, checkRateLimit, sanitizeText } = require('./_lib/http');

const K_MELDINGEN = 'kb:meldingen';

module.exports = async function handler(req, res) {
  setSecurityHeaders(res, req.headers.origin, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body || {};
  try {
    if (body.actie === 'suggestie') {
      if (!(await checkRateLimit(req, 'suggestie', 5, 86400))) return res.status(429).json({ error: 'Maximaal 5 suggesties per dag.' });
      const tekst = sanitizeText(body.tekst, 1000);
      if (tekst.length < 10) return res.status(400).json({ error: 'Een suggestie moet minimaal 10 tekens zijn.' });
      if ((await kv.cmd('HLEN', kb.K_VOORSTELLEN)) >= 300) return res.status(429).json({ error: 'Er staan al veel suggesties open. Probeer het later opnieuw.' });
      const id = kb.nieuwId('sugg', true);
      await kv.pipeline([
        ['HSET', kb.K_VOORSTELLEN, id, JSON.stringify({
          id, soort: 'nieuw', tekst, herkomst: 'gebruiker', deelgebied: 'heel', type: 'jaarlijks',
          zichtbaarheid: 'openbaar', aangemaakt: new Date().toISOString()
        })],
        meldstatus.cmd(id, 'ontvangen')
      ]);
      return res.json({ ok: true, id });
    }
    if (body.actie === 'klopt-niet') {
      // Melding bij een antwoord (met vraag en antwoord), of een losse melding vanuit Meldingen.
      if (!(await checkRateLimit(req, 'klopt-niet', 10, 86400))) return res.status(429).json({ error: 'Maximaal 10 meldingen per dag.' });
      const toelichting = sanitizeText(body.toelichting, 1000);
      const log = await logboek.get(body.logId);
      if (!log && toelichting.length < 5) return res.status(400).json({ error: 'Geef een korte toelichting.' });
      if ((await kv.cmd('HLEN', K_MELDINGEN)) >= 300) return res.status(429).json({ error: 'Er staan al veel meldingen open. Probeer het later opnieuw.' });
      const id = kb.nieuwId('meld', true);
      await kv.pipeline([
        ['HSET', K_MELDINGEN, id, JSON.stringify({
          id, logId: log ? log.id : null, toelichting,
          vraag: log ? log.vraag : '', antwoord: log ? log.antwoord.slice(0, 4000) : '',
          feiten: log ? log.feiten : [], web: log ? log.web : [],
          tijd: new Date().toISOString()
        })],
        meldstatus.cmd(id, 'ontvangen')
      ]);
      return res.json({ ok: true, id });
    }
    if (body.actie === 'status') {
      // Status van eigen meldingen; zonder inhoud, alleen status en datum.
      if (!(await checkRateLimit(req, 'meldstatus', 60, 3600))) return res.status(429).json({ error: 'Te vaak opgevraagd, probeer het later opnieuw.' });
      if (!Array.isArray(body.ids)) return res.status(400).json({ error: 'Geen lijst ontvangen' });
      return res.json({ statussen: await meldstatus.lees(body.ids) });
    }

    return res.status(400).json({ error: 'Onbekende actie' });
  } catch (e) {
    return res.status(500).json({ error: 'Opslaan mislukt, probeer het later opnieuw.' });
  }
};
