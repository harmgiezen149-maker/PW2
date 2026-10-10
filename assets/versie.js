// Versie van de app, op één plek. Bij elke nieuwe versie: nummer ophogen, datum en "nieuw" aanpassen.
// De app (updatemelding en Profiel), het beheerpaneel en de service worker lezen dit bestand;
// de updatecontrole haalt het opnieuw op en vergelijkt het nummer met de versie die draait.
// Houd het object geldige JSON (dubbele aanhalingstekens), want de controle leest het als tekst.
self.PW_VERSIE = {
  "nummer": "2.16",
  "datum": "2026-10-10",
  "nieuw": [
    "Herstel na de overstap naar inloggen; een e-mailadres mag ook als gebruikersnaam, en de velden hebben duidelijke namen",
    "Inloggen met je eigen gebruikersnaam en wachtwoord (Profiel → Inloggen)",
    "Zonder inlog een maximum aantal vragen per dag (standaard 10)",
    "Ook een maximum per maand voor niet-ingelogde bezoekers samen",
    "Maximum per maand per gebruiker, met een waarschuwing bij 75% en het gebruik in Profiel",
    "Zuiniger: de aanvulling van websites alleen op verzoek (knop onder het antwoord), nieuwer en goedkoper model"
  ]
};
