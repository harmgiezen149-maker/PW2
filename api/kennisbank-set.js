const ALLOWED_ORIGIN = 'https://pwpb2.vercel.app';
const kennisbank = require('./_kennisbank');

function setSecurityHeaders(res, origin) {
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
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
    if (timestamps.length >= maxRequests) return { ok: false };
    timestamps.push(now);
    const encoded = encodeURIComponent(JSON.stringify(timestamps));
    await fetch(`${url}/set/${key}/${encoded}?EX=${windowSeconds}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    return { ok: true };
  } catch(e) { return { ok: true }; }
}

function sanitizeText(text, maxLength) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<\/?kennisbank>/gi, '')
    .replace(/<\/?correcties>/gi, '')
    .trim().slice(0, maxLength);
}

module.exports = async function handler(req, res) {
  setSecurityHeaders(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const { action, slug, tekst, titel, password } = req.body || {};

  const parse = (raw) => {
    try {
      const d = JSON.parse(raw);
      if (!d.result) return {};
      let p = typeof d.result === 'string' ? JSON.parse(d.result) : d.result;
      if (p && p.value !== undefined) p = typeof p.value === 'string' ? JSON.parse(p.value) : p.value;
      return (p && typeof p === 'object' && !Array.isArray(p)) ? p : {};
    } catch(e) { return {}; }
  };

  const getOverrides = async () => {
    const r = await fetch(`${url}/get/kennisbank`, { headers: { Authorization: `Bearer ${token}` } });
    return parse(await r.text());
  };

  const save = async (obj) => {
    const encoded = encodeURIComponent(JSON.stringify(obj));
    const r = await fetch(`${url}/set/kennisbank/${encoded}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    return r.json();
  };

  const ip = getIp(req);

  try {
    const pwLimit = await checkRateLimit(ip, 'pw', 10, 600);
    if (!pwLimit.ok) return res.status(429).json({ error: 'Te veel pogingen.' });

    if (password !== process.env.BEHEER_WACHTWOORD) return res.status(401).json({ error: 'Ongeldig wachtwoord' });

    const cleanSlug = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
    if (!/^[a-z0-9-]{2,40}$/.test(cleanSlug)) {
      return res.status(400).json({ error: 'Ongeldige sectienaam (gebruik kleine letters, cijfers en streepjes).' });
    }

    const overrides = await getOverrides();
    const vandaag = new Date().toISOString().slice(0, 10);
    const baseline = kennisbank.secties.find(s => s.slug === cleanSlug);

    if (action === 'set-section') {
      const cleanTekst = sanitizeText(tekst, 4000);
      if (cleanTekst.length < 5) return res.status(400).json({ error: 'Tekst is te kort.' });
      const cleanTitel = sanitizeText(titel, 80);
      overrides[cleanSlug] = { tekst: cleanTekst, gecontroleerd: vandaag };
      if (cleanTitel) overrides[cleanSlug].titel = cleanTitel;
      await save(overrides);
      return res.status(200).json({ ok: true });
    }

    if (action === 'clear-section') {
      delete overrides[cleanSlug];
      await save(overrides);
      return res.status(200).json({ ok: true });
    }

    if (action === 'mark-checked') {
      if (overrides[cleanSlug]) {
        overrides[cleanSlug].gecontroleerd = vandaag;
      } else if (baseline) {
        overrides[cleanSlug] = { tekst: baseline.tekst, gecontroleerd: vandaag };
      } else {
        return res.status(400).json({ error: 'Sectie niet gevonden' });
      }
      await save(overrides);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Onbekende actie' });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
