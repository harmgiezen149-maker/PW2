export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const { action, text, index, password } = req.body;

  // Upstash REST: sla op als plain string via /set/key/value
  const save = async (key, arr) => {
    const encoded = encodeURIComponent(JSON.stringify(arr));
    const r = await fetch(`${url}/set/${key}/${encoded}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    return r.json();
  };

  const parse = (raw) => {
    try {
      const d = JSON.parse(raw);
      if (!d.result) return [];
      let p = typeof d.result === 'string' ? JSON.parse(d.result) : d.result;
      if (p && p.value !== undefined) p = typeof p.value === 'string' ? JSON.parse(p.value) : p.value;
      return Array.isArray(p) ? p : [];
    } catch(e) { return []; }
  };

  const get = async (key) => {
    const r = await fetch(`${url}/get/${key}`, { headers: { Authorization: `Bearer ${token}` } });
    return parse(await r.text());
  };

  try {
    if (action === 'add-pending') {
      const pending = await get('pending');
      pending.push(text);
      await save('pending', pending);
      return res.status(200).json({ ok: true, pending });
    }

    if (action === 'approve' || action === 'reject' || action === 'delete-approved') {
      if (password !== process.env.BEHEER_WACHTWOORD) {
        return res.status(401).json({ error: 'Ongeldig wachtwoord' });
      }

      let pending = await get('pending');
      let approved = await get('approved');

      if (action === 'approve') {
        const item = pending[index];
        if (item === undefined) return res.status(400).json({ error: 'Index niet gevonden' });
        pending.splice(index, 1);
        approved.push(item);
        await Promise.all([save('pending', pending), save('approved', approved)]);
      } else if (action === 'reject') {
        pending.splice(index, 1);
        await save('pending', pending);
      } else if (action === 'delete-approved') {
        approved.splice(index, 1);
        await save('approved', approved);
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Onbekende actie: ' + action });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
