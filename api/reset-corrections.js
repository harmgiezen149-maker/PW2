export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const { password } = req.query;

  if (password !== process.env.BEHEER_WACHTWOORD) {
    return res.status(401).json({ error: 'Ongeldig wachtwoord' });
  }

  try {
    await Promise.all([
      fetch(`${url}/set/pending`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: '[]' })
      }),
      fetch(`${url}/set/approved`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: '[]' })
      }),
      fetch(`${url}/del/corrections`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);
    return res.status(200).json({ ok: true, message: 'Database geleegd' });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
