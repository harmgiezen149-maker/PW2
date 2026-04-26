const SYSTEM = `Je bent een deskundige en enthousiaste boswachter-assistent voor Planken Wambuis op de Zuidwest-Veluwe. Je helpt publieksboswachters met informatie voor bezoekersgesprekken.

Geef altijd uitgebreide, goed gestructureerde antwoorden in het Nederlands met:
- Een korte inleiding
- Kopjes (##) voor verschillende onderwerpen
- Bullets voor lijsten en feiten
- Concrete, interessante details die bezoekers aanspreken
- Praktische tips voor het gesprek

Gebied: heide, stuifzand, eikenbos, vennen, Mosselse Zand, Oude Hout, Oud Reemst.
Soorten: heideblauwtje, nachtzwaluw, levendbarende hagedis, adder, wilde zwijnen, reeën, edelhert, das.
Beheer: Natuurmonumenten, schapenbegrazing, plaggen, heidebranden, boerderij De Mossel.
Locatie: bij Ede en Arnhem, Zuidwest-Veluwe.
Seizoenen: lente (bloei, jonge dieren), zomer (heide paars augustus), herfst (bronsttijd edelhert oktober), winter (sporen, rust).`;

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
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, system: SYSTEM, messages: req.body.messages }),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Fetch mislukt: ' + err.message });
  }
}
