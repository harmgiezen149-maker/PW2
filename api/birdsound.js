const NAMEN = {
  'nachtzwaluw': 'Caprimulgus europaeus',
  'torenvalk': 'Falco tinnunculus',
  'buizerd': 'Buteo buteo',
  'boomleeuwerik': 'Lullula arborea',
  'boompieper': 'Anthus trivialis',
  'geelgors': 'Emberiza citrinella',
  'roodborsttapuit': 'Saxicola rubicola',
  'paapje': 'Saxicola rubetra',
  'kneu': 'Linaria cannabina',
  'graspieper': 'Anthus pratensis',
  'veldleeuwerik': 'Alauda arvensis',
  'wielewaal': 'Oriolus oriolus',
  'koekoek': 'Cuculus canorus',
  'groene specht': 'Picus viridis',
  'zwarte specht': 'Dryocopus martius',
  'grote bonte specht': 'Dendrocopos major',
  'ransuil': 'Asio otus',
  'bosuil': 'Strix aluco',
  'kerkuil': 'Tyto alba',
  'wespendief': 'Pernis apivorus',
  'havik': 'Accipiter gentilis',
  'sperwer': 'Accipiter nisus',
  'boomvalk': 'Falco subbuteo',
  'ijsvogel': 'Alcedo atthis',
  'houtsnip': 'Scolopax rusticola',
  'watersnip': 'Gallinago gallinago',
  'kraanvogel': 'Grus grus',
  'reiger': 'Ardea cinerea',
  'zwarte kraai': 'Corvus corone',
  'gaai': 'Garrulus glandarius',
  'ekster': 'Pica pica',
  'merel': 'Turdus merula',
  'zanglijster': 'Turdus philomelos',
  'roodborst': 'Erithacus rubecula',
  'pimpelmees': 'Cyanistes caeruleus',
  'koolmees': 'Parus major',
  'vink': 'Fringilla coelebs',
  'heggenmus': 'Prunella modularis',
  'tjiftjaf': 'Phylloscopus collybita',
  'fitis': 'Phylloscopus trochilus',
  'braamsluiper': 'Sylvia curruca',
  'grasmus': 'Sylvia communis',
  'das': 'Meles meles',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=86400');

  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'Geen naam opgegeven' });

  const zoekNaam = NAMEN[name.toLowerCase()] || name;

  try {
    const url = `https://xeno-canto.org/api/2/recordings?query=${encodeURIComponent(zoekNaam)}+q:A&page=1`;
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await r.json();

    if (!data.recordings || data.recordings.length === 0) {
      return res.status(404).json({ error: 'Geen geluid gevonden voor: ' + zoekNaam });
    }

    const rec = data.recordings[0];
    return res.status(200).json({
      url: 'https:' + rec.file,
      soort: zoekNaam,
      locatie: rec.loc,
      opnemer: rec.rec
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
