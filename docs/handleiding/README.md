# Handleiding opnieuw maken

De handleiding (`../handleiding-boswachter-assistent.pdf`) wordt gemaakt uit `handleiding.html`.
De schermafbeeldingen in `shots/` komen uit de echte pagina's van de app, met nagebootste
API-antwoorden (voorbeeldgegevens; er is geen database of API-sleutel nodig).

Vereist: Node.js met Playwright en Chromium.

```
node docs/handleiding/shots.js   # schermafbeeldingen vernieuwen
node docs/handleiding/pdf.js     # pdf maken
```
