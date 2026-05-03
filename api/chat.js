const ALLOWED_ORIGIN = 'https://pwpb2.vercel.app';

function setSecurityHeaders(res, origin) {
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin');
}

function getIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 
         req.headers['x-real-ip'] || 'unknown';
}

async function checkRateLimit(ip, endpoint, maxRequests, windowSeconds) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return { ok: true };

  const key = `rl:${endpoint}:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;

  try {
    const r = await fetch(`${url}/get/${key}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    let timestamps = [];
    if (data.result) {
      try {
        let p = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        if (p && p.value !== undefined) p = typeof p.value === 'string' ? JSON.parse(p.value) : p.value;
        if (Array.isArray(p)) timestamps = p.filter(t => t > windowStart);
      } catch(e) {}
    }

    if (timestamps.length >= maxRequests) {
      return { ok: false, retryAfter: timestamps[0] + windowSeconds - now };
    }

    timestamps.push(now);
    const encoded = encodeURIComponent(JSON.stringify(timestamps));
    await fetch(`${url}/set/${key}/${encoded}?EX=${windowSeconds}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    return { ok: true };
  } catch(e) {
    return { ok: true };
  }
}

function sanitizeText(text, maxLength) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, maxLength);
}

function getSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return 'lente (maart t/m mei)';
  if (m >= 6 && m <= 8) return 'zomer (juni t/m augustus)';
  if (m >= 9 && m <= 11) return 'herfst (september t/m november)';
  return 'winter (december t/m februari)';
}

async function getCorrections() {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    const parse = (raw) => {
      try {
        const d = JSON.parse(raw);
        if (!d.result) return [];
        let p = typeof d.result === 'string' ? JSON.parse(d.result) : d.result;
        if (p && p.value !== undefined) p = typeof p.value === 'string' ? JSON.parse(p.value) : p.value;
        if (!Array.isArray(p)) return [];
        return p.filter(x => x !== null && x !== undefined);
      } catch(e) { return []; }
    };
    const [rp, ra] = await Promise.all([
      fetch(`${url}/get/pending`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${url}/get/approved`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const [tp, ta] = await Promise.all([rp.text(), ra.text()]);
    return [...parse(tp), ...parse(ta)];
  } catch(e) { return []; }
}

function getSystemNormaal(corrections) {
  const season = getSeason();
  const date = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  let correctionsText = '';
  if (corrections && corrections.length > 0) {
    correctionsText = '\n\nACTUELE CORRECTIES EN AANVULLINGEN:\n' +
      corrections.map((c, i) => `${i+1}. ${c}`).join('\n');
  }
  return `Je bent een deskundige boswachter-assistent voor Planken Wambuis op de Zuidwest-Veluwe.

Het is nu ${season} (${date}). Geef alleen seizoensrelevante info.

Geef uitgebreide antwoorden met minimaal 300 woorden. Structureer:
- Enthousiaste inleiding van 2-3 zinnen
- ## kopjes voor onderwerpen (minimaal 3)
- Bulletstructuur:
  - Hoofdonderwerp (- **Onderwerp**)
    - Toelichting als subbullet
    - Detail
- Sluit af met ## Gesprekstips
- Op de ALLERLAATSTE regel: {"soorten":["Naam1","Naam2"]}

Gebied: heide, stuifzand, eikenbos, vennen. Plekken: Mosselse Zand, Oude Hout, Oud Reemst, De Mossel, Wolfhezerheide.
Soorten: heideblauwtje, nachtzwaluw, hagedis, adder, zwijn, ree, edelhert, das, torenvalk, buizerd.
Beheer: schapenbegrazing, plaggen, branden, maaien door Natuurmonumenten.

LEDEN: NM heeft 750.000 leden. Lid v.a. €2,50/mnd. Aanmelden via nm.nl.

WOLF: vaste roedel van ca. 13 wolven (2 ouders, 2 jaarlingen, 9 welpen) in Planken Wambuis sinds 2022. GW2435m actief. Meldingen BIJ12 (0800-1212).${correctionsText}`;
}

function getSystemStorytelling(corrections) {
  const season = getSeason();
  const date = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  let correctionsText = '';
  if (corrections && corrections.length > 0) {
    correctionsText = '\n\nACTUELE CORRECTIES:\n' + corrections.map((c, i) => `${i+1}. ${c}`).join('\n');
  }
  return `Je bent een deskundige boswachter-assistent voor Planken Wambuis op de Zuidwest-Veluwe.

Het is nu ${season} (${date}). Alleen seizoensrelevante info.

Geef uitgebreide verhaal-antwoorden minimaal 300 woorden:

## [Pakkende titel]

Sfeervolle opening met zintuigen.

### 🌿 Beleving
Tastbare beschrijving van het moment.

### ⚡ Verrassing
"Wist je dat..." met verrassend feit.

### 📖 Feit
- **Hoofdfeit**
  - Toelichting
  - Detail

### ❓ Vraag aan de bezoeker
1-2 vragen om bezoekers te betrekken.

### 💬 Gesprekstips
2-3 tips als bullets.

Gebied: heide, stuifzand, eikenbos, vennen. Plekken: Mosselse Zand, Oude Hout, Oud Reemst, De Mossel, Wolfhezerheide.
Soorten: heideblauwtje, nachtzwaluw, hagedis, adder, zwijn, ree, edelhert, das, torenvalk, buizerd.
Wolvenroedel: 13 wolven sinds 2022.

Op ALLERLAATSTE regel: {"soorten":["Naam1","Naam2"]}${correctionsText}`;
}

module.exports = async function handler(req, res) {
  setSecurityHeaders(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ip = getIp(req);
  const limit = await checkRateLimit(ip, 'chat', 30, 3600);
  if (!limit.ok) {
    return res.status(429).json({ error: `Te veel verzoeken. Probeer over ${limit.retryAfter}s opnieuw.` });
  }

  if (!req.body || !Array.isArray(req.body.messages)) {
    return res.status(400).json({ error: 'Ongeldig bericht' });
  }

  const messages = req.body.messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: sanitizeText(m.content, 1000)
  })).filter(m => m.content.length > 0);

  if (messages.length === 0) {
    return res.status(400).json({ error: 'Bericht is leeg' });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key niet geconfigureerd' });

  try {
    const corrections = await getCorrections();
    const mode = req.body.mode || 'normaal';
    const sys = mode === 'storytelling' ? getSystemStorytelling(corrections) : getSystemNormaal(corrections);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: sys,
        messages: messages
      }),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Fetch mislukt: ' + err.message });
  }
};
