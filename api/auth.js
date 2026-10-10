// Openbaar deel van het inloggen:
// - 'wie': wie ben ik (op basis van mijn sessie)?
// - 'inloggen' / 'uitloggen': met gebruikersnaam en wachtwoord; elke inlog is een sessie per apparaat.
// - 'uitnodiging' / 'activeren': met een eenmalige uitnodigingslink van de beheerder een gebruikersnaam
//   en wachtwoord kiezen (of een vergeten wachtwoord opnieuw instellen).
// - 'wachtwoord-wijzigen': voor wie is ingelogd.
// - 'status': kan er al een beheerder inloggen? (zo niet, dan kan dat worden ingesteld)
// - 'start': met het beheerwachtwoord een beheerder met inlog instellen. Werkt alleen zolang er geen
//   beheerder is die kan inloggen; een bestaande beheerder zonder wachtwoord (van vóór het inloggen
//   met wachtwoord) wordt dan overgenomen. Daarna heeft het beheerwachtwoord geen functie meer.
const auth = require('./_lib/auth');
const gebruik = require('./_lib/gebruik');
const { setSecurityHeaders, checkRateLimit, sanitizeText } = require('./_lib/http');

module.exports = async function handler(req, res) {
  setSecurityHeaders(res, req.headers.origin, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  const body = req.body || {};
  const fout = (e) => res.status(e.status || 500).json({ error: e.message });

  try {
    if (body.actie === 'wie') {
      const g = await auth.gebruiker(req);
      // Een oude persoonlijke link is geen inlog meer, maar een eerdere versie van de app die nog in de
      // cache zit, zou de code bij "niet ingelogd" wissen. Daarom melden we hem als oude link: de nieuwe
      // app zet hem om naar een uitnodiging (gebruikersnaam en wachtwoord kiezen).
      if (!g) {
        const oud = await auth.oudeLink(req.headers['x-pw-token']);
        if (oud) return res.json({ gebruiker: { id: oud.id, naam: oud.naam, rol: oud.rol }, gebruik: null, oudeLink: true });
      }
      // Met het gebruik van deze maand, voor Profiel en de waarschuwing bij 75% van het maximum
      return res.json({ gebruiker: g, gebruik: g ? await gebruik.stand(g) : null });
    }

    if (body.actie === 'status') {
      return res.json({ beheerderAanwezig: await auth.heeftBeheerderMetInlog() });
    }

    if (body.actie === 'inloggen') {
      if (!(await checkRateLimit(req, 'inloggen', 20, 900))) return res.status(429).json({ error: 'Te veel pogingen. Probeer het over een kwartier opnieuw.' });
      try { return res.json(Object.assign({ ok: true }, await auth.inloggen({ gebruikersnaam: body.gebruikersnaam, wachtwoord: body.wachtwoord }))); }
      catch (e) { return fout(e); }
    }

    if (body.actie === 'uitloggen') {
      await auth.uitloggen(req.headers['x-pw-token']);
      return res.json({ ok: true });
    }

    // Wat hoort bij deze uitnodigingslink? (voor het scherm "kies je gebruikersnaam en wachtwoord")
    if (body.actie === 'uitnodiging') {
      if (!(await checkRateLimit(req, 'uitnodiging', 30, 900))) return res.status(429).json({ error: 'Te veel pogingen.' });
      return res.json({ uitnodiging: await auth.uitnodigingInfo(body.code) });
    }

    if (body.actie === 'activeren') {
      if (!(await checkRateLimit(req, 'activeren', 10, 900))) return res.status(429).json({ error: 'Te veel pogingen. Probeer het over een kwartier opnieuw.' });
      try { return res.json(Object.assign({ ok: true }, await auth.activeren({ code: body.code, gebruikersnaam: body.gebruikersnaam, wachtwoord: body.wachtwoord }))); }
      catch (e) { return fout(e); }
    }

    if (body.actie === 'wachtwoord-wijzigen') {
      const g = await auth.gebruiker(req);
      if (!g) return res.status(401).json({ error: 'Log eerst in.' });
      if (!(await checkRateLimit(req, 'wachtwoord', 10, 900))) return res.status(429).json({ error: 'Te veel pogingen. Probeer het over een kwartier opnieuw.' });
      try { await auth.wachtwoordWijzigen({ id: g.id, token: req.headers['x-pw-token'], oud: body.oud, nieuw: body.nieuw }); return res.json({ ok: true }); }
      catch (e) { return fout(e); }
    }

    if (body.actie === 'start') {
      if (!(await checkRateLimit(req, 'auth-start', 5, 600))) return res.status(429).json({ error: 'Te veel pogingen, wacht 10 minuten.' });
      if (await auth.heeftBeheerderMetInlog()) return res.status(409).json({ error: 'Er is al een beheerder. Log in met je gebruikersnaam en wachtwoord.' });
      const pw = process.env.BEHEER_WACHTWOORD;
      if (!pw || typeof body.wachtwoord !== 'string' || !auth.gelijk(body.wachtwoord, pw)) {
        return res.status(401).json({ error: 'Ongeldig beheerwachtwoord' });
      }
      const naam = sanitizeText(body.naam, 60);
      if (naam.length < 2) return res.status(400).json({ error: 'Vul je naam in.' });
      const wwFout = auth.controleerWachtwoord(body.nieuwWachtwoord);
      if (wwFout) return res.status(400).json({ error: wwFout });
      if (!auth.NAAM_RE.test(auth.normaalNaam(body.gebruikersnaam))) return res.status(400).json({ error: 'Kies een gebruikersnaam van 3 tot 40 tekens: kleine letters, cijfers, punt, streepje of liggend streepje.' });
      if (await require('./_lib/kv').cmd('HGET', auth.K_NAMEN, auth.normaalNaam(body.gebruikersnaam))) return res.status(409).json({ error: 'Die gebruikersnaam is al in gebruik. Kies een andere.' });
      // Beheerder met een eenmalige uitnodiging, die meteen wordt gebruikt om de inlog in te stellen.
      // Een bestaande beheerder zonder wachtwoord wordt overgenomen (zelfde account en gebruik).
      const bestaand = await auth.beheerderZonderInlog(naam);
      const { code } = bestaand
        ? await auth.maakLink({ id: bestaand.id, door: naam + ' (met beheerwachtwoord)' })
        : await auth.maakLink({ naam, rol: 'beheerder', door: naam + ' (eerste beheerder)' });
      try { return res.json(Object.assign({ ok: true }, await auth.activeren({ code, gebruikersnaam: body.gebruikersnaam, wachtwoord: body.nieuwWachtwoord }))); }
      catch (e) { return fout(e); }
    }

    return res.status(400).json({ error: 'Onbekende actie' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
