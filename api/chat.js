const Anthropic = require('@anthropic-ai/sdk');
const { setSecurityHeaders, checkRateLimit, sanitizeText } = require('./_lib/http');
const prompts = require('./_lib/prompts');
const kb = require('./_lib/kennisbank');
const kaart = require('./_lib/kaart');
const auth = require('./_lib/auth');
const logboek = require('./_lib/logboek');

const MODEL = 'claude-opus-5';

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

  const instructie = phase === 2 ? prompts.systeemAanvulling()
    : mode === 'storytelling' ? prompts.systeemVerhaal() : prompts.systeemNormaal();
  const system = [{ type: 'text', text: instructie }];
  let meta = [];

  if (phase === 2) {
    // Aanvulronde: kennisbank als platte tekst, zodat bekende feiten niet herhaald worden.
    system.push({ type: 'text', text: kb.alsTekst(bruikbaar), cache_control: { type: 'ephemeral' } });
  } else {
    // Hoofdantwoord: elk onderwerp als document met citaties, zodat elk gebiedsfeit
    // terug te leiden is naar een gecontroleerd kennisbankfeit.
    const gebouwd = kb.bouwDocumenten(bruikbaar);
    meta = gebouwd.meta;
    if (gebouwd.docs.length > 0) {
      gebouwd.docs[gebouwd.docs.length - 1].cache_control = { type: 'ephemeral' };
      messages[0] = { role: 'user', content: [...gebouwd.docs, { type: 'text', text: messages[0].content }] };
    }
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
      max_uses: phase === 2 ? 2 : 1,
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
      const gebruik = {
        stop: final.stop_reason, usage: final.usage || null, kosten: logboek.kosten(final.usage)
      };
      if (phase === 2) {
        if (req.body.logId) await logboek.aanvullen(req.body.logId, { tekst: antwoord, web: [...web], ...gebruik });
        return null;
      }
      return await logboek.schrijf({
        vraag, antwoord, mode, rol: gebruiker ? gebruiker.rol : 'anoniem',
        feiten: [...feitIds], web: [...web], ...gebruik
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
  } catch (err) {
    const status = err instanceof Anthropic.APIError && err.status ? err.status : 502;
    if (!gestart) return res.status(status === 429 ? 429 : 502).json({ error: 'De assistent is even niet bereikbaar: ' + err.message });
    stuur({ type: 'pw_error', message: 'Het antwoord werd onderbroken. Probeer het opnieuw.' });
  }
  res.end();
};
