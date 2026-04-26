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
- Gebruik bullets voor concrete feiten en details
- Sluit af met 2-3 praktische gespreksitps voor de boswachter

Gebied Planken Wambuis: heide, stuifzand, eikenbos, vennen. Bekende plekken: Mosselse Zand, Oude Hout, Oud Reemst, boerderij De Mossel.

Flora: struikheide (bloeit paars in augustus), pijpenstrootje, bochtige smele, diverse venplanten, vleesetende zonnedauw.
Fauna: heideblauwtje, nachtzwaluw, levendbarende hagedis, adder, wilde zwijnen, reeën, edelhert, das, torenvalk, buizerd.
Beheer: schapenbegrazing (Drentse heideschapen), plaggen, heidebranden, maaien — allemaal om vergrassing en verstruweling tegen te gaan.
Beheerder: Natuurmonumenten, lokale boerderij De Mossel speelt rol in begrazingsbeheer.`;
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
