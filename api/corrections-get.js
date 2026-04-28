export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    const r = await fetch(`${url}/get/corrections`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();

    let corrections = [];
    if (data.result) {
      // result kan een string zijn die JSON bevat, of al een array
      if (typeof data.result === 'string') {
        try { corrections = JSON.parse(data.result); } catch(e) { corrections = []; }
      } else if (Array.isArray(data.result)) {
        corrections = data.result;
      }
    }

    // Zorg dat het altijd een array is
    if (!Array.isArray(corrections)) corrections = [];

    return res.status(200).json({ corrections });
  } catch(e) {
    return res.status(500).json({ error: e.message, corrections: [] });
  }
}
