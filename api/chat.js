function getSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return 'lente (maart t/m mei)';
  if (m >= 6 && m <= 8) return 'zomer (juni t/m augustus)';
  if (m >= 9 && m <= 11) return 'herfst (september t/m november)';
  return 'winter (december t/m februari)';
}

function getSystem() {
  const season = getSeason();
  const date = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

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
Beheer: schapenbegrazing (Drentse heideschapen), plaggen, heidebranden, maaien — om vergrassing en verstruweling tegen te gaan. Beheerder: Natuurmonumenten, boerderij De Mossel speelt rol in begrazingsbeheer.

WOLF — belangrijke specifieke informatie voor dit gebied:
Op de Zuidwest-Veluwe is wolf GW2435m (geboren in Vlaanderen) al actief sinds eind 2022. In 2023 kreeg hij met wolvin GW3012f welpen — de eerste wolven in dit deel van de Veluwe. In 2024 is GW3012f gedood door een andere wolf. De status van de roedel is momenteel onduidelijk. Planken Wambuis heeft GEEN vaste wolvenroedel, maar wolven kunnen wel door het gebied trekken vanuit de Zuidwest-Veluwe roedel in de buurt. Nederland telt momenteel 14 wolvenroedels, waarvan 7 op de Veluwe (Noord, Noordoost, Midden, Zuidoost, Zuidwest, Hoge Veluwe en Noordwest-Veluwe). Bezoekers die een wolf zien kunnen dit melden bij het Wolvenmeldpunt van BIJ12 (0800-1212).`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { return res.status(200).end(); }
  if (req.method !== 'POST') { return res.status(405).json({ error: 'Method Not Allowed' }); }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { return res.status(500).json({ error: 'API key niet gevonden' }); }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: getSystem(),
        messages: req.body.messages
      }),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Fetch mislukt: ' + err.message });
  }
}
