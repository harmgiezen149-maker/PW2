// Beheerpaneel: jaarkalender. Per maand wat er in het gebied speelt (flora en fauna, activiteiten,
// beheer en onderhoud). Een kalenderitem is een kennisbankfeit met een moment: elk jaar in bepaalde
// maanden (type seizoen) of op een datum of in een periode (type tijdelijk). Zo gebruikt ook de
// assistent het, en geldt dezelfde controle als voor alle feiten.
// Gebruikt de hulpfuncties uit beheer.html (el, api, melding, fout, datumNL, toonTab, OV, MAANDEN).
(function() {
var KLEUR = { natuur: '#3F7A4E', activiteit: '#2256A0', beheer: '#8A5A2E', overig: '#6B7280', algemeen: '#6E5E9C' };
var KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
var huidigeMaand = null;

function sleutel(m) { return m.jaar + '-' + String(m.maand).padStart(2, '0'); }

function wanneer(it) {
  if (it.type === 'seizoen') {
    var ms = (it.maanden || []);
    return ms.length === 12 ? 'Het hele jaar' : 'Elk jaar: ' + ms.map(function(m) { return KORT[m - 1]; }).join(', ');
  }
  function d(iso) { var x = new Date(iso + 'T12:00:00'); return x.getDate() + ' ' + KORT[x.getMonth()] + ' ' + x.getFullYear(); }
  if (!it.startdatum) return 't/m ' + d(it.einddatum);
  return it.startdatum === it.einddatum ? d(it.startdatum) : d(it.startdatum) + ' – ' + d(it.einddatum);
}

// Het volledige feit meesturen, zodat velden die niet in het formulier staan behouden blijven
function payload(f, wijziging) {
  var velden = ['id', 'tekst', 'onderwerp', 'deelgebied', 'type', 'zichtbaarheid', 'bron', 'bronUrl', 'bronDatum', 'startdatum', 'einddatum',
    'vervaltOp', 'maanden', 'plekId', 'foto', 'fotoBron', 'kalender', 'titel'];
  var p = {};
  velden.forEach(function(k) { if (f && f[k] !== undefined) p[k] = f[k]; });
  return Object.assign(p, wijziging);
}

// ------------------------------------------------ formulier: nieuw of bewerken
function formulier(d, f, klaar) {
  f = f || {};
  var s = el('div', { class: 'section kal-form', id: 'kalForm' }, [el('h2', { text: f.id ? 'Kalenderitem bewerken' : 'Nieuw in de kalender' })]);
  var form = el('div', { class: 'form' });
  function veld(label, input, hint) {
    var w = el('div', null, [el('label', { text: label }), input]);
    if (hint) w.appendChild(el('div', { class: 'hint', text: hint }));
    return w;
  }
  function keuze(opties, waarde) {
    var x = el('select');
    opties.forEach(function(o) { var op = el('option', { value: o[0], text: o[1] }); if (o[0] === waarde) op.selected = true; x.appendChild(op); });
    return x;
  }
  var titel = el('input', { maxlength: '80', placeholder: 'Bijv. Heide in bloei, Schaapskudde op de heide, Excursie paddenstoelen' }); titel.value = f.titel || '';
  var cat = keuze(d.categorieen.map(function(c) { return [c.slug, c.titel]; }), f.categorie || (f.kalender && f.kalender !== 'geen' ? f.kalender : 'natuur'));
  var soort = f.type === 'tijdelijk' ? 'datum' : 'jaarlijks';
  var knopJaar = el('button', { type: 'button', text: 'Elk jaar in bepaalde maanden' });
  var knopDatum = el('button', { type: 'button', text: 'Op een datum of in een periode' });
  var maanden = el('div', { class: 'maanden' });
  MAANDEN.forEach(function(m, i) {
    var cb = el('input', { type: 'checkbox', value: String(i + 1) });
    if ((f.maanden || []).indexOf(i + 1) >= 0) cb.checked = true;
    maanden.appendChild(el('label', null, [cb, m]));
  });
  var van = el('input', { type: 'date' }); van.value = f.startdatum || '';
  var tot = el('input', { type: 'date' }); tot.value = f.einddatum || '';
  var jaarVak = veld('Maanden', maanden, 'Bijvoorbeeld bloei, bronst, vogeltrek of begrazing die elk jaar terugkomt.');
  var datumVak = el('div', { class: 'rij' }, [veld('Van', van, 'Leeg = loopt al.'), veld('Tot en met (verplicht)', tot, 'Eén dag: twee keer dezelfde datum.')]);
  function wissel() {
    knopJaar.setAttribute('aria-pressed', soort === 'jaarlijks' ? 'true' : 'false');
    knopDatum.setAttribute('aria-pressed', soort === 'datum' ? 'true' : 'false');
    jaarVak.style.display = soort === 'jaarlijks' ? '' : 'none';
    datumVak.style.display = soort === 'datum' ? '' : 'none';
  }
  knopJaar.onclick = function() { soort = 'jaarlijks'; wissel(); };
  knopDatum.onclick = function() { if (cat.value === 'algemeen') return; soort = 'datum'; wissel(); };
  var algemeenHint = el('div', { class: 'hint', text: 'Algemeen: natuurkennis voor deze tijd van het jaar (bijv. bladverkleuring of vogeltrek), niet specifiek voor dit gebied. Komt elk jaar terug; schrijf "op de Veluwe" of "in Nederland".' });
  cat.onchange = function() {
    algemeenHint.style.display = cat.value === 'algemeen' ? '' : 'none';
    knopDatum.disabled = cat.value === 'algemeen';
    if (cat.value === 'algemeen') { soort = 'jaarlijks'; dg.value = 'heel'; wissel(); }
  };
  var tekst = el('textarea', { placeholder: 'Wat vertel je bezoekers? Bijv.: Van mei tot oktober graast de schaapskudde op de heide van Oud Reemst. Honden aan de lijn.' }); tekst.value = f.tekst || '';
  var dg = keuze(OV.deelgebieden.map(function(x) { return [x.slug, x.titel]; }), f.deelgebied || 'heel');
  var plek = keuze([['', '— geen plek —']].concat((OV.plekkenKort || []).map(function(p) { return [p.id, p.naam]; })), f.plekId || '');
  var zicht = keuze([['openbaar', 'Openbaar (iedereen)'], ['intern', 'Intern (alleen ingelogd)']], f.zichtbaarheid || 'openbaar');
  var bron = el('input', { placeholder: 'Bijv. agenda natuurmonumenten.nl, boswachter Jan, beheerplan 2026' }); bron.value = f.bron || '';
  var bronUrl = el('input', { placeholder: 'https://…' }); bronUrl.value = f.bronUrl || '';

  form.appendChild(el('div', { class: 'rij' }, [veld('Korte titel', titel), veld('Soort', cat)]));
  form.appendChild(algemeenHint);
  form.appendChild(el('label', { text: 'Wanneer' }));
  form.appendChild(el('div', { class: 'bk-segment kal-soort' }, [knopJaar, knopDatum]));
  form.appendChild(jaarVak);
  form.appendChild(datumVak);
  form.appendChild(veld('Wat vertel je bezoekers?', tekst, 'Eén item per blok, in gewone zinnen en met absolute datums. De assistent gebruikt dit ook.'));
  form.appendChild(el('div', { class: 'rij' }, [veld('Deelgebied', dg), veld('Plek op de kaart (optioneel)', plek)]));
  form.appendChild(el('div', { class: 'rij' }, [veld('Zichtbaarheid', zicht), veld('Bron', bron)]));
  form.appendChild(veld('Link naar bron (optioneel)', bronUrl));
  var opslaan = el('button', { class: 'btn primair', text: 'Opslaan' });
  opslaan.onclick = function() {
    var ms = [];
    maanden.querySelectorAll('input').forEach(function(cb) { if (cb.checked) ms.push(Number(cb.value)); });
    var w = {
      titel: titel.value, kalender: cat.value, tekst: tekst.value, deelgebied: dg.value, plekId: plek.value, zichtbaarheid: zicht.value,
      bron: bron.value, bronUrl: bronUrl.value, onderwerp: f.onderwerp || (d.onderwerpVoor || {})[cat.value] || 'seizoen'
    };
    if (soort === 'jaarlijks') { w.type = 'seizoen'; w.maanden = ms; w.startdatum = ''; w.einddatum = ''; }
    else { w.type = 'tijdelijk'; w.startdatum = van.value; w.einddatum = tot.value; w.maanden = []; }
    if (w.type === 'tijdelijk' && w.startdatum && w.einddatum && w.startdatum > w.einddatum) { melding('De begindatum ligt na de einddatum', true); return; }
    opslaan.disabled = true;
    api('feit-opslaan', { feit: payload(f.id ? f : null, w) }).then(function(r) {
      melding('Opgeslagen. Het staat meteen in de kalender en de assistent gebruikt het.');
      var eerste = w.type === 'tijdelijk' ? (w.startdatum || w.einddatum).slice(0, 7) : null;
      klaar(eerste);
    }).catch(function(e) { opslaan.disabled = false; fout(e); });
  };
  form.appendChild(el('div', { class: 'acties' }, [opslaan, el('button', { class: 'btn secundair', type: 'button', text: 'Annuleren', onclick: function() { s.remove(); } })]));
  s.appendChild(form);
  wissel();
  cat.onchange();
  return s;
}

// ------------------------------------------------ het tabblad
window.tabKalender = function(inhoud, opties) {
  opties = opties || {};
  api('kalender').then(function(d) {
    inhoud.innerHTML = '';
    inhoud.appendChild(el('h1', { text: 'Jaarkalender' }));
    inhoud.appendChild(el('p', { class: 'intro', text: 'Wat er per maand speelt en wat publieksboswachters aan bezoekers kunnen vertellen: flora en fauna, activiteiten, beheer en onderhoud. De kalender haalt zijn items uit de kennisbank: seizoensfeiten met maanden en tijdelijke feiten met datums. Wat je hier toevoegt, staat meteen in de app en de assistent gebruikt het.' }));
    function herlaad(maand) { toonTab('kalender', { maand: maand || huidigeMaand }); }
    var plekForm = el('div');
    var acties = el('div', { class: 'acties', style: 'margin:0 0 16px' }, [
      el('button', { class: 'btn primair', text: '+ Nieuw kalenderitem', onclick: function() {
        plekForm.innerHTML = '';
        plekForm.appendChild(formulier(d, null, herlaad));
        plekForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } })
    ]);
    var zoek = el('button', { class: 'btn secundair', text: 'Zoek op de websites' });
    var zoekStatus = el('span', { class: 'hint', style: 'align-self:center' });
    zoek.onclick = function() {
      zoek.disabled = true;
      zoekStatus.textContent = 'Zoeken op de toegestane websites… dit kan een paar minuten duren.';
      api('kalender-zoeken').then(function(r) {
        zoek.disabled = false;
        zoekStatus.textContent = r.voorstellen
          ? r.voorstellen + ' voorstel(len) gevonden, waarvan ' + r.kalender + ' voor de kalender. Bekijk en keur ze goed bij Voorstellen.'
          : 'Niets nieuws gevonden.';
        if (r.voorstellen) laadOverzicht();
      }).catch(function(e) { zoek.disabled = false; zoekStatus.textContent = ''; fout(e); });
    };
    acties.appendChild(zoek);
    var algemeen = el('button', { class: 'btn secundair', text: 'Algemene weetjes voorstellen' });
    var voorMaand = el('select', { class: 'kal-voor', 'aria-label': 'Voor welke maanden' }, [el('option', { value: 'maand', text: 'voor de gekozen maand' }), el('option', { value: 'jaar', text: 'voor het hele jaar' })]);
    algemeen.onclick = function() {
      algemeen.disabled = true;
      zoekStatus.textContent = 'De assistent stelt algemene natuurweetjes voor… dit duurt even.';
      var m = voorMaand.value === 'maand' ? Number(String(huidigeMaand).slice(5, 7)) : null;
      api('kalender-algemeen', { maand: m }).then(function(r) {
        algemeen.disabled = false;
        zoekStatus.textContent = r.voorstellen ? r.voorstellen + ' weetje(s) voorgesteld. Lees ze na bij Voorstellen; daar keur je ze in één keer goed.' : 'Geen nieuwe weetjes gevonden.';
        if (r.voorstellen) laadOverzicht();
      }).catch(function(e) { algemeen.disabled = false; zoekStatus.textContent = ''; fout(e); });
    };
    acties.appendChild(algemeen);
    acties.appendChild(voorMaand);
    acties.appendChild(zoekStatus);
    inhoud.appendChild(acties);
    inhoud.appendChild(el('p', { class: 'hint', style: 'margin:-8px 0 16px', text: '"Zoek op de websites" doorzoekt de agenda en het nieuws van natuurmonumenten.nl en de andere toegestane websites naar activiteiten, werkzaamheden en seizoensmomenten. "Algemene weetjes voorstellen" laat de assistent algemene natuurkennis per maand voorstellen (bladverkleuring, vogeltrek, bronst). Alles komt eerst bij Voorstellen.' }));
    inhoud.appendChild(plekForm);

    // Maanden
    var maanden = d.maanden;
    var i = 0;
    var gewenst = opties.maand || huidigeMaand;
    maanden.forEach(function(m, j) { if (sleutel(m) === gewenst) i = j; });
    huidigeMaand = sleutel(maanden[i]);
    var rij = el('div', { class: 'kal-maanden' });
    var lijst = el('div');
    function toonMaand(j) {
      i = j; huidigeMaand = sleutel(maanden[j]);
      rij.querySelectorAll('button').forEach(function(b, k) { b.setAttribute('aria-pressed', k === j ? 'true' : 'false'); });
      var m = maanden[j];
      lijst.innerHTML = '';
      lijst.appendChild(el('h2', { class: 'kal-kop', text: m.naam.charAt(0).toUpperCase() + m.naam.slice(1) + ' ' + m.jaar + ' · ' + m.ids.length + ' item(s)' }));
      if (!m.ids.length) lijst.appendChild(el('p', { class: 'leeg', text: 'Voor deze maand staat nog niets in de kalender.' }));
      m.ids.forEach(function(id) {
        var it = d.items[id];
        var cat = d.categorieen.filter(function(c) { return c.slug === it.categorie; })[0] || { titel: 'Overig' };
        var b = it.beoordeling || {};
        var badges = el('div', { class: 'badges' }, [
          el('span', { class: 'badge kal-badge', style: 'background:' + (KLEUR[it.categorie] || KLEUR.overig), text: cat.titel }),
          el('span', { class: 'badge', text: wanneer(it) }),
          el('span', { class: 'badge', text: (OV.deelgebieden.filter(function(x) { return x.slug === it.deelgebied; })[0] || { titel: 'Hele gebied' }).titel }),
          it.zichtbaarheid === 'intern' ? el('span', { class: 'badge intern', text: 'Intern' }) : null,
          !it.kalender ? el('span', { class: 'badge', title: 'Staat in de kalender omdat het een seizoens- of tijdelijk feit is', text: 'Automatisch uit de kennisbank' }) : null,
          b.verlopen ? el('span', { class: 'badge warn', text: 'Mogelijk verouderd' }) : null
        ]);
        var card = el('div', { class: 'card kal-card', style: 'border-left:5px solid ' + (KLEUR[it.categorie] || KLEUR.overig) }, [badges]);
        if (it.titel) card.appendChild(el('div', { class: 'kal-card-titel', text: it.titel }));
        card.appendChild(el('div', { class: 'tekst', text: it.tekst }));
        card.appendChild(el('div', { class: 'meta', text: 'Bron: ' + (it.bron || '—') + ' · gecontroleerd ' + datumNL(it.gecontroleerdOp) }));
        card.appendChild(el('div', { class: 'acties' }, [
          el('button', { class: 'btn secundair klein', text: 'Bewerken', onclick: function() {
            plekForm.innerHTML = '';
            plekForm.appendChild(formulier(d, it, herlaad));
            plekForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } }),
          el('button', { class: 'btn secundair klein', text: 'Niet in de kalender', title: 'Het feit blijft in de kennisbank en de assistent gebruikt het nog', onclick: function() {
            if (!confirm('Dit item uit de kalender halen? Het feit blijft in de kennisbank staan en de assistent gebruikt het nog.')) return;
            api('feit-opslaan', { feit: payload(it, { kalender: 'geen' }) }).then(function() { melding('Uit de kalender gehaald'); herlaad(); }).catch(fout);
          } }),
          el('button', { class: 'btn gevaar klein', text: 'Verwijderen', onclick: function() {
            if (!confirm('Dit item verwijderen? Het verdwijnt uit de kalender, de app en de assistent. In de Kennisbank blijft het als ingetrokken feit bewaard, zodat je het zo nodig terugzet.')) return;
            api('feit-intrekken', { id: it.id, reden: 'verwijderd uit de jaarkalender' }).then(function() { melding('Verwijderd'); herlaad(); }).catch(fout);
          } })
        ]));
        lijst.appendChild(card);
      });
    }
    maanden.forEach(function(m, j) {
      rij.appendChild(el('button', { type: 'button', 'aria-pressed': 'false', html: '<b>' + KORT[m.maand - 1] + (m.maand === 1 || j === 0 ? ' ' + m.jaar : '') + '</b><span>' + m.ids.length + '</span>',
        onclick: function() { toonMaand(j); } }));
    });
    inhoud.appendChild(rij);
    inhoud.appendChild(lijst);
    toonMaand(i);
  }).catch(fout);
};
})();
