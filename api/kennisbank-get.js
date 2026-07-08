const ALLOWED_ORIGIN = 'https://pwpb2.vercel.app';
const kennisbank = require('./_kennisbank');

function setSecurityHeaders(res, origin) {
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

module.exports = async function handler(req, res) {
  setSecurityHeaders(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  const parse = (raw) => {
    try {
      const d = JSON.parse(raw);
      if (!d.result) return {};
      let p = typeof d.result === 'string' ? JSON.parse(d.result) : d.result;
      if (p && p.value !== undefined) p = typeof p.value === 'string' ? JSON.parse(p.value) : p.value;
      return (p && typeof p === 'object' && !Array.isArray(p)) ? p : {};
    } catch(e) { return {}; }
  };

  try {
    const r = await fetch(`${url}/get/kennisbank`, { headers: { Authorization: `Bearer ${token}` } });
    const overrides = parse(await r.text());

    const secties = kennisbank.secties.map(s => {
      const o = overrides[s.slug];
      return o
        ? { slug: s.slug, titel: o.titel || s.titel, tekst: o.tekst, gecontroleerd: o.gecontroleerd || s.laatstGecontroleerd, bron: 'aangepast' }
        : { slug: s.slug, titel: s.titel, tekst: s.tekst, gecontroleerd: s.laatstGecontroleerd, bron: 'standaard' };
    });
    const bekend = new Set(kennisbank.secties.map(s => s.slug));
    for (const slug of Object.keys(overrides)) {
      if (bekend.has(slug)) continue;
      const o = overrides[slug];
      if (o && o.tekst) secties.push({ slug, titel: o.titel || slug, tekst: o.tekst, gecontroleerd: o.gecontroleerd || '', bron: 'aangepast' });
    }

    return res.status(200).json({ versie: kennisbank.versie, secties });
  } catch(e) {
    return res.status(500).json({ error: e.message, secties: [] });
  }
};
