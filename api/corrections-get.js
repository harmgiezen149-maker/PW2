export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    // Haal pending en approved op
    const [rp, ra] = await Promise.all([
      fetch(`${url}/get/pending`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${url}/get/approved`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const [dp, da] = await Promise.all([rp.json(), ra.json()]);

    const parse = (d) => {
      if (!d.result) return [];
      try {
        let p = typeof d.result === 'string' ? JSON.parse(d.result) : d.result;
        if (p.value !== undefined) p = typeof p.value === 'string' ? JSON.parse(p.value) : p.value;
        return Array.isArray(p) ? p : [];
      } catch(e) { return []; }
    };

    return res.status(200).json({
      pending: parse(dp),
      approved: parse(da),
      // Voor backwards compat: corrections = alle actieve (pending + approved)
      corrections: [...parse(dp), ...parse(da)]
    });
  } catch(e) {
    return res.status(500).json({ error: e.message, pending: [], approved: [], corrections: [] });
  }
}
