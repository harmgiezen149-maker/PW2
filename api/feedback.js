// Openbaar: suggesties van gebruikers. Ze komen als voorstel bij de beheerder en
// worden pas na goedkeuring gebruikt.
const kv = require('./_lib/kv');
const kb = require('./_lib/kennisbank');
const { setSecurityHeaders, checkRateLimit, sanitizeText } = require('./_lib/http');

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
    return res.status(400).json({ error: 'Onbekende actie' });
  } catch (e) {
    return res.status(500).json({ error: 'Opslaan mislukt, probeer het later opnieuw.' });
  }
};
