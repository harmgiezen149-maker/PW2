// Gebieden: de vijf deelgebieden van Planken Wambuis, met per gebied de gecontroleerde
// feiten en routes en een knop die de chat opent met het gebied al ingevuld.
(function() {
// Getekende miniaturen per gebied (tot er echte foto's zijn)
var MINIATUUR = {
  wolfheze: '<rect width="56" height="56" fill="#CFDCCB"/><path d="M0 38 Q20 30 36 36 T56 34 V56 H0z" fill="#8F7189"/><path d="M8 38 L16 16 L24 38z M28 38 L37 12 L46 38z" fill="#3F5A4B"/>',
  mossel: '<rect width="56" height="56" fill="#D6E0EA"/><path d="M0 30 Q22 22 38 30 T56 28 V56 H0z" fill="#E7DAB8"/><path d="M6 40 q8 -4 14 0 t14 0 t14 0" stroke="#C9B888" stroke-width="2" fill="none"/>',
  reemst: '<rect width="56" height="56" fill="#D2DEC9"/><path d="M0 36 H56 V56 H0z" fill="#A9BE8E"/><circle cx="16" cy="24" r="9" fill="#4E6B45"/><circle cx="36" cy="20" r="11" fill="#3F5A4B"/><path d="M16 33v5M36 31v7" stroke="#5B4632" stroke-width="2.5"/>',
  buunderkamp: '<rect width="56" height="56" fill="#D7DDE3"/><path d="M0 34 Q28 24 56 34 V56 H0z" fill="#9E8398"/><path d="M20 34 L28 14 L36 34z" fill="#3F5A4B"/>',
  'oude-hout': '<rect width="56" height="56" fill="#CBD9C5"/><circle cx="14" cy="22" r="10" fill="#4E6B45"/><circle cx="32" cy="18" r="12" fill="#3F5A4B"/><circle cx="46" cy="26" r="9" fill="#56744D"/><path d="M0 40 H56 V56 H0z" fill="#7E9A6E"/>'
};
var KLEUR = { wolfheze: '#8F7189', mossel: '#E7DAB8', reemst: '#A9BE8E', buunderkamp: '#9E8398', 'oude-hout': '#7E9A6E' };

function miniatuur(slug) {
  return '<svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">' + (MINIATUUR[slug] || MINIATUUR.wolfheze) + '</svg>';
}

function kopbeeld(g) {
  if (g.foto) {
    return '<img src="' + PW.esc(g.foto) + '" alt="' + PW.esc(g.titel) + '" loading="lazy">' +
      (g.fotoBron ? '<span class="beeld-bron">Foto: ' + PW.esc(g.fotoBron) + '</span>' : '');
  }
  var grond = KLEUR[g.slug] || '#8F7189';
  return '<svg width="100%" height="100%" viewBox="0 0 390 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
    '<rect width="390" height="150" fill="#BCCAD6"/><path d="M0 70 Q120 50 230 66 T390 60 V150 H0z" fill="#94A89D"/>' +
    '<path d="M20 110 L44 40 L68 110z M60 110 L90 24 L120 110z M280 110 L306 36 L332 110z M320 110 L350 20 L380 110z" fill="#3F5A4B"/>' +
    '<path d="M0 104 Q140 88 260 104 T390 100 V150 H0z" fill="' + grond + '"/></svg>' +
    '<span class="beeld-bron">Illustratie · foto volgt</span>';
}

function laad(sleutel, body) {
  return PW.api('/api/gebied', body).then(function(d) {
    PW.opslag.schrijfJSON(sleutel, d);
    return d;
  }).catch(function(e) {
    var oud = PW.opslag.leesJSON(sleutel, null);
    if (oud) { oud.offline = true; return oud; }
    throw e;
  });
}

function stand(d) {
  if (!d || !d.offline) return null;
  return PW.el('p', { class: 'stand', tekst: 'Geen verbinding. Laatst geladen: ' + new Date(d.bijgewerkt).toLocaleString('nl-NL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) });
}

// ============================================================
// Overzicht
// ============================================================
function toonOverzicht() {
  var box = document.getElementById('gebiedenInhoud');
  box.innerHTML = '';
  box.appendChild(PW.el('p', { class: 'intro', tekst: 'Planken Wambuis bestaat uit vijf deelgebieden. Tik op een gebied voor de gecontroleerde feiten en routes.' }));
  var lijst = PW.el('div', { class: 'gebied-lijst' }, [PW.el('p', { class: 'leeg', tekst: 'Laden…' })]);
  box.appendChild(lijst);
  laad('pw_gebieden', { actie: 'gebieden' }).then(function(d) {
    lijst.innerHTML = '';
    var s = stand(d); if (s) lijst.appendChild(s);
    d.gebieden.forEach(function(g) {
      var sub = g.beschrijving || (g.aantal ? g.aantal + (g.aantal === 1 ? ' gecontroleerd feit' : ' gecontroleerde feiten') : 'Nog geen feiten in de kennisbank');
      lijst.appendChild(PW.el('a', { class: 'kaart gebied-rij', href: '#gebied/' + g.slug, html:
        '<span class="gebied-mini">' + (g.foto ? '<img src="' + PW.esc(g.foto) + '" alt="">' : miniatuur(g.slug)) + '</span>' +
        '<span class="gebied-tekst"><span class="gebied-titel">' + PW.esc(g.titel) + '</span><span class="gebied-sub">' + PW.esc(sub) + '</span></span>' +
        PW.icoon('rechts', { maat: 20, kleur: '#8A9199', dikte: 2.2 }) }));
    });
    if (d.buurgebieden && d.buurgebieden.length) {
      var buur = PW.el('div', { class: 'buur' }, [PW.el('h2', { class: 'sectie-kop', tekst: 'Buurgebieden · ander beheer' })]);
      var chips = PW.el('div', { class: 'buur-chips' });
      d.buurgebieden.forEach(function(b) { chips.appendChild(PW.el('span', { class: 'buur-chip', tekst: b })); });
      buur.appendChild(chips);
      buur.appendChild(PW.el('p', { class: 'stand', tekst: 'Deze gebieden horen niet bij Planken Wambuis. De assistent verwijst voor details naar hun eigen beheerder.' }));
      lijst.appendChild(buur);
    }
  }).catch(function() {
    lijst.innerHTML = '';
    lijst.appendChild(PW.el('p', { class: 'leeg', tekst: 'De gebieden konden niet worden geladen. Controleer je verbinding.' }));
  });
}

// ============================================================
// Eén gebied
// ============================================================
var huidig = { slug: null, deel: 'feiten', data: null };

function feitKaart(f) {
  var kop = PW.el('div', { class: 'melding-kop' }, [PW.el('span', { class: 'onderwerp-label', tekst: f.onderwerpTitel })]);
  if (f.intern) kop.appendChild(PW.el('span', { class: 'label label-intern', html: PW.icoon('slot', { maat: 12, dikte: 2.4 }) + 'Intern' }));
  if (f.type === 'tijdelijk' && f.einddatum) kop.appendChild(PW.el('span', { class: 'label label-tijdelijk', tekst: 'Tijdelijk t/m ' + PW.nlDatumKort(f.einddatum) }));
  var voet = PW.el('div', { class: 'feit-voet' });
  voet.appendChild(PW.el('span', { class: f.verouderd ? 'gecontroleerd verouderd' : 'gecontroleerd',
    html: PW.icoon(f.verouderd ? 'waarschuwing' : 'vinkje', { maat: 15, dikte: 2.4 }) + (f.verouderd ? 'Mogelijk verouderd · gecontroleerd ' : 'Gecontroleerd ') + PW.nlDatumKort(f.gecontroleerdOp) }));
  if (f.bron) {
    var bron = PW.el('span', { class: 'feit-bron' }, ['· ']);
    if (f.bronUrl) bron.appendChild(PW.el('a', { href: f.bronUrl, target: '_blank', rel: 'noopener', tekst: f.bron }));
    else bron.appendChild(document.createTextNode(f.bron));
    voet.appendChild(bron);
  }
  var k = PW.el('article', { class: 'kaart melding' }, [kop, PW.feitFoto(f), PW.el('p', { class: 'melding-tekst', tekst: f.tekst }), voet]);
  if (PW.kaartLink && f.plekId) voet.appendChild(PW.kaartLink(f));
  return k;
}

function toonDeel() {
  var d = huidig.data;
  var box = document.getElementById('gebiedDeel');
  box.innerHTML = '';
  ['feiten', 'routes', 'kaart'].forEach(function(id) {
    var b = document.getElementById('gebiedSeg-' + id);
    if (b) b.setAttribute('aria-selected', huidig.deel === id ? 'true' : 'false');
  });
  if (!d) { box.appendChild(PW.el('p', { class: 'leeg', tekst: 'Laden…' })); return; }
  var s = stand(d); if (s) box.appendChild(s);
  if (huidig.deel === 'kaart' && PW.kaartVoorGebied) {
    PW.kaartVoorGebied(box, d);
  } else {
    var lijst = huidig.deel === 'routes' ? d.routes : d.feiten;
    if (d.beschrijving && huidig.deel === 'feiten') box.appendChild(PW.el('p', { class: 'intro', tekst: d.beschrijving }));
    if (!lijst.length) {
      box.appendChild(PW.el('p', { class: 'leeg', tekst: huidig.deel === 'routes'
        ? 'Er staan nog geen routes voor dit gebied in de kennisbank. Kijk bij Hele gebied of vraag de assistent.'
        : 'Er staan nog geen gecontroleerde feiten over dit gebied in de kennisbank.' }));
    }
    lijst.forEach(function(f) { box.appendChild(feitKaart(f)); });
  }
  box.appendChild(PW.el('button', { type: 'button', class: 'knop vraag-gebied', html: PW.icoon('chat', { maat: 22 }) + 'Vraag de assistent over dit gebied',
    onclick: function() { PW.vulVraag('Over ' + d.titel + ': '); } }));
}

function toonGebied(slug) {
  var v = document.getElementById('view-gebied');
  if (huidig.slug !== slug) { huidig = { slug: slug, deel: 'feiten', data: null }; }
  var titel = (PW.opslag.leesJSON('pw_gebied_' + slug, null) || {}).titel || '';
  var segmenten = '<button type="button" role="tab" id="gebiedSeg-feiten">Feiten</button><button type="button" role="tab" id="gebiedSeg-routes">Routes</button>' +
    (PW.kaartVoorGebied ? '<button type="button" role="tab" id="gebiedSeg-kaart">Op de kaart</button>' : '');
  v.innerHTML = '<div class="view-scroll"><div class="gebied-beeld" id="gebiedBeeld"></div>' +
    '<div class="segment segment-plak" role="tablist" aria-label="Onderdelen">' + segmenten + '</div>' +
    '<div class="view-inhoud" id="gebiedDeel"></div></div>';
  ['feiten', 'routes', 'kaart'].forEach(function(id) {
    var b = document.getElementById('gebiedSeg-' + id);
    if (b) b.onclick = function() { huidig.deel = id; toonDeel(); };
  });
  document.getElementById('gebiedBeeld').innerHTML = kopbeeld({ slug: slug, titel: titel });
  toonDeel();
  laad('pw_gebied_' + slug, { actie: 'gebied', slug: slug }).then(function(d) {
    if (huidig.slug !== slug) return;
    huidig.data = d;
    document.getElementById('kopTitel').textContent = d.titel;
    document.getElementById('gebiedBeeld').innerHTML = kopbeeld(d);
    toonDeel();
  }).catch(function(e) {
    var box = document.getElementById('gebiedDeel');
    box.innerHTML = '';
    box.appendChild(PW.el('p', { class: 'leeg', tekst: /Onbekend/.test(e.message) ? 'Dit gebied bestaat niet.' : 'Het gebied kon niet worden geladen. Controleer je verbinding.' }));
  });
}

document.getElementById('view-gebieden').innerHTML = '<div class="view-scroll"><div class="view-inhoud" id="gebiedenInhoud"></div></div>';
PW.registreerView('gebieden', { kop: 'Gebieden', tabblad: { titel: 'Gebieden', icoon: 'gebieden', volgorde: 3 }, toon: toonOverzicht });
PW.registreerView('gebied', {
  tab: 'gebieden', terug: '#gebieden',
  kop: function(slug) { return (PW.opslag.leesJSON('pw_gebied_' + slug, null) || {}).titel || 'Gebied'; },
  toon: toonGebied
});
PW.op('login', function() {
  if (PW.huidigeView === 'gebieden') toonOverzicht();
  if (PW.huidigeView === 'gebied' && huidig.slug) { var s = huidig.slug; huidig.slug = null; toonGebied(s); }
});
})();
