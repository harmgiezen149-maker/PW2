// Foto's in de app: de achtergrond achter de chat (één staande foto voor telefoons en één
// liggende voor tablet en computer) en de avatar van de assistent. De beheerder uploadt ze;
// de browser verkleint ze vooraf. Opslag in de database in stukken, zodat elk verzoek klein
// blijft. Een nieuwe foto krijgt een nieuwe versie, zodat browsers en de CDN hem lang mogen
// bewaren.
const crypto = require('crypto');
const kv = require('./kv');

const K_META = 'cfg:achtergrond';
const K_DEEL = 'cfg:achtergrond:'; // + soort:versie:nummer
const SOORTEN = ['staand', 'liggend', 'avatar'];
const POSITIES = { boven: 'center top', midden: 'center center', onder: 'center bottom' };
const MAX_BYTES = 1500 * 1024;     // na verkleinen in de browser ruim voldoende
const MAX_BYTES_AVATAR = 300 * 1024; // de avatar is hooguit een paar centimeter groot
const STUK = 256 * 1024;           // tekens base64 per databaseverzoek

// Soort afbeelding herkennen aan de eerste bytes (niet aan wat de browser zegt)
function soortBeeld(buf) {
  if (buf.length > 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'image/png';
  if (buf.length > 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

async function meta() {
  const m = await kv.getJSON(K_META, null);
  return m && typeof m === 'object' ? m : {};
}

// Wat de app mag weten: versie, uitsnede en maker per soort
async function publiek() {
  const m = await meta();
  const uit = {};
  for (const s of SOORTEN) {
    const x = m[s];
    uit[s] = x ? { versie: x.versie, positie: x.positie, fotoBron: x.fotoBron, breedte: x.breedte, hoogte: x.hoogte } : null;
  }
  return uit;
}

function tekst(v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }

// Nieuwe foto en/of andere uitsnede of maker. data = data-URL (optioneel als er al een foto is).
async function opslaan({ soort, data, fotoBron, positie, breedte, hoogte, door }) {
  if (!SOORTEN.includes(soort)) throw Object.assign(new Error('Onbekende soort (staand, liggend of avatar).'), { status: 400 });
  const bron = tekst(fotoBron, 120);
  if (bron.length < 2) throw Object.assign(new Error('Vermeld van wie de foto is (je moet hem mogen gebruiken).'), { status: 400 });
  if (!POSITIES[positie]) throw Object.assign(new Error('Kies een uitsnede: boven, midden of onder.'), { status: 400 });
  const alle = await meta();
  const oud = alle[soort] || null;
  let nieuw;
  if (data) {
    const m = /^data:image\/[a-z+]+;base64,([A-Za-z0-9+/=]+)$/.exec(String(data));
    if (!m) throw Object.assign(new Error('Geen geldige afbeelding ontvangen.'), { status: 400 });
    const buf = Buffer.from(m[1], 'base64');
    const type = soortBeeld(buf);
    if (!type) throw Object.assign(new Error('Alleen JPG, PNG of WebP.'), { status: 400 });
    if (soort === 'avatar' && buf.length > MAX_BYTES_AVATAR) throw Object.assign(new Error('De avatar is te groot (hoogstens 300 kB na verkleinen).'), { status: 400 });
    if (buf.length > MAX_BYTES) throw Object.assign(new Error('De foto is te groot (hoogstens 1,5 MB na verkleinen).'), { status: 400 });
    const versie = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    const b64 = buf.toString('base64');
    const stukken = Math.ceil(b64.length / STUK);
    // Eerst alle stukken schrijven (elk een eigen verzoek), pas daarna de verwijzing omzetten
    for (let i = 0; i < stukken; i++) {
      await kv.cmd('SET', K_DEEL + soort + ':' + versie + ':' + i, b64.slice(i * STUK, (i + 1) * STUK));
    }
    nieuw = { versie, type, stukken, bytes: buf.length,
      breedte: Math.round(Number(breedte)) || null, hoogte: Math.round(Number(hoogte)) || null };
  } else {
    if (!oud) throw Object.assign(new Error('Kies eerst een foto.'), { status: 400 });
    nieuw = { versie: oud.versie, type: oud.type, stukken: oud.stukken, bytes: oud.bytes, breedte: oud.breedte, hoogte: oud.hoogte };
  }
  alle[soort] = Object.assign(nieuw, { positie, fotoBron: bron, door: door || '', datum: new Date().toISOString() });
  await kv.setJSON(K_META, alle);
  if (oud && oud.versie !== nieuw.versie) await verwijderStukken(soort, oud);
  return alle[soort];
}

async function verwijderStukken(soort, m) {
  const sleutels = [];
  for (let i = 0; i < (m.stukken || 0); i++) sleutels.push(K_DEEL + soort + ':' + m.versie + ':' + i);
  if (sleutels.length) await kv.cmd('DEL', ...sleutels);
}

async function verwijderen(soort) {
  if (!SOORTEN.includes(soort)) throw Object.assign(new Error('Onbekende soort.'), { status: 400 });
  const alle = await meta();
  const oud = alle[soort];
  if (!oud) return;
  delete alle[soort];
  await kv.setJSON(K_META, alle);
  await verwijderStukken(soort, oud);
}

// { type, buf, versie } of null
async function beeld(soort) {
  if (!SOORTEN.includes(soort)) return null;
  const m = (await meta())[soort];
  if (!m) return null;
  const sleutels = [];
  for (let i = 0; i < m.stukken; i++) sleutels.push(K_DEEL + soort + ':' + m.versie + ':' + i);
  const delen = await kv.cmd('MGET', ...sleutels);
  if (!Array.isArray(delen) || delen.some(d => typeof d !== 'string')) return null;
  return { type: m.type, buf: Buffer.from(delen.join(''), 'base64'), versie: m.versie };
}

module.exports = { K_META, SOORTEN, POSITIES, MAX_BYTES, MAX_BYTES_AVATAR, soortBeeld, meta, publiek, opslaan, verwijderen, beeld };
