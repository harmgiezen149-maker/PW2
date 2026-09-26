// Kleine helper rond de Upstash/Vercel KV REST-API.
// Commando's gaan als JSON-array in de request-body (POST), zodat ook grote
// waarden (kennisbank, logboek) veilig opgeslagen kunnen worden.

function config() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Database niet geconfigureerd');
  return { url, token };
}

async function cmd(...args) {
  const { url, token } = config();
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args.map(a => (typeof a === 'string' ? a : String(a))))
  });
  const d = await r.json();
  if (d.error) throw new Error('Database: ' + d.error);
  return d.result;
}

async function pipeline(cmds) {
  if (cmds.length === 0) return [];
  const { url, token } = config();
  const r = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds.map(c => c.map(a => (typeof a === 'string' ? a : String(a)))))
  });
  const d = await r.json();
  if (!Array.isArray(d)) throw new Error('Database: ' + (d.error || 'onverwacht antwoord'));
  return d.map(x => {
    if (x.error) throw new Error('Database: ' + x.error);
    return x.result;
  });
}

// Oude waarden zijn soms dubbel gecodeerd opgeslagen ({"value":"[...]"}); lees ze tolerant.
function parse(raw) {
  if (raw === null || raw === undefined) return null;
  try {
    let p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (p && typeof p === 'object' && !Array.isArray(p) && p.value !== undefined && Object.keys(p).length === 1) {
      p = typeof p.value === 'string' ? JSON.parse(p.value) : p.value;
    }
    return p;
  } catch (e) { return null; }
}

async function getJSON(key, fallback) {
  const p = parse(await cmd('GET', key));
  return p === null ? fallback : p;
}

async function setJSON(key, value, exSeconds) {
  const args = ['SET', key, JSON.stringify(value)];
  if (exSeconds) args.push('EX', exSeconds);
  return cmd(...args);
}

// HGETALL geeft [veld, waarde, veld, waarde, ...]
async function hgetallJSON(key) {
  const flat = (await cmd('HGETALL', key)) || [];
  const out = {};
  for (let i = 0; i < flat.length; i += 2) {
    const v = parse(flat[i + 1]);
    if (v !== null) out[flat[i]] = v;
  }
  return out;
}

async function hsetJSON(key, field, value) {
  return cmd('HSET', key, field, JSON.stringify(value));
}

module.exports = { cmd, pipeline, parse, getJSON, setJSON, hgetallJSON, hsetJSON };
