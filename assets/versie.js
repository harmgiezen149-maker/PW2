// Versie van de app, op één plek. Bij elke nieuwe versie: nummer ophogen, datum en "nieuw" aanpassen.
// De app (updatemelding en Profiel), het beheerpaneel en de service worker lezen dit bestand;
// de updatecontrole haalt het opnieuw op en vergelijkt het nummer met de versie die draait.
// Houd het object geldige JSON (dubbele aanhalingstekens), want de controle leest het als tekst.
self.PW_VERSIE = {
  "nummer": "2.8",
  "datum": "2026-09-27",
  "nieuw": [
    "Kalender: algemene natuurweetjes per maand, apart van wat er in het gebied speelt",
    "Updatemelding: de app laat zelf weten als er een nieuwe versie is",
    "Kalender: per maand wat er in het gebied speelt",
    "Routes uit Kaart en plekken ook bij de deelgebieden en in de chat",
    "Alle afbeeldingen beheerbaar via Beheer → Foto's",
    "De Reijerscamp als deelgebied"
  ]
};
