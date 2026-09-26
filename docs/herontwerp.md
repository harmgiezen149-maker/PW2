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
| C · Gebieden | De vijf deelgebieden met korte beschrijving; per gebied de feiten en routes, en "Vraag de assistent over dit gebied". |
| D · Kaart | Kaart met plekken, routes, labels en grenzen; lagen, zoeken, eigen locatie, luchtfoto; onderblad met de gekoppelde feiten; kaartje in antwoorden. Ondergrond: PDOK (Kadaster). |
| E · Beheer en handleiding | Beheerpaneel in de nieuwe stijl met zijmenu, overzicht met weekendlijst en het nieuwe onderdeel "Kaart en plekken" (plekken aanklikken, routes uit GPX, grenzen uit GeoJSON, ook in RD). Feiten kunnen een plek en een foto krijgen. Handleiding en schermafbeeldingen bijgewerkt (15 pagina's). |
| Aanvulling · Achtergrondfoto | Beheerpaneel → Achtergrondfoto: een staande foto (telefoon) en een liggende (tablet en computer). De foto wordt in de browser verkleind, in stukken in de database gezet en via `api/achtergrond` met een versie in de link uitgeleverd (een jaar te cachen, ook offline via de service worker). De foto staat stil achter de chat; de naam van de maker staat klein in de hoek. |

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
   Per gebied en per feit kan een beheerder nu al een foto-link met de naam van de maker
   invullen.
3. Kaartgegevens: grenzen van de deelgebieden (GIS, als GeoJSON), GPX-bestanden van de
   routes, en de ligging van parkeerplaatsen, uitkijkposten en ingangen.

## Technisch

- De app staat in `index.html` met `assets/` (core, chat, kaart, gebieden, meldingen,
  profiel, vogels, app.css). Leaflet 1.9.4 staat in `assets/leaflet/` (BSD-2), Fira Sans
  in `assets/fonts/` (OFL).
- Nieuw endpoint `api/gebied.js` (actueel, gebieden, gebied, kaart); nieuwe modules
  `api/_lib/kaart.js` en `api/_lib/meldstatus.js`. Nieuwe sleutels in de database:
  `kb:plekken`, `kb:routes`, `cfg:gebieden`, `kaart:grens:<gebied>`, `kb:meldstatus`,
  `cfg:achtergrond` (+ de stukken van de foto's; die zitten niet in de back-up).
  De kaart zit in de wekelijkse back-up.
- UI-tests en schermafbeeldingen draaien tegen een nagebootste API
  (`docs/handleiding/mock.js`), zonder database of API-sleutel.
