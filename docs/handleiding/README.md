# Handleiding opnieuw maken

De handleiding (`../handleiding-boswachter-assistent.pdf`) wordt gemaakt uit `handleiding.html`.
De schermafbeeldingen in `shots/` komen uit de echte pagina's van de app, met nagebootste
API-antwoorden uit `mock.js` (voorbeeldgegevens; er is geen database of API-sleutel nodig).
De kaartondergrond van PDOK wordt daarbij vervangen door een lichte rastertegel (`tegel.png`);
de plekken op de voorbeeldkaart zijn verzonnen.

Vereist: Node.js met Playwright en Chromium.

```
node docs/handleiding/shots.js   # schermafbeeldingen vernieuwen
node docs/handleiding/pdf.js     # pdf maken
```
