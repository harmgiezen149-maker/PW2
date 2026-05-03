import { setSecurityHeaders, getIp, checkRateLimit, sanitizeText } from './_helpers.js';

function getSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return 'lente (maart t/m mei)';
  if (m >= 6 && m <= 8) return 'zomer (juni t/m augustus)';
  if (m >= 9 && m <= 11) return 'herfst (september t/m november)';
  return 'winter (december t/m februari)';
}

async function getCorrections() {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    const parse = (raw) => {
      try {
        const d = JSON.parse(raw);
        if (!d.result) return [];
        let p = typeof d.result === 'string' ? JSON.parse(d.result) : d.result;
        if (p && p.value !== undefined) p = typeof p.value === 'string' ? JSON.parse(p.value) : p.value;
        if (!Array.isArray(p)) return [];
        return p.filter(x => x !== null && x !== undefined);
      } catch(e) { return []; }
    };
    const [rp, ra] = await Promise.all([
      fetch(`${url}/get/pending`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${url}/get/approved`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const [tp, ta] = await Promise.all([rp.text(), ra.text()]);
    return [...parse(tp), ...parse(ta)];
  } catch(e) { return []; }
}

function getSystemNormaal(corrections) {
  const season = getSeason();
  const date = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  let correctionsText = '';
  if (corrections && corrections.length > 0) {
    correctionsText = '\n\nACTUELE CORRECTIES EN AANVULLINGEN (hebben prioriteit boven andere informatie):\n' +
      corrections.map((c, i) => `${i+1}. ${c}`).join('\n');
  }
  return `Je bent een deskundige en enthousiaste boswachter-assistent voor Planken Wambuis op de Zuidwest-Veluwe. Je helpt publieksboswachters met informatie voor bezoekersgesprekken.

Het is nu ${season} (${date}). Geef alleen informatie die relevant is voor dit seizoen. Noem andere seizoenen niet.

Geef altijd uitgebreide antwoorden met minimaal 300 woorden. Structureer als volgt:
- Begin met een enthousiaste inleiding van 2-3 zinnen over wat er nu speelt
- Gebruik ## kopjes voor verschillende onderwerpen (minimaal 3 kopjes)
- Gebruik deze bulletstructuur consequent:
  - Hoofdonderwerp als bullet (- **Onderwerp**)
    - Toelichting als subbullet eronder (twee spaties inspringen)
    - Nog een detail als subbullet
- Sluit af met ## Gesprekstips en 2-3 praktische tips als bullets met subbullets
- Voeg op de ALLERLAATSTE regel een JSON toe met maximaal 5 soorten die in het antwoord genoemd zijn, in het formaat: {"soorten":["Naam1","Naam2","Naam3"]}

Gebied Planken Wambuis: heide, stuifzand, eikenbos, vennen. Bekende plekken: Mosselse Zand, Oude Hout, Oud Reemst, boerderij De Mossel, Wolfhezerheide.
Flora: struikheide, pijpenstrootje, bochtige smele, zonnedauw, diverse venplanten.
Fauna: heideblauwtje, nachtzwaluw, levendbarende hagedis, adder, wilde zwijnen, reeën, edelhert, das, torenvalk, buizerd.
Beheer: schapenbegrazing (Drentse heideschapen), plaggen, heidebranden, maaien. Beheerder: Natuurmonumenten, boerderij De Mossel.

LEDEN WERVEN — Natuurmonumenten heeft ca. 750.000 leden en is daarmee de grootste natuurbeschermingsorganisatie van Nederland. Een lidmaatschap kost vanaf €2,50 per maand. Leden krijgen gratis toegang tot alle Natuurmonumenten-terreinen, ontvangen het magazine 'Puur Natuur', en dragen direct bij aan aankoop en beheer van natuur. Op Planken Wambuis betaalt het lidmaatschap direct mee aan heidebeheer, wolvenmonitoring en het beschermen van de zeldzame nachtzwaluw. Aanmelden via nm.nl of ter plekke via de boswachter.

WOLF — Planken Wambuis heeft een vaste wolvenroedel. De Zuidwest-Veluwe roedel heeft haar territorium in Planken Wambuis, Mossel, Oud Reemst en De Ginkel. De roedel bestaat uit twee ouderdieren, twee jaarlingen en negen welpen (totaal ca. 13 wolven). Wolf GW2435m actief sinds eind 2022. Meldingen via BIJ12 Wolvenmeldpunt (0800-1212).${correctionsText}`;
}

function getSystemStorytelling(corrections) {
  const season = getSeason();
  const date = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  let correctionsText = '';
  if (corrections && corrections.length > 0) {
    correctionsText = '\n\nACTUELE CORRECTIES EN AANVULLINGEN:\n' +
      corrections.map((c, i) => `${i+1}. ${c}`).join('\n');
  }
  return `Je bent een deskundige en enthousiaste boswachter-assistent voor Planken Wambuis op de Zuidwest-Veluwe.

Het is nu ${season} (${date}). Geef alleen informatie die relevant is voor dit seizoen.

Geef uitgebreide antwoorden met minimaal 300 woorden, opgebouwd als verhaal:

## [Pakkende titel]

Korte sfeervolle opening met zintuigen.

### 🌿 Beleving
Tastbare beschrijving van het moment.

### ⚡ Verrassing
"Wist je dat..." met verrassend feit.

### 📖 Feit
- **Hoofdfeit**
  - Toelichting
  - Detail

### ❓ Vraag aan de bezoeker
1-2 vragen om bezoekers te betrekken.

### 💬 Gesprekstips
2-3 praktische tips als bullets met subbullets.

Gebied: heide, stuifzand, eikenbos, vennen. Plekken: Mosselse Zand, Oude Hout, Oud Reemst, De Mossel, Wolfhezerheide.
Soorten: heideblauwtje, nachtzwaluw, hagedis, adder, zwijn, ree, edelhert, das, torenvalk, buizerd.
Wolvenroedel Zuidwest-Veluwe: 13 wolven actief in Planken Wambuis sinds 2022.

Voeg op de ALLERLAATSTE regel een JSON toe met max 5 soorten: {"soorten":["Naam1","Naam2"]}${correctionsText}`;
}

function getSystem(corrections, mode) {
  return mode === 'storytelling' ? getSystemStorytelling(corrections) : getSystemNormaal(corrections);
}

export default async function handler(req, res) {
  setSecurityHeaders(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Rate limit: max 30 vragen per IP per uur
  const ip = getIp(req);
  const limit = await checkRateLimit(ip, 'chat', 30, 3600);
  if (!limit.ok) {
    return res.status(429).json({ error: `Te veel verzoeken. Probeer het over ${limit.retryAfter} seconden opnieuw.` });
  }

  // Validatie
  if (!req.body || !Array.isArray(req.body.messages)) {
    return res.status(400).json({ error: 'Ongeldig bericht' });
  }

  const messages = req.body.messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: sanitizeText(m.content, 1000)
  })).filter(m => m.content.length > 0);

  if (messages.length === 0) {
    return res.status(400).json({ error: 'Bericht is leeg' });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key niet geconfigureerd' });

  try {
    const corrections = await getCorrections();
    const mode = req.body.mode || 'normaal';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: getSystem(corrections, mode),
        messages: messages
      }),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Fetch mislukt: ' + err.message });
  }
}
