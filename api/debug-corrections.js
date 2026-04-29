export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    const [rp, ra, rc] = await Promise.all([
      fetch(`${url}/get/pending`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${url}/get/approved`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${url}/get/corrections`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const [dp, da, dc] = await Promise.all([rp.text(), ra.text(), rc.text()]);
    
    return res.status(200).json({ 
      pending_raw: dp,
      approved_raw: da,
      corrections_raw: dc
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
