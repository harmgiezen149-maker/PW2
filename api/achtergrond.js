// Openbaar: de afbeeldingen uit Beheer → Foto's.
// - GET /api/achtergrond?info=1           achtergrond, avatar, logo en app-icoon: versie, uitsnede, maker (kort gecachet)
// - GET /api/achtergrond?manifest=1       webmanifest, met het eigen app-icoon als dat er is
// - GET /api/achtergrond?soort=staand&v=… de afbeelding zelf (ook avatar, logo, icoon-…, gebied-…, feit-…;
//                                         met versie: een jaar te cachen)
const achtergrond = require('./_lib/achtergrond');

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).end();
  const q = req.query || {};
  if (q.manifest !== undefined) {
    // Lukt de database niet, dan het manifest met de standaardiconen: de app moet altijd te installeren zijn
    let alle = null;
    try { alle = await achtergrond.meta(); } catch (e) { alle = null; }
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
    return res.status(200).end(JSON.stringify(achtergrond.manifest(alle)));
  }
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
    // Met de juiste versie in de link mag de afbeelding lang bewaard worden; anders kort
    res.setHeader('Cache-Control', q.v === b.versie ? 'public, max-age=31536000, immutable' : 'public, max-age=0, s-maxage=60');
    return res.status(200).end(b.buf);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).end();
  }
};
