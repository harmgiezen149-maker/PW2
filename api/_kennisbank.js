// Basiskennisbank Planken Wambuis.
// Bestanden in api/ met een underscore-prefix worden door Vercel niet als endpoint geserveerd.
// Secties kunnen via het beheerpaneel (KV-key 'kennisbank') worden overschreven of aangevuld
// zonder redeploy; een override met dezelfde slug vervangt de tekst hieronder.

module.exports = {
  versie: '2026-07',
  secties: [
    {
      slug: 'gebied',
      titel: 'Gebied & landschap',
      laatstGecontroleerd: '2026-07',
      tekst: 'Planken Wambuis ligt op de Zuidwest-Veluwe (gemeente Ede) en wordt beheerd door Natuurmonumenten. Het landschap bestaat uit heide, stuifzand, eikenbos en vennen.'
    },
    {
      slug: 'wolf',
      titel: 'Wolf',
      laatstGecontroleerd: '2026-07',
      tekst: 'Er leeft een vaste wolvenroedel van ca. 13 wolven (2 ouders, 2 jaarlingen, 9 welpen) in Planken Wambuis, gevestigd sinds 2022. De mannelijke wolf GW2435m is actief in het gebied. Wolvenwaarnemingen melden bij BIJ12 via 0800-1212.'
    },
    {
      slug: 'soorten',
      titel: 'Kenmerkende soorten',
      laatstGecontroleerd: '2026-07',
      tekst: 'Kenmerkende soorten in het gebied: heideblauwtje, nachtzwaluw, zandhagedis, adder, wild zwijn, ree, edelhert, das, torenvalk en buizerd.'
    },
    {
      slug: 'plekken-routes',
      titel: 'Plekken & routes',
      laatstGecontroleerd: '2026-07',
      tekst: 'Bekende plekken in en rond het gebied: Mosselse Zand, Oude Hout, Oud Reemst, De Mossel en de Wolfhezerheide.'
    },
    {
      slug: 'beheer-begrazing',
      titel: 'Beheer & begrazing',
      laatstGecontroleerd: '2026-07',
      tekst: 'Natuurmonumenten beheert het gebied onder andere met schapenbegrazing, plaggen, gecontroleerd branden en maaien.'
    },
    {
      slug: 'regels-toegang',
      titel: 'Regels & toegang',
      laatstGecontroleerd: '2026-07',
      tekst: '(Nog in te vullen via het beheerpaneel: openingstijden, hondenbeleid, toegankelijkheid van paden en eventuele afsluitingen.)'
    },
    {
      slug: 'lidmaatschap',
      titel: 'Natuurmonumenten-lidmaatschap',
      laatstGecontroleerd: '2026-07',
      tekst: 'Natuurmonumenten heeft 750.000 leden. Lid worden kan vanaf €2,50 per maand, aanmelden via nm.nl.'
    },
    {
      slug: 'contact-meldingen',
      titel: 'Contact & meldingen',
      laatstGecontroleerd: '2026-07',
      tekst: 'Wolvenmeldingen: BIJ12, telefoon 0800-1212. Algemene informatie en contact: Natuurmonumenten via nm.nl.'
    }
  ]
};
