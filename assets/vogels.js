// Vogelnamen in antwoorden krijgen een afspeelknop met het geluid (Wikimedia Commons).
// ============================================================
// VOGELS — geordend: langere/specifiekere namen vóór kortere
// om substring-conflicten te voorkomen (bijv. 'zwarte ooievaar'
// vóór 'ooievaar'). Dekt alle soorten van de Zuidwest-Veluwe,
// inclusief zeldzame maar voorkomende doortrekkers/gasten.
// ============================================================
var VOGELS = [
  // Roofvogels — samengestelde namen eerst
  'bruine kiekendief','blauwe kiekendief','grauwe kiekendief',
  'grote bonte specht','kleine bonte specht','middelste bonte specht',
  'gekraagde roodstaart','zwarte roodstaart',
  'zwarte ooievaar','zwarte kraai','zwarte mees',
  'rode wouw','zwarte wouw',
  // Roofvogels enkelvoudig
  'wespendief','havik','sperwer','buizerd','torenvalk','boomvalk','slechtvalk',
  'ransuil','bosuil','kerkuil','visarend','zeearend',
  // Spechten
  'groene specht','zwarte specht','draaihals',
  // Reigers & ooievaars
  'blauwe reiger','purperreiger','ooievaar','reiger',
  // Kraanvogel & steltlopers
  'kraanvogel','watersnip','houtsnip','kievit','wulp','grutto','tureluur','oeverloper',
  // Watervogels
  'fuut','aalscholver','meerkoet','waterral','wilde eend','slobeend','tafeleend','kuifeend',
  'ijsvogel',
  // Duiven & zwaluwen
  'holenduif','houtduif','zomertortel',
  'gierzwaluw','boerenzwaluw','huiszwaluw','oeverzwaluw',
  // Nachtzwaluw
  'nachtzwaluw',
  // Hop (zeldzaam)
  'hop',
  // Koekoek
  'koekoek',
  // Wielewaal
  'wielewaal',
  // Mezen — samengesteld eerst
  'kuifmees','zwarte mees','staartmees','matkop','glanskop','koolmees','pimpelmees',
  // Boomklever & boomkruipers
  'boomklever','boomkruiper',
  // Zangers — samengesteld eerst
  'sprinkhaanzanger','bosrietzanger','kleine karekiet','spotvogel',
  'braamsluiper','tuinfluiter','grasmus','zwartkop','fluiter',
  'tjiftjaf','fitis',
  // Lijsters & vliegenvangers
  'beflijster','kramsvogel','koperwiek','zanglijster','merel',
  'bonte vliegenvanger','grauwe vliegenvanger',
  // Roodstaarten, nachtegaal, blauwborst
  'nachtegaal','blauwborst','roodborst',
  // Tapuit & verwanten
  'roodborsttapuit','paapje','tapuit',
  // Winterkoning & heggenmus
  'winterkoning','heggenmus',
  // Leeuweriken & piepers
  'boomleeuwerik','veldleeuwerik',
  'boompieper','graspieper','waterpieper',
  // Gorzen
  'geelgors','rietgors','ortolaan',
  // Vinkachtigen — samengesteld eerst
  'grote kruisbek','kruisbek','appelvink','goudvink',
  'groenling','putter','sijsje','kneu','keep','vink',
  // Kraaiachtigen
  'gaai','ekster','kauw','raaf','roek',
  // Kwikstaarten
  'witte kwikstaart','gele kwikstaart',
  // Overig
  'patrijs','fazant','waterhoentje',
  // Zeldzame gasten Veluwe
  'draaihals','raaf','zwarte wouw','rode wouw','grauwe kiekendief','ortolaan','hop','blauwborst'
];

// ============================================================
// LATIJN — Nederlandse naam → Latijnse naam voor Wikimedia-zoekopdracht
// ============================================================
var LATIJN = {
  // Roofvogels
  'bruine kiekendief':'Circus aeruginosus',
  'blauwe kiekendief':'Circus cyaneus',
  'grauwe kiekendief':'Circus pygargus',
  'wespendief':'Pernis apivorus',
  'havik':'Accipiter gentilis',
  'sperwer':'Accipiter nisus',
  'buizerd':'Buteo buteo',
  'torenvalk':'Falco tinnunculus',
  'boomvalk':'Falco subbuteo',
  'slechtvalk':'Falco peregrinus',
  'ransuil':'Asio otus',
  'bosuil':'Strix aluco',
  'kerkuil':'Tyto alba',
  'visarend':'Pandion haliaetus',
  'zeearend':'Haliaeetus albicilla',
  'rode wouw':'Milvus milvus',
  'zwarte wouw':'Milvus migrans',
  // Spechten
  'groene specht':'Picus viridis',
  'zwarte specht':'Dryocopus martius',
  'grote bonte specht':'Dendrocopos major',
  'kleine bonte specht':'Dryobates minor',
  'middelste bonte specht':'Dendrocoptes medius',
  'draaihals':'Jynx torquilla',
  // Reigers & ooievaars
  'blauwe reiger':'Ardea cinerea',
  'purperreiger':'Ardea purpurea',
  'reiger':'Ardea cinerea',
  'ooievaar':'Ciconia ciconia',
  'zwarte ooievaar':'Ciconia nigra',
  // Steltlopers & watervogels
  'kraanvogel':'Grus grus',
  'watersnip':'Gallinago gallinago',
  'houtsnip':'Scolopax rusticola',
  'kievit':'Vanellus vanellus',
  'wulp':'Numenius arquata',
  'grutto':'Limosa limosa',
  'tureluur':'Tringa totanus',
  'oeverloper':'Actitis hypoleucos',
  'fuut':'Podiceps cristatus',
  'aalscholver':'Phalacrocorax carbo',
  'meerkoet':'Fulica atra',
  'waterral':'Rallus aquaticus',
  'waterhoentje':'Gallinula chloropus',
  'wilde eend':'Anas platyrhynchos',
  'slobeend':'Spatula clypeata',
  'tafeleend':'Aythya ferina',
  'kuifeend':'Aythya fuligula',
  'ijsvogel':'Alcedo atthis',
  // Duiven & zwaluwen
  'houtduif':'Columba palumbus',
  'holenduif':'Columba oenas',
  'zomertortel':'Streptopelia turtur',
  'gierzwaluw':'Apus apus',
  'boerenzwaluw':'Hirundo rustica',
  'huiszwaluw':'Delichon urbicum',
  'oeverzwaluw':'Riparia riparia',
  // Nachtzwaluw & hop
  'nachtzwaluw':'Caprimulgus europaeus',
  'hop':'Upupa epops',
  // Koekoek & wielewaal
  'koekoek':'Cuculus canorus',
  'wielewaal':'Oriolus oriolus',
  // Mezen
  'koolmees':'Parus major',
  'pimpelmees':'Cyanistes caeruleus',
  'staartmees':'Aegithalos caudatus',
  'matkop':'Poecile montanus',
  'glanskop':'Poecile palustris',
  'kuifmees':'Lophophanes cristatus',
  'zwarte mees':'Periparus ater',
  // Boomklever & boomkruiper
  'boomklever':'Sitta europaea',
  'boomkruiper':'Certhia brachydactyla',
  // Zangers
  'tjiftjaf':'Phylloscopus collybita',
  'fitis':'Phylloscopus trochilus',
  'fluiter':'Phylloscopus sibilatrix',
  'zwartkop':'Sylvia atricapilla',
  'grasmus':'Sylvia communis',
  'tuinfluiter':'Sylvia borin',
  'braamsluiper':'Curruca curruca',
  'spotvogel':'Hippolais icterina',
  'sprinkhaanzanger':'Locustella naevia',
  'bosrietzanger':'Acrocephalus palustris',
  'kleine karekiet':'Acrocephalus scirpaceus',
  // Vliegenvangers
  'bonte vliegenvanger':'Ficedula hypoleuca',
  'grauwe vliegenvanger':'Muscicapa striata',
  // Lijsters
  'merel':'Turdus merula',
  'zanglijster':'Turdus philomelos',
  'kramsvogel':'Turdus pilaris',
  'koperwiek':'Turdus iliacus',
  'beflijster':'Turdus torquatus',
  // Roodstaarten & verwanten
  'gekraagde roodstaart':'Phoenicurus phoenicurus',
  'zwarte roodstaart':'Phoenicurus ochruros',
  'nachtegaal':'Luscinia megarhynchos',
  'blauwborst':'Luscinia svecica',
  'roodborst':'Erithacus rubecula',
  // Tapuit & verwanten
  'roodborsttapuit':'Saxicola rubicola',
  'paapje':'Saxicola rubetra',
  'tapuit':'Oenanthe oenanthe',
  // Winterkoning & heggenmus
  'winterkoning':'Troglodytes troglodytes',
  'heggenmus':'Prunella modularis',
  // Leeuweriken & piepers
  'boomleeuwerik':'Lullula arborea',
  'veldleeuwerik':'Alauda arvensis',
  'boompieper':'Anthus trivialis',
  'graspieper':'Anthus pratensis',
  'waterpieper':'Anthus spinoletta',
  // Gorzen
  'geelgors':'Emberiza citrinella',
  'rietgors':'Emberiza schoeniclus',
  'ortolaan':'Emberiza hortulana',
  // Vinkachtigen
  'vink':'Fringilla coelebs',
  'keep':'Fringilla montifringilla',
  'groenling':'Chloris chloris',
  'putter':'Carduelis carduelis',
  'sijsje':'Spinus spinus',
  'kneu':'Linaria cannabina',
  'kruisbek':'Loxia curvirostra',
  'grote kruisbek':'Loxia pytyopsittacus',
  'appelvink':'Coccothraustes coccothraustes',
  'goudvink':'Pyrrhula pyrrhula',
  // Kraaiachtigen
  'gaai':'Garrulus glandarius',
  'ekster':'Pica pica',
  'kauw':'Corvus monedula',
  'roek':'Corvus frugilegus',
  'zwarte kraai':'Corvus corone',
  'raaf':'Corvus corax',
  // Kwikstaarten
  'witte kwikstaart':'Motacilla alba',
  'gele kwikstaart':'Motacilla flava',
  // Overig
  'patrijs':'Perdix perdix',
  'fazant':'Phasianus colchicus'
};

var audioCache = {};
var currentAudio = null;
var currentBtn = null;

function speelAudio(url, btn) {
  var audio = new Audio(url);
  audio.play().then(function() {
    btn.textContent = '■';
    btn.classList.add('playing');
    currentAudio = audio;
    currentBtn = btn;
    audio.onended = function() {
      btn.textContent = '▶'; btn.classList.remove('playing');
      currentAudio = null; currentBtn = null;
    };
  }).catch(function(e) {
    console.log('Audio fout:', e);
    btn.textContent = '✕';
    setTimeout(function(){ btn.textContent = '▶'; }, 2000);
    currentAudio = null; currentBtn = null;
  });
  audio.onerror = function() {
    btn.textContent = '✕'; btn.classList.remove('playing');
    setTimeout(function(){ btn.textContent = '▶'; }, 2000);
    currentAudio = null; currentBtn = null;
  };
}

function haalAudioUrl(titel) {
  return fetch('https://commons.wikimedia.org/w/api.php?action=query&titles=File:' + encodeURIComponent(titel) + '&prop=imageinfo&iiprop=url&format=json&origin=*')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var pages = data.query && data.query.pages;
    var page = pages && pages[Object.keys(pages)[0]];
    return page && page.imageinfo && page.imageinfo[0] && page.imageinfo[0].url;
  });
}

function zoekOgg(query) {
  return fetch('https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(query) + '&srnamespace=6&format=json&srlimit=10&origin=*')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var results = (data.query && data.query.search) || [];
    var ogg = results.filter(function(r) { return r.title.toLowerCase().indexOf('.ogg') > -1; });
    return ogg.length > 0 ? ogg[0].title.replace('File:', '') : null;
  });
}

function zoekEnSpeelAudio(latijn, btn) {
  var queries = [
    latijn + ' call',
    latijn + ' song',
    latijn,
    latijn.split(' ')[0] + ' ' + latijn.split(' ')[1] + ' vocalisation'
  ];

  function probeerVolgende(i) {
    if (i >= queries.length) {
      btn.textContent = '✕'; setTimeout(function(){ btn.textContent = '▶'; }, 2000); return;
    }
    zoekOgg(queries[i]).then(function(titel) {
      if (!titel) { probeerVolgende(i + 1); return; }
      haalAudioUrl(titel).then(function(url) {
        if (!url) { probeerVolgende(i + 1); return; }
        audioCache[latijn] = url;
        speelAudio(url, btn);
      }).catch(function() { probeerVolgende(i + 1); });
    }).catch(function() { probeerVolgende(i + 1); });
  }

  probeerVolgende(0);
}

function playBirdSound(naam, btn) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
    if (currentBtn) { currentBtn.textContent = '▶'; currentBtn.classList.remove('playing'); }
    if (currentBtn === btn) { currentBtn = null; return; }
  }

  btn.textContent = '…';
  var latijn = LATIJN[naam.toLowerCase()] || naam;

  if (audioCache[latijn]) { speelAudio(audioCache[latijn], btn); return; }

  zoekEnSpeelAudio(latijn, btn);
}

// Eén gecombineerde regex, langste namen eerst en met woordgrenzen, zodat
// samengestelde namen (roodborsttapuit) als geheel matchen en niet op hun
// deelwoorden (roodborst / tapuit). (?:en|s)? vangt Nederlandse meervouden.
var VOGEL_RE = new RegExp('\\b(' + VOGELS.slice()
  .sort(function(a, b) { return b.length - a.length; })
  .map(function(v) { return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); })
  .join('|') + ')(?:en|s)?\\b', 'gi');

function addBirdButtons(container) {
  var seen = {};
  var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
  var nodes = [];
  var node;
  while (node = walker.nextNode()) {
    // Tekst binnen een bestaande knop overslaan
    if (node.parentNode && node.parentNode.classList && node.parentNode.classList.contains('bird-btn')) continue;
    nodes.push(node);
  }

  nodes.forEach(function(textNode) {
    var text = textNode.textContent;
    VOGEL_RE.lastIndex = 0;
    var m, treffers = [];
    while ((m = VOGEL_RE.exec(text)) !== null) {
      var naam = m[1].toLowerCase();
      if (seen[naam]) continue;            // Ontdubbelen: alleen eerste vermelding
      seen[naam] = true;
      treffers.push({ end: m.index + m[0].length, naam: naam });
    }
    if (treffers.length === 0) return;

    // Tekstknoop opnieuw opbouwen: tekst met een knop na de eerste vermelding
    var frag = document.createDocumentFragment();
    var pos = 0;
    treffers.forEach(function(t) {
      frag.appendChild(document.createTextNode(text.substring(pos, t.end)));
      var btn = document.createElement('button');
      btn.className = 'bird-btn';
      btn.textContent = '▶';
      btn.title = t.naam + ' geluid';
      btn.onclick = (function(v, b) { return function(e) { e.stopPropagation(); playBirdSound(v, b); }; })(t.naam, btn);
      frag.appendChild(btn);
      pos = t.end;
    });
    frag.appendChild(document.createTextNode(text.substring(pos)));
    textNode.parentNode.replaceChild(frag, textNode);
  });
}
