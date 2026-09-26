// Beheerpaneel: Kaart en plekken. Plekken aanklikken op de kaart, routes uit een GPX-bestand
// laden en per deelgebied een label, grens, korte beschrijving en foto vastleggen.
// Gebruikt de hulpfuncties uit beheer.html (el, api, melding, fout, OV, laadOverzicht, datumNL).
(function() {
var PDOK = 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png';
var LUCHTFOTO = 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857/{z}/{x}/{y}.jpeg';
var KLEUR = { parkeren: '#2256A0', uitkijk: '#2D6A45', bezoekerscentrum: '#1D2856', ingang: '#1D2856', horeca: '#5B524B', voorziening: '#5B524B', overig: '#5B524B' };
var LETTER = { parkeren: 'P', uitkijk: 'U', bezoekerscentrum: 'i', ingang: 'I', horeca: 'H', voorziening: 'V', overig: '•' };
var MAX_ROUTEPUNTEN = 1500, MAX_GRENSPUNTEN = 800;

var leaflet = null;
function laadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!leaflet) {
    leaflet = new Promise(function(ok, nee) {
      document.head.appendChild(el('link', { rel: 'stylesheet', href: '/assets/leaflet/leaflet.css' }));
      var s = el('script', { src: '/assets/leaflet/leaflet.js' });
      s.onload = function() { ok(window.L); };
      s.onerror = function() { leaflet = null; nee(new Error('De kaart kon niet worden geladen.')); };
      document.head.appendChild(s);
    });
  }
  return leaflet;
}

// ============================================================
// Geometrie: vereenvoudigen, GPX en GeoJSON lezen, RD omrekenen
// ============================================================
function afstandTotLijn(p, a, b) {
  var x = p[1], y = p[0], x1 = a[1], y1 = a[0], x2 = b[1], y2 = b[0];
  var dx = x2 - x1, dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  var t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}
function douglasPeucker(punten, tol) {
  if (punten.length < 3) return punten.slice();
  var houd = new Array(punten.length); houd[0] = houd[punten.length - 1] = true;
  var stapel = [[0, punten.length - 1]];
  while (stapel.length) {
    var r = stapel.pop(), max = 0, idx = -1;
    for (var i = r[0] + 1; i < r[1]; i++) { var d = afstandTotLijn(punten[i], punten[r[0]], punten[r[1]]); if (d > max) { max = d; idx = i; } }
    if (max > tol && idx > 0) { houd[idx] = true; stapel.push([r[0], idx], [idx, r[1]]); }
  }
  return punten.filter(function(p, i) { return houd[i]; });
}
// Vereenvoudigen tot hoogstens max punten (tolerantie in graden, begint bij ongeveer 1 meter)
function vereenvoudig(punten, max) {
  var tol = 0.00001, uit = punten;
  while (uit.length > max && tol < 0.01) { uit = douglasPeucker(punten, tol); tol *= 2; }
  return uit.map(function(p) { return [Math.round(p[0] * 1e6) / 1e6, Math.round(p[1] * 1e6) / 1e6]; });
}

// Rijksdriehoekscoördinaten (EPSG:28992) naar WGS84, benadering tot op ongeveer een meter
function rdNaarWgs(x, y) {
  var dX = (x - 155000) * 1e-5, dY = (y - 463000) * 1e-5;
  var n = 3235.65389 * dY - 32.58297 * dX * dX - 0.2475 * dY * dY - 0.84978 * dX * dX * dY - 0.0655 * dY * dY * dY -
    0.01709 * dX * dX * dY * dY - 0.00738 * dX + 0.0053 * Math.pow(dX, 4) - 0.00039 * dX * dX * Math.pow(dY, 3) +
    0.00033 * Math.pow(dX, 4) * dY - 0.00012 * dX * dY;
  var e = 5260.52916 * dX + 105.94684 * dX * dY + 2.45656 * dX * dY * dY - 0.81885 * Math.pow(dX, 3) + 0.05594 * dX * Math.pow(dY, 3) -
    0.05607 * Math.pow(dX, 3) * dY + 0.01199 * dY - 0.00256 * Math.pow(dX, 3) * dY * dY + 0.00128 * dX * Math.pow(dY, 4) +
    0.00022 * dY * dY - 0.00022 * dX * dX + 0.00026 * Math.pow(dX, 5);
  return [52.15517 + n / 3600, 5.387206 + e / 3600];
}

function leesGpx(tekst) {
  var doc = new DOMParser().parseFromString(tekst, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Dit is geen geldig GPX-bestand.');
  var pt = doc.getElementsByTagNameNS('*', 'trkpt');
  if (!pt.length) pt = doc.getElementsByTagNameNS('*', 'rtept');
  var punten = [];
  for (var i = 0; i < pt.length; i++) {
    var lat = parseFloat(pt[i].getAttribute('lat')), lon = parseFloat(pt[i].getAttribute('lon'));
    if (isFinite(lat) && isFinite(lon)) punten.push([lat, lon]);
  }
  if (punten.length < 2) throw new Error('Geen route gevonden in het GPX-bestand (trkpt of rtept).');
  var naam = doc.getElementsByTagNameNS('*', 'name')[0];
  return { naam: naam ? naam.textContent.trim().slice(0, 80) : '', punten: punten };
}

// GeoJSON (Polygon, MultiPolygon, Feature of FeatureCollection) naar buitenringen [lat, lon];
// coördinaten in RD worden herkend en omgerekend.
function leesGeoJson(tekst) {
  var g;
  try { g = JSON.parse(tekst); } catch (e) { throw new Error('Dit is geen geldig GeoJSON-bestand.'); }
  var ringen = [];
  function geometrie(geo) {
    if (!geo) return;
    if (geo.type === 'Polygon') ringen.push(geo.coordinates[0]);
    else if (geo.type === 'MultiPolygon') geo.coordinates.forEach(function(p) { ringen.push(p[0]); });
    else if (geo.type === 'Feature') geometrie(geo.geometry);
    else if (geo.type === 'FeatureCollection') (geo.features || []).forEach(function(f) { geometrie(f.geometry); });
    else if (geo.type === 'GeometryCollection') (geo.geometries || []).forEach(geometrie);
  }
  geometrie(g);
  if (!ringen.length) throw new Error('Geen vlak (Polygon of MultiPolygon) gevonden in het bestand.');
  return ringen.map(function(ring) {
    var ll = ring.map(function(c) { return Math.abs(c[0]) > 1000 ? rdNaarWgs(c[0], c[1]) : [c[1], c[0]]; });
    return vereenvoudig(ll, MAX_GRENSPUNTEN);
  });
}

function leesBestand(invoer) {
  return new Promise(function(ok, nee) {
    var f = invoer.files && invoer.files[0];
    if (!f) return nee(new Error('Kies eerst een bestand.'));
    if (f.size > 20e6) return nee(new Error('Het bestand is te groot (meer dan 20 MB).'));
    var r = new FileReader();
    r.onload = function() { ok(r.result); };
    r.onerror = function() { nee(new Error('Het bestand kon niet worden gelezen.')); };
    r.readAsText(f);
  });
}

// ============================================================
// Het tabblad
// ============================================================
var toestand = { modus: 'plekken', data: null, kaart: null, lagen: null, kiesBij: null, tijdelijk: null };

function keuze(opties, waarde) {
  var s = el('select');
  opties.forEach(function(o) { var op = el('option', { value: o.slug, text: o.titel }); if (o.slug === waarde) op.selected = true; s.appendChild(op); });
  return s;
}
function veld(label, invoer, hint) {
  var w = el('div', null, [el('label', { text: label }), invoer]);
  if (hint) w.appendChild(el('div', { class: 'hint', text: hint }));
  return w;
}
function dgTitel(slug) { return titelVan(OV.deelgebieden, slug); }

function stipHtml(soort, extra) {
  return '<span class="bk-stip" style="background:' + (KLEUR[soort] || '#5B524B') + ';' + (extra || '') + '">' + (LETTER[soort] || '•') + '</span>';
}

function tekenKaart() {
  var L = window.L, k = toestand.kaart, d = toestand.data;
  if (toestand.lagen) k.removeLayer(toestand.lagen);
  var groep = L.featureGroup().addTo(k);
  toestand.lagen = groep;
  toestand.markers = {};
  OV.deelgebieden.forEach(function(dg) {
    if (dg.slug === 'heel') return;
    var grens = d.grenzen[dg.slug], cfg = d.gebieden[dg.slug] || {};
    if (grens) L.polygon(grens.map(function(r) { return [r]; }), { color: '#2256A0', weight: 2, fillOpacity: 0.06, interactive: toestand.modus === 'gebieden' })
      .on('click', function() { if (toestand.modus === 'gebieden') bewerkGebied(dg.slug); }).addTo(groep);
    if (cfg.lat) L.marker([cfg.lat, cfg.lon], { interactive: false, icon: L.divIcon({ className: 'gebied-label-bk', html: '<span>' + dg.titel + '</span>', iconSize: [140, 30], iconAnchor: [70, 15] }) }).addTo(groep);
  });
  d.routes.forEach(function(r) {
    var lijn = L.polyline(r.punten, { color: '#8A5A2E', weight: toestand.modus === 'routes' ? 5 : 3, opacity: 0.9, dashArray: '8 6' }).addTo(groep);
    lijn.on('click', function() { if (toestand.modus === 'routes') bewerkRoute(r); });
  });
  d.plekken.forEach(function(p) {
    var m = L.marker([p.lat, p.lon], { title: p.naam, icon: L.divIcon({ className: 'bk-teken', html: stipHtml(p.soort), iconSize: [26, 26], iconAnchor: [13, 13] }) }).addTo(groep);
    m.on('click', function() { if (toestand.modus !== 'plekken') kiesModus('plekken'); bewerkPlek(p); });
    toestand.markers[p.id] = m;
  });
}

function kiesModus(m) {
  toestand.modus = m;
  document.querySelectorAll('.bk-segment button').forEach(function(b) { b.setAttribute('aria-pressed', b.getAttribute('data-m') === m ? 'true' : 'false'); });
  stopKiezen();
  wisTijdelijk();
  tekenKaart();
  ({ plekken: lijstPlekken, routes: lijstRoutes, gebieden: lijstGebieden })[m]();
}

// Klik op de kaart om een punt te kiezen
function startKiezen(tip, bij) {
  toestand.kiesBij = bij;
  var vak = document.getElementById('bkKaart');
  vak.classList.add('kies');
  var t = document.getElementById('bkTip');
  t.textContent = tip; t.hidden = false;
}
function stopKiezen() {
  toestand.kiesBij = null;
  var vak = document.getElementById('bkKaart');
  if (vak) vak.classList.remove('kies');
  var t = document.getElementById('bkTip'); if (t) t.hidden = true;
}
function wisTijdelijk() {
  if (toestand.tijdelijk) { toestand.kaart.removeLayer(toestand.tijdelijk); toestand.tijdelijk = null; }
}
function toonTijdelijk(laag) {
  wisTijdelijk();
  toestand.tijdelijk = laag.addTo(toestand.kaart);
}

function paneel() {
  var p = document.getElementById('bkPaneel');
  p.innerHTML = '';
  return p;
}

function herlaad(modus, daarna) {
  return api('kaart').then(function(d) {
    toestand.data = d;
    return laadOverzicht();
  }).then(function() {
    kiesModus(modus || toestand.modus);
    if (daarna) daarna();
  });
}

// ------------------------------------------------ plekken
function lijstPlekken() {
  var p = paneel();
  p.appendChild(el('h2', { text: 'Plekken' }));
  p.appendChild(el('p', { class: 'uitleg', text: 'Parkeerplaatsen, uitkijkposten, ingangen en andere vaste plekken. De informatie bij een plek komt uit de kennisbank: koppel feiten aan een plek via Kennisbank > Bewerken > "Plek op de kaart". Gevoelige plekken (wolven, nesten, burchten, rustgebieden) kunnen niet op de kaart.' }));
  p.appendChild(el('button', { class: 'btn primair', text: '+ Nieuwe plek', onclick: function() { bewerkPlek(null); } }));
  var lijst = el('div', { class: 'bk-lijst', style: 'margin-top:12px' });
  if (!toestand.data.plekken.length) lijst.appendChild(el('p', { class: 'leeg', text: 'Nog geen plekken. Klik op "+ Nieuwe plek" en daarna op de kaart.' }));
  toestand.data.plekken.forEach(function(pl) {
    var rij = el('button', { class: 'bk-rij', type: 'button', html: stipHtml(pl.soort) + '<span style="flex:1"><b></b><span></span></span>' });
    rij.querySelector('b').textContent = pl.naam + (pl.zichtbaarheid === 'intern' ? ' (intern)' : '');
    rij.querySelector('span span').textContent = (OV.soorten.filter(function(s) { return s.slug === pl.soort; })[0] || {}).titel + ' · ' + dgTitel(pl.deelgebied) + ' · ' + pl.feiten.length + ' feit(en)';
    rij.onclick = function() { bewerkPlek(pl); toestand.kaart.setView([pl.lat, pl.lon], Math.max(toestand.kaart.getZoom(), 15)); };
    lijst.appendChild(rij);
  });
  p.appendChild(lijst);
}

function bewerkPlek(pl) {
  var L = window.L;
  var nieuw = !pl;
  pl = pl || { soort: 'parkeren', deelgebied: 'heel', zichtbaarheid: 'openbaar', feiten: [] };
  var p = paneel();
  p.appendChild(el('h2', { text: nieuw ? 'Nieuwe plek' : pl.naam }));
  var f = el('div', { class: 'form' });
  var naam = el('input', { placeholder: 'Bijv. Parkeerplaats Oud Reemst' }); naam.value = pl.naam || '';
  var soort = keuze(OV.soorten, pl.soort);
  var dg = keuze(OV.deelgebieden, pl.deelgebied);
  var zicht = keuze([{ slug: 'openbaar', titel: 'Openbaar (iedereen)' }, { slug: 'intern', titel: 'Intern (alleen ingelogd)' }], pl.zichtbaarheid);
  var toel = el('textarea', { placeholder: 'Korte toelichting (optioneel), bijv. "aan de Deelenseweg"', style: 'min-height:60px' }); toel.value = pl.toelichting || '';
  var lat = el('input', { inputmode: 'decimal', placeholder: '52.0…' }); lat.value = pl.lat || '';
  var lon = el('input', { inputmode: 'decimal', placeholder: '5.7…' }); lon.value = pl.lon || '';
  var marker = null;
  function zetPunt(ll, verplaats) {
    lat.value = ll.lat.toFixed(6); lon.value = ll.lng.toFixed(6);
    if (!marker) {
      marker = L.marker(ll, { draggable: true, icon: L.divIcon({ className: 'bk-teken', html: stipHtml(soort.value, 'outline:3px solid #C8511F;outline-offset:1px'), iconSize: [26, 26], iconAnchor: [13, 13] }) });
      marker.on('dragend', function() { var x = marker.getLatLng(); lat.value = x.lat.toFixed(6); lon.value = x.lng.toFixed(6); });
      toonTijdelijk(marker);
    } else marker.setLatLng(ll);
    if (verplaats) toestand.kaart.setView(ll, Math.max(toestand.kaart.getZoom(), 15));
  }
  var kies = el('button', { class: 'btn secundair klein', type: 'button', text: 'Kies op de kaart', onclick: function() {
    startKiezen('Klik op de kaart waar de plek ligt. Je kunt de punt daarna nog verslepen.', function(ll) { zetPunt(ll); stopKiezen(); });
  } });
  f.appendChild(veld('Naam', naam));
  f.appendChild(el('div', { class: 'rij' }, [veld('Soort plek', soort), veld('Deelgebied', dg)]));
  f.appendChild(veld('Zichtbaarheid', zicht));
  f.appendChild(veld('Toelichting', toel));
  f.appendChild(el('label', { text: 'Ligging' }));
  f.appendChild(el('div', { class: 'coord' }, [el('div', null, [lat]), el('div', null, [lon]), kies]));
  f.appendChild(el('div', { class: 'hint', text: 'Klik op "Kies op de kaart", of vul de coördinaten in (breedte, lengte in graden). Controleer de ligging met de luchtfoto.' }));
  if (!nieuw) {
    f.appendChild(el('label', { text: 'Feiten bij deze plek (' + pl.feiten.length + ')' }));
    if (!pl.feiten.length) f.appendChild(el('div', { class: 'hint', text: 'Nog geen feiten gekoppeld. Doe dat via Kennisbank > Bewerken > "Plek op de kaart".' }));
    pl.feiten.forEach(function(x) { f.appendChild(el('div', { class: 'meta', text: '• ' + x.tekst.slice(0, 140) + (x.tekst.length > 140 ? '…' : '') + (x.type === 'tijdelijk' ? ' (tijdelijk)' : '') })); });
    f.appendChild(el('div', { class: 'meta', style: 'margin-top:8px', text: 'Ligging gecontroleerd ' + datumNL(pl.gecontroleerdOp) + (pl.gecontroleerdDoor ? ' door ' + pl.gecontroleerdDoor : '') }));
  }
  var opslaan = el('button', { class: 'btn primair', text: 'Opslaan (= ligging gecontroleerd)' });
  opslaan.onclick = function() {
    opslaan.disabled = true;
    var w = { naam: naam.value, soort: soort.value, deelgebied: dg.value, zichtbaarheid: zicht.value, toelichting: toel.value, lat: parseFloat(String(lat.value).replace(',', '.')), lon: parseFloat(String(lon.value).replace(',', '.')) };
    if (!nieuw) w.id = pl.id;
    api('plek-opslaan', { plek: w }).then(function() { melding('Plek opgeslagen'); return herlaad('plekken'); })
      .catch(function(e) { opslaan.disabled = false; fout(e); });
  };
  var acties = el('div', { class: 'acties' }, [opslaan, el('button', { class: 'btn secundair', text: 'Annuleren', onclick: function() { kiesModus('plekken'); } })]);
  if (!nieuw) acties.appendChild(el('button', { class: 'btn gevaar', text: 'Verwijderen', onclick: function() {
    if (!confirm('Plek "' + pl.naam + '" verwijderen? Gekoppelde feiten blijven bestaan, maar staan dan niet meer op de kaart.')) return;
    api('plek-verwijderen', { id: pl.id }).then(function(r) { melding('Verwijderd' + (r.losgekoppeld ? ', ' + r.losgekoppeld + ' feit(en) losgekoppeld' : '')); return herlaad('plekken'); }).catch(fout);
  } }));
  f.appendChild(acties);
  p.appendChild(f);
  if (!nieuw) {
    if (toestand.markers[pl.id]) toestand.lagen.removeLayer(toestand.markers[pl.id]);
    zetPunt(L.latLng(pl.lat, pl.lon), true);
  } else {
    startKiezen('Klik op de kaart waar de nieuwe plek ligt.', function(ll) { zetPunt(ll); stopKiezen(); });
  }
  naam.focus();
}

// ------------------------------------------------ routes
var feitenCache = null;
function routeFeiten() {
  if (feitenCache) return Promise.resolve(feitenCache);
  return api('feiten').then(function(d) {
    feitenCache = d.feiten.filter(function(f) { return f.status === 'actief' && f.onderwerp === 'routes'; });
    return feitenCache;
  });
}

function lijstRoutes() {
  var p = paneel();
  p.appendChild(el('h2', { text: 'Routes' }));
  p.appendChild(el('p', { class: 'uitleg', text: 'Laad een route uit een GPX-bestand, bijvoorbeeld de download bij een wandelroute op natuurmonumenten.nl. Lange routes worden vereenvoudigd (hoogstens ' + MAX_ROUTEPUNTEN + ' punten). Koppel eventueel het kennisbankfeit met de beschrijving van de route.' }));
  p.appendChild(el('button', { class: 'btn primair', text: '+ Route uit GPX', onclick: function() { bewerkRoute(null); } }));
  var lijst = el('div', { class: 'bk-lijst', style: 'margin-top:12px' });
  if (!toestand.data.routes.length) lijst.appendChild(el('p', { class: 'leeg', text: 'Nog geen routes.' }));
  toestand.data.routes.forEach(function(r) {
    var rij = el('button', { class: 'bk-rij', type: 'button', html: '<span class="bk-stip" style="background:#8A5A2E">R</span><span style="flex:1"><b></b><span></span></span>' });
    rij.querySelector('b').textContent = r.naam + (r.zichtbaarheid === 'intern' ? ' (intern)' : '');
    rij.querySelector('span span').textContent = String(r.lengteKm).replace('.', ',') + ' km · ' + dgTitel(r.deelgebied) + ' · ' + r.punten.length + ' punten';
    rij.onclick = function() { bewerkRoute(r); };
    lijst.appendChild(rij);
  });
  p.appendChild(lijst);
}

function bewerkRoute(r) {
  var L = window.L;
  var nieuw = !r;
  r = r || { deelgebied: 'heel', zichtbaarheid: 'openbaar', bron: 'GPX van natuurmonumenten.nl' };
  var punten = r.punten || null;
  var p = paneel();
  p.appendChild(el('h2', { text: nieuw ? 'Nieuwe route' : r.naam }));
  var f = el('div', { class: 'form' });
  var bestand = el('input', { type: 'file', accept: '.gpx,application/gpx+xml,application/xml' });
  var status = el('div', { class: 'hint' });
  var naam = el('input'); naam.value = r.naam || '';
  var dg = keuze(OV.deelgebieden, r.deelgebied);
  var zicht = keuze([{ slug: 'openbaar', titel: 'Openbaar (iedereen)' }, { slug: 'intern', titel: 'Intern (alleen ingelogd)' }], r.zichtbaarheid);
  var bron = el('input'); bron.value = r.bron || '';
  var bronUrl = el('input', { placeholder: 'https://www.natuurmonumenten.nl/…' }); bronUrl.value = r.bronUrl || '';
  var feit = keuze([{ slug: '', titel: '— geen —' }], '');
  routeFeiten().then(function(lijst) {
    lijst.forEach(function(x) { var o = el('option', { value: x.id, text: x.tekst.slice(0, 90) }); if (x.id === r.feitId) o.selected = true; feit.appendChild(o); });
  }).catch(function() {});
  function toonLijn() {
    if (!punten) return;
    var lijn = L.polyline(punten, { color: '#C8511F', weight: 5 });
    toonTijdelijk(lijn);
    toestand.kaart.fitBounds(lijn.getBounds(), { padding: [30, 30] });
  }
  bestand.onchange = function() {
    leesBestand(bestand).then(function(t) {
      var g = leesGpx(t);
      punten = vereenvoudig(g.punten, MAX_ROUTEPUNTEN);
      if (!naam.value && g.naam) naam.value = g.naam;
      status.textContent = g.punten.length + ' punten gelezen' + (punten.length < g.punten.length ? ', vereenvoudigd tot ' + punten.length : '') + '. Controleer de lijn op de kaart.';
      toonLijn();
    }).catch(function(e) { status.textContent = e.message; });
  };
  f.appendChild(veld(nieuw ? 'GPX-bestand' : 'Ander GPX-bestand (optioneel)', bestand));
  f.appendChild(status);
  f.appendChild(veld('Naam', naam));
  f.appendChild(el('div', { class: 'rij' }, [veld('Deelgebied', dg), veld('Zichtbaarheid', zicht)]));
  f.appendChild(el('div', { class: 'rij' }, [veld('Bron', bron), veld('Link naar de route (optioneel)', bronUrl)]));
  f.appendChild(veld('Beschrijving uit de kennisbank (optioneel)', feit, 'Kies het feit (onderwerp Plekken & routes) dat deze route beschrijft; dat wordt in de app bij de route getoond.'));
  var opslaan = el('button', { class: 'btn primair', text: 'Opslaan (= gecontroleerd)' });
  opslaan.onclick = function() {
    if (!punten) { melding('Kies eerst een GPX-bestand', true); return; }
    opslaan.disabled = true;
    var w = { naam: naam.value, deelgebied: dg.value, zichtbaarheid: zicht.value, bron: bron.value, bronUrl: bronUrl.value, feitId: feit.value, punten: punten };
    if (!nieuw) w.id = r.id;
    api('route-opslaan', { route: w }).then(function(x) { melding('Route opgeslagen (' + String(x.route.lengteKm).replace('.', ',') + ' km)'); return herlaad('routes'); })
      .catch(function(e) { opslaan.disabled = false; fout(e); });
  };
  var acties = el('div', { class: 'acties' }, [opslaan, el('button', { class: 'btn secundair', text: 'Annuleren', onclick: function() { kiesModus('routes'); } })]);
  if (!nieuw) acties.appendChild(el('button', { class: 'btn gevaar', text: 'Verwijderen', onclick: function() {
    if (!confirm('Route "' + r.naam + '" verwijderen?')) return;
    api('route-verwijderen', { id: r.id }).then(function() { melding('Verwijderd'); return herlaad('routes'); }).catch(fout);
  } }));
  f.appendChild(acties);
  p.appendChild(f);
  toonLijn();
}

// ------------------------------------------------ deelgebieden
function lijstGebieden() {
  var p = paneel();
  p.appendChild(el('h2', { text: 'Deelgebieden' }));
  p.appendChild(el('p', { class: 'uitleg', text: 'Per deelgebied: waar de naam op de kaart staat, de grens (GeoJSON, bijvoorbeeld uit de GIS van Natuurmonumenten; RD-coördinaten worden omgerekend), een korte beschrijving voor het tabblad Gebieden en eventueel een foto.' }));
  var lijst = el('div', { class: 'bk-lijst' });
  OV.deelgebieden.forEach(function(dg) {
    if (dg.slug === 'heel') return;
    var cfg = toestand.data.gebieden[dg.slug] || {};
    var delen = [];
    delen.push(cfg.lat ? 'label' : 'geen label');
    delen.push(toestand.data.grenzen[dg.slug] ? 'grens' : 'geen grens');
    if (cfg.beschrijving) delen.push('beschrijving');
    if (cfg.foto) delen.push('foto');
    var rij = el('button', { class: 'bk-rij', type: 'button', html: '<span style="flex:1"><b></b><span></span></span>' });
    rij.querySelector('b').textContent = dg.titel;
    rij.querySelector('span span').textContent = delen.join(' · ');
    rij.onclick = function() { bewerkGebied(dg.slug); };
    lijst.appendChild(rij);
  });
  p.appendChild(lijst);
}

function bewerkGebied(slug) {
  var L = window.L;
  var cfg = toestand.data.gebieden[slug] || {};
  var grens = toestand.data.grenzen[slug] || null;
  var grensGewijzigd = false;
  var p = paneel();
  p.appendChild(el('h2', { text: dgTitel(slug) }));
  var f = el('div', { class: 'form' });
  var beschrijving = el('textarea', { maxlength: '200', style: 'min-height:60px', placeholder: 'Leeg = eerste zin van een landschapsfeit uit de kennisbank' }); beschrijving.value = cfg.beschrijving || '';
  var lat = el('input', { inputmode: 'decimal' }); lat.value = cfg.lat || '';
  var lon = el('input', { inputmode: 'decimal' }); lon.value = cfg.lon || '';
  var foto = el('input', { placeholder: 'https://… (alleen een foto die je mag gebruiken)' }); foto.value = cfg.foto || '';
  var fotoBron = el('input', { placeholder: 'Bijv. Natuurmonumenten / naam fotograaf' }); fotoBron.value = cfg.fotoBron || '';
  var bestand = el('input', { type: 'file', accept: '.geojson,.json,application/geo+json,application/json' });
  var grensStatus = el('div', { class: 'hint' });
  function toonGrens() {
    wisTijdelijk();
    var n = grens ? grens.reduce(function(t, r) { return t + r.length; }, 0) : 0;
    grensStatus.textContent = grens ? 'Grens: ' + grens.length + ' vlak(ken), ' + n + ' punten' + (grensGewijzigd ? ' (nog niet opgeslagen)' : '') : 'Geen grens' + (grensGewijzigd ? ' (nog niet opgeslagen)' : '');
    if (grens) {
      var poly = L.polygon(grens.map(function(r) { return [r]; }), { color: '#C8511F', weight: 3, fillOpacity: 0.1 });
      toonTijdelijk(poly);
      toestand.kaart.fitBounds(poly.getBounds(), { padding: [30, 30] });
    }
  }
  bestand.onchange = function() {
    leesBestand(bestand).then(function(t) { grens = leesGeoJson(t); grensGewijzigd = true; toonGrens(); })
      .catch(function(e) { grensStatus.textContent = e.message; });
  };
  f.appendChild(veld('Korte beschrijving (tabblad Gebieden)', beschrijving, 'Hoogstens 200 tekens.'));
  f.appendChild(el('label', { text: 'Naam op de kaart (label)' }));
  f.appendChild(el('div', { class: 'coord' }, [el('div', null, [lat]), el('div', null, [lon]),
    el('button', { class: 'btn secundair klein', type: 'button', text: 'Kies op de kaart', onclick: function() {
      startKiezen('Klik waar de naam van ' + dgTitel(slug) + ' op de kaart moet staan.', function(ll) { lat.value = ll.lat.toFixed(6); lon.value = ll.lng.toFixed(6); stopKiezen(); });
    } })]));
  f.appendChild(veld('Grens (GeoJSON-bestand)', bestand));
  f.appendChild(grensStatus);
  f.appendChild(el('div', { class: 'acties', style: 'margin-top:6px' }, [el('button', { class: 'btn gevaar klein', type: 'button', text: 'Grens weghalen', onclick: function() { grens = null; grensGewijzigd = true; toonGrens(); } })]));
  f.appendChild(el('div', { class: 'rij' }, [veld('Foto (optioneel)', foto), veld('Foto van (verplicht bij een foto)', fotoBron)]));
  var opslaan = el('button', { class: 'btn primair', text: 'Opslaan' });
  opslaan.onclick = function() {
    opslaan.disabled = true;
    var g = { beschrijving: beschrijving.value, foto: foto.value, fotoBron: fotoBron.value,
      lat: lat.value ? parseFloat(String(lat.value).replace(',', '.')) : null, lon: lon.value ? parseFloat(String(lon.value).replace(',', '.')) : null };
    if (grensGewijzigd) g.grens = grens;
    api('gebied-opslaan', { slug: slug, gebied: g }).then(function() { melding('Opgeslagen'); return herlaad('gebieden'); })
      .catch(function(e) { opslaan.disabled = false; fout(e); });
  };
  f.appendChild(el('div', { class: 'acties' }, [opslaan, el('button', { class: 'btn secundair', text: 'Annuleren', onclick: function() { kiesModus('gebieden'); } })]));
  p.appendChild(f);
  toonGrens();
}

// ------------------------------------------------ opbouw
window.tabKaart = function(inhoud) {
  Promise.all([laadLeaflet(), api('kaart')]).then(function(r) {
    var L = r[0];
    toestand.data = r[1];
    feitenCache = null;
    inhoud.innerHTML = '';
    inhoud.appendChild(el('h1', { text: 'Kaart en plekken' }));
    inhoud.appendChild(el('p', { class: 'intro', text: 'Wat hier staat, verschijnt op de kaart in de app, bij de gebieden en in antwoorden. Opslaan geldt als controle van de ligging (datum van vandaag).' }));
    var seg = el('div', { class: 'bk-segment' });
    [['plekken', 'Plekken (' + toestand.data.plekken.length + ')'], ['routes', 'Routes (' + toestand.data.routes.length + ')'], ['gebieden', 'Deelgebieden']].forEach(function(m) {
      seg.appendChild(el('button', { type: 'button', 'data-m': m[0], 'aria-pressed': 'false', text: m[1], onclick: function() { kiesModus(m[0]); } }));
    });
    var ondergrond = el('button', { type: 'button', 'aria-pressed': 'false', text: 'Luchtfoto' });
    seg.appendChild(ondergrond);
    inhoud.appendChild(seg);
    var kaartVak = el('div', { class: 'bk-kaart', id: 'bkKaart' }, [el('div', { class: 'bk-tip', id: 'bkTip', hidden: 'hidden' })]);
    var indeling = el('div', { class: 'bk-indeling' }, [el('div', { class: 'section', style: 'padding:10px' }, [kaartVak]), el('div', { class: 'section', id: 'bkPaneel' })]);
    inhoud.appendChild(indeling);
    var m = toestand.data.midden || { lat: 52.04, lon: 5.77, zoom: 12 };
    var k = L.map(kaartVak, { minZoom: 9, maxZoom: 19 }).setView([m.lat, m.lon], m.zoom);
    k.attributionControl.setPrefix(false);
    var basis = L.tileLayer(PDOK, { maxZoom: 19, maxNativeZoom: 19, attribution: 'Kaart: Kadaster / PDOK' }).addTo(k);
    ondergrond.onclick = function() {
      var lucht = ondergrond.getAttribute('aria-pressed') !== 'true';
      ondergrond.setAttribute('aria-pressed', lucht ? 'true' : 'false');
      k.removeLayer(basis);
      basis = L.tileLayer(lucht ? LUCHTFOTO : PDOK, { maxZoom: 19, maxNativeZoom: 19, attribution: lucht ? 'Luchtfoto: Beeldmateriaal Nederland / PDOK' : 'Kaart: Kadaster / PDOK' }).addTo(k);
      basis.bringToBack();
    };
    k.on('click', function(e) { if (toestand.kiesBij) toestand.kiesBij(e.latlng); });
    toestand.kaart = k;
    toestand.lagen = null;
    toestand.tijdelijk = null;
    kiesModus('plekken');
    var alles = L.featureGroup();
    toestand.data.plekken.forEach(function(p) { L.marker([p.lat, p.lon]).addTo(alles); });
    toestand.data.routes.forEach(function(x) { L.polyline(x.punten).addTo(alles); });
    if (alles.getLayers().length) k.fitBounds(alles.getBounds(), { padding: [30, 30], maxZoom: 15 });
  }).catch(fout);
};

// Voor tests
window.__bkGeo = { vereenvoudig: vereenvoudig, rdNaarWgs: rdNaarWgs, leesGpx: leesGpx, leesGeoJson: leesGeoJson };
})();
