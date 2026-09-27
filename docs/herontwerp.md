# Herontwerp Boswachter Assistent (september 2026)

Nieuw ontwerp van de app, gebaseerd op het aangeleverde voorbeeld: blauwe kop, oranje
verstuurknop, warmgrijze tabbalk, een natuurbeeld achter de chat en vijf tabbladen.
De betrouwbaarheid uit het verbeterplan (`verbeterplan-betrouwbaarheid.md`) blijft overal
zichtbaar: voetnoten, bronnenlijst, "niet gecontroleerd", "Dat weet ik niet" en
"Klopt er iets niet?".

## Wat er gebouwd is

| Fase | Wat |
|------|-----|
| A · Huisstijl en chat | Kleuren en lettertype (Fira Sans, meegeleverd), kopbalk, weerbalk over een getekend heidelandschap, begroeting met getekende boswachter en drie snelle vragen, "+" voor onderwerpen, ballonnen, nieuwe app-iconen. Website-aanvullingen hebben geen eigen voetnootnummers meer (die botsten met de bronnenlijst). |
| B · Profiel en Meldingen | Profiel vervangt het tandwiel: inlogstatus, verhaalmodus, automatisch voorlezen, tekstgrootte, handleiding, uitleg over de bronnen, beheerpaneel. Meldingen: lopende tijdelijke feiten, seizoenskalender van deze maand, recent goedgekeurd nm.nl-nieuws, "Iets melden" en "Mijn meldingen" met status. |
| C · Gebieden | De deelgebieden met korte beschrijving; per gebied de feiten en routes, en "Vraag de assistent over dit gebied". |
| D · Kaart | Kaart met plekken, routes, labels en grenzen; lagen, zoeken, eigen locatie, luchtfoto; onderblad met de gekoppelde feiten; kaartje in antwoorden. Ondergrond: PDOK (Kadaster). |
| E · Beheer en handleiding | Beheerpaneel in de nieuwe stijl met zijmenu, overzicht met weekendlijst en het nieuwe onderdeel "Kaart en plekken" (plekken aanklikken, routes uit GPX, grenzen uit GeoJSON, ook in RD). Feiten kunnen een plek en een foto krijgen. Handleiding en schermafbeeldingen bijgewerkt (15 pagina's). |
| Aanvulling · Achtergrondfoto | Beheerpaneel → Foto's: een staande foto (telefoon) en een liggende (tablet en computer). De foto wordt in de browser verkleind, in stukken in de database gezet en via `api/achtergrond` met een versie in de link uitgeleverd (een jaar te cachen, ook offline via de service worker). De foto staat stil achter de chat; de naam van de maker staat klein in de hoek. |
| Aanvulling · Avatar | Het tabblad heet nu Beheerpaneel → Foto's. Daar kan een beheerder ook de avatar van de assistent vervangen (bij voorkeur een illustratie, geen foto van een echt persoon). Opslag en uitlevering zoals de achtergrondfoto (soort `avatar`, hooguit 300 kB); laadt de afbeelding niet, dan toont de app weer de getekende boswachter. De maker staat bij Profiel. |
| Aanvulling · Reijerscamp | De Reijerscamp is een zesde deelgebied (was buurgebied): in de kennisbank, de instructie aan de assistent, het tabblad Gebieden, de kaart, het beheerpaneel en de wekelijkse controle (ook de pagina van de Reijerscamp op natuurmonumenten.nl). De grenzen van alle deelgebieden komen uit de NM-beheerkaart en worden via het beheerpaneel in de database gezet, niet in de code. |
| Aanvulling · Alle afbeeldingen | Beheerpaneel → Foto's beheert nu elke afbeelding in de app, met uploaden in plaats van links: logo in de kopbalk (ook in het beheerpaneel), app-icoon (drie formaten uit één afbeelding; het webmanifest komt nu van `api/achtergrond?manifest=1`), avatar, achtergrond, een foto per deelgebied en foto's bij feiten. Een geüploade foto vervangt een eerder ingevulde link. |
| Aanvulling · Routes | Routes uit Kaart en plekken staan nu ook bij het deelgebied (Gebieden → Routes, met lengte, gekoppeld feit en knop naar de kaart) en zijn gecontroleerde kennis voor de assistent ("Plekken & routes", met een kaartje van de route onder het antwoord). Interne routes alleen voor wie is ingelogd. |
| Aanvulling · Jaarkalender | Nieuw tabblad Kalender (per maand, twaalf maanden vooruit, filter op flora en fauna, activiteiten, beheer en onderhoud, overig). De kalender komt uit de kennisbank: seizoensfeiten (maanden) en tijdelijke feiten (datums), met een eigen kalendercategorie en korte titel of automatisch volgens onderwerp. Beheer → Jaarkalender: per maand toevoegen, bewerken, uit de kalender halen en verwijderen (intrekken). "Zoek op de websites" en de wekelijkse controle leveren kalendervoorstellen. De assistent kent ook activiteiten die binnen 90 dagen beginnen ("begint …, nu nog niet"). |
| Aanvulling · Versiecontrole | Eén versiebestand (`assets/versie.js`: nummer, datum, wat er nieuw is) voor app, beheerpaneel en service worker (cachenaam). De app controleert bij het openen, elk half uur en bij terugkeren naar de app of er een nieuwere versie staat, en toont dan bovenin "Nieuwe versie van de app" met Bijwerken of Later; na bijwerken een bevestiging. Beveiliging tegen eindeloos herladen (na twee pogingen eerst de cache wissen, na drie niet meer vragen). Profiel toont de versie, wat er nieuw is en "Controleren op updates"; het beheerpaneel toont de versie en een balk bij een nieuwe versie. **Bij elke nieuwe versie `assets/versie.js` bijwerken.** |
| Aanvulling · Algemeen in de kalender | Nieuwe kalendercategorie *Algemeen in de natuur*: algemene natuurweetjes per maand (bladverkleuring, vogeltrek, paddenstoelen), altijd type seizoen. In de app apart onder "In de natuur in <maand>", met de noot dat het niet specifiek voor het gebied is; de assistent krijgt het label "algemene natuurkennis, niet specifiek voor dit gebied" en brengt het zo. Beheer → Jaarkalender → *Algemene weetjes voorstellen* (een maand of het hele jaar) laat de assistent voorstellen maken zonder websites, voorzichtig geformuleerd en zonder claims over het gebied; bij Voorstellen kun je ze na nalezen in één keer goedkeuren (alleen nieuwe voorstellen, geen wijzigingen). |

## Keuzes bij de open vragen uit het plan

- **Mijn meldingen** zonder koppeling aan personen: het apparaat onthoudt de id's van
  de eigen meldingen en vraagt alleen de status op. De server kent alleen id → status
  (geen tekst, geen gebruiker) en ruimt statussen na een half jaar op.
- **Wildwaarnemingen** worden niet getoond. Gevoelige plekken (wolven, nesten, burchten,
  rustgebieden) worden door de server geweigerd; feiten over de wolf krijgen geen plek.
- **Kaartgegevens**: er staan geen plekken of routes in de code. Een beheerder legt ze
  vast in "Kaart en plekken"; alleen wat is gecontroleerd, verschijnt in de app. Tot die
  tijd toont de kaart een uitleg in plaats van plekken.
- **Beeld**: het logo is een getekend takje en de achtergrond een getekend landschap,
  tot er een officieel beeldmerk en foto's met gebruiksrecht zijn.

## Nog nodig van Natuurmonumenten

1. Akkoord van Communicatie op de blauw-oranje uitstraling, en het officiële beeldmerk.
2. Natuurfoto's met gebruiksrecht (achtergrond chat; per deelgebied; eventueel per feit).
   Een beheerder kan ze uploaden in Beheer → Foto's, net als het beeldmerk (logo en app-icoon).
3. Kaartgegevens: grenzen van de deelgebieden (GIS, als GeoJSON), GPX-bestanden van de
   routes, en de ligging van parkeerplaatsen, uitkijkposten en ingangen.

## Technisch

- De app staat in `index.html` met `assets/` (core, chat, kaart, gebieden, meldingen,
  profiel, vogels, app.css). Leaflet 1.9.4 staat in `assets/leaflet/` (BSD-2), Fira Sans
  in `assets/fonts/` (OFL).
- Nieuw endpoint `api/gebied.js` (actueel, gebieden, gebied, kaart); nieuwe modules
  `api/_lib/kaart.js` en `api/_lib/meldstatus.js`. Nieuwe sleutels in de database:
  `kb:plekken`, `kb:routes`, `cfg:gebieden`, `kaart:grens:<gebied>`, `kb:meldstatus`,
  `cfg:achtergrond` (alle afbeeldingen uit Foto's, + de stukken van de afbeeldingen; die zitten niet
  in de back-up).
  De kaart zit in de wekelijkse back-up.
- UI-tests en schermafbeeldingen draaien tegen een nagebootste API
  (`docs/handleiding/mock.js`), zonder database of API-sleutel.
