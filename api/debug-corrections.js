export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    const r = await fetch(`${url}/get/corrections`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const raw = await r.text();
    const data = JSON.parse(raw);
    
    let corrections = [];
    if (data.result) {
      if (typeof data.result === 'string') {
        try { corrections = JSON.parse(data.result); } catch(e) { corrections = ['parse fout: ' + e.message]; }
      } else {
        corrections = data.result;
      }
    }

    return res.status(200).json({ 
      raw: raw.substring(0, 500),
      result_type: typeof data.result,
      corrections: corrections
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
