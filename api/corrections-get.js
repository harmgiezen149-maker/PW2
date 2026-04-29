export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
      return p.filter(function(x) { return x !== null && x !== undefined; });
    } catch(e) { return []; }
  };

  try {
    const [rp, ra] = await Promise.all([
      fetch(`${url}/get/pending`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${url}/get/approved`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const [tp, ta] = await Promise.all([rp.text(), ra.text()]);
    const pending = parse(tp);
    const approved = parse(ta);

    return res.status(200).json({
      pending,
      approved,
      corrections: [...pending, ...approved]
    });
  } catch(e) {
    return res.status(500).json({ error: e.message, pending: [], approved: [], corrections: [] });
  }
}
