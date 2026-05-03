export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=86400');

  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'Geen naam opgegeven' });

  try {
    const url = `https://xeno-canto.org/api/2/recordings?query=${encodeURIComponent(name)}+q:A&page=1`;
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await r.json();

    if (!data.recordings || data.recordings.length === 0) {
      return res.status(404).json({ error: 'Geen geluid gevonden' });
    }

    // Pak de beste opname (kwaliteit A, eerste resultaat)
    const rec = data.recordings[0];
    return res.status(200).json({
      url: 'https:' + rec.file,
      name: rec['en'] || name,
      location: rec.loc,
      recordist: rec.rec
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
