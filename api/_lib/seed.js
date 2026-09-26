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

// Versie 3: voorstellen uit openbare documenten in de bronnenmap (Kiek). Interne
// documenten staan bewust níet in deze openbare repository; die verwerkt de
// beheerder via "Tekst uit document omzetten in voorstellen" in het beheerpaneel.
const FOLDER = "Gebiedsfolder 'Planken Wambuis, Reijerscamp en Wolfheze' (Natuurmonumenten, 2021)";
const LAAG = "Boekje 'Natuur in Laag-Wolfheze', hoofdstuk Gebiedsbeschrijving (D. van Dam)";
const PORTAAL = 'NatureToday / Zoogdiervereniging, berichten van 20-12-2018 en 07-02-2019';
function d(id, extra) {
  return Object.assign({ id: 'seed3_' + id, sinds: 3, soort: 'nieuw', deelgebied: 'heel', type: 'vast',
    zichtbaarheid: 'openbaar', herkomst: 'document' }, extra);
}
const FOLDER_TOEL = 'Uit de gebiedsfolder van 2021; controleer of dit nog actueel is.';
voorstellen.push(
  d('toegang', { onderwerp: 'bezoek', type: 'jaarlijks', bron: FOLDER, toelichting: FOLDER_TOEL,
    tekst: 'Planken Wambuis is toegankelijk van zonsopkomst tot zonsondergang.' }),
  d('bigfive', { onderwerp: 'soorten', bron: FOLDER, toelichting: 'Uit de gebiedsfolder van 2021.',
    tekst: "De 'Veluwse Big Five' zijn het edelhert, het wild zwijn, de ree, het rund en de pony." }),
  d('wild-spotten', { onderwerp: 'soorten', bron: FOLDER, toelichting: 'Tip van de boswachter uit de gebiedsfolder van 2021.',
    tekst: 'Wilde zwijnen en edelherten zie je het best in de uren na zonsopgang en voor zonsondergang; een ree kun je ook overdag tegenkomen.' }),
  d('observatieposten', { onderwerp: 'routes', type: 'jaarlijks', bron: FOLDER, bronUrl: 'https://www.natuurmonumenten.nl/wild-zien',
    toelichting: FOLDER_TOEL + ' De folder zegt niet welke posten in Planken Wambuis zelf liggen; vul dat aan.',
    tekst: 'In het gebied van Planken Wambuis, Reijerscamp en Wolfheze staan zes natuur- en wildobservatieposten, van waaruit je bij goed weer wild en grote grazers kunt spotten.' }),
  d('routes-folder', { onderwerp: 'routes', type: 'jaarlijks', bron: FOLDER, toelichting: FOLDER_TOEL,
    tekst: 'Wandelroutes van Natuurmonumenten in het gebied zijn onder andere de route Mosselse Zand (2,5 km), de route Oud Reemst (3,5 km) en de route Planken Wambuis (8 km). Alle routes staan op natuurmonumenten.nl en in de app Natuur Routes.' }),
  d('mosselse-zand', { onderwerp: 'gebied', deelgebied: 'mossel', bron: FOLDER, toelichting: 'Uit de gebiedsfolder van 2021.',
    tekst: 'Het Mosselse Zand is een uitgestrekte zandvlakte, een "megazandbak" waar je zandrillen en dierensporen kunt zien.' }),
  d('vakantiewoning', { onderwerp: 'nm', type: 'jaarlijks', deelgebied: 'reemst', bron: FOLDER, toelichting: FOLDER_TOEL,
    tekst: 'Vakantiewoning Nieuw Reemst ligt midden in Planken Wambuis, omringd door eeuwenoude eiken, met zicht op een weide waar regelmatig edelherten en wilde zwijnen komen eten en waar de schaapskudde overnacht. Boeken kan via buitenlevenvakanties.nl.' }),
  d('contact-zv', { onderwerp: 'contact', type: 'jaarlijks', bron: FOLDER, toelichting: FOLDER_TOEL + ' Controleer vooral telefoonnummer en e-mailadres.',
    tekst: 'Contact met Natuurmonumenten Zuid-Veluwe en IJsselvallei: telefoon (055) 312 55 00, e-mail secrzvij@natuurmonumenten.nl.' }),
  d('horeca', { onderwerp: 'bezoek', type: 'jaarlijks', bron: FOLDER, toelichting: FOLDER_TOEL + ' Vul eventueel openingstijden aan.',
    tekst: 'Horeca in en bij het gebied: Theeschenkerij Mossel en Restaurant Planken Wambuis; in Wolfheze het Fletcher Hotel-Restaurant Wolfheze.' }),
  d('wodanseiken', { onderwerp: 'gebied', deelgebied: 'wolfheze', bron: FOLDER, toelichting: 'Uit de gebiedsfolder van 2021 ("ruim 450 jaar oud").',
    tekst: 'De Wodanseiken in Laag Wolfheze waren in 2021 ruim 450 jaar oud en behoren tot de bekendste bomen van Nederland.' }),
  d('heelsumse-beek', { onderwerp: 'gebied', deelgebied: 'wolfheze', bron: FOLDER,
    toelichting: 'Uit de gebiedsfolder van 2021. Het boekje over Laag-Wolfheze noemt ongeveer 1650 als begin van de papierindustrie langs de beek; controleer het jaartal 1550.',
    tekst: 'De Heelsumse Beek is een spreng uit 1550. Sprengen werden gegraven om papiermolens te laten draaien en van schoon water te voorzien.' }),
  d('faunaportalen', { onderwerp: 'gebied', bron: PORTAAL, bronUrl: 'https://www.naturetoday.com',
    toelichting: 'Uit twee berichten van de Zoogdiervereniging (2018/2019). Vult het bestaande feit over de marterbrug aan.',
    tekst: 'Boven de A12 tussen Ede en knooppunt Grijsoord zijn bij de verbreding van de weg in 2016 twee wegportalen ingericht als faunaportaal, zodat boommarters en eekhoorns via touwen en een goot veilig kunnen oversteken. Een raster met gladde schermen leidt de dieren naar de faunaportalen, een ecoduct of onderdoorgangen. In juli 2018 werden de eerste eekhoorns op camera vastgelegd en op 14 december 2018 de eerste boommarter.' }),
  d('laag-bron', { onderwerp: 'gebied', deelgebied: 'wolfheze', bron: LAAG, toelichting: 'Uit het boekje over Laag-Wolfheze.',
    tekst: 'In Laag-Wolfheze komt kwelwater naar boven en ontspringt de Heelsumse beek. Het dal is een van de fraaiste sneeuwsmeltwaterdalen van Nederland, ontstaan aan het eind van de laatste ijstijd. In de beekbedding zijn soms zandvulkaantjes te zien, en regenboogkleurige vliesjes op het water verraden ijzerbacteriën.' }),
  d('laag-grafheuvels', { onderwerp: 'naam', deelgebied: 'wolfheze', bron: LAAG, toelichting: 'Uit het boekje over Laag-Wolfheze.',
    tekst: "In Laag-Wolfheze liggen acht prehistorische grafheuvels. In één ervan, de 'Koningsheuvel', zijn een klokbeker en een stenen polsbeschermer gevonden (gebruikt bij het boogschieten)." }),
  d('laag-kerkje', { onderwerp: 'naam', deelgebied: 'wolfheze', bron: LAAG, toelichting: 'Uit het boekje over Laag-Wolfheze.',
    tekst: 'In Laag-Wolfheze stond in de middeleeuwen een kerkje met een begraafplaats. Het raakte eind 16e eeuw in verval; de resten werden in 1627 verkocht voor 375 gulden. Een aarden verhoging geeft de plek nog aan.' }),
  d('laag-papier', { onderwerp: 'naam', deelgebied: 'wolfheze', bron: LAAG, toelichting: 'Uit het boekje over Laag-Wolfheze. Zie ook het voorstel over de Heelsumse Beek (folder noemt 1550).',
    tekst: 'Vanaf ongeveer 1650 bloeide langs de Heelsumse beek de papierindustrie. Daarvoor werden sprengen gegraven, sommige meer dan twee kilometer lang, zoals de Papiermolenbeek. Door grondwateronttrekking staat er nu nauwelijks water in deze gegraven beeklopen.' }),
  d('laag-nat', { onderwerp: 'gebied', deelgebied: 'wolfheze', bron: LAAG, toelichting: 'Uit het boekje over Laag-Wolfheze.',
    tekst: "Natte plekken in Laag-Wolfheze zijn de Veenmospoel (ontstaan in 1982 door het uitgraven van bosveen), het Ven (een natte laagte met kwelwater) en de Paddenpoel (een gegraven vijver achter de voormalige boerderij 'Het Kousenhuisje'). Er liggen ook twee landweren (wallen met greppels) haaks op een oude Hessenweg met karrensporen." }),
  d('laag-schilders', { onderwerp: 'naam', deelgebied: 'wolfheze', bron: LAAG, toelichting: 'Uit het boekje over Laag-Wolfheze.',
    tekst: "Midden 19e eeuw schilderden kunstenaars van de Oosterbeekse school, onder wie Anton Mauve, Johannes Bilders en Jacob en Willem Maris, 'en plein air' in Laag-Wolfheze. De naam 'Wodanseiken' gaat terug op Bilders." })
);

module.exports = { versie: 3, feiten, voorstellen, sectieOnderwerp };
