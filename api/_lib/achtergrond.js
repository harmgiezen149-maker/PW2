// Alle afbeeldingen in de app, beheerd via Beheer → Foto's:
// - achtergrond achter de chat: 'staand' (telefoon) en 'liggend' (tablet en computer)
// - 'avatar' van de assistent, 'logo' in de kopbalk
// - app-icoon: 'icoon-192', 'icoon-512' en 'icoon-maskable' (de browser maakt ze uit één afbeelding)
// - 'gebied-<slug>': foto van een deelgebied; 'feit-<id>': foto bij een kennisbankfeit
// De beheerder uploadt ze; de browser verkleint ze vooraf. Opslag in de database in stukken,
// zodat elk verzoek klein blijft. Een nieuwe afbeelding krijgt een nieuwe versie, zodat
// browsers en de CDN hem lang mogen bewaren.
const crypto = require('crypto');
const kv = require('./kv');
const kb = require('./kennisbank');

const K_META = 'cfg:achtergrond';
const K_DEEL = 'cfg:achtergrond:'; // + soort:versie:nummer
const VASTE_SOORTEN = ['staand', 'liggend', 'avatar', 'logo', 'icoon-192', 'icoon-512', 'icoon-maskable'];
const SOORTEN = ['staand', 'liggend', 'avatar'];   // met een uitsnede (en de foto's van gebieden en feiten)
const POSITIES = { boven: 'center top', midden: 'center center', onder: 'center bottom' };
const VLAKKEN = ['blauw', 'wit', 'geen'];          // achter het logo in de kopbalk
const MAX_BYTES = 1500 * 1024;                     // achtergrond, na verkleinen in de browser ruim voldoende
const MAX_BYTES_AVATAR = 300 * 1024;               // de avatar is hooguit een paar centimeter groot
const MAX_PER_GROEP = { logo: 200 * 1024, 'icoon-192': 150 * 1024, 'icoon-512': 500 * 1024, 'icoon-maskable': 500 * 1024, gebied: 800 * 1024, feit: 800 * 1024 };
const STUK = 256 * 1024;                           // tekens base64 per databaseverzoek

function groep(soort) {
  if (soort.startsWith('gebied-')) return 'gebied';
  if (soort.startsWith('feit-')) return 'feit';
  return soort;
}

function geldigeSoort(soort) {
  if (typeof soort !== 'string') return false;
  if (VASTE_SOORTEN.includes(soort)) return true;
  const g = /^gebied-([a-z-]{2,40})$/.exec(soort);
  if (g) return kb.DEELGEBIEDEN.some(d => d.slug === g[1] && d.slug !== 'heel');
  return /^feit-[A-Za-z0-9_-]{1,64}$/.test(soort);
}

function metUitsnede(soort) { return SOORTEN.includes(soort) || ['gebied', 'feit'].includes(groep(soort)); }

function maxBytes(soort) {
  if (soort === 'avatar') return MAX_BYTES_AVATAR;
  return MAX_PER_GROEP[groep(soort)] || MAX_BYTES;
}

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

function url(soort, m) { return '/api/achtergrond?soort=' + encodeURIComponent(soort) + '&v=' + encodeURIComponent(m.versie); }

// Foto van een deelgebied of feit voor de app: { foto, fotoBron, fotoPositie } of null
function fotoVoor(alle, soort) {
  const m = alle && alle[soort];
  if (!m) return null;
  return { foto: url(soort, m), fotoBron: m.fotoBron, fotoPositie: POSITIES[m.positie] || POSITIES.midden };
}

// Wat de app bij het starten ophaalt: achtergrond, avatar, logo en app-icoon (geen foto's van gebieden en feiten)
async function publiek() {
  const m = await meta();
  const uit = {};
  for (const s of SOORTEN) {
    const x = m[s];
    uit[s] = x ? { versie: x.versie, positie: x.positie, fotoBron: x.fotoBron, breedte: x.breedte, hoogte: x.hoogte } : null;
  }
  uit.logo = m.logo ? { versie: m.logo.versie, vlak: m.logo.vlak || 'blauw', fotoBron: m.logo.fotoBron, breedte: m.logo.breedte, hoogte: m.logo.hoogte } : null;
  uit.icoon = icoon(m);
  return uit;
}

// Het app-icoon telt alleen als alle drie de formaten er zijn
function icoon(m) {
  const a = m['icoon-192'], b = m['icoon-512'], c = m['icoon-maskable'];
  if (!a || !b || !c) return null;
  return { v192: a.versie, v512: b.versie, vMaskable: c.versie, type192: a.type, type512: b.type, typeMaskable: c.type, fotoBron: b.fotoBron };
}

const MANIFEST = {
  name: 'Boswachter Assistent · Planken Wambuis',
  short_name: 'Planken Wambuis',
  description: 'Boswachter Assistent voor Planken Wambuis (Natuurmonumenten, Zuidwest-Veluwe): gecontroleerde gebiedskennis, gesprekstips en wat er nu speelt.',
  start_url: '/', scope: '/', display: 'standalone', orientation: 'portrait', lang: 'nl',
  theme_color: '#2256A0', background_color: '#F4F2EC'
};
const STANDAARD_ICONEN = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
];

// Webmanifest met het eigen app-icoon als dat er is
function manifest(alle) {
  const i = alle ? icoon(alle) : null;
  const icons = i ? [
    { src: url('icoon-192', { versie: i.v192 }), sizes: '192x192', type: i.type192 },
    { src: url('icoon-512', { versie: i.v512 }), sizes: '512x512', type: i.type512 },
    { src: url('icoon-maskable', { versie: i.vMaskable }), sizes: '512x512', type: i.typeMaskable, purpose: 'maskable' }
  ] : STANDAARD_ICONEN;
  return Object.assign({}, MANIFEST, { icons });
}

function tekst(v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
function fout(bericht) { return Object.assign(new Error(bericht), { status: 400 }); }

// Nieuwe afbeelding en/of andere uitsnede of maker. data = data-URL (optioneel als er al een afbeelding is).
async function opslaan({ soort, data, fotoBron, positie, vlak, breedte, hoogte, door }) {
  if (!geldigeSoort(soort)) throw fout('Onbekende soort afbeelding.');
  const bron = tekst(fotoBron, 120);
  if (bron.length < 2) throw fout('Vermeld van wie de foto is (je moet hem mogen gebruiken).');
  if (metUitsnede(soort) && !POSITIES[positie]) throw fout('Kies een uitsnede: boven, midden of onder.');
  if (soort === 'logo' && vlak !== undefined && !VLAKKEN.includes(vlak)) throw fout('Kies een vlak achter het logo: blauw, wit of geen.');
  const alle = await meta();
  const oud = alle[soort] || null;
  let nieuw;
  if (data) {
    const m = /^data:image\/[a-z+]+;base64,([A-Za-z0-9+/=]+)$/.exec(String(data));
    if (!m) throw fout('Geen geldige afbeelding ontvangen.');
    const buf = Buffer.from(m[1], 'base64');
    const type = soortBeeld(buf);
    if (!type) throw fout('Alleen JPG, PNG of WebP.');
    const max = maxBytes(soort);
    if (buf.length > max) {
      throw fout(soort === 'avatar' ? 'De avatar is te groot (hoogstens 300 kB na verkleinen).'
        : `De afbeelding is te groot (hoogstens ${max >= 1024 * 1024 ? (max / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB' : Math.round(max / 1024) + ' kB'} na verkleinen).`);
    }
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
    if (!oud) throw fout('Kies eerst een afbeelding.');
    nieuw = { versie: oud.versie, type: oud.type, stukken: oud.stukken, bytes: oud.bytes, breedte: oud.breedte, hoogte: oud.hoogte };
  }
  const extra = { fotoBron: bron, door: door || '', datum: new Date().toISOString() };
  if (metUitsnede(soort)) extra.positie = positie;
  if (soort === 'logo') extra.vlak = vlak || (oud && oud.vlak) || 'blauw';
  alle[soort] = Object.assign(nieuw, extra);
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
  if (!geldigeSoort(soort)) throw fout('Onbekende soort afbeelding.');
  const alle = await meta();
  const oud = alle[soort];
  if (!oud) return;
  delete alle[soort];
  await kv.setJSON(K_META, alle);
  await verwijderStukken(soort, oud);
}

// { type, buf, versie } of null
async function beeld(soort) {
  if (!geldigeSoort(soort)) return null;
  const m = (await meta())[soort];
  if (!m) return null;
  const sleutels = [];
  for (let i = 0; i < m.stukken; i++) sleutels.push(K_DEEL + soort + ':' + m.versie + ':' + i);
  const delen = await kv.cmd('MGET', ...sleutels);
  if (!Array.isArray(delen) || delen.some(d => typeof d !== 'string')) return null;
  return { type: m.type, buf: Buffer.from(delen.join(''), 'base64'), versie: m.versie };
}

module.exports = {
  K_META, SOORTEN, VASTE_SOORTEN, POSITIES, VLAKKEN, MAX_BYTES, MAX_BYTES_AVATAR,
  soortBeeld, geldigeSoort, meta, publiek, fotoVoor, manifest, opslaan, verwijderen, beeld
};
