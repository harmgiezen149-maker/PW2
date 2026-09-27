// Kalender: per maand wat er in het gebied speelt en wat je bezoekers kunt vertellen:
// flora en fauna, activiteiten, beheer en onderhoud (zoals blessen of een schaapskudde).
// Alles komt uit de gecontroleerde kennisbank; de beheerder vult de kalender in het beheerpaneel.
(function() {
var K_KALENDER = 'pw_kalender';
var KLEUR = { natuur: '#3F7A4E', activiteit: '#2256A0', beheer: '#8A5A2E', overig: '#6B7280' };
var KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
var data = PW.opslag.leesJSON(K_KALENDER, null);
var laadFout = false;
var keuze = { maand: null, categorie: 'alles' };   // maand = 'jjjj-mm'

function sleutel(m) { return m.jaar + '-' + String(m.maand).padStart(2, '0'); }

function laad() {
  return PW.api('/api/gebied', { actie: 'kalender' }).then(function(d) {
    data = d; laadFout = false;
    PW.opslag.schrijfJSON(K_KALENDER, d);
    return d;
  }).catch(function() { laadFout = true; return data; });
}

// "Elk jaar · aug – sep" of "12 okt" of "3 – 17 okt"
function wanneer(it) {
  if (it.type === 'seizoen') {
    var ms = (it.maanden || []).slice().sort(function(a, b) { return a - b; });
    var reeksen = [], begin = null, vorige = null;
    ms.forEach(function(m) {
      if (begin === null) { begin = m; vorige = m; return; }
      if (m === vorige + 1) { vorige = m; return; }
      reeksen.push([begin, vorige]); begin = m; vorige = m;
    });
    if (begin !== null) reeksen.push([begin, vorige]);
    if (ms.length === 12) return 'Het hele jaar';
    return 'Elk jaar · ' + reeksen.map(function(r) { return r[0] === r[1] ? KORT[r[0] - 1] : KORT[r[0] - 1] + ' – ' + KORT[r[1] - 1]; }).join(', ');
  }
  var eind = it.einddatum, start = it.startdatum;
  function dag(iso) { var d = new Date(iso + 'T12:00:00'); return d.getDate() + ' ' + KORT[d.getMonth()]; }
  if (!start) return 't/m ' + dag(eind);
  if (start === eind) return new Date(start + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
  return dag(start) + ' – ' + dag(eind);
}

function nuBezig(it) {
  if (it.type !== 'tijdelijk') return false;
  var vandaag = new Date().toISOString().slice(0, 10);
  return (!it.startdatum || it.startdatum <= vandaag) && it.einddatum >= vandaag;
}

function itemKaart(it) {
  var cat = (data.categorieen || []).filter(function(c) { return c.slug === it.categorie; })[0] || { titel: 'Overig' };
  var kop = PW.el('div', { class: 'melding-kop' }, [
    PW.el('span', { class: 'kal-cat', style: 'color:' + (KLEUR[it.categorie] || KLEUR.overig), html: '<span class="kal-stip" style="background:' + (KLEUR[it.categorie] || KLEUR.overig) + '"></span>' + PW.esc(cat.titel) }),
    PW.el('span', { class: 'kal-wanneer', tekst: wanneer(it) })
  ]);
  if (nuBezig(it)) kop.appendChild(PW.el('span', { class: 'label label-tijdelijk', tekst: 'Nu' }));
  if (it.intern) kop.appendChild(PW.el('span', { class: 'label label-intern', html: PW.icoon('slot', { maat: 12, dikte: 2.4 }) + 'Intern' }));
  var inhoud = [kop];
  if (it.titel) inhoud.push(PW.el('h3', { class: 'kal-titel', tekst: it.titel }));
  var foto = PW.feitFoto(it); if (foto) inhoud.push(foto);
  inhoud.push(PW.el('p', { class: 'melding-tekst', tekst: it.tekst }));
  var voet = PW.el('div', { class: 'feit-voet' });
  if (it.deelgebiedTitel && it.deelgebied !== 'heel') voet.appendChild(PW.el('span', { class: 'melding-plek', tekst: it.deelgebiedTitel + ' ·' }));
  voet.appendChild(PW.el('span', { class: it.verouderd ? 'gecontroleerd verouderd' : 'gecontroleerd',
    html: PW.icoon(it.verouderd ? 'waarschuwing' : 'vinkje', { maat: 15, dikte: 2.4 }) + (it.verouderd ? 'Mogelijk verouderd · gecontroleerd ' : 'Gecontroleerd ') + PW.nlDatumKort(it.gecontroleerdOp) }));
  if (it.bron) {
    var bron = PW.el('span', { class: 'feit-bron' }, ['· ']);
    if (it.bronUrl) bron.appendChild(PW.el('a', { href: it.bronUrl, target: '_blank', rel: 'noopener', tekst: it.bron }));
    else bron.appendChild(document.createTextNode(it.bron));
    voet.appendChild(bron);
  }
  if (PW.kaartLink && it.plekId) voet.appendChild(PW.kaartLink(it));
  inhoud.push(voet);
  return PW.el('article', { class: 'kaart melding kal-item', 'data-cat': it.categorie }, inhoud);
}

function toon(param) {
  var box = document.getElementById('kalenderInhoud');
  if (param && /^\d{4}-\d{2}$/.test(param)) keuze.maand = param;
  teken(box);
  laad().then(function() { if (PW.huidigeView === 'kalender') teken(box); });
}

function teken(box) {
  box.innerHTML = '';
  if (!data || !data.maanden) {
    box.appendChild(PW.el('p', { class: 'leeg', tekst: laadFout ? 'De kalender kon niet worden geladen. Controleer je verbinding.' : 'Laden…' }));
    return;
  }
  var maanden = data.maanden;
  var i = 0;
  maanden.forEach(function(m, j) { if (sleutel(m) === keuze.maand) i = j; });
  var m = maanden[i];
  keuze.maand = sleutel(m);

  // Maand kiezen: pijltjes en een rij met de twaalf maanden
  var vorige = PW.el('button', { type: 'button', class: 'kal-pijl', 'aria-label': 'Vorige maand', html: PW.icoon('terug', { maat: 22, dikte: 2.4 }) });
  var volgende = PW.el('button', { type: 'button', class: 'kal-pijl kal-pijl-rechts', 'aria-label': 'Volgende maand', html: PW.icoon('terug', { maat: 22, dikte: 2.4 }) });
  vorige.disabled = i === 0; volgende.disabled = i === maanden.length - 1;
  vorige.onclick = function() { keuze.maand = sleutel(maanden[i - 1]); teken(box); };
  volgende.onclick = function() { keuze.maand = sleutel(maanden[i + 1]); teken(box); };
  var naam = m.naam.charAt(0).toUpperCase() + m.naam.slice(1) + ' ' + m.jaar;
  box.appendChild(PW.el('div', { class: 'kal-kop' }, [vorige, PW.el('h2', { class: 'kal-maand', tekst: naam }), volgende]));
  var rij = PW.el('div', { class: 'kal-maanden', role: 'tablist', 'aria-label': 'Maanden' });
  maanden.forEach(function(x, j) {
    var b = PW.el('button', { type: 'button', role: 'tab', 'aria-selected': j === i ? 'true' : 'false',
      html: '<b>' + KORT[x.maand - 1] + '</b><span>' + (x.ids.length || '·') + '</span>' });
    if (x.maand === 1 && j > 0) b.classList.add('kal-nieuwjaar');
    b.onclick = function() { keuze.maand = sleutel(x); teken(box); };
    rij.appendChild(b);
  });
  box.appendChild(rij);
  setTimeout(function() { var a = rij.querySelector('[aria-selected="true"]'); if (a) rij.scrollLeft = a.offsetLeft - rij.clientWidth / 2 + a.clientWidth / 2; }, 0);

  if (laadFout) box.appendChild(PW.el('p', { class: 'stand', tekst: 'Geen verbinding. Laatst geladen: ' + new Date(data.bijgewerkt).toLocaleString('nl-NL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) }));

  // Filter per categorie
  var items = m.ids.map(function(id) { return data.items[id]; }).filter(Boolean);
  var filter = PW.el('div', { class: 'kal-filter' });
  [{ slug: 'alles', titel: 'Alles' }].concat(data.categorieen || []).forEach(function(c) {
    var n = c.slug === 'alles' ? items.length : items.filter(function(x) { return x.categorie === c.slug; }).length;
    if (c.slug !== 'alles' && !n) return;
    var b = PW.el('button', { type: 'button', class: 'laag-knop', 'aria-pressed': keuze.categorie === c.slug ? 'true' : 'false', tekst: c.titel + ' (' + n + ')' });
    b.onclick = function() { keuze.categorie = c.slug; teken(box); };
    filter.appendChild(b);
  });
  if (items.length) box.appendChild(filter);
  var zicht = items.filter(function(x) { return keuze.categorie === 'alles' || x.categorie === keuze.categorie; });
  if (!zicht.length && keuze.categorie !== 'alles') { keuze.categorie = 'alles'; zicht = items; }
  if (!items.length) {
    box.appendChild(PW.el('p', { class: 'leeg', tekst: 'Voor ' + m.naam + ' staat nog niets in de kalender.' }));
  }
  zicht.forEach(function(it) { box.appendChild(itemKaart(it)); });
  box.appendChild(PW.el('button', { type: 'button', class: 'knop vraag-gebied', html: PW.icoon('chat', { maat: 22 }) + 'Vraag de assistent over ' + m.naam,
    onclick: function() { PW.vulVraag('Wat is er in ' + m.naam + ' in het gebied te zien en te doen? '); } }));
}

document.getElementById('view-kalender').innerHTML = '<div class="view-scroll"><div class="view-inhoud" id="kalenderInhoud"></div></div>';
PW.registreerView('kalender', { kop: 'Kalender', tabblad: { titel: 'Kalender', icoon: 'kalender', volgorde: 3.5 }, toon: toon });
PW.op('login', function() { data = null; if (PW.huidigeView === 'kalender') toon(); });
})();
