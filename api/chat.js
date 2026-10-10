const Anthropic = require('@anthropic-ai/sdk');
const { setSecurityHeaders, checkRateLimit, sanitizeText } = require('./_lib/http');
const prompts = require('./_lib/prompts');
const kb = require('./_lib/kennisbank');
const kaart = require('./_lib/kaart');
const auth = require('./_lib/auth');
const logboek = require('./_lib/logboek');
const gebruik = require('./_lib/gebruik');

const MODEL = 'claude-opus-5-5';

module.exports = async function handler(req, res) {
  setSecurityHeaders(res, req.headers.origin, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!(await checkRateLimit(req, 'chat', 30, 3600))) {
    return res.status(429).json({ error: 'Te veel vragen in korte tijd. Probeer het over een uur opnieuw.' });
  }

  if (!req.body || !Array.isArray(req.body.messages)) {
    return res.status(400).json({ error: 'Ongeldig bericht' });
  }

  const messages = req.body.messages.map(m => {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    // Gebruikersvragen kort houden; het eerdere antwoord (fase-2-context) mag langer.
    return { role, content: sanitizeText(m.content, role === 'assistant' ? 8000 : 1000) };
  }).filter(m => m.content.length > 0);

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Bericht is leeg' });
  }

  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key niet geconfigureerd' });

  const phase = req.body.phase === 2 ? 2 : 1;
  const mode = req.body.mode === 'storytelling' ? 'storytelling' : 'normaal';
  // Interne feiten alleen voor ingelogde boswachters en vrijwilligers
  const gebruiker = await auth.gebruiker(req);
  const ingelogd = !!gebruiker;
  // Maandmaximum (Beheer → Gebruikers): op = geen nieuwe vragen meer deze maand
  if (gebruiker && gebruiker.maxPerMaand) {
    const st = await gebruik.stand(gebruiker);
    if (st.op) return res.status(429).json({ error: gebruik.OP_MELDING, gebruik: st });
  }
  const vraag = messages[0].content;

  let feiten, sites, routes;
  try {
    // De routes op de kaart horen ook bij de kennis; lukt dat ophalen niet, dan zonder
    [feiten, sites, routes] = await Promise.all([kb.alleFeiten(), kb.getSites(), kaart.routes().catch(() => ({}))]);
  } catch (e) {
    return res.status(503).json({ error: 'De kennisbank is even niet bereikbaar. Probeer het zo opnieuw.' });
  }
  // Ook activiteiten en werkzaamheden die binnen 90 dagen beginnen (gemarkeerd met "begint …")
  const bruikbaar = kb.bruikbareFeiten(Object.assign({}, feiten, kaart.routeFeiten(routes)), { ingelogd, vooruitDagen: 90 });

  // Kosten: antwoord en aanvulling sturen precies dezelfde voorkant (tools, systeemprompt, kennisbank
  // als documenten met de cache-markering op het laatste document). De aanvulling leest die dan uit
  // de cache van het antwoord in plaats van de hele kennisbank opnieuw te betalen. De taak staat
  // daarom niet in de systeemprompt maar als taakregel in het gebruikersbericht.
  const system = [{ type: 'text', text: prompts.systeem() }];
  const taak = mode === 'storytelling' ? prompts.TAAK.verhaal : prompts.TAAK.antwoord;
  const vraagTekst = `${taak}\n\n${messages[0].content}`;
  // Elk onderwerp als document met citaties, zodat elk gebiedsfeit terug te leiden is
  // naar een gecontroleerd kennisbankfeit.
  const gebouwd = kb.bouwDocumenten(bruikbaar);
  const meta = phase === 1 ? gebouwd.meta : [];
  if (gebouwd.docs.length > 0) {
    gebouwd.docs[gebouwd.docs.length - 1].cache_control = { type: 'ephemeral' };
    messages[0] = { role: 'user', content: [...gebouwd.docs, { type: 'text', text: vraagTekst }] };
  } else {
    messages[0] = { role: 'user', content: vraagTekst };
  }
  if (phase === 2) {
    // Aanvulling: vraag, eerder antwoord en de taakregel voor de aanvulling
    if (messages.length < 3 || messages[1].role !== 'assistant') return res.status(400).json({ error: 'Ongeldige aanvulling' });
    messages.splice(3);
    messages[2] = { role: 'user', content: `${prompts.TAAK.aanvulling}\n\nVul het antwoord hierboven aan volgens de regels van deze taak.` };
  }

  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: phase === 2 ? 8000 : 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: phase === 2 ? 'low' : 'medium' },
    system,
    messages,
    tools: [{
      type: 'web_search_20260209',
      name: 'web_search',
      max_uses: 1,   // in beide fasen gelijk: de tools horen bij de gedeelde, gecachete voorkant
      allowed_domains: sites,
      user_location: { type: 'approximate', country: 'NL', timezone: 'Europe/Amsterdam' }
    }]
  });

  // Vraag, antwoord, gebruikte feiten en webbronnen in het logboek (zonder persoonsgegevens)
  async function schrijfLog(final) {
    try {
      const tekst = [];
      const feitIds = new Set();
      const web = new Set();
      for (const b of final.content || []) {
        if (b.type !== 'text') continue;
        tekst.push(b.text);
        for (const c of b.citations || []) {
          if (c.type === 'content_block_location' && meta[c.document_index]) {
            for (let i = c.start_block_index; i < c.end_block_index; i++) {
              const f = meta[c.document_index].feiten[i];
              if (f) feitIds.add(f.id);
            }
          } else if (c.url) web.add(c.url);
        }
      }
      const antwoord = tekst.join('').replace(/\{\s*"soorten"[\s\S]*\}\s*$/, '').trim().slice(0, 8000);
      const verbruik = {
        stop: final.stop_reason, model: final.model, usage: final.usage || null, kosten: logboek.kosten(final.usage, final.model)
      };
      // Maandtotaal per gebruiker (bezoekers samen als "anoniem"); niet in het logboek zelf
      await gebruik.registreer(gebruiker ? gebruiker.id : 'anoniem', verbruik.kosten, { vraag: phase === 1 });
      if (phase === 2) {
        if (req.body.logId) await logboek.aanvullen(req.body.logId, { tekst: antwoord, web: [...web], ...verbruik });
        return null;
      }
      return await logboek.schrijf({
        vraag, antwoord, mode, rol: gebruiker ? gebruiker.rol : 'anoniem',
        feiten: [...feitIds], web: [...web], ...verbruik
      });
    } catch (e) {
      return null;
    }
  }

  let gestart = false;
  const stuur = (evt) => res.write(`data: ${JSON.stringify(evt)}\n\n`);
  try {
    for await (const event of stream) {
      if (!gestart) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        gestart = true;
        // Welke kennisbankfeiten achter welk document/blok zitten (voor de voetnoten)
        if (phase === 1) stuur({ type: 'pw_meta', docs: meta });
      }
      stuur(event);
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') {
      stuur({ type: 'pw_error', message: 'Deze vraag kan de assistent niet beantwoorden. Stel je vraag anders of vraag het de boswachter.' });
    }
    const logId = await schrijfLog(final);
    if (logId) stuur({ type: 'pw_log', id: logId });
    // Stand tegenover het maandmaximum, zodat de app bij 75% kan waarschuwen
    if (gebruiker && gebruiker.maxPerMaand) stuur({ type: 'pw_gebruik', gebruik: await gebruik.stand(gebruiker) });
  } catch (err) {
    const status = err instanceof Anthropic.APIError && err.status ? err.status : 502;
    if (!gestart) return res.status(status === 429 ? 429 : 502).json({ error: 'De assistent is even niet bereikbaar: ' + err.message });
    stuur({ type: 'pw_error', message: 'Het antwoord werd onderbroken. Probeer het opnieuw.' });
  }
  res.end();
};
