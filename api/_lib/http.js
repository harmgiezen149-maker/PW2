const kv = require('./kv');

const ALLOWED_ORIGIN = 'https://pwpb2.vercel.app';
const TZ = 'Europe/Amsterdam';

function setSecurityHeaders(res, origin, methods) {
  if (origin === ALLOWED_ORIGIN) res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', methods || 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-PW-Token, X-Beheer-Wachtwoord');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin');
}

function getIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
         req.headers['x-real-ip'] || 'unknown';
}

// Vast venster: maximaal `max` verzoeken per `windowSeconds` per IP en endpoint.
// Bij een databasefout wordt het verzoek doorgelaten (liever beschikbaar dan geblokkeerd).
async function checkRateLimit(req, endpoint, max, windowSeconds) {
  try {
    const venster = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `rl:${endpoint}:${getIp(req)}:${venster}`;
    const [n] = await kv.pipeline([['INCR', key], ['EXPIRE', key, windowSeconds]]);
    return n <= max;
  } catch (e) {
    return true;
  }
}

function sanitizeText(text, maxLength) {
  if (typeof text !== 'string') return '';
  return text.replace(/<\/?(kennisbank|correcties|document)[^>]*>/gi, '').trim().slice(0, maxLength);
}

// Datums altijd in Nederlandse tijd, ook als de server in UTC draait.
function nlDatum(d) {
  return (d || new Date()).toLocaleDateString('nl-NL', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function vandaagISO(d) {
  // en-CA geeft JJJJ-MM-DD
  return (d || new Date()).toLocaleDateString('en-CA', { timeZone: TZ });
}

function nlMaand(d) {
  return Number(vandaagISO(d).slice(5, 7));
}

function seizoen(d) {
  const m = nlMaand(d);
  if (m >= 3 && m <= 5) return 'lente';
  if (m >= 6 && m <= 8) return 'zomer';
  if (m >= 9 && m <= 11) return 'herfst';
  return 'winter';
}

module.exports = { ALLOWED_ORIGIN, setSecurityHeaders, getIp, checkRateLimit, sanitizeText, nlDatum, vandaagISO, nlMaand, seizoen };
