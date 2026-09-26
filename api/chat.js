const Anthropic = require('@anthropic-ai/sdk');
const kv = require('./_lib/kv');
const { setSecurityHeaders, checkRateLimit, sanitizeText } = require('./_lib/http');
const { STANDAARD_SITES } = require('./_lib/sites');
const prompts = require('./_lib/prompts');
const kennisbank = require('./_kennisbank');

const MODEL = 'claude-opus-5';

// Alleen door de beheerder goedgekeurde correcties; openstaande suggesties zijn nog niet gecontroleerd.
async function getGoedgekeurdeCorrecties() {
  try {
    const p = await kv.getJSON('approved', []);
    return Array.isArray(p) ? p.filter(x => typeof x === 'string' && x.trim()) : [];
  } catch (e) { return []; }
}

async function getKennisbankOverrides() {
  try {
    const p = await kv.getJSON('kennisbank', {});
    return (p && typeof p === 'object' && !Array.isArray(p)) ? p : {};
  } catch (e) { return {}; }
}

function renderKennisbank(overrides, correcties) {
  const secties = kennisbank.secties.map(s => {
    const o = overrides[s.slug];
    return o ? { titel: o.titel || s.titel, tekst: o.tekst, datum: o.gecontroleerd || s.laatstGecontroleerd }
             : { titel: s.titel, tekst: s.tekst, datum: s.laatstGecontroleerd };
  });
  const bekend = new Set(kennisbank.secties.map(s => s.slug));
  for (const slug of Object.keys(overrides)) {
    if (bekend.has(slug)) continue;
    const o = overrides[slug];
    if (o && o.tekst) secties.push({ titel: o.titel || slug, tekst: o.tekst, datum: o.gecontroleerd || '' });
  }
  let body = secties
    .map(s => `## ${s.titel}${s.datum ? ` (laatst gecontroleerd: ${s.datum})` : ''}\n${s.tekst}`)
    .join('\n\n');
  if (correcties.length > 0) {
    body += '\n\n## Goedgekeurde correcties\n' + correcties.map(c => `- ${c}`).join('\n');
  }
  return `<kennisbank>\n${body}\n</kennisbank>`;
}

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

  const [overrides, correcties] = await Promise.all([getKennisbankOverrides(), getGoedgekeurdeCorrecties()]);
  const kennisbankTekst = renderKennisbank(overrides, correcties);
  const phase = req.body.phase === 2 ? 2 : 1;
  const mode = req.body.mode === 'storytelling' ? 'storytelling' : 'normaal';

  const instructie = phase === 2 ? prompts.systeemAanvulling()
    : mode === 'storytelling' ? prompts.systeemVerhaal() : prompts.systeemNormaal();

  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: phase === 2 ? 8000 : 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: phase === 2 ? 'low' : 'medium' },
    system: [
      { type: 'text', text: instructie },
      { type: 'text', text: kennisbankTekst, cache_control: { type: 'ephemeral' } }
    ],
    messages,
    tools: [{
      type: 'web_search_20260209',
      name: 'web_search',
      max_uses: phase === 2 ? 2 : 1,
      allowed_domains: STANDAARD_SITES,
      user_location: { type: 'approximate', country: 'NL', timezone: 'Europe/Amsterdam' }
    }]
  });

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
      }
      stuur(event);
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') {
      stuur({ type: 'pw_error', message: 'Deze vraag kan de assistent niet beantwoorden. Stel je vraag anders of vraag het de boswachter.' });
    }
  } catch (err) {
    const status = err instanceof Anthropic.APIError && err.status ? err.status : 502;
    if (!gestart) return res.status(status === 429 ? 429 : 502).json({ error: 'De assistent is even niet bereikbaar: ' + err.message });
    stuur({ type: 'pw_error', message: 'Het antwoord werd onderbroken. Probeer het opnieuw.' });
  }
  res.end();
};
