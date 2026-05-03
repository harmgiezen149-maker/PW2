import { setSecurityHeaders } from './_helpers.js';

export default async function handler(req, res) {
  setSecurityHeaders(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();

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

  try {
    const [rp, ra] = await Promise.all([
      fetch(`${url}/get/pending`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${url}/get/approved`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const [tp, ta] = await Promise.all([rp.text(), ra.text()]);
    return res.status(200).json({
      pending: parse(tp),
      approved: parse(ta)
    });
  } catch(e) {
    return res.status(500).json({ error: e.message, pending: [], approved: [] });
  }
}
