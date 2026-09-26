// Zelftest voor preview-deployments: roept de echte chat-keten aan en geeft het
// resultaat als JSON terug. Werkt alleen op previews (die zijn afgeschermd met
// Vercel-authenticatie); op productie bestaat dit endpoint niet (404).
const chat = require('./chat');
const { checkRateLimit } = require('./_lib/http');

module.exports = async function handler(req, res) {
  if (process.env.VERCEL_ENV !== 'preview') return res.status(404).end();
  if (!(await checkRateLimit(req, 'zelftest', 20, 3600))) return res.status(429).json({ error: 'te vaak' });

  // ?taak=nm: de nm.nl-controle direct uitvoeren (zonder de tijd- en dagvergrendeling)
  if (req.query.taak === 'nm') {
    const t0 = Date.now();
    try {
      const status = await require('./_lib/nmcheck').controleer();
      return res.status(200).json({ duurMs: Date.now() - t0, status });
    } catch (e) {
      return res.status(200).json({ duurMs: Date.now() - t0, fout: e.message });
    }
  }

  const vraag = String(req.query.vraag || 'Hoeveel wolven leven er in Planken Wambuis?').slice(0, 300);
  const fase = req.query.fase === '2' ? 2 : 1;
  const messages = fase === 2
    ? [{ role: 'user', content: vraag }, { role: 'assistant', content: String(req.query.antwoord || '## Wolf\n- Er leeft een roedel.') }, { role: 'user', content: 'Vul dit antwoord aan volgens je instructies.' }]
    : [{ role: 'user', content: vraag }];

  const chunks = [];
  const nep = {
    statusCode: 200, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
    write(c) { chunks.push(c); return true; },
    end() { return this; }
  };
  const nepReq = { method: 'POST', headers: req.headers, query: {}, body: { messages, phase: fase, mode: req.query.mode || 'normaal' } };
  await chat(nepReq, nep);

  const events = chunks.join('').split('\n').filter(l => l.startsWith('data: ')).map(l => JSON.parse(l.slice(6)));
  let tekst = '';
  const citaties = [];
  const overig = {};
  for (const e of events) {
    if (e.type === 'content_block_delta' && e.delta.type === 'text_delta') tekst += e.delta.text;
    else if (e.type === 'content_block_delta' && e.delta.type === 'citations_delta') citaties.push(e.delta.citation);
    else overig[e.type] = (overig[e.type] || 0) + 1;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({
    status: nep.statusCode, fout: nep.body || null, tekst, citaties,
    eventTypes: overig,
    slot: events.filter(e => e.type === 'message_delta').map(e => ({ stop_reason: e.delta.stop_reason, usage: e.usage })),
    pw: events.filter(e => e.type && e.type.startsWith('pw_'))
  });
};
