// Openbaar: de achtergrondfoto van de chat.
// - GET /api/achtergrond?info=1           versie, uitsnede en maker per soort (kort gecachet)
// - GET /api/achtergrond?soort=staand&v=… de foto zelf (met versie: een jaar te cachen)
const achtergrond = require('./_lib/achtergrond');

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).end();
  const q = req.query || {};
  try {
    if (q.info !== undefined) {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
      return res.status(200).json(await achtergrond.publiek());
    }
    const b = await achtergrond.beeld(String(q.soort || ''));
    if (!b) {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
      return res.status(404).end();
    }
    res.setHeader('Content-Type', b.type);
    res.setHeader('Content-Length', String(b.buf.length));
    // Met de juiste versie in de link mag de foto lang bewaard worden; anders kort
    res.setHeader('Cache-Control', q.v === b.versie ? 'public, max-age=31536000, immutable' : 'public, max-age=0, s-maxage=60');
    return res.status(200).end(b.buf);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).end();
  }
};
