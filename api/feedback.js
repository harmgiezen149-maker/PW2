// Openbaar: suggesties van gebruikers. Ze komen als voorstel bij de beheerder en
// worden pas na goedkeuring gebruikt.
const kv = require('./_lib/kv');
const kb = require('./_lib/kennisbank');
const logboek = require('./_lib/logboek');
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
      const id = kb.nieuwId('sugg');
      await kv.hsetJSON(kb.K_VOORSTELLEN, id, {
        id, soort: 'nieuw', tekst, herkomst: 'gebruiker', deelgebied: 'heel', type: 'jaarlijks',
        zichtbaarheid: 'openbaar', aangemaakt: new Date().toISOString()
      });
      return res.json({ ok: true });
    }
    if (body.actie === 'klopt-niet') {
      // Melding bij een antwoord: komt met vraag en antwoord in het beheerpaneel.
      if (!(await checkRateLimit(req, 'klopt-niet', 10, 86400))) return res.status(429).json({ error: 'Maximaal 10 meldingen per dag.' });
      const toelichting = sanitizeText(body.toelichting, 1000);
      const log = await logboek.get(body.logId);
      if (!log && toelichting.length < 5) return res.status(400).json({ error: 'Geef een korte toelichting.' });
      if ((await kv.cmd('HLEN', K_MELDINGEN)) >= 300) return res.status(429).json({ error: 'Er staan al veel meldingen open. Probeer het later opnieuw.' });
      const id = kb.nieuwId('meld');
      await kv.hsetJSON(K_MELDINGEN, id, {
        id, logId: log ? log.id : null, toelichting,
        vraag: log ? log.vraag : '', antwoord: log ? log.antwoord.slice(0, 4000) : '',
        feiten: log ? log.feiten : [], web: log ? log.web : [],
        tijd: new Date().toISOString()
      });
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'Onbekende actie' });
  } catch (e) {
    return res.status(500).json({ error: 'Opslaan mislukt, probeer het later opnieuw.' });
  }
};
