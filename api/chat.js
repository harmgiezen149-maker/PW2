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
    const r = await fetch(`${url}/get/corrections`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    if (!data.result) return [];
    let parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    if (parsed.value !== undefined) {
      parsed = typeof parsed.value === 'string' ? JSON.parse(parsed.value) : parsed.value;
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch(e) {
    return [];
  }
}

function getSystem(corrections) {
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
- Voeg op de ALLERLAATSTE regel een JSON toe met maximaal 5 soorten die in het antwoord genoemd zijn, in het formaat: {"soorten":["Naam1","Naam2","Naam3"]} — geen uitleg, alleen JSON op die regel

Gebied Planken Wambuis: heide, stuifzand, eikenbos, vennen. Bekende plekken: Mosselse Zand, Oude Hout, Oud Reemst, boerderij De Mossel.
Flora: struikheide, pijpenstrootje, bochtige smele, zonnedauw, diverse venplanten.
Fauna: heideblauwtje, nachtzwaluw, levendbarende hagedis, adder, wilde zwijnen, reeën, edelhert, das, torenvalk, buizerd.
Beheer: schapenbegrazing (Drentse heideschapen), plaggen, heidebranden, maaien. Beheerder: Natuurmonumenten, boerderij De Mossel.

WOLF — Planken Wambuis heeft een vaste wolvenroedel. De Zuidwest-Veluwe roedel heeft haar territorium in Planken Wambuis, Mossel, Oud Reemst en De Ginkel. De roedel bestaat uit twee ouderdieren, twee jaarlingen en negen welpen (totaal ca. 13 wolven). Wolf GW2435m actief sinds eind 2022. Meldingen via BIJ12 Wolvenmeldpunt (0800-1212).${correctionsText}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key niet gevonden' });

  try {
    const corrections = await getCorrections();
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: getSystem(corrections),
        messages: req.body.messages
      }),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Fetch mislukt: ' + err.message });
  }
}
