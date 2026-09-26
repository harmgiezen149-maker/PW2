// Startinhoud voor de kennisbank in de database. Wordt eenmalig geïmporteerd
// (zie zorgVoorSeed in kennisbank.js); daarna beheert de beheerder alles via het
// beheerpaneel. Nieuwe voorstellen kunnen hier met een hogere `sinds` worden
// toegevoegd; ze komen dan als voorstel ter goedkeuring binnen.
// Alleen openbare informatie: deze repository is openbaar.

// De oorspronkelijke kennisbank (33 feiten) is op 26-09-2026 eenmalig in de database
// geïmporteerd en staat niet meer in de code (verbeterplan: "uit de code halen").
// Terug te vinden in de Git-geschiedenis en in de back-ups in het beheerpaneel.
const feiten = [];

// Oude sectie → onderwerp (voor teksten die in het oude beheerpaneel waren aangepast)
const sectieOnderwerp = {
  naam: 'naam', gebied: 'gebied', historie: 'naam', wolf: 'wolf', soorten: 'soorten',
  'vee-grootwild': 'vee', 'plekken-routes': 'routes', 'beheer-begrazing': 'beheer',
  'regels-toegang': 'bezoek', lidmaatschap: 'nm', 'contact-meldingen': 'contact'
};

// Versie 2 (fase 5): voorstellen na controle van de twijfelachtige feiten en nieuwe
// onderwerpen, plus een concept-seizoenskalender. Alles ter goedkeuring door de beheerder.
const NM = 'https://www.natuurmonumenten.nl';
const GEBIED = NM + '/natuurgebieden/planken-wambuis';
function v(id, extra) {
  return Object.assign({ id: 'seed2_' + id, sinds: 2, soort: 'nieuw', deelgebied: 'heel', type: 'jaarlijks',
    zichtbaarheid: 'openbaar', herkomst: 'claude' }, extra);
}
const KALENDER = 'Concept seizoenskalender op basis van de soortenlijst in de kennisbank en algemene Veluwe-kennis. Controleer of dit klopt voor Planken Wambuis, vul aan met plekken (bijv. "op het Mosselse Zand") en pas de bron aan voordat je goedkeurt.';
function maand(nr, naam, tekst) {
  return v('seizoen-' + nr, { onderwerp: 'seizoen', type: 'seizoen', maanden: [nr], tekst,
    bron: 'Concept seizoenskalender (te controleren door boswachters)', toelichting: KALENDER + ' (' + naam + ')' });
}

const voorstellen = [
  v('wolf', { soort: 'wijziging', feitId: 'oud_wolf', onderwerp: 'wolf',
    tekst: 'In Planken Wambuis leeft een vaste wolvenroedel, gevestigd sinds 2022. In het voorjaar van 2026 zijn minstens tien welpen geboren (wildcamerabeelden, in september 2026 gedeeld door een boswachter van Natuurmonumenten). Het totale aantal wolven in de roedel is niet precies bekend; in maart 2026 waren acht grote wolven op beeld te zien. Het territorium omvat bos- en heidegebieden tussen Otterlo en Ede, waaronder Planken Wambuis. De mannelijke wolf GW2435m is actief in het gebied.',
    bron: 'EdeStad en Barneveldse Krant, "Tien welpen op wildcamera bij wolvenroedel op Zuidwest-Veluwe" (september 2026)',
    bronUrl: 'https://www.edestad.nl/lokaal/dieren/1309474/tien-welpen-op-wildcamera-bij-wolvenroedel-op-zuidwest-veluwe',
    toelichting: 'Het huidige feit noemt 11 wolven met 7 welpen (gecontroleerd 08-07-2026). Regionaal nieuws van september 2026 meldt minstens 10 welpen dit voorjaar en een onduidelijk totaal. Controleer bij de boswachter; GW2435m en "sinds 2022" zijn overgenomen uit het huidige feit.' }),
  v('wolf-afstand', { onderwerp: 'veiligheid',
    tekst: 'Natuurmonumenten en de gemeente Ede hebben in Planken Wambuis borden geplaatst: houd minimaal 100 meter afstand tot wolven.',
    bron: 'natuurmonumenten.nl, nieuwsbericht "Tijdelijke omleidingsroute in Planken Wambuis"', bronUrl: GEBIED + '/nieuws/tijdelijke-omleidingsroute-in-planken-wambuis',
    toelichting: 'De datum van het bericht kon ik niet vaststellen. Controleer of de borden er nog staan.' }),
  v('omleiding', { onderwerp: 'bezoek', type: 'tijdelijk', einddatum: '2026-10-15',
    tekst: 'Het fiets- en wandelpad van Nieuw Reemst tot de kruising van de Planken Wambuisweg met de Kreelseweg en Mosselseweg (bij de voormalige landbouwenclave Mossel en fietsknooppunt 63) is afgesloten, zodat de jonge wolven hun schuwheid voor mensen niet verliezen. Wandelaars en fietsers volgen de bebording van de omleidingsroute: bij de splitsing vanaf Nieuw Reemst rechts, door de glooiende heideheuvels van Kruiponder naar Boerderij Mossel, en dan verder via de Mosselseweg en Kreelseweg.',
    bron: 'natuurmonumenten.nl, nieuwsbericht "Tijdelijke omleidingsroute in Planken Wambuis"', bronUrl: GEBIED + '/nieuws/tijdelijke-omleidingsroute-in-planken-wambuis',
    toelichting: 'LET OP: ik weet niet sinds wanneer en tot wanneer deze afsluiting geldt, en of hij nog actueel is. De einddatum staat voorlopig op 15-10-2026. Controleer het bericht en pas de einddatum aan, of wijs af als de afsluiting voorbij is.' }),
  v('leden', { soort: 'wijziging', feitId: 'seed_nm-1', onderwerp: 'nm',
    tekst: 'Natuurmonumenten heeft ongeveer 977.000 leden en donateurs.',
    bron: 'natuurmonumenten.nl, pagina "Over ons"', bronUrl: NM + '/over-natuurmonumenten',
    toelichting: 'Het huidige feit noemt 750.000 leden. Op de Over ons-pagina staat nu 977.000 leden en donateurs.' }),
  v('lidprijs', { soort: 'wijziging', feitId: 'seed_nm-2', onderwerp: 'nm',
    tekst: 'Lid worden van Natuurmonumenten kan vanaf € 4,25 per maand, via natuurmonumenten.nl/word-nu-lid of in een bezoekerscentrum. Er zijn vier soorten lidmaatschap, elk met een eigen minimumbedrag per maand.',
    bron: 'natuurmonumenten.nl, pagina "Word nu lid"', bronUrl: NM + '/word-nu-lid',
    toelichting: 'Het huidige feit noemt € 2,50 per maand; nm.nl noemt nu "vanaf € 4,25 per maand".' }),
  v('ledenvoordeel', { onderwerp: 'nm',
    tekst: 'Leden van Natuurmonumenten krijgen onder andere het blad Puur Natuur, toegang tot de route-app met meer dan 300 natuurroutes, tot 30% korting op excursies en gratis parkeren op aangewezen parkeerplaatsen van Natuurmonumenten.',
    bron: 'natuurmonumenten.nl, pagina "Voordeel voor leden"', bronUrl: NM + '/word-lid/ledenvoordeel',
    toelichting: 'Handig bij ledenwerving (knop "Leden werven").' }),
  v('honden', { onderwerp: 'bezoek',
    tekst: 'In Planken Wambuis moeten honden kort aangelijnd zijn.',
    bron: 'natuurmonumenten.nl, gebiedspagina Planken Wambuis', bronUrl: GEBIED,
    toelichting: 'Nieuw onderwerp praktisch bezoek (vraag 15).' }),
  v('grazers', { onderwerp: 'veiligheid',
    tekst: "In Planken Wambuis lopen Sayaguesa-runderen en New Forest pony's vrij rond. Houd minimaal 25 meter afstand tot de grazers en doorkruis nooit een kudde; dat geldt ook voor je hond.",
    bron: 'natuurmonumenten.nl, gebiedspagina Planken Wambuis', bronUrl: GEBIED,
    toelichting: 'Nieuw onderwerp veiligheid (vraag 15).' }),
  v('parkeren', { onderwerp: 'bezoek', deelgebied: 'reemst',
    tekst: 'Op parkeerplaats Oud Reemst (Otterlo) betalen niet-leden een parkeerbijdrage van € 2,00 per uur, met een maximum van € 8,00 per dag. Leden van Natuurmonumenten parkeren gratis door hun ledenpas bij de automaat te scannen.',
    bron: 'natuurmonumenten.nl, gebiedspagina Planken Wambuis', bronUrl: GEBIED,
    toelichting: 'Nieuw onderwerp praktisch bezoek (vraag 15). Andere parkeerplaatsen (bijv. bij Planken Wambuis zelf of Wolfheze) nog aanvullen.' }),
  v('paden', { onderwerp: 'bezoek', type: 'vast',
    tekst: 'Bezoekers blijven in Planken Wambuis op de paden en volgen de toegangsregels op de terreinborden. Ongeveer een derde van het gebied is niet-toegankelijk rustgebied.',
    bron: 'natuurmonumenten.nl, gebiedspagina Planken Wambuis; kennisbank (gebied)', bronUrl: GEBIED,
    toelichting: 'Nieuw onderwerp praktisch bezoek (vraag 15).' }),
  v('routes', { onderwerp: 'routes',
    tekst: "Natuurmonumenten heeft in het gebied onder andere deze wandelroutes: 'Wandelroute Planken Wambuis, vlak bij Ede', 'Wandelroute langs de akkers van Oud-Reemst, bij Otterlo' en de 'Historische wandelroute Planken Wambuis' (vanuit Wolfheze).",
    bron: 'natuurmonumenten.nl, routepagina\'s', bronUrl: GEBIED + '/route/wandelroute-planken-wambuis-vlak-bij-ede',
    toelichting: 'Routenamen overgenomen van nm.nl. Vul eventueel lengte en startpunt aan.' }),

  maand(1, 'januari', 'In januari overwintert de klapekster op de heide. Na sneeuw of in modder zijn sporen van wolf, wild zwijn, ree en edelhert goed te vinden. De raaf begint al met baltsen.'),
  maand(2, 'februari', 'In februari bouwt de raaf zijn nest en roffelen de spechten, zoals de zwarte specht. Op zonnige dagen kunnen de eerste adders al buiten liggen.'),
  maand(3, 'maart', 'In maart komen adders en zandhagedissen uit hun winterrust en zonnen ze op beschutte plekken. De boomleeuwerik zingt boven de heide. Wilde zwijnen krijgen hun biggen (maart-april) en gewone padden trekken naar hun voortplantingswater.'),
  maand(4, 'april', 'In april kleuren de mannetjes van de heikikker in de paartijd korte tijd blauw. De rugstreeppad begint te roepen in de vochtige delen, en zomervogels komen terug van de trek.'),
  maand(5, 'mei', 'In mei komen de nachtzwaluw en de grauwe klauwier terug uit Afrika. Wolvenwelpen worden in april-mei geboren; de roedel is dan extra gevoelig voor verstoring.'),
  maand(6, 'juni', 'In juni is in de schemering het snorren van de nachtzwaluw te horen. Het heideblauwtje vliegt (juni-juli) en reeën hebben jonge kalfjes.'),
  maand(7, 'juli', 'In juli vliegt het heideblauwtje nog volop en voert de grauwe klauwier zijn jongen. Eind juli begint de struikhei te bloeien.'),
  maand(8, 'augustus', 'In augustus staat de heide in bloei (struikhei, augustus-september). Eind augustus vertrekt de nachtzwaluw weer naar Afrika. De wolvenwelpen trekken steeds vaker met de roedel mee.'),
  maand(9, 'september', 'In september begint de bronst van het edelhert (september-oktober): de mannetjes burlen vooral in de schemering. De heide bloeit uit en de eerste paddenstoelen verschijnen.'),
  maand(10, 'oktober', 'In oktober is het paddenstoelentijd, bijvoorbeeld vliegenzwammen onder berken en dennen. De bronst van het edelhert loopt af, kraanvogels trekken over en wilde zwijnen zoeken eikels en beukennootjes.'),
  maand(11, 'november', 'In november keert de klapekster terug als wintergast op de heide. Door de bladval zijn dieren en hun sporen beter te zien.'),
  maand(12, 'december', 'In december is het rustig in het gebied. De klapekster overwintert op de heide en na sneeuw zijn sporen van wolf en wild zwijn te vinden.')
];

module.exports = { versie: 2, feiten, voorstellen, sectieOnderwerp };
