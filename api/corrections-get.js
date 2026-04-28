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
      try {
        // result is een string met {"value":"[...]"} erin
        var parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        // parsed kan {"value":"[...]"} zijn of direct een array
        if (parsed.value !== undefined) {
          corrections = typeof parsed.value === 'string' ? JSON.parse(parsed.value) : parsed.value;
        } else if (Array.isArray(parsed)) {
          corrections = parsed;
        }
      } catch(e) {
        corrections = [];
      }
    }

    if (!Array.isArray(corrections)) corrections = [];
    return res.status(200).json({ corrections });
  } catch(e) {
    return res.status(500).json({ error: e.message, corrections: [] });
  }
}
