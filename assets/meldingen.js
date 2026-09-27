// Meldingen: wat er nu speelt in het gebied (tijdelijke feiten, seizoenskalender van deze
// maand, goedgekeurd nieuws van nm.nl) en "Mijn meldingen". Zelf iets melden kan via
// de knop "Iets melden". Meldingen zijn anoniem: dit apparaat onthoudt welke meldingen
// het heeft verstuurd en vraagt alleen hun status op.
(function() {
var K_MIJN = 'pw_mijnmeldingen';
var K_ACTUEEL = 'pw_actueel';
var K_GEZIEN = 'pw_gezien';
var tab = 'actueel';
var actueel = PW.opslag.leesJSON(K_ACTUEEL, null);
var laadFout = false;

// ============================================================
// Mijn meldingen (alleen op dit apparaat)
// ============================================================
PW.mijnMeldingen = {
  lijst: function() { return PW.opslag.leesJSON(K_MIJN, []); },
  voegToe: function(m) {
    if (!m || !m.id) return;
    var l = PW.mijnMeldingen.lijst().filter(function(x) { return x.id !== m.id; });
    l.unshift({ id: m.id, soort: m.soort, tekst: String(m.tekst || '').slice(0, 300), datum: new Date().toISOString() });
    PW.opslag.schrijfJSON(K_MIJN, l.slice(0, 30));
    PW.meld('mijnmeldingen');
  },
  wis: function() { PW.opslag.schrijf(K_MIJN, null); PW.meld('mijnmeldingen'); }
};

var STATUS = {
  'ontvangen': { tekst: 'Ontvangen, nog niet bekeken', kleur: 'var(--tekst-3)' },
  'in-behandeling': { tekst: 'In behandeling bij de beheerder', kleur: 'var(--blauw)' },
  'verwerkt': { tekst: 'Verwerkt in de kennisbank', kleur: 'var(--groen)' },
  'afgehandeld': { tekst: 'Bekeken en afgehandeld', kleur: 'var(--tekst-2)' },
  'afgewezen': { tekst: 'Bekeken, niet overgenomen', kleur: 'var(--tekst-2)' }
};

// ============================================================
// Iets melden
// ============================================================
PW.ietsMelden = function(standaard) {
  var soort = standaard || 'klopt-niet';
  PW.openBlad(function(blad, sluit) {
    blad.appendChild(PW.el('h2', { tekst: 'Iets melden' }));
    blad.appendChild(PW.el('p', { class: 'uitleg', tekst: 'De beheerder bekijkt elke melding. Pas na goedkeuring gebruikt de assistent het. Je melding is anoniem.' }));
    var formulier = PW.el('div');
    var k1 = PW.el('button', { type: 'button', class: 'keuze', html: '<b>Er klopt iets niet</b><span>Een feit is fout of verouderd</span>' });
    var k2 = PW.el('button', { type: 'button', class: 'keuze', html: '<b>Suggestie</b><span>Iets wat de assistent zou moeten weten</span>' });
    var ta = PW.el('textarea', { id: 'meldTekst', maxlength: '1000' });
    var lab = PW.el('label', { for: 'meldTekst' });
    function toon() {
      k1.setAttribute('aria-pressed', soort === 'klopt-niet' ? 'true' : 'false');
      k2.setAttribute('aria-pressed', soort === 'suggestie' ? 'true' : 'false');
      lab.textContent = soort === 'klopt-niet' ? 'Wat klopt er niet, en wat is het juiste?' : 'Wat is je suggestie?';
      ta.placeholder = soort === 'klopt-niet'
        ? 'Bijv.: de parkeerplaats bij Oud Reemst kost nu € 2,50 per uur (bord bij de automaat).'
        : 'Bijv.: sinds deze zomer staat er een nieuwe picknickbank bij het ven.';
    }
    k1.onclick = function() { soort = 'klopt-niet'; toon(); };
    k2.onclick = function() { soort = 'suggestie'; toon(); };
    toon();
    formulier.appendChild(PW.el('div', { class: 'veld' }, [PW.el('span', { class: 'veld-label', tekst: 'Wat wil je melden?' }), PW.el('div', { class: 'keuzes' }, [k1, k2])]));
    formulier.appendChild(PW.el('div', { class: 'veld' }, [lab, ta]));
    var fout = PW.el('p', { class: 'fout', role: 'alert' }); fout.hidden = true; fout.style.margin = '0 0 0.75rem';
    formulier.appendChild(fout);
    var stuur = PW.el('button', { type: 'button', class: 'knop knop-oranje', style: 'width:100%', tekst: 'Versturen' });
    formulier.appendChild(stuur);
    formulier.appendChild(PW.el('button', { type: 'button', class: 'knop knop-rand blad-sluit', tekst: 'Annuleren', onclick: sluit }));
    stuur.onclick = function() {
      var tekst = ta.value.trim();
      var min = soort === 'suggestie' ? 10 : 5;
      if (tekst.length < min) { fout.textContent = 'Schrijf iets meer (minstens ' + min + ' tekens).'; fout.hidden = false; ta.focus(); return; }
      stuur.disabled = true;
      var body = soort === 'suggestie' ? { actie: 'suggestie', tekst: tekst } : { actie: 'klopt-niet', toelichting: tekst };
      PW.api('/api/feedback', body).then(function(d) {
        PW.mijnMeldingen.voegToe({ id: d.id, soort: soort, tekst: tekst });
        formulier.innerHTML = '';
        formulier.appendChild(PW.el('p', { class: 'bedankt', html: PW.icoon('vinkje', { maat: 22 }) + '<span>Bedankt! Je melding is verstuurd. Onder "Mijn meldingen" zie je wat ermee gebeurt.</span>' }));
        formulier.appendChild(PW.el('button', { type: 'button', class: 'knop blad-sluit', tekst: 'Naar mijn meldingen', onclick: function() { sluit(); tab = 'mijn'; PW.ga('#meldingen'); toonView(); } }));
        formulier.appendChild(PW.el('button', { type: 'button', class: 'knop knop-rand blad-sluit', tekst: 'Sluiten', onclick: sluit }));
      }).catch(function(e) { stuur.disabled = false; fout.textContent = e.message; fout.hidden = false; });
    };
    blad.appendChild(formulier);
  });
};

// ============================================================
// Actueel in het gebied
// ============================================================
function laadActueel() {
  return PW.api('/api/gebied', { actie: 'actueel' }).then(function(d) {
    actueel = d;
    laadFout = false;
    PW.opslag.schrijfJSON(K_ACTUEEL, d);
    werkTellerBij();
    return d;
  }).catch(function() { laadFout = true; });
}

function nieuweIds(d) {
  if (!d) return [];
  var gezien = PW.opslag.leesJSON(K_GEZIEN, []);
  return (d.tijdelijk || []).concat(d.nieuws || []).map(function(x) { return x.id; })
    .filter(function(id) { return gezien.indexOf(id) < 0; });
}
function werkTellerBij() { PW.zetTeller('meldingen', PW.huidigeView === 'meldingen' && tab === 'actueel' ? 0 : nieuweIds(actueel).length); }
function markeerGezien() {
  if (!actueel) return;
  var ids = (actueel.tijdelijk || []).concat(actueel.nieuws || [], actueel.seizoen || []).map(function(x) { return x.id; });
  PW.opslag.schrijfJSON(K_GEZIEN, ids);
  PW.zetTeller('meldingen', 0);
}

function stand(d) {
  if (!d || !d.bijgewerkt) return '';
  var t = new Date(d.bijgewerkt);
  var s = t.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }) + ', ' + t.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  return (laadFout ? 'Geen verbinding. Laatst geladen: ' : 'Bijgewerkt ') + s;
}

function kaartje(item, label, labelKlasse, extra) {
  var kop = PW.el('div', { class: 'melding-kop' }, [PW.el('span', { class: 'label ' + labelKlasse, tekst: label })]);
  if (item.intern) kop.appendChild(PW.el('span', { class: 'label label-intern', html: PW.icoon('slot', { maat: 12, dikte: 2.4 }) + 'Intern' }));
  if (item.deelgebiedTitel) kop.appendChild(PW.el('span', { class: 'melding-plek', tekst: item.deelgebiedTitel }));
  var k = PW.el('article', { class: 'kaart melding' }, [kop, PW.el('p', { class: 'melding-tekst', tekst: item.tekst })]);
  var voet = PW.el('div', { class: 'melding-voet' });
  (extra || []).forEach(function(e) { voet.appendChild(e); });
  if (item.gecontroleerdOp) {
    voet.appendChild(PW.el('span', { class: item.verouderd ? 'gecontroleerd verouderd' : 'gecontroleerd',
      html: PW.icoon(item.verouderd ? 'waarschuwing' : 'vinkje', { maat: 15, dikte: 2.4 }) +
        (item.verouderd ? 'Mogelijk verouderd · gecontroleerd ' : 'Gecontroleerd ') + PW.nlDatumKort(item.gecontroleerdOp) }));
  }
  if (PW.kaartLink && item.plekId) voet.appendChild(PW.kaartLink(item));
  if (voet.childNodes.length) k.appendChild(voet);
  return k;
}

function toonActueel(box) {
  var d = actueel;
  if (!d) {
    box.appendChild(PW.el('p', { class: 'leeg', tekst: laadFout ? 'Geen verbinding. Probeer het later opnieuw.' : 'Laden…' }));
    return;
  }
  box.appendChild(PW.el('p', { class: 'stand', tekst: stand(d) }));
  var tijdelijk = d.tijdelijk || [], seizoen = d.seizoen || [], nieuws = d.nieuws || [];
  if (!tijdelijk.length && !seizoen.length && !nieuws.length) {
    box.appendChild(PW.el('p', { class: 'leeg', tekst: 'Er is op dit moment niets bijzonders te melden: geen afsluitingen, activiteiten of nieuws.' }));
    return;
  }
  if (tijdelijk.length) {
    box.appendChild(PW.el('h2', { class: 'sectie-kop', tekst: 'Tijdelijk · afsluitingen en activiteiten' }));
    tijdelijk.forEach(function(x) {
      var geldt = x.einddatum ? PW.el('span', { class: 'melding-geldt', tekst: (x.startdatum ? 'Van ' + PW.nlDatumKort(x.startdatum) + ' ' : '') + 't/m ' + PW.nlDatumKort(x.einddatum) }) : null;
      box.appendChild(kaartje(x, 'Tijdelijk', 'label-tijdelijk', [geldt]));
    });
  }
  if (seizoen.length) {
    box.appendChild(PW.el('h2', { class: 'sectie-kop', tekst: 'Nu te zien · ' + d.maand }));
    seizoen.forEach(function(x) { box.appendChild(kaartje(x, 'Seizoen · ' + d.maand, 'label-seizoen')); });
  }
  box.appendChild(PW.el('a', { class: 'knop knop-rand kal-link', href: '#kalender', html: PW.icoon('kalender', { maat: 20 }) + 'Wat speelt er per maand? Naar de kalender' }));
  if (nieuws.length) {
    box.appendChild(PW.el('h2', { class: 'sectie-kop', tekst: 'Nieuws van natuurmonumenten.nl' }));
    nieuws.forEach(function(x) {
      var lees = x.bronUrl ? PW.el('a', { href: x.bronUrl, target: '_blank', rel: 'noopener', class: 'melding-link', tekst: 'Lees op natuurmonumenten.nl ›' }) : null;
      box.appendChild(kaartje(x, 'Nieuws · goedgekeurd ' + PW.nlDatumKort(x.goedgekeurdOp), 'label-nieuws', [lees]));
    });
  }
}

// ============================================================
// Mijn meldingen
// ============================================================
function toonMijn(box) {
  var lijst = PW.mijnMeldingen.lijst();
  box.appendChild(PW.el('p', { class: 'stand', tekst: 'Je meldingen worden alleen op dit apparaat onthouden. De beheerder ziet niet wie ze heeft gestuurd.' }));
  if (!lijst.length) {
    box.appendChild(PW.el('p', { class: 'leeg', tekst: 'Je hebt vanaf dit apparaat nog niets gemeld. Tik op "Iets melden" of op "Klopt er iets niet?" onder een antwoord.' }));
    return;
  }
  var kaarten = {};
  lijst.forEach(function(m) {
    var status = PW.el('div', { class: 'melding-status', tekst: 'Status ophalen…' });
    var k = PW.el('article', { class: 'kaart melding' }, [
      PW.el('div', { class: 'melding-kop melding-kop-rond' }, [
        PW.el('span', { class: 'label ' + (m.soort === 'suggestie' ? 'label-nieuws' : 'label-tijdelijk'), tekst: m.soort === 'suggestie' ? 'Suggestie' : 'Klopt niet' }),
        PW.el('span', { class: 'melding-plek', tekst: PW.nlDatumKort(m.datum) })]),
      PW.el('p', { class: 'melding-tekst', tekst: '"' + m.tekst + '"' }),
      status]);
    kaarten[m.id] = status;
    box.appendChild(k);
  });
  box.appendChild(PW.el('button', { type: 'button', class: 'knop knop-rand knop-klein', style: 'align-self:center', tekst: 'Lijst wissen op dit apparaat',
    onclick: function() { if (confirm('Je lijst met meldingen van dit apparaat wissen? De meldingen zelf blijven bij de beheerder.')) PW.mijnMeldingen.wis(); } }));
  PW.api('/api/feedback', { actie: 'status', ids: lijst.map(function(m) { return m.id; }) })
    .then(function(d) {
      Object.keys(kaarten).forEach(function(id) {
        var st = d.statussen && d.statussen[id];
        var info = st && STATUS[st.s];
        kaarten[id].textContent = info ? info.tekst + (st.s !== 'ontvangen' && st.t ? ' · ' + PW.nlDatumKort(st.t) : '') : 'Status niet meer beschikbaar';
        kaarten[id].style.color = info ? info.kleur : 'var(--tekst-3)';
      });
    })
    .catch(function() {
      Object.keys(kaarten).forEach(function(id) { kaarten[id].textContent = 'Status nu niet op te halen (geen verbinding?)'; });
    });
}

// ============================================================
// Scherm
// ============================================================
function toonView() {
  var tA = document.getElementById('segActueel'), tM = document.getElementById('segMijn');
  tA.setAttribute('aria-selected', tab === 'actueel' ? 'true' : 'false');
  tM.setAttribute('aria-selected', tab === 'mijn' ? 'true' : 'false');
  var box = document.getElementById('meldingenInhoud');
  box.innerHTML = '';
  if (tab === 'actueel') { toonActueel(box); markeerGezien(); }
  else toonMijn(box);
}

function init() {
  var v = document.getElementById('view-meldingen');
  v.innerHTML =
    '<div class="segment" role="tablist" aria-label="Soort meldingen">' +
      '<button type="button" role="tab" id="segActueel">Actueel in het gebied</button>' +
      '<button type="button" role="tab" id="segMijn">Mijn meldingen</button>' +
    '</div>' +
    '<div class="view-scroll"><div class="view-inhoud met-fab" id="meldingenInhoud" role="tabpanel"></div></div>' +
    '<button type="button" class="fab" id="ietsMelden">' + PW.icoon('plus', { maat: 20, kleur: '#FFFFFF', dikte: 2.6 }) + 'Iets melden</button>';
  document.getElementById('segActueel').onclick = function() { tab = 'actueel'; toonView(); };
  document.getElementById('segMijn').onclick = function() { tab = 'mijn'; toonView(); };
  document.getElementById('ietsMelden').onclick = function() { PW.ietsMelden(); };
  PW.op('mijnmeldingen', function() { if (PW.huidigeView === 'meldingen' && tab === 'mijn') toonView(); });
  // Na het inloggen (interne feiten) en bij het openen van de app de stand ophalen
  PW.op('login', function() { laadActueel().then(function() { if (PW.huidigeView === 'meldingen') toonView(); }); });
}

PW.registreerView('meldingen', {
  kop: 'Meldingen',
  tabblad: { titel: 'Meldingen', icoon: 'meldingen', volgorde: 4 },
  toon: function(param) {
    if (param === 'mijn') tab = 'mijn';
    toonView();
    if (tab === 'actueel') laadActueel().then(function() { if (PW.huidigeView === 'meldingen') toonView(); });
  }
});
init();
})();
