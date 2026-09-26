// Startinhoud voor de kennisbank in de database. Wordt eenmalig geïmporteerd
// (zie zorgVoorSeed in kennisbank.js); daarna beheert de beheerder alles via het
// beheerpaneel. Nieuwe voorstellen kunnen hier met een hogere `sinds` worden
// toegevoegd; ze komen dan als voorstel ter goedkeuring binnen.
// Alleen openbare informatie: deze repository is openbaar.

const DOC = "Document 'Planken Wambuis, naam en gebied' (Natuurmonumenten)";
const OUD = 'Oude kennisbank (bron niet vastgelegd)';
const AUG = '2026-08';
const JUL = '2026-07';

function f(id, sectie, onderwerp, type, tekst, extra) {
  return Object.assign({ id: 'seed_' + id, sectie, onderwerp, type, tekst, deelgebied: 'heel',
    bron: DOC, gecontroleerdOp: AUG, gecontroleerdDoor: 'import oude kennisbank' }, extra || {});
}

const feiten = [
  f('naam-1', 'naam', 'naam', 'vast', 'Het gebied is vernoemd naar de boerderij annex herberg Planken Wambuis, die hier sinds 1782 stond. Het is nooit vastgesteld dat er een doorrijstal bij stond.'),
  f('naam-2', 'naam', 'naam', 'vast', 'Het huidige restaurant Planken Wambuis dateert van 1926 en is later herbouwd.'),
  f('naam-3', 'naam', 'naam', 'vast', 'Een "wambuis" is een veelvoorkomende naam voor een gebouw op het platteland, vaak gebruikt als herberg; "planken" betekent van planken gemaakt (houten). Het woord wambuis is verwant aan wamba (Gotisch voor buik) en womb (Engels voor baarmoeder): een beschutte, tijdelijke verblijfplaats.'),

  f('gebied-1', 'gebied', 'gebied', 'vast', 'Planken Wambuis ligt op de Zuidwest-Veluwe (gemeente Ede) en wordt beheerd door Natuurmonumenten.'),
  f('gebied-2', 'gebied', 'gebied', 'vast', 'Het gebied is ruim 2100 ha groot (ongeveer 7 bij 3 km), waarvan circa een derde niet-toegankelijk rustgebied is.'),
  f('gebied-3', 'gebied', 'gebied', 'vast', 'Het gebied wordt doorsneden door de N224 (Verlengde Arnhemseweg/Amsterdamseweg); ten zuiden daarvan ligt de Buunderkamp. Op deze weg vallen veel wildaanrijdingen.'),
  f('gebied-4', 'gebied', 'gebied', 'jaarlijks', 'Aan de oostkant is het gebied via het ecoduct Oud Reemst (over de N310, geopend in 2013) verbonden met buurgebied De Hoge Veluwe. De Hoge Veluwe sloot dit ecoduct in 2019 af voor edelherten en (zonder succes) wolven; in maart 2026 is het weer geopend, met een raster van 1 meter hoog met openingen voor wild zwijn en das.', { deelgebied: 'reemst' }),
  f('gebied-5', 'gebied', 'gebied', 'vast', 'Aan de zuidkant verbindt het ecoduct Jac. P. Thijsse (over de A12) het gebied met buurgebied de Reijerscamp. Wilde zwijnen worden daar tegengehouden, omdat hier de grens van hun leefgebied ligt.'),
  f('gebied-6', 'gebied', 'gebied', 'vast', 'Over de A12 ligt een marterbrug/faunaportaal voor marters en eekhoorns (bij de afslag naar de N224); onder de A12 ligt een faunatunnel, onder andere voor dassen.'),
  f('gebied-7', 'gebied', 'gebied', 'vast', 'De westkant van het gebied sluit aan op buurgebied de Noord- en Zuid-Ginkel (Ginkelse Heide).'),
  f('gebied-8', 'gebied', 'gebied', 'vast', 'De landschappen in het gebied zijn bos, heide, grasland (voormalige akkers) en zandverstuiving (het Mosselse Zand).'),
  f('gebied-9', 'gebied', 'gebied', 'jaarlijks', 'Bij Oud Reemst blijven op de zuidakker de berken staan; die voormalige akker ontwikkelt zich tot een vrij open berkenbos met veel kruiden en zichtlijnen langs het pad.', { deelgebied: 'reemst' }),
  f('gebied-10', 'gebied', 'gebied', 'jaarlijks', 'De laanbomen (beuken) aan de OR-laan bij Oud Reemst worden volgens de planning (stand augustus 2026) rond 2033 vervangen door eiken, die daarvoor in opkweek zijn.', { deelgebied: 'reemst' }),

  f('historie-1', 'historie', 'naam', 'vast', 'Planken Wambuis is in 1980 door het Rijk aangekocht en geschonken aan Natuurmonumenten, ter gelegenheid van het 75-jarig bestaan van de vereniging.'),
  f('historie-2', 'historie', 'naam', 'vast', 'Daarvoor was het gebied 400 jaar in bezit van de adellijke families (de graven en hertogen van Gelre) op Kasteel Rosendael bij Velp (hemelsbreed 7-8 km), voor jacht, pacht en houtopbrengst (stookhout en eikenbast voor de leerlooierijen). In die tijd zijn de beukenlanen en houtwallen aangelegd.'),
  f('historie-3', 'historie', 'naam', 'vast', 'Sinds ongeveer 1500 zijn er in het gebied akkers in gebruik; de zuidakker bij Oud Reemst pas sinds eind 19e eeuw.'),
  f('historie-4', 'historie', 'naam', 'vast', 'Oud Reemst was een landbouwenclave; de zuidakker is als laatste uit roulatie genomen, in 2004.', { deelgebied: 'reemst' }),
  f('historie-5', 'historie', 'naam', 'vast', 'Andere voormalige landbouwenclaves in het gebied zijn Dennenkamp (uit roulatie in 1984), Nieuw Reemst (1991), Mossel (1995) en het Mosselse veld bij Valenberg (1989).'),

  f('wolf-1', 'wolf', 'wolf', 'jaarlijks', 'Er leeft een vaste wolvenroedel van ca. 13 wolven (2 ouders, 2 jaarlingen, 9 welpen) in Planken Wambuis, gevestigd sinds 2022.', { bron: OUD, gecontroleerdOp: JUL }),
  f('wolf-2', 'wolf', 'wolf', 'jaarlijks', 'De mannelijke wolf GW2435m is actief in het gebied.', { bron: OUD, gecontroleerdOp: JUL }),

  f('soorten-1', 'soorten', 'soorten', 'jaarlijks', 'Kenmerkende soorten in het gebied zijn onder andere heideblauwtje, nachtzwaluw, zandhagedis, adder, wild zwijn, ree, edelhert, das, torenvalk en buizerd.'),
  f('soorten-2', 'soorten', 'soorten', 'jaarlijks', "Vogels in het gebied zijn onder andere de raaf (in 1970 geherintroduceerd, na zo'n 200 jaar afwezigheid), zeearend, vijf soorten spechten (waaronder de zwarte specht), veld- en boomleeuwerik, nachtzwaluw, klapekster (in de winter) en grauwe klauwier (in de zomer)."),
  f('soorten-3', 'soorten', 'soorten', 'jaarlijks', 'Reptielen in het gebied: zandhagedis, hazelworm, gladde slang en adder.'),
  f('soorten-4', 'soorten', 'soorten', 'jaarlijks', 'Amfibieën in de vochtiger delen van het gebied: gewone pad, rugstreeppad en heikikker.'),
  f('soorten-5', 'vee-grootwild', 'soorten', 'jaarlijks', 'Groot wild in het gebied: edelhert, ree, wild zwijn, wolf, vos en das; daarnaast leven er boommarter en steenmarter.'),

  f('vee-1', 'vee-grootwild', 'vee', 'jaarlijks', "Voor begrazing lopen er New Forest pony's en Sayaguesa-runderen (afkomstig uit Sayago-Zamora, Spanje), verdeeld over de Mosselkudde en de iets grotere Reemsterkudde."),
  f('vee-2', 'vee-grootwild', 'vee', 'jaarlijks', 'De Veluwse heideschapen van de Edese Schaapskudde (een gescheperde kudde met herder) begrazen de heide.'),

  f('routes-1', 'plekken-routes', 'routes', 'jaarlijks', 'Bekende plekken in het gebied zijn het Mosselse Zand, het Oude Hout, Oud Reemst, De Mossel en de Wolfhezerheide.', { bron: OUD, gecontroleerdOp: JUL }),
  f('beheer-1', 'beheer-begrazing', 'beheer', 'jaarlijks', 'Natuurmonumenten beheert het gebied onder andere met schapenbegrazing, plaggen, gecontroleerd branden en maaien.', { bron: OUD, gecontroleerdOp: JUL }),
  f('nm-1', 'lidmaatschap', 'nm', 'jaarlijks', 'Natuurmonumenten heeft 750.000 leden.', { bron: OUD, gecontroleerdOp: JUL }),
  f('nm-2', 'lidmaatschap', 'nm', 'jaarlijks', 'Lid worden van Natuurmonumenten kan vanaf € 2,50 per maand; aanmelden via natuurmonumenten.nl.', { bron: OUD, gecontroleerdOp: JUL }),
  f('contact-1', 'contact-meldingen', 'contact', 'jaarlijks', 'Wolvenwaarnemingen meld je bij BIJ12, telefoon 0800-1212.', { bron: OUD, gecontroleerdOp: JUL }),
  f('contact-2', 'contact-meldingen', 'contact', 'jaarlijks', 'Voor algemene informatie en contact: Natuurmonumenten via natuurmonumenten.nl.', { bron: OUD, gecontroleerdOp: JUL })
];

// Oude sectie → onderwerp (voor teksten die in het oude beheerpaneel waren aangepast)
const sectieOnderwerp = {
  naam: 'naam', gebied: 'gebied', historie: 'naam', wolf: 'wolf', soorten: 'soorten',
  'vee-grootwild': 'vee', 'plekken-routes': 'routes', 'beheer-begrazing': 'beheer',
  'regels-toegang': 'bezoek', lidmaatschap: 'nm', 'contact-meldingen': 'contact'
};

const voorstellen = [];

module.exports = { versie: 1, feiten, voorstellen, sectieOnderwerp };
