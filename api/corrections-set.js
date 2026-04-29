export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const { action, text, index, password } = req.body;

  const save = async (key, arr) => {
    await fetch(`${url}/set/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(arr) })
    });
  };

  const parse = (d) => {
    if (!d.result) return [];
    try {
      let p = typeof d.result === 'string' ? JSON.parse(d.result) : d.result;
      if (p.value !== undefined) p = typeof p.value === 'string' ? JSON.parse(p.value) : p.value;
      return Array.isArray(p) ? p : [];
    } catch(e) { return []; }
  };

  try {
    if (action === 'add-pending') {
      // Iedereen mag een suggestie toevoegen
      const r = await fetch(`${url}/get/pending`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      const pending = parse(d);
      pending.push(text);
      await save('pending', pending);
      return res.status(200).json({ ok: true });
    }

    if (action === 'approve' || action === 'reject' || action === 'delete-approved') {
      // Alleen met wachtwoord
      if (password !== process.env.BEHEER_WACHTWOORD) {
        return res.status(401).json({ error: 'Ongeldig wachtwoord' });
      }

      const [rp, ra] = await Promise.all([
        fetch(`${url}/get/pending`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${url}/get/approved`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const [dp, da] = await Promise.all([rp.json(), ra.json()]);
      let pending = parse(dp);
      let approved = parse(da);

      if (action === 'approve') {
        const item = pending[index];
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

    return res.status(400).json({ error: 'Onbekende actie' });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
