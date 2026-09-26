// Kaart: Planken Wambuis met de plekken, routes en deelgebieden die een beheerder heeft
// vastgelegd en gecontroleerd. De informatie bij een plek komt uit de kennisbank.
// Ondergrond: PDOK (Kadaster), kaart of luchtfoto. Leaflet wordt pas geladen als er een
// kaart nodig is. Gevoelige plekken (wolven, nesten, rustgebieden) staan nooit op de kaart.
(function() {
var MIDDEN = { lat: 52.04, lon: 5.77, zoom: 12 };
var ONDERGROND = {
  kaart: { url: 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png',
    attr: 'Kaart: <a href="https://www.kadaster.nl" target="_blank" rel="noopener">Kadaster</a> / <a href="https://www.pdok.nl" target="_blank" rel="noopener">PDOK</a>' },
  luchtfoto: { url: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857/{z}/{x}/{y}.jpeg',
    attr: 'Luchtfoto: <a href="https://www.beeldmateriaal.nl" target="_blank" rel="noopener">Beeldmateriaal Nederland</a> / <a href="https://www.pdok.nl" target="_blank" rel="noopener">PDOK</a>' }
};
// Lagen (knoppen boven de kaart); plekken met een lopend tijdelijk feit horen ook bij Afsluitingen
var LAGEN = [
  { id: 'routes', titel: 'Routes' },
  { id: 'parkeren', titel: 'Parkeren', soorten: ['parkeren'] },
  { id: 'uitkijk', titel: 'Uitkijkposten', soorten: ['uitkijk'] },
  { id: 'afsluitingen', titel: 'Afsluitingen' },
  { id: 'overig', titel: 'Overig', soorten: ['ingang', 'bezoekerscentrum', 'horeca', 'voorziening', 'overig'] }
];
var ROUTEKLEUR = '#8A5A2E';

// ============================================================
// Leaflet en gegevens laden
// ============================================================
var leafletBelofte = null;
PW.laadLeaflet = function() {
  if (window.L) return Promise.resolve(window.L);
  if (!leafletBelofte) {
    leafletBelofte = new Promise(function(ok, fout) {
      var css = PW.el('link', { rel: 'stylesheet', href: '/assets/leaflet/leaflet.css' });
      document.head.appendChild(css);
      var s = PW.el('script', { src: '/assets/leaflet/leaflet.js' });
      s.onload = function() { ok(window.L); };
      s.onerror = function() { leafletBelofte = null; fout(new Error('De kaart kon niet worden geladen.')); };
      document.head.appendChild(s);
    });
  }
  return leafletBelofte;
};

var data = PW.opslag.leesJSON('pw_kaart', null);
var dataBelofte = null;
function laadData(vers) {
  if (dataBelofte && !vers) return dataBelofte;
  dataBelofte = PW.api('/api/gebied', { actie: 'kaart' }).then(function(d) {
    data = d;
    PW.opslag.schrijfJSON('pw_kaart', d);
    return d;
  }).catch(function(e) {
    dataBelofte = null;
    if (data) { data.offline = true; return data; }
    throw e;
  });
  return dataBelofte;
}
PW.op('login', function() { dataBelofte = null; if (PW.huidigeView === 'kaart') toonKaart(huidigeParam); });

// ============================================================
// Tekens op de kaart
// ============================================================
var VERREKIJKER = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="15" r="4"/><circle cx="17" cy="15" r="4"/><path d="M11 15h2M5 11l2-6h2l1 6M19 11l-2-6h-2l-1 6"/></svg>';
function tekenHtml(soort) {
  if (soort === 'parkeren') return { kleur: '#2256A0', inhoud: '<b>P</b>' };
  if (soort === 'uitkijk') return { kleur: '#2D6A45', inhoud: VERREKIJKER };
  if (soort === 'bezoekerscentrum') return { kleur: '#1D2856', inhoud: '<b>i</b>' };
  if (soort === 'ingang') return { kleur: '#1D2856', inhoud: PW.icoon('route', { maat: 15, kleur: '#FFFFFF', dikte: 2.4 }) };
  if (soort === 'horeca') return { kleur: '#5B524B', inhoud: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 8h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2"/></svg>' };
  return { kleur: '#5B524B', inhoud: '<span class="teken-stip"></span>' };
}

function plekIcoon(L, p, gekozen) {
  var t = tekenHtml(p.soort);
  var maat = gekozen ? 40 : 32;
  var html = '<span class="teken' + (gekozen ? ' gekozen' : '') + '" style="background:' + t.kleur + '">' + t.inhoud +
    (p.tijdelijk ? '<span class="teken-let-op" title="Tijdelijke afsluiting of melding">!</span>' : '') + '</span>';
  return L.divIcon({ className: 'teken-houder', html: html, iconSize: [maat, maat], iconAnchor: [maat / 2, maat / 2] });
}

function laagVan(p) {
  for (var i = 0; i < LAGEN.length; i++) if (LAGEN[i].soorten && LAGEN[i].soorten.indexOf(p.soort) >= 0) return LAGEN[i].id;
  return 'overig';
}

// Plekken, routes, grenzen en labels op een Leaflet-kaart zetten.
// opties: { filter: functie(item, soort) -> bool, bijKlik: functie(soort, item), gekozen: { soort, id } }
function tekenGegevens(L, map, d, opties) {
  opties = opties || {};
  var groep = L.featureGroup().addTo(map);
  var items = { plekken: {}, routes: {}, grenzen: [] };
  (d.gebieden || []).forEach(function(g) {
    if (opties.filter && !opties.filter(g, 'gebied')) return;
    if (g.grens) {
      var poly = L.polygon(g.grens, { color: '#2256A0', weight: 2, fillColor: '#2256A0', fillOpacity: 0.07, interactive: false }).addTo(groep);
      items.grenzen.push(poly);
    }
    if (g.lat && g.lon) {
      L.marker([g.lat, g.lon], { interactive: false, keyboard: false,
        icon: L.divIcon({ className: 'gebied-label', html: '<span>' + PW.esc(g.titel) + '</span>', iconSize: [140, 36], iconAnchor: [70, 18] }) }).addTo(groep);
    }
  });
  (d.routes || []).forEach(function(r) {
    if (opties.filter && !opties.filter(r, 'route')) return;
    var gekozen = opties.gekozen && opties.gekozen.soort === 'route' && opties.gekozen.id === r.id;
    var lijn = L.polyline(r.punten, { color: ROUTEKLEUR, weight: gekozen ? 6 : 4, opacity: 0.9, dashArray: gekozen ? null : '8 6' }).addTo(groep);
    // Bredere, onzichtbare lijn eronder zodat de route makkelijk aan te tikken is
    var tik = L.polyline(r.punten, { color: '#000', weight: 18, opacity: 0 }).addTo(groep);
    if (opties.bijKlik) { lijn.on('click', function() { opties.bijKlik('route', r); }); tik.on('click', function() { opties.bijKlik('route', r); }); }
    items.routes[r.id] = lijn;
  });
  (d.plekken || []).forEach(function(p) {
    if (opties.filter && !opties.filter(p, 'plek')) return;
    var gekozen = opties.gekozen && opties.gekozen.soort === 'plek' && opties.gekozen.id === p.id;
    var m = L.marker([p.lat, p.lon], { icon: plekIcoon(L, p, gekozen), title: p.naam, alt: p.naam, riseOnHover: true, zIndexOffset: gekozen ? 1000 : 0 }).addTo(groep);
    if (opties.bijKlik) m.on('click', function() { opties.bijKlik('plek', p); });
    items.plekken[p.id] = m;
  });
  return { groep: groep, items: items };
}

function nieuweKaart(L, el, opties) {
  opties = opties || {};
  var map = L.map(el, Object.assign({ zoomControl: false, attributionControl: true, minZoom: 9, maxZoom: 19,
    maxBounds: [[51.8, 5.4], [52.3, 6.15]], maxBoundsViscosity: 0.8 }, opties.leaflet || {}));
  map.attributionControl.setPrefix(false);
  var laag = L.tileLayer(ONDERGROND[opties.ondergrond || 'kaart'].url, { maxZoom: 19, maxNativeZoom: 19, attribution: ONDERGROND[opties.ondergrond || 'kaart'].attr }).addTo(map);
  map._pwOndergrond = laag;
  map.setView([MIDDEN.lat, MIDDEN.lon], MIDDEN.zoom);
  return map;
}

function passend(map, groep, maxZoom) {
  var b = groep.getBounds();
  if (b.isValid()) map.fitBounds(b, { padding: [28, 28], maxZoom: maxZoom || 15 });
  else map.setView([MIDDEN.lat, MIDDEN.lon], MIDDEN.zoom);
}

function naarGoogle(lat, lon) {
  return 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lon;
}

// ============================================================
// Het tabblad Kaart
// ============================================================
var kaart = null;       // Leaflet-kaart van het tabblad
var getekend = null;    // { groep, items }
var aan = { routes: true, parkeren: true, uitkijk: true, afsluitingen: true, overig: true };
var gekozen = null;     // { soort, id }
var huidigeParam = null;
var ondergrond = 'kaart';
var locatieTeken = null;

function zichtbaar(item, soort) {
  if (soort === 'gebied') return true;
  if (soort === 'route') return aan.routes;
  if (gekozen && gekozen.soort === 'plek' && gekozen.id === item.id) return true;
  return aan[laagVan(item)] || (item.tijdelijk && aan.afsluitingen);
}

function herteken() {
  if (!kaart || !data) return;
  if (getekend) kaart.removeLayer(getekend.groep);
  getekend = tekenGegevens(window.L, kaart, data, { filter: zichtbaar, bijKlik: kies, gekozen: gekozen });
}

function bouwKnoppen() {
  var box = document.getElementById('kaartLagen');
  box.innerHTML = '';
  if (!data) return;
  var heeft = {
    routes: (data.routes || []).length > 0,
    afsluitingen: (data.plekken || []).some(function(p) { return p.tijdelijk; })
  };
  (data.plekken || []).forEach(function(p) { heeft[laagVan(p)] = true; });
  LAGEN.forEach(function(l) {
    if (!heeft[l.id]) return;
    var k = PW.el('button', { type: 'button', class: 'laag-knop', 'aria-pressed': aan[l.id] ? 'true' : 'false', tekst: l.titel });
    k.onclick = function() {
      aan[l.id] = !aan[l.id];
      k.setAttribute('aria-pressed', aan[l.id] ? 'true' : 'false');
      herteken();
    };
    box.appendChild(k);
  });
}

function sluitBlad() {
  document.getElementById('kaartBlad').hidden = true;
  if (gekozen) { gekozen = null; herteken(); }
}

function feitRegel(f) {
  var r = PW.el('div', { class: 'blad-feit' });
  if (f.type === 'tijdelijk') r.appendChild(PW.el('span', { class: 'label label-tijdelijk', tekst: 'Tijdelijk' + (f.einddatum ? ' t/m ' + PW.nlDatumKort(f.einddatum) : '') }));
  if (f.intern) r.appendChild(PW.el('span', { class: 'label label-intern', html: PW.icoon('slot', { maat: 12, dikte: 2.4 }) + 'Intern' }));
  r.appendChild(PW.el('p', { tekst: f.tekst }));
  var voet = PW.el('span', { class: f.verouderd ? 'gecontroleerd verouderd' : 'gecontroleerd',
    html: PW.icoon(f.verouderd ? 'waarschuwing' : 'vinkje', { maat: 15, dikte: 2.4 }) + (f.verouderd ? 'Mogelijk verouderd · gecontroleerd ' : 'Gecontroleerd ') + PW.nlDatumKort(f.gecontroleerdOp) });
  var regel = PW.el('div', { class: 'feit-voet' }, [voet]);
  if (f.bron) {
    var bron = PW.el('span', { class: 'feit-bron' }, ['Bron: ']);
    if (f.bronUrl) bron.appendChild(PW.el('a', { href: f.bronUrl, target: '_blank', rel: 'noopener', tekst: f.bron }));
    else bron.appendChild(document.createTextNode(f.bron));
    regel.appendChild(bron);
  }
  r.appendChild(regel);
  return r;
}

function kies(soort, item) {
  gekozen = { soort: soort, id: item.id };
  herteken();
  var blad = document.getElementById('kaartBlad');
  blad.innerHTML = '';
  blad.hidden = false;
  blad.appendChild(PW.el('button', { type: 'button', class: 'blad-dicht', 'aria-label': 'Sluiten', html: PW.icoon('sluiten', { maat: 20 }), onclick: sluitBlad }));
  var t = soort === 'plek' ? tekenHtml(item.soort) : { kleur: ROUTEKLEUR, inhoud: PW.icoon('route', { maat: 20, kleur: '#FFFFFF', dikte: 2.2 }) };
  var sub = soort === 'plek' ? item.soortTitel + ' · ' + item.deelgebiedTitel
    : 'Route · ' + String(item.lengteKm).replace('.', ',') + ' km · ' + item.deelgebiedTitel;
  blad.appendChild(PW.el('div', { class: 'blad-kop' }, [
    PW.el('span', { class: 'teken teken-groot', style: 'background:' + t.kleur, html: t.inhoud }),
    PW.el('div', {}, [PW.el('h2', { tekst: item.naam }), PW.el('div', { class: 'blad-sub', tekst: sub })])
  ]));
  var inhoud = PW.el('div', { class: 'blad-inhoud' });
  if (item.toelichting) inhoud.appendChild(PW.el('p', { class: 'blad-toelichting', tekst: item.toelichting }));
  var feiten = soort === 'plek' ? item.feiten : (item.feit ? [item.feit] : []);
  feiten.forEach(function(f) { inhoud.appendChild(feitRegel(f)); });
  if (!feiten.length) {
    inhoud.appendChild(PW.el('p', { class: 'blad-toelichting', tekst: soort === 'plek'
      ? 'Er staan nog geen feiten over deze plek in de kennisbank.'
      : (item.bron ? 'Bron: ' + item.bron : '') }));
  }
  if (soort === 'route' && item.bronUrl) inhoud.appendChild(PW.el('a', { href: item.bronUrl, target: '_blank', rel: 'noopener', class: 'melding-link', tekst: 'Route op ' + item.bronUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] + ' ›' }));
  inhoud.appendChild(PW.el('div', { class: 'gecontroleerd', html: PW.icoon('vinkje', { maat: 15, dikte: 2.4 }) + 'Ligging gecontroleerd ' + PW.nlDatumKort(item.gecontroleerdOp) }));
  blad.appendChild(inhoud);
  var doel = soort === 'plek' ? [item.lat, item.lon] : item.punten[0];
  blad.appendChild(PW.el('div', { class: 'blad-knoppen' }, [
    PW.el('button', { type: 'button', class: 'knop', tekst: 'Vraag de assistent', onclick: function() { PW.vulVraag('Over ' + item.naam + ': '); } }),
    PW.el('a', { class: 'knop knop-rand', href: naarGoogle(doel[0], doel[1]), target: '_blank', rel: 'noopener', tekst: soort === 'plek' ? 'Route erheen' : 'Naar het startpunt' })
  ]));
  // In beeld brengen boven het onderblad (op de telefoon bedekt dat de onderkant van de kaart)
  var laag = soort === 'plek' ? getekend.items.plekken[item.id] : getekend.items.routes[item.id];
  if (laag) {
    var smal = window.innerWidth < 768;
    var onder = smal ? blad.offsetHeight : 0;
    var rechts = smal ? 0 : blad.offsetWidth + 24;
    var boven = document.querySelector('.kaart-boven').offsetHeight + 12;
    if (soort === 'plek') {
      var zoom = Math.max(kaart.getZoom(), 15);
      var punt = kaart.project([item.lat, item.lon], zoom).add([rechts / 2, (onder - boven) / 2]);
      kaart.flyTo(kaart.unproject(punt, zoom), zoom, { duration: 0.6 });
    } else {
      kaart.flyToBounds(laag.getBounds(), { paddingTopLeft: [40, boven + 20], paddingBottomRight: [40 + rechts, 40 + onder], duration: 0.6 });
    }
  }
}

function zoek(term) {
  var lijst = document.getElementById('kaartZoekLijst');
  lijst.innerHTML = '';
  term = (term || '').trim().toLowerCase();
  if (!term || !data) { lijst.hidden = true; return; }
  var treffers = [];
  (data.plekken || []).forEach(function(p) {
    if ((p.naam + ' ' + p.soortTitel + ' ' + p.deelgebiedTitel).toLowerCase().indexOf(term) >= 0) treffers.push({ soort: 'plek', item: p, sub: p.soortTitel });
  });
  (data.routes || []).forEach(function(r) {
    if ((r.naam + ' route ' + r.deelgebiedTitel).toLowerCase().indexOf(term) >= 0) treffers.push({ soort: 'route', item: r, sub: 'Route · ' + String(r.lengteKm).replace('.', ',') + ' km' });
  });
  (data.gebieden || []).forEach(function(g) {
    if (g.titel.toLowerCase().indexOf(term) >= 0 && (g.grens || g.lat)) treffers.push({ soort: 'gebied', item: g, sub: 'Deelgebied' });
  });
  if (!treffers.length) lijst.appendChild(PW.el('li', { class: 'zoek-geen', tekst: 'Niets gevonden op de kaart.' }));
  treffers.slice(0, 8).forEach(function(t) {
    var knop = PW.el('button', { type: 'button', html: '<b>' + PW.esc(t.item.naam || t.item.titel) + '</b><span>' + PW.esc(t.sub) + '</span>' });
    knop.onclick = function() {
      lijst.hidden = true;
      document.getElementById('kaartZoek').value = '';
      document.getElementById('kaartZoek').blur();
      if (t.soort === 'gebied') toonGebiedOpKaart(t.item.slug); else kies(t.soort, t.item);
    };
    lijst.appendChild(PW.el('li', {}, [knop]));
  });
  lijst.hidden = false;
}

function toonGebiedOpKaart(slug) {
  var d = data;
  var groep = window.L.featureGroup();
  (d.gebieden || []).forEach(function(g) {
    if (g.slug !== slug) return;
    if (g.grens) window.L.polygon(g.grens).addTo(groep);
    else if (g.lat) window.L.marker([g.lat, g.lon]).addTo(groep);
  });
  (d.plekken || []).forEach(function(p) { if (p.deelgebied === slug) window.L.marker([p.lat, p.lon]).addTo(groep); });
  (d.routes || []).forEach(function(r) { if (r.deelgebied === slug) window.L.polyline(r.punten).addTo(groep); });
  passend(kaart, groep, 15);
}

function mijnLocatie() {
  if (!navigator.geolocation) { PW.toonFout('Je locatie is op dit apparaat niet beschikbaar.'); return; }
  navigator.geolocation.getCurrentPosition(function(pos) {
    var ll = [pos.coords.latitude, pos.coords.longitude];
    if (locatieTeken) kaart.removeLayer(locatieTeken);
    locatieTeken = window.L.circleMarker(ll, { radius: 8, color: '#FFFFFF', weight: 3, fillColor: '#2F6BC0', fillOpacity: 1 }).addTo(kaart);
    if (kaart.options.maxBounds && !kaart.options.maxBounds.contains(ll)) {
      toonMelding('Je bent niet in de buurt van Planken Wambuis.');
    } else {
      kaart.flyTo(ll, Math.max(kaart.getZoom(), 15), { duration: 0.6 });
    }
  }, function() {
    toonMelding('Je locatie kon niet worden bepaald. Sta locatie toe in je browser.');
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}

function toonMelding(tekst) {
  var m = document.getElementById('kaartMelding');
  m.textContent = tekst;
  m.hidden = false;
  clearTimeout(toonMelding.t);
  toonMelding.t = setTimeout(function() { m.hidden = true; }, 5000);
}

function wisselOndergrond() {
  ondergrond = ondergrond === 'kaart' ? 'luchtfoto' : 'kaart';
  var o = ONDERGROND[ondergrond];
  kaart.removeLayer(kaart._pwOndergrond);
  kaart._pwOndergrond = window.L.tileLayer(o.url, { maxZoom: 19, maxNativeZoom: 19, attribution: o.attr }).addTo(kaart);
  kaart._pwOndergrond.bringToBack();
  var k = document.getElementById('kaartOndergrond');
  k.setAttribute('aria-pressed', ondergrond === 'luchtfoto' ? 'true' : 'false');
  k.title = ondergrond === 'luchtfoto' ? 'Toon kaart' : 'Toon luchtfoto';
}

function bouwView() {
  var v = document.getElementById('view-kaart');
  v.innerHTML =
    '<div class="kaart-houder" id="kaartHouder" role="region" aria-label="Kaart van Planken Wambuis"></div>' +
    '<div class="kaart-boven">' +
      '<div class="kaart-zoek">' + PW.icoon('zoek', { maat: 20, kleur: '#555B63', dikte: 2.2 }) +
        '<label for="kaartZoek" class="sr-only">Zoek een plek of route</label>' +
        '<input id="kaartZoek" type="search" placeholder="Zoek een plek of route" autocomplete="off">' +
        '<ul class="kaart-zoeklijst" id="kaartZoekLijst" hidden></ul></div>' +
      '<div class="kaart-lagen" id="kaartLagen"></div>' +
    '</div>' +
    '<div class="kaart-knoppen">' +
      '<div class="kaart-zoom"><button type="button" id="kaartIn" aria-label="Inzoomen">+</button><button type="button" id="kaartUit" aria-label="Uitzoomen">−</button></div>' +
      '<button type="button" class="kaart-knop" id="kaartLocatie" aria-label="Mijn locatie" title="Mijn locatie">' + PW.icoon('locatie', { maat: 22, kleur: '#2256A0' }) + '</button>' +
      '<button type="button" class="kaart-knop" id="kaartOndergrond" aria-pressed="false" aria-label="Luchtfoto aan of uit" title="Toon luchtfoto">' + PW.icoon('lagen', { maat: 22, kleur: '#2256A0' }) + '</button>' +
    '</div>' +
    '<p class="kaart-melding" id="kaartMelding" role="status" hidden></p>' +
    '<div class="kaart-leeg kaart" id="kaartLeeg" hidden></div>' +
    '<section class="kaart-blad" id="kaartBlad" aria-label="Geselecteerde plek" hidden></section>';
  var zoekveld = document.getElementById('kaartZoek');
  zoekveld.addEventListener('input', function() { zoek(zoekveld.value); });
  zoekveld.addEventListener('keydown', function(e) { if (e.key === 'Escape') { zoekveld.value = ''; zoek(''); } });
  document.getElementById('kaartIn').onclick = function() { kaart && kaart.zoomIn(); };
  document.getElementById('kaartUit').onclick = function() { kaart && kaart.zoomOut(); };
  document.getElementById('kaartLocatie').onclick = function() { kaart && mijnLocatie(); };
  document.getElementById('kaartOndergrond').onclick = function() { kaart && wisselOndergrond(); };
}

function toonLeeg() {
  var leeg = document.getElementById('kaartLeeg');
  var niets = data && !(data.plekken || []).length && !(data.routes || []).length;
  leeg.hidden = !niets && !(data && data.offline);
  leeg.innerHTML = '';
  if (niets) {
    leeg.appendChild(PW.el('b', { tekst: 'Nog geen plekken op de kaart' }));
    leeg.appendChild(PW.el('p', { tekst: 'De beheerder zet parkeerplaatsen, uitkijkposten en routes op de kaart via het beheerpaneel. Alleen wat is gecontroleerd, verschijnt hier.' }));
  } else if (data && data.offline) {
    leeg.appendChild(PW.el('p', { tekst: 'Geen verbinding: je ziet de laatst geladen plekken. De kaartachtergrond kan ontbreken.' }));
  }
}

function toonKaart(param) {
  huidigeParam = param;
  if (!document.getElementById('kaartHouder')) bouwView();
  Promise.all([PW.laadLeaflet(), laadData()]).then(function(r) {
    var L = r[0];
    if (!kaart) kaart = nieuweKaart(L, document.getElementById('kaartHouder'));
    kaart.invalidateSize();
    kaart.off('click');
    kaart.on('click', function() { sluitBlad(); document.getElementById('kaartZoekLijst').hidden = true; });
    herteken();
    bouwKnoppen();
    toonLeeg();
    var delen = (param || '').split('/');
    if (delen[0] === 'plek' || delen[0] === 'route') {
      var lijst = delen[0] === 'plek' ? data.plekken : data.routes;
      var item = (lijst || []).find(function(x) { return x.id === delen[1]; });
      if (item) { setTimeout(function() { kies(delen[0], item); }, 50); return; }
      toonMelding('Deze plek staat niet (meer) op de kaart.');
    } else if (delen[0] === 'plekken') {
      var ids = (delen[1] || '').split(',');
      var groep = L.featureGroup();
      (data.plekken || []).forEach(function(p) { if (ids.indexOf(p.id) >= 0) L.marker([p.lat, p.lon]).addTo(groep); });
      passend(kaart, groep, 16);
      return;
    } else if (delen[0] === 'gebied') {
      toonGebiedOpKaart(delen[1]);
      return;
    }
    if (!kaart._pwGepast) { passend(kaart, getekend.groep, 14); kaart._pwGepast = true; }
  }).catch(function(e) {
    var leeg = document.getElementById('kaartLeeg');
    leeg.hidden = false;
    leeg.innerHTML = '';
    leeg.appendChild(PW.el('p', { tekst: e.message || 'De kaart kon niet worden geladen. Controleer je verbinding.' }));
  });
}

PW.registreerView('kaart', {
  kop: 'Kaart', tabblad: { titel: 'Kaart', icoon: 'kaart', volgorde: 2 },
  toon: function(param) { toonKaart(param); }
});

// ============================================================
// Kleine kaarten: in antwoorden en bij een gebied
// ============================================================
PW.kaartLink = function(item) {
  return PW.el('a', { href: '#kaart/plek/' + encodeURIComponent(item.plekId), class: 'melding-link', tekst: 'Op de kaart ›' });
};

function legenda(plekken) {
  var gezien = {};
  var box = PW.el('span', { class: 'mini-legenda' });
  plekken.forEach(function(p) {
    if (gezien[p.soort]) return;
    gezien[p.soort] = true;
    var t = tekenHtml(p.soort);
    box.appendChild(PW.el('span', { class: 'legenda-item', html: '<span class="legenda-stip" style="background:' + t.kleur + '"></span>' + PW.esc(p.soortTitel) }));
  });
  return box;
}

function miniKaart(L, el, d, filter, maxZoom) {
  var map = nieuweKaart(L, el, { leaflet: { dragging: false, touchZoom: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false } });
  var g = tekenGegevens(L, map, d, { filter: filter });
  passend(map, g.groep, maxZoom || 15);
  return map;
}

// Na een antwoord: gaat het over plekken met een locatie, dan een kaartje erbij
PW.op('antwoord', function(e) {
  var ids = [];
  (e.feiten || []).forEach(function(f) { if (f.plekId && ids.indexOf(f.plekId) < 0) ids.push(f.plekId); });
  if (!ids.length || !e.rendered) return;
  laadData().then(function(d) {
    var plekken = (d.plekken || []).filter(function(p) { return ids.indexOf(p.id) >= 0; });
    if (!plekken.length) return;
    return PW.laadLeaflet().then(function(L) {
      var vak = PW.el('div', { class: 'mini-kaart', role: 'img', 'aria-label': 'Kaartje met ' + plekken.map(function(p) { return p.naam; }).join(', ') });
      var link = plekken.length === 1 ? '#kaart/plek/' + plekken[0].id : '#kaart/plekken/' + plekken.map(function(p) { return p.id; }).join(',');
      var fig = PW.el('figure', { class: 'antwoord-kaart' }, [vak,
        PW.el('figcaption', {}, [legenda(plekken), PW.el('a', { href: link, tekst: 'Open op kaart ›' })])]);
      var voor = e.rendered.bronEl || e.rendered.kloptEl || e.rendered.scrollBtn;
      e.rendered.bub.insertBefore(fig, voor);
      miniKaart(L, vak, { plekken: plekken, routes: [], gebieden: [] }, null, 15);
    });
  }).catch(function() {});
});

// Tab "Op de kaart" bij een gebied
PW.kaartVoorGebied = function(box, g) {
  var vak = PW.el('div', { class: 'mini-kaart gebied-kaart' });
  box.appendChild(vak);
  var lijst = PW.el('div', { class: 'gebied-plekken' });
  box.appendChild(lijst);
  box.appendChild(PW.el('a', { class: 'knop knop-rand', href: '#kaart/gebied/' + g.slug, tekst: 'Open de grote kaart' }));
  Promise.all([PW.laadLeaflet(), laadData()]).then(function(r) {
    var L = r[0], d = r[1];
    var inGebied = function(x, soort) { return soort === 'gebied' ? x.slug === g.slug : x.deelgebied === g.slug; };
    var plekken = (d.plekken || []).filter(function(p) { return p.deelgebied === g.slug; });
    var routes = (d.routes || []).filter(function(x) { return x.deelgebied === g.slug; });
    var map = nieuweKaart(L, vak, { leaflet: { scrollWheelZoom: false } });
    var t = tekenGegevens(L, map, d, { filter: inGebied, bijKlik: function(soort, item) { PW.ga('#kaart/' + soort + '/' + item.id); } });
    passend(map, t.groep, 15);
    if (!plekken.length && !routes.length) {
      lijst.appendChild(PW.el('p', { class: 'leeg', tekst: 'Er staan nog geen plekken of routes van dit gebied op de kaart.' }));
    }
    plekken.concat(routes).forEach(function(x) {
      var isRoute = !!x.punten;
      lijst.appendChild(PW.el('a', { class: 'lijst-rij kaart', href: '#kaart/' + (isRoute ? 'route' : 'plek') + '/' + x.id, html:
        '<span class="lijst-tekst"><span class="lijst-titel">' + PW.esc(x.naam) + '</span><span class="lijst-uitleg">' +
        PW.esc(isRoute ? 'Route · ' + String(x.lengteKm).replace('.', ',') + ' km' : x.soortTitel) + '</span></span>' +
        PW.icoon('rechts', { maat: 18, kleur: '#8A9199', dikte: 2.2 }) }));
    });
  }).catch(function() {
    vak.remove();
    lijst.appendChild(PW.el('p', { class: 'leeg', tekst: 'De kaart kon niet worden geladen. Controleer je verbinding.' }));
  });
};
})();
