// Openbaar deel van het inloggen:
// - 'wie': wie ben ik (op basis van mijn persoonlijke code)?
// - 'status': is er al een beheerder? (zo niet, dan kan de eerste worden aangemaakt)
// - 'start': eerste beheerder aanmaken met het beheerwachtwoord. Werkt alleen zolang
//   er geen actieve beheerder is; daarna heeft het wachtwoord geen functie meer.
const auth = require('./_lib/auth');
const { setSecurityHeaders, checkRateLimit, sanitizeText } = require('./_lib/http');

module.exports = async function handler(req, res) {
  setSecurityHeaders(res, req.headers.origin, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  const body = req.body || {};

  try {
    if (body.actie === 'wie') {
      return res.json({ gebruiker: await auth.gebruiker(req) });
    }

    if (body.actie === 'status') {
      return res.json({ beheerderAanwezig: await auth.heeftActieveBeheerder() });
    }

    if (body.actie === 'start') {
      if (!(await checkRateLimit(req, 'auth-start', 5, 600))) return res.status(429).json({ error: 'Te veel pogingen, wacht 10 minuten.' });
      if (await auth.heeftActieveBeheerder()) return res.status(409).json({ error: 'Er is al een beheerder. Vraag die om een persoonlijke link.' });
      const pw = process.env.BEHEER_WACHTWOORD;
      if (!pw || typeof body.wachtwoord !== 'string' || !auth.gelijk(body.wachtwoord, pw)) {
        return res.status(401).json({ error: 'Ongeldig wachtwoord' });
      }
      const naam = sanitizeText(body.naam, 60);
      if (naam.length < 2) return res.status(400).json({ error: 'Vul je naam in.' });
      const { gebruiker, code } = await auth.maakLink({ naam, rol: 'beheerder', door: naam + ' (eerste beheerder)' });
      return res.json({ ok: true, gebruiker, code });
    }

    return res.status(400).json({ error: 'Onbekende actie' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
