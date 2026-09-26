// Chat: begroeting, vragen stellen, antwoorden met voetnoten en bronnen,
// aanvulling van websites op de achtergrond, voorlezen en "Klopt er iets niet?".
(function() {
var $ = function(id) { return document.getElementById(id); };

// ============================================================
// Snelle vragen
// ============================================================
var SUGGESTIES = [
  { label: 'Wat is er nu te zien?', vraag: 'Wat is er actueel te zien op Planken Wambuis qua flora en fauna deze tijd van het jaar?' },
  { label: 'Waar zie ik vandaag het best wild?', vraag: 'Waar en wanneer zie ik in Planken Wambuis het best wild?' },
  { label: 'Tips voor bezoekersgesprekken', vraag: 'Geef actuele talking points voor bezoekersgesprekken op Planken Wambuis deze tijd van het jaar' }
];
var ONDERWERPEN = [
  { label: 'Wat is er nu te zien?', vraag: 'Wat is er actueel te zien op Planken Wambuis qua flora en fauna deze tijd van het jaar?' },
  { label: 'Talking points', vraag: 'Geef actuele talking points voor bezoekersgesprekken op Planken Wambuis deze tijd van het jaar' },
  { label: 'Heidebeheer', vraag: 'Leg heidebeheer op Planken Wambuis uit, wat is er actueel gaande qua beheer?' },
  { label: 'Actuele vogels', vraag: 'Welke vogels zijn er actueel te zien of te horen op Planken Wambuis?' },
  { label: 'Begrazing', vraag: 'Leg begrazing uit als beheersmaatregel op Planken Wambuis, wat is er actueel gaande?' },
  { label: 'Planten en paddenstoelen', vraag: 'Welke planten en paddenstoelen zijn er actueel bijzonder op Planken Wambuis?' },
  { label: 'De wolf', vraag: 'Vertel over de wolvenroedel op Planken Wambuis, wat is er actueel bekend?' },
  { label: 'Leden werven', vraag: 'Help mij met het werven van nieuwe leden voor Natuurmonumenten op Planken Wambuis. Geef concrete gespreksstrategieën, argumenten en tips voor bezoekersgesprekken.' },
  { label: 'Routes en parkeren', vraag: 'Welke wandelroutes zijn er en waar kan ik parkeren?' },
  { label: 'Regels in het gebied', vraag: 'Welke regels gelden er voor bezoekers in Planken Wambuis?' }
];

function groet() {
  var h = new Date().getHours();
  var dagdeel = h >= 5 && h < 12 ? 'Goedemorgen' : h >= 12 && h < 18 ? 'Goedemiddag' : h >= 18 && h < 23 ? 'Goedenavond' : 'Goedenacht';
  var naam = PW.voornaam();
  return dagdeel + ', ' + (naam || 'boswachter') + '!';
}

function toonGroet() {
  $('greet').textContent = groet();
  $('weldate').textContent = PW.nlDatumLang() + '. Waarmee kan ik je helpen?';
}

function bouwSuggesties() {
  var box = $('suggesties');
  box.innerHTML = '';
  SUGGESTIES.forEach(function(s) {
    box.appendChild(PW.el('button', { type: 'button', class: 'suggestie', tekst: s.label, onclick: function() { ask(s.vraag, s.label); } }));
  });
}

function openOnderwerpen() {
  PW.openBlad(function(blad, sluit) {
    blad.appendChild(PW.el('h2', { tekst: 'Onderwerpen' }));
    blad.appendChild(PW.el('p', { class: 'uitleg', tekst: 'Tik op een onderwerp om het direct te vragen.' }));
    var grid = PW.el('div', { class: 'onderwerpen' });
    ONDERWERPEN.forEach(function(o) {
      grid.appendChild(PW.el('button', { type: 'button', class: 'onderwerp', tekst: o.label, onclick: function() { sluit(); ask(o.vraag, o.label); } }));
    });
    blad.appendChild(grid);
    blad.appendChild(PW.el('button', { type: 'button', class: 'knop knop-rand blad-sluit', tekst: 'Sluiten', onclick: sluit }));
  });
}

// ============================================================
// Weer
// ============================================================
function weerIcoon(code, maat) {
  maat = maat || 40;
  var zon = '<circle cx="28" cy="13" r="7" fill="#F2C14E"/><path d="M28 1v3M28 22v3M16 13h3M37 13h3M19.5 4.5l2 2M34.5 19.5l2 2M36.5 4.5l-2 2" stroke="#F2C14E" stroke-width="2" stroke-linecap="round"/>';
  var wolk = '<path d="M8 32h22a7 7 0 0 0 0-14 9 9 0 0 0-17 3 6 6 0 0 0-5 11z" fill="#FFFFFF" stroke="#8A9199" stroke-width="1.2"/>';
  var grijzeWolk = '<path d="M8 28h24a7 7 0 0 0 0-14 9 9 0 0 0-17 3 6 6 0 0 0-7 11z" fill="#DDE2E8" stroke="#8A9199" stroke-width="1.2"/>';
  var regen = '<path d="M14 32l-2 4M22 32l-2 4M30 32l-2 4" stroke="#6E9BD8" stroke-width="2.2" stroke-linecap="round"/>';
  var sneeuw = '<path d="M14 33v.01M22 35v.01M30 33v.01" stroke="#9DB5D6" stroke-width="3.2" stroke-linecap="round"/>';
  var bliksem = '<path d="M23 29l-4 6h4l-3 5" stroke="#F2C14E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
  var mist = '<path d="M8 20h28M5 26h30M10 32h26" stroke="#B9C2CB" stroke-width="2.6" stroke-linecap="round"/>';
  var inh;
  if (code === 0) inh = '<circle cx="22" cy="18" r="8" fill="#F2C14E"/><path d="M22 3v4M22 29v4M7 18h4M33 18h4M11.5 7.5l2.8 2.8M29.7 25.7l2.8 2.8M32.5 7.5l-2.8 2.8M14.3 25.7l-2.8 2.8" stroke="#F2C14E" stroke-width="2.2" stroke-linecap="round"/>';
  else if (code <= 2) inh = zon + wolk;
  else if (code === 3) inh = grijzeWolk;
  else if (code <= 49) inh = mist;
  else if (code <= 69 || (code >= 80 && code <= 82)) inh = grijzeWolk + regen;
  else if (code <= 86) inh = grijzeWolk + sneeuw;
  else inh = grijzeWolk + bliksem;
  return '<svg width="' + maat + '" height="' + Math.round(maat * 0.9) + '" viewBox="0 0 44 40" fill="none" aria-hidden="true">' + inh + '</svg>';
}

function weerOmschrijving(code) {
  if (code === 0) return 'helder';
  if (code <= 2) return 'licht bewolkt';
  if (code === 3) return 'bewolkt';
  if (code <= 49) return 'mist';
  if (code <= 59) return 'motregen';
  if (code <= 69) return 'regen';
  if (code <= 79) return 'sneeuw';
  if (code <= 82) return 'buien';
  if (code <= 86) return 'sneeuwbuien';
  if (code <= 99) return 'onweer';
  return '';
}

function dagNaam(dateStr, i) {
  if (i === 0) return 'Vandaag';
  if (i === 1) return 'Morgen';
  return ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'][new Date(dateStr).getDay()];
}

function laadWeer() {
  fetch('/api/weather')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.current) throw new Error('geen weer');
      var c = data.current, d = data.daily;
      $('wIcoon').innerHTML = weerIcoon(c.weather_code, 44);
      $('wNu').innerHTML = '<b>' + Math.round(c.temperature_2m) + ' °C</b> · wind ' + Math.round(c.wind_speed_10m) + ' km/u · ' + weerOmschrijving(c.weather_code);
      $('weerbalk').setAttribute('aria-label', 'Weer Planken Wambuis: ' + Math.round(c.temperature_2m) + ' graden, ' + weerOmschrijving(c.weather_code) + '. Tik voor vijf dagen.');
      var box = $('weerDagen');
      box.innerHTML = '';
      for (var i = 0; i < 5 && d && d.time && i < d.time.length; i++) {
        var regen = d.precipitation_sum[i] > 0 ? d.precipitation_sum[i].toFixed(1).replace('.', ',') + ' mm' : '';
        box.appendChild(PW.el('div', { class: 'weer-dag', html:
          '<span class="weer-dag-naam">' + dagNaam(d.time[i], i) + '</span>' + weerIcoon(d.weather_code[i], 30) +
          '<span class="weer-dag-temp">' + Math.round(d.temperature_2m_max[i]) + '° / ' + Math.round(d.temperature_2m_min[i]) + '°</span>' +
          '<span class="weer-dag-regen">' + regen + '</span>' }));
      }
    })
    .catch(function() { $('wNu').textContent = 'Weer niet beschikbaar'; });
}

function wisselWeer() {
  var open = $('weerbalk').getAttribute('aria-expanded') === 'true';
  $('weerbalk').setAttribute('aria-expanded', open ? 'false' : 'true');
  $('weerDagen').hidden = open;
}

// ============================================================
// Voorlezen
// ============================================================
var currentSpeech = null;
var EMOJI = /[\p{Extended_Pictographic}\u{1F100}-\u{1F1FF}\u{FE0F}\u{200D}]/gu;

function voorleesLabel(btn, spreekt) {
  btn.innerHTML = PW.icoon(spreekt ? 'stop' : 'voorlezen', { maat: 18 }) + (spreekt ? 'Stop' : 'Voorlezen');
  btn.classList.toggle('speaking', spreekt);
}

function speakText(btn, bubble) {
  if (!('speechSynthesis' in window)) { showErr('Voorlezen werkt niet in deze browser.'); return; }
  var synth = window.speechSynthesis;
  if (synth.speaking || synth.pending) {
    synth.cancel();
    cleanupHighlights();
    if (currentSpeech && currentSpeech.btn) voorleesLabel(currentSpeech.btn, false);
    var wasMine = currentSpeech && currentSpeech.btn === btn;
    currentSpeech = null;
    if (wasMine) return;
  }
  // Elk blad-element wordt een stukje tekst, met directe verwijzing naar het element
  var chunks = [];
  collectLeafElements(bubble).forEach(function(el) {
    var t = el.textContent.replace(EMOJI, '').trim();
    if (t.length >= 3) chunks.push({ text: t, el: el });
  });
  if (chunks.length === 0) return;
  voorleesLabel(btn, true);
  currentSpeech = { btn: btn, bubble: bubble };
  var i = 0;
  function speakNext() {
    if (i >= chunks.length || !currentSpeech) {
      cleanupHighlights();
      voorleesLabel(btn, false);
      currentSpeech = null;
      return;
    }
    cleanupHighlights();
    var chunk = chunks[i];
    chunk.el.classList.add('speech-active');
    chunk.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var u = new SpeechSynthesisUtterance(chunk.text);
    u.lang = 'nl-NL';
    u.rate = 1.0;
    var nl = synth.getVoices().find(function(v) { return v.lang.indexOf('nl') === 0; });
    if (nl) u.voice = nl;
    u.onend = function() { i++; speakNext(); };
    u.onerror = function() { cleanupHighlights(); voorleesLabel(btn, false); currentSpeech = null; };
    synth.speak(u);
  }
  if (synth.getVoices().length === 0) setTimeout(speakNext, 150); else speakNext();
}

// Alle blad-elementen (zonder blok-kinderen) in volgorde; lange alinea's worden zinnen
function collectLeafElements(root) {
  var result = [];
  function visit(el) {
    var blockChildren = Array.prototype.filter.call(el.children, function(c) {
      return c.tagName === 'DIV' || (c.matches && c.matches('.bl, .bl-sub, .bh'));
    });
    if (blockChildren.length === 0) {
      var t = el.textContent.trim();
      if (!t) return;
      if (t.length > 80 && !el.matches('.bh, .bl, .bl-sub')) splitInSentences(el).forEach(function(s) { result.push(s); });
      else result.push(el);
    } else {
      blockChildren.forEach(visit);
    }
  }
  visit(root);
  return result;
}

function splitInSentences(el) {
  var sentences = el.textContent.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [el.textContent];
  if (sentences.length <= 1) return [el];
  el.innerHTML = '';
  var spans = [];
  sentences.forEach(function(s) {
    var span = PW.el('span', { class: 'sentence', tekst: s });
    el.appendChild(span);
    if (s.trim()) spans.push(span);
  });
  return spans;
}

function cleanupHighlights() {
  document.querySelectorAll('.speech-active').forEach(function(el) { el.classList.remove('speech-active'); });
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = function() { window.speechSynthesis.getVoices(); };
}

// ============================================================
// Berichten
// ============================================================
function scrollNaar(el) {
  setTimeout(function() { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
}

function showErr(msg) {
  var el = $('err');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(showErr.t);
  showErr.t = setTimeout(function() { el.hidden = true; }, 8000);
}
PW.toonFout = showErr;

function addUser(text) {
  var w = PW.el('div', { class: 'msg user' }, [PW.el('div', { class: 'bub', tekst: text })]);
  $('chatInhoud').appendChild(w);
  scrollNaar(w);
}

function botAvatar() {
  return PW.el('div', { class: 'avatar avatar-klein', html: PW.AVATAR });
}

function addBot(text, bronnen, logId) {
  var soorten = [];
  var mainText = text;
  var lines = text.trim().split('\n');
  try {
    var json = JSON.parse(lines[lines.length - 1].trim());
    if (json.soorten && Array.isArray(json.soorten)) {
      soorten = json.soorten;
      mainText = lines.slice(0, -1).join('\n').trim();
    }
  } catch (e) {}

  var w = PW.el('div', { class: 'msg bot' });
  var b = PW.el('article', { class: 'bub' });
  var speakBtn = PW.el('button', { type: 'button', class: 'voorlees-knop' });
  voorleesLabel(speakBtn, false);
  b.appendChild(speakBtn);
  var contentDiv = PW.el('div', { class: 'antwoord-tekst', html: render(mainText) });
  b.appendChild(contentDiv);
  speakBtn.onclick = function() { speakText(speakBtn, contentDiv); };
  var bronEl = bronnen && bronnen.length > 0 ? b.appendChild(maakBronnenlijst(bronnen)) : null;
  var kloptEl = logId ? b.appendChild(maakKloptNiet(logId, text)) : null;
  if (soorten.length > 0) loadPhotos(soorten, b);
  var scrollBtn = PW.el('button', { type: 'button', class: 'terug-boven', html: '↑ Terug naar begin van antwoord' });
  scrollBtn.onclick = function() { w.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  b.appendChild(scrollBtn);
  w.appendChild(botAvatar());
  w.appendChild(b);
  $('chatInhoud').appendChild(w);
  if (window.addBirdButtons) addBirdButtons(b);
  scrollNaar(w);
  if (PW.voorkeur.voorlezen()) setTimeout(function() { speakText(speakBtn, contentDiv); }, 400);
  // Bubbel, inhoud en scrollknop teruggeven zodat fase 2 kan aanvullen
  return { bub: b, content: contentDiv, scrollBtn: scrollBtn, bronEl: bronEl, kloptEl: kloptEl, bronnen: bronnen || [] };
}

// Laden: voortgangsbalk met wisselende status
var ldrTimer = null;
var ldrSticky = false;
var ldrStatuses = ['Vraag begrepen…', 'Denkt na over je vraag…', 'Verzamelt gebiedskennis…', 'Schrijft antwoord…'];

function showTyping() {
  var w = PW.el('div', { class: 'msg bot', id: 'typ' }, [botAvatar(), PW.el('div', { class: 'typ-bub', html:
    '<div class="ldr-status" id="ldrStatus">' + ldrStatuses[0] + '</div><div class="ldr-bar"><div class="ldr-fill"></div></div>' })]);
  $('chatInhoud').appendChild(w);
  scrollNaar(w);
  ldrSticky = false;
  var i = 0;
  ldrTimer = setInterval(function() {
    if (ldrSticky) return;
    i = Math.min(i + 1, ldrStatuses.length - 1);
    setLoaderText(ldrStatuses[i]);
    if (i === ldrStatuses.length - 1) { clearInterval(ldrTimer); ldrTimer = null; }
  }, 2500);
}

function setLoaderText(text) {
  var el = $('ldrStatus');
  if (!el) return;
  el.classList.add('fade');
  setTimeout(function() { el.textContent = text; el.classList.remove('fade'); }, 250);
}

function setLoaderStatus(text) { ldrSticky = true; setLoaderText(text); }

function hideTyping() {
  if (ldrTimer) { clearInterval(ldrTimer); ldrTimer = null; }
  ldrSticky = false;
  var t = $('typ'); if (t) t.remove();
}

// ============================================================
// Opmaak van antwoorden (nooit HTML uit het antwoord uitvoeren)
// ============================================================
function fmt(line) {
  line = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  line = line.replace(/\s?⟦([^⟧]+)⟧/g, '<sup class="fn">$1</sup>');
  line = line.replace(/\s*\*\([^)]+\)\*/g, '');
  return line.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
}

function render(text) {
  var html = '';
  text.split('\n').forEach(function(line) {
    if (/^#{1,3} /.test(line)) {
      // Kopjes zonder emoji: rustiger en beter voor te lezen
      html += '<span class="bh">' + fmt(line.replace(/^#{1,3} /, '').replace(EMOJI, '').trim()) + '</span>';
    } else if (/^  +[-*] /.test(line)) {
      html += '<div class="bl-sub">' + fmt(line.replace(/^  +[-*] /, '')) + '</div>';
    } else if (/^[-*] /.test(line)) {
      html += '<div class="bl">' + fmt(line.replace(/^[-*] /, '')) + '</div>';
    } else if (line.trim() === '') {
      html += '<div style="height:4px"></div>';
    } else {
      html += '<div>' + fmt(line) + '</div>';
    }
  });
  return html;
}
PW.render = render;

function zonderVoetnoten(t) { return (t || '').replace(/\s?⟦[^⟧]*⟧/g, ''); }

// ============================================================
// Foto's van soorten (Wikipedia)
// ============================================================
function openLightbox(src, label) {
  var lb = PW.el('div', { class: 'lightbox', role: 'dialog', 'aria-label': label }, [
    PW.el('img', { src: src, alt: label }), PW.el('span', { tekst: label + ' · tik om te sluiten' })]);
  lb.onclick = function() { lb.remove(); };
  document.body.appendChild(lb);
}

function getPhoto(naam) {
  return fetch('https://nl.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(naam) + '&srlimit=1&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var title = (d.query.search.length > 0) ? d.query.search[0].title : naam;
      return fetch('https://nl.wikipedia.org/w/api.php?action=query&titles=' + encodeURIComponent(title) + '&prop=pageimages&format=json&pithumbsize=300&origin=*');
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var pages = d.query.pages;
      var page = pages[Object.keys(pages)[0]];
      if (page && page.thumbnail) return page.thumbnail.source;
      return fetch('https://en.wikipedia.org/w/api.php?action=query&titles=' + encodeURIComponent(naam) + '&prop=pageimages&format=json&pithumbsize=300&origin=*')
        .then(function(r) { return r.json(); })
        .then(function(d2) {
          var p2 = d2.query.pages;
          var pg = p2[Object.keys(p2)[0]];
          return (pg && pg.thumbnail) ? pg.thumbnail.source : null;
        });
    })
    .catch(function() { return null; });
}

function loadPhotos(soorten, container) {
  var div = PW.el('div', { class: 'photos' });
  div.hidden = true;
  container.appendChild(div);
  soorten.forEach(function(naam) {
    getPhoto(naam).then(function(url) {
      if (!url) return;
      var img = PW.el('img', { src: url, alt: naam, loading: 'lazy' });
      img.onclick = function() { openLightbox(url, naam); };
      div.appendChild(PW.el('div', { class: 'photo-card' }, [img, PW.el('span', { tekst: naam })]));
      div.hidden = false;
    });
  });
}

// ============================================================
// Streaming van één chat-call
// ============================================================
// onDelta(streamText) bij elke tekst, onSearch() wanneer het model gaat zoeken.
// Citaties worden voetnootmarkeringen ⟦n⟧ en een genummerde bronnenlijst.
function runChat(payload, onDelta, onSearch) {
  return fetch('/api/chat?' + Date.now(), { method: 'POST', headers: PW.apiHeaders(), body: JSON.stringify(payload) })
  .then(function(res) {
    if (!res.ok) return res.json().catch(function() { return {}; }).then(function(d) { throw new Error(d.error || 'Server fout'); });
    var rawText = '';
    var fout = null;
    var meta = [];          // kennisbankdocumenten met hun feiten (pw_meta)
    var blokken = {};       // index -> { type, cit: [] }
    var bronnen = [];       // genummerde bronnen
    var bronNrs = {};       // sleutel -> nummer
    var paginaDatum = {};   // url -> page_age van zoekresultaat
    var logId = null;       // id in het logboek (voor "klopt niet")
    var feitenGebruikt = [];

    function bronNr(sleutel, maak) {
      if (!bronNrs[sleutel]) {
        var b = maak();
        b.nr = bronnen.length + 1;
        bronnen.push(b);
        bronNrs[sleutel] = b.nr;
      }
      return bronNrs[sleutel];
    }

    function nummersVoor(c) {
      if (c.type === 'content_block_location' && meta[c.document_index]) {
        var doc = meta[c.document_index];
        var nrs = [];
        for (var i = c.start_block_index; i < c.end_block_index; i++) {
          var f = doc.feiten[i];
          if (!f) continue;
          if (feitenGebruikt.indexOf(f) < 0) feitenGebruikt.push(f);
          nrs.push(bronNr('kb:' + f.id, function() {
            return { soort: 'kb', titel: doc.titel + (f.deelgebied && f.deelgebied !== 'Hele gebied' ? ' · ' + f.deelgebied : ''),
                     datum: f.gecontroleerdOp, verouderd: f.verouderd, bron: f.bron, url: f.bronUrl, feit: f };
          }));
        }
        return nrs;
      }
      if (c.url) {
        return [bronNr('web:' + c.url, function() {
          return { soort: 'web', titel: c.title || c.url, url: c.url, datum: paginaDatum[c.url] || '' };
        })];
      }
      if (typeof c.document_index === 'number') {
        return [bronNr('doc:' + c.document_index, function() {
          return { soort: 'kb', titel: (c.document_title || 'Kennisbank').replace(/^Kennisbank: /, '') };
        })];
      }
      return [];
    }

    function verwerk(evt) {
      if (evt.type === 'pw_error') { fout = evt.message; return; }
      if (evt.type === 'pw_meta') { meta = evt.docs || []; return; }
      if (evt.type === 'pw_log') { logId = evt.id; return; }
      if (evt.type === 'content_block_start' && evt.content_block) {
        var cb = evt.content_block;
        blokken[evt.index] = { type: cb.type, cit: [] };
        if (cb.type === 'server_tool_use' && onSearch) onSearch();
        if (cb.type === 'web_search_tool_result' && Array.isArray(cb.content)) {
          cb.content.forEach(function(r) { if (r.url) paginaDatum[r.url] = r.page_age || ''; });
        }
        return;
      }
      if (evt.type === 'content_block_delta' && evt.delta) {
        if (evt.delta.type === 'text_delta') {
          var t = evt.delta.text;
          var bk = blokken[evt.index];
          // Bij de overgang naar een (geciteerd) tekstblok valt soms de spatie weg: "**Aantal**Er leeft"
          if (bk && !bk.gestart) {
            bk.gestart = true;
            if (/[0-9A-Za-zÀ-ÿ.,:;!?)*⟧]$/.test(rawText) && /^[0-9A-Za-zÀ-ÿ]/.test(t)) t = ' ' + t;
          }
          rawText += t;
          if (onDelta) onDelta(rawText);
        } else if (evt.delta.type === 'citations_delta' && evt.delta.citation && blokken[evt.index]) {
          blokken[evt.index].cit.push(evt.delta.citation);
        }
        return;
      }
      if (evt.type === 'content_block_stop' && blokken[evt.index]) {
        var bl = blokken[evt.index];
        if (bl.type === 'text' && bl.cit.length > 0) {
          var nrs = [];
          bl.cit.forEach(function(c) { nummersVoor(c).forEach(function(n) { if (nrs.indexOf(n) < 0) nrs.push(n); }); });
          nrs.sort(function(x, y) { return x - y; });
          if (nrs.length > 0) {
            var m = rawText.match(/\s*$/);
            var eind = rawText.length - m[0].length;
            rawText = rawText.slice(0, eind) + '⟦' + nrs.join(',') + '⟧' + rawText.slice(eind);
            if (onDelta) onDelta(rawText);
          }
        }
      }
    }

    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';
    function read() {
      return reader.read().then(function(result) {
        if (result.done) return { rawText: rawText, bronnen: bronnen, fout: fout, logId: logId, feiten: feitenGebruikt };
        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop();
        lines.forEach(function(line) {
          if (line.indexOf('data: ') !== 0) return;
          var data = line.slice(6).trim();
          if (!data || data === '[DONE]') return;
          try { verwerk(JSON.parse(data)); } catch (e) {}
        });
        return read();
      });
    }
    return read();
  });
}

// ============================================================
// "Klopt er iets niet?" onder een antwoord
// ============================================================
function maakKloptNiet(logId, antwoord) {
  var wrap = PW.el('div', { class: 'klopt-niet' });
  var knop = PW.el('button', { type: 'button', class: 'klopt-knop', html: PW.icoon('waarschuwing', { maat: 18, kleur: '#C8511F' }) + 'Klopt er iets niet?' });
  wrap.appendChild(knop);
  knop.onclick = function() {
    knop.hidden = true;
    var id = 'kn' + Math.random().toString(36).slice(2, 8);
    var label = PW.el('label', { for: id, class: 'sr-only', tekst: 'Wat klopt er niet?' });
    var ta = PW.el('textarea', { id: id, placeholder: 'Wat klopt er niet? Wat is het juiste feit (en waar staat het)?' });
    var stuur = PW.el('button', { type: 'button', class: 'knop knop-klein', tekst: 'Versturen' });
    var annuleer = PW.el('button', { type: 'button', class: 'knop knop-rand knop-klein', tekst: 'Annuleren' });
    var acties = PW.el('div', { class: 'klopt-acties' }, [stuur, annuleer]);
    annuleer.onclick = function() { label.remove(); ta.remove(); acties.remove(); knop.hidden = false; };
    stuur.onclick = function() {
      stuur.disabled = true;
      PW.api('/api/feedback', { actie: 'klopt-niet', logId: logId, toelichting: ta.value })
        .then(function(d) {
          if (PW.mijnMeldingen) PW.mijnMeldingen.voegToe({ id: d.id, soort: 'klopt-niet', tekst: ta.value.trim() || '(zonder toelichting) ' + (antwoord || '').slice(0, 80) });
          wrap.innerHTML = '';
          wrap.appendChild(PW.el('div', { class: 'klopt-ok', html: PW.icoon('vinkje', { maat: 18 }) + ' Bedankt! De beheerder bekijkt je melding.' }));
        })
        .catch(function(e) { stuur.disabled = false; showErr('Versturen mislukt: ' + e.message); });
    };
    wrap.appendChild(label);
    wrap.appendChild(ta);
    wrap.appendChild(acties);
    ta.focus();
  };
  return wrap;
}

// ============================================================
// Bronnenlijst onder een antwoord
// ============================================================
function maakBronnenlijst(bronnen) {
  var el = PW.el('div', { class: 'bronnen' }, [PW.el('div', { class: 'bronnen-kop', tekst: 'Bronnen' })]);
  bronnen.forEach(function(b) {
    var tekst = PW.el('span');
    if (b.soort === 'kb') {
      tekst.appendChild(document.createTextNode('Kennisbank · ' + b.titel));
      if (b.datum) {
        tekst.appendChild(document.createTextNode(' · '));
        tekst.appendChild(PW.el('span', { class: 'gecontroleerd-tekst', tekst: 'gecontroleerd ' + PW.nlDatumKort(b.datum) }));
      }
      if (b.verouderd) tekst.appendChild(PW.el('span', { class: 'oud', tekst: ' · mogelijk verouderd' }));
      if (b.bron) {
        tekst.appendChild(document.createTextNode(' · bron: '));
        if (b.url) tekst.appendChild(PW.el('a', { href: b.url, target: '_blank', rel: 'noopener', tekst: b.bron }));
        else tekst.appendChild(document.createTextNode(b.bron));
      }
    } else {
      tekst.appendChild(document.createTextNode('Website: '));
      tekst.appendChild(PW.el('a', { href: b.url, target: '_blank', rel: 'noopener', tekst: b.titel || b.url }));
      if (b.datum) tekst.appendChild(document.createTextNode(' · ' + b.datum));
      tekst.appendChild(PW.el('span', { class: 'web-label', tekst: ' · niet gecontroleerd door een boswachter' }));
    }
    el.appendChild(PW.el('div', { class: 'bron' }, [PW.el('span', { class: 'bron-nr', tekst: String(b.nr) }), tekst]));
  });
  return el;
}

// ============================================================
// Vraag stellen: fase 1 (snel antwoord) en fase 2 (aanvulling)
// ============================================================
var bezig = false;
function ask(q, label) {
  if (bezig) return;
  if (PW.huidigeView !== 'chat') PW.ga('#chat');
  bezig = true;
  $('btn').disabled = true;
  addUser(label || q);
  showTyping();
  var mode = PW.voorkeur.verhaal() ? 'storytelling' : 'normaal';
  var streamBubble = null;

  runChat(
    { messages: [{ role: 'user', content: q }], mode: mode, phase: 1 },
    function(rawText) {
      if (!streamBubble) { hideTyping(); streamBubble = createStreamBubble(); }
      updateStreamBubble(streamBubble, rawText);
    },
    function() { if (!streamBubble) setLoaderStatus('Zoekt actuele informatie…'); }
  )
  .then(function(r1) {
    bezig = false;
    $('btn').disabled = false;
    hideTyping();
    if (streamBubble) { streamBubble.remove(); streamBubble = null; }
    var fase1Tekst = r1.rawText || '';
    if (!fase1Tekst.trim()) { showErr(r1.fout || 'Er kwam geen antwoord. Probeer het opnieuw.'); return; }
    if (r1.fout) showErr(r1.fout);
    var rendered = addBot(fase1Tekst, r1.bronnen, r1.logId);
    rendered.logId = r1.logId;
    PW.meld('antwoord', { vraag: q, feiten: r1.feiten, rendered: rendered });
    startAanvulling(q, mode, fase1Tekst, rendered);
  })
  .catch(function(e) {
    bezig = false;
    hideTyping();
    if (streamBubble) streamBubble.remove();
    if (!navigator.onLine) showErr('Geen internetverbinding. Vragen stellen werkt alleen online: controleer je verbinding en probeer het opnieuw.');
    else showErr('Verbindingsfout: ' + e.message);
    $('btn').disabled = false;
  });
}
PW.vraag = ask;

// Kop normaliseren voor het matchen (kleine letters, emoji en leestekens weg)
function normKop(s) {
  return (s || '').replace(/[#*]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Tekst van fase 2 opdelen in secties { kop, body } op basis van ## regels
function parseSecties(tekst) {
  var secties = [];
  var huidig = null;
  tekst.split('\n').forEach(function(line) {
    var m = line.match(/^#{1,3}\s+(.*)$/);
    if (m) { huidig = { kop: m[1].trim(), body: [] }; secties.push(huidig); }
    else if (line.trim() !== '') {
      if (!huidig) { huidig = { kop: 'Overig', body: [] }; secties.push(huidig); }
      huidig.body.push(line);
    }
  });
  return secties.filter(function(s) { return s.body.join('').trim() !== ''; });
}

// Aanvulling van websites: zonder voetnootnummers (die horen bij de bronnenlijst
// van het hoofdantwoord); de bronnen van de aanvulling staan in een eigen lijst.
function maakAanvulBlok(bodyTekst) {
  return PW.el('div', { class: 'aanvul-inline', html: '<span class="aanvul-tag">Van website · niet gecontroleerd</span><div>' + render(zonderVoetnoten(bodyTekst)) + '</div>' });
}

function startAanvulling(q, mode, fase1Tekst, rendered) {
  if (!rendered || !rendered.bub) return;
  var ind = PW.el('div', { class: 'aanvul-indicator', html: '<span class="aanvul-dot"></span> Aanvullen met actuele informatie van websites…' });
  // Aanvullende tekst direct na het antwoord; de bronnen ervan vóór "Klopt er iets niet?"
  var naTekst = rendered.content.nextSibling;
  var voorKlopt = rendered.kloptEl || rendered.scrollBtn;
  rendered.bub.insertBefore(ind, naTekst);

  runChat({
    messages: [
      { role: 'user', content: q },
      { role: 'assistant', content: zonderVoetnoten(fase1Tekst) },
      { role: 'user', content: 'Vul dit antwoord aan volgens je instructies.' }
    ],
    mode: mode, phase: 2, logId: rendered.logId || null
  })
  .then(function(r2) {
    var tekst = (r2.rawText || '').trim();
    ind.remove();
    // Niets gevonden betekent niet dat het antwoord klopt: dan tonen we gewoon niets.
    if (!tekst || /^GEEN_AANVULLING\b/i.test(tekst)) return;

    var secties = parseSecties(tekst);
    var koppen = rendered.content.querySelectorAll('.bh');
    var overig = [];
    secties.forEach(function(sec) {
      var bodyTekst = sec.body.join('\n');
      var doel = null;
      var nk = normKop(sec.kop);
      if (nk !== 'overig') {
        for (var i = 0; i < koppen.length; i++) {
          var kt = normKop(koppen[i].textContent);
          if (kt === nk || (nk.length > 3 && (kt.indexOf(nk) === 0 || nk.indexOf(kt) === 0))) { doel = koppen[i]; break; }
        }
      }
      if (doel) {
        // Invoegen na de inhoud van deze sectie: vóór het volgende kopje (of aan het eind)
        var node = doel.nextSibling;
        while (node && !(node.nodeType === 1 && node.classList && node.classList.contains('bh'))) node = node.nextSibling;
        var blok = maakAanvulBlok(bodyTekst);
        if (node) rendered.content.insertBefore(blok, node); else rendered.content.appendChild(blok);
      } else {
        overig.push(bodyTekst);
      }
    });
    if (overig.length > 0) {
      rendered.bub.insertBefore(PW.el('div', { class: 'aanvul-blok', html:
        '<span class="aanvul-tag">Aanvulling van websites · niet gecontroleerd</span><div>' + render(zonderVoetnoten(overig.join('\n'))) + '</div>' }), rendered.content.nextSibling);
    }
    if (r2.bronnen && r2.bronnen.length > 0) {
      var bl = PW.el('div', { class: 'aanvul-blok' }, [PW.el('div', { class: 'aanvul-kop', tekst: 'Bronnen aanvulling · niet gecontroleerd door een boswachter' })]);
      r2.bronnen.forEach(function(b) {
        bl.appendChild(PW.el('div', { class: 'bl' }, [PW.el('a', { href: b.url, target: '_blank', rel: 'noopener', tekst: b.titel || b.url }),
          b.datum ? document.createTextNode(' · ' + b.datum) : null]));
      });
      rendered.bub.insertBefore(bl, voorKlopt);
    }
    if (window.addBirdButtons) addBirdButtons(rendered.bub);
  })
  .catch(function() { ind.remove(); });
}

// Tijdelijke ballon tijdens het streamen
function createStreamBubble() {
  var w = PW.el('div', { class: 'msg bot' }, [botAvatar(), PW.el('article', { class: 'bub' }, [PW.el('div', { class: 'stream-content' })])]);
  $('chatInhoud').appendChild(w);
  scrollNaar(w);
  return w;
}

function updateStreamBubble(wrapper, text) {
  wrapper.querySelector('.stream-content').innerHTML = render(text.replace(/\{\s*"soorten"[\s\S]*\}\s*$/g, ''));
}

// ============================================================
// Start
// ============================================================
function sendTxt() {
  var t = $('txt').value.trim();
  if (!t) return;
  $('txt').value = '';
  $('txt').style.height = '';
  $('txt').blur();
  ask(t);
}

function init() {
  toonGroet();
  bouwSuggesties();
  $('plusKnop').innerHTML = PW.icoon('plus', { maat: 22, kleur: '#5B524B', dikte: 2.4 });
  $('plusKnop').onclick = openOnderwerpen;
  $('btn').innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true"><path d="M3 11.5L21 3l-7.5 18-2.6-7.4z"/></svg>';
  $('btn').onclick = sendTxt;
  $('txt').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight + 4, 120) + 'px';
  });
  $('txt').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTxt(); }
  });
  $('weerbalk').onclick = wisselWeer;
  $('wIcoon').innerHTML = weerIcoon(1, 44);
  var sk = $('storyToggle');
  function toonVerhaal() { sk.setAttribute('aria-pressed', PW.voorkeur.verhaal() ? 'true' : 'false'); }
  sk.onclick = function() { PW.voorkeur.zetVerhaal(!PW.voorkeur.verhaal()); };
  PW.op('voorkeur', toonVerhaal);
  toonVerhaal();
  PW.op('login', toonGroet);
  laadWeer();
}

PW.registreerView('chat', { kop: 'Boswachter Assistent', verhaalKnop: true });
init();
})();
