// Kern van de app: iconen, inloggen, voorkeuren, tabbladen en kleine hulpfuncties.
// Gedeeld door chat, meldingen, gebieden, kaart en profiel.
var PW = window.PW = window.PW || {};
PW.VERSIE = '2.0';

// ============================================================
// Iconen (lijn-iconen, viewBox 24x24)
// ============================================================
var ICOON_PADEN = {
  chat: '<path d="M4 5h16v11H10l-6 4z"/><path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" stroke-linecap="round" stroke-width="2.6"/>',
  kaart: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  gebieden: '<path d="M12 3l6 8h-3.5l4.5 6H5l4.5-6H6z"/><path d="M12 17v4"/>',
  meldingen: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  profiel: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke-linecap="round"/>',
  rechts: '<path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/>',
  terug: '<path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round"/>',
  omhoog: '<path d="M6 15l6-6 6 6" stroke-linecap="round" stroke-linejoin="round"/>',
  voorlezen: '<path d="M4 9h4l5-4v14l-5-4H4z" stroke-linejoin="round"/><path d="M17 9a4 4 0 0 1 0 6" stroke-linecap="round"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="1.5"/>',
  waarschuwing: '<path d="M12 3l10 18H2z" stroke-linejoin="round"/><path d="M12 10v5M12 18v.01" stroke-linecap="round"/>',
  vinkje: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/>',
  slot: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  boek: '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z" stroke-linejoin="round"/><path d="M4 19V5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01" stroke-linecap="round"/>',
  beheer: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 13h8M8 16h5" stroke-linecap="round"/>',
  uitloggen: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" stroke-linecap="round" stroke-linejoin="round"/>',
  zoek: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5" stroke-linecap="round"/>',
  locatie: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke-linecap="round"/>',
  plek: '<path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z" stroke-linejoin="round"/><circle cx="12" cy="9" r="2.5"/>',
  sluiten: '<path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/>',
  tekst: '<path d="M4 7V5h11v2M9.5 5v14M7 19h5M14 12v-1.5h7V12M17.5 10.5V19M16 19h3" stroke-linecap="round" stroke-linejoin="round"/>',
  verhaal: '<path d="M5 4h10l4 4v12H5z" stroke-linejoin="round"/><path d="M9 11h6M9 15h6" stroke-linecap="round"/>',
  kalender: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4" stroke-linecap="round"/>',
  nieuws: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2z" stroke-linejoin="round"/><path d="M17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5" stroke-linecap="round"/>',
  route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" stroke-linecap="round"/>',
  lagen: '<path d="M12 3l9 5-9 5-9-5z" stroke-linejoin="round"/><path d="M3 13l9 5 9-5" stroke-linejoin="round"/>'
};

PW.icoon = function(naam, opties) {
  opties = opties || {};
  var maat = opties.maat || 24;
  var kleur = opties.kleur || 'currentColor';
  var dikte = opties.dikte || 2;
  return '<svg width="' + maat + '" height="' + maat + '" viewBox="0 0 24 24" fill="none" stroke="' + kleur +
    '" stroke-width="' + dikte + '" aria-hidden="true" focusable="false">' + (ICOON_PADEN[naam] || '') + '</svg>';
};

// Logo: takje (tijdelijk, tot het officiële beeldmerk er is)
PW.LOGO = '<svg width="26" height="26" viewBox="0 0 40 40" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M8 32 L32 8"/><path d="M14 26 l-6 -2 M14 26 l2 6 M19 21 l-7 -3 M19 21 l3 7 M24 16 l-6 -4 M24 16 l4 6 M29 11 l-4 -4 M29 11 l4 3"/></svg>';

// Getekende boswachter: een illustratie, geen foto van een echt persoon.
PW.AVATAR = '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" fill="#DCE7F5"/><path d="M10 64c2-13 11-19 22-19s20 6 22 19z" fill="#2F4A3A"/><path d="M26 45l6 8 6-8z" fill="#E9E2D0"/><circle cx="32" cy="33" r="10.5" fill="#E7B792"/><path d="M16 26h32l-5-3H21z" fill="#6B4E2E"/><path d="M23 23.5c0-6.5 4-10 9-10s9 3.5 9 10z" fill="#7C5B37"/><circle cx="28" cy="33" r="1.4" fill="#3B2A20"/><circle cx="36" cy="33" r="1.4" fill="#3B2A20"/><path d="M28.5 38c2 1.6 5 1.6 7 0" stroke="#3B2A20" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>';

// ============================================================
// Hulpfuncties
// ============================================================
PW.esc = function(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

PW.el = function(tag, attrs, inhoud) {
  var e = document.createElement(tag);
  if (attrs) Object.keys(attrs).forEach(function(k) {
    if (k === 'class') e.className = attrs[k];
    else if (k === 'html') e.innerHTML = attrs[k];
    else if (k === 'tekst') e.textContent = attrs[k];
    else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') e.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) e.setAttribute(k, attrs[k]);
  });
  (inhoud || []).forEach(function(c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return e;
};

PW.nlDatumKort = function(iso) {
  if (!iso) return '';
  var p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : (p.length === 2 ? p[1] + '-' + p[0] : iso);
};

PW.nlDatumLang = function(d) {
  var t = (d || new Date()).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

PW.opslag = {
  lees: function(k, standaard) { try { var v = localStorage.getItem(k); return v === null ? standaard : v; } catch (e) { return standaard; } },
  schrijf: function(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} },
  leesJSON: function(k, standaard) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null ? standaard : v; } catch (e) { return standaard; } },
  schrijfJSON: function(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

// ============================================================
// Inloggen met een persoonlijke link (…/?login=<code>)
// ============================================================
PW.gebruiker = null;

PW.token = function() { return PW.opslag.lees('pw_token', null); };

PW.apiHeaders = function() {
  var h = { 'Content-Type': 'application/json' };
  var t = PW.token();
  if (t) h['X-PW-Token'] = t;
  return h;
};

// POST naar de eigen API; gooit een fout met de melding van de server.
PW.api = function(pad, body) {
  return fetch(pad, { method: 'POST', headers: PW.apiHeaders(), body: JSON.stringify(body || {}) })
    .then(function(r) {
      return r.json().catch(function() { return {}; }).then(function(d) {
        if (!r.ok) throw new Error(d.error || 'Er ging iets mis (' + r.status + ')');
        return d;
      });
    });
};

(function leesLoginLink() {
  var m = location.search.match(/[?&]login=([A-Za-z0-9_-]{20,100})/);
  if (!m) return;
  PW.opslag.schrijf('pw_token', m[1]);
  history.replaceState(null, '', location.pathname + location.hash);
})();

PW.controleerLogin = function() {
  if (!PW.token()) { PW.gebruiker = null; PW.meld('login'); return Promise.resolve(null); }
  return PW.api('/api/auth', { actie: 'wie' })
    .then(function(d) {
      PW.gebruiker = d.gebruiker || null;
      // Ingetrokken of ongeldige link: code vergeten
      if (!PW.gebruiker) PW.opslag.schrijf('pw_token', null);
      PW.meld('login');
      return PW.gebruiker;
    })
    .catch(function() { PW.meld('login'); return null; });
};

PW.uitloggen = function() {
  PW.opslag.schrijf('pw_token', null);
  PW.gebruiker = null;
  PW.meld('login');
};

PW.voornaam = function() {
  if (!PW.gebruiker || !PW.gebruiker.naam) return '';
  return PW.gebruiker.naam.replace(/\(.*?\)/g, '').trim().split(/\s+/)[0] || '';
};

// Eenvoudige gebeurtenissen tussen onderdelen
var luisteraars = {};
PW.op = function(naam, fn) { (luisteraars[naam] = luisteraars[naam] || []).push(fn); };
PW.meld = function(naam, data) { (luisteraars[naam] || []).forEach(function(fn) { try { fn(data); } catch (e) { console.error(e); } }); };

// ============================================================
// Voorkeuren (alleen op dit apparaat)
// ============================================================
PW.voorkeur = {
  verhaal: function() { return PW.opslag.lees('storyMode', 'off') === 'on'; },
  zetVerhaal: function(aan) { PW.opslag.schrijf('storyMode', aan ? 'on' : 'off'); PW.meld('voorkeur'); },
  voorlezen: function() { return PW.opslag.lees('pw_voorlezen', 'uit') === 'aan'; },
  zetVoorlezen: function(aan) { PW.opslag.schrijf('pw_voorlezen', aan ? 'aan' : 'uit'); PW.meld('voorkeur'); },
  tekstgrootte: function() { return PW.opslag.lees('pw_tekstgrootte', 'normaal'); },
  zetTekstgrootte: function(g) { PW.opslag.schrijf('pw_tekstgrootte', g); pasTekstgrootteToe(); PW.meld('voorkeur'); }
};
function pasTekstgrootteToe() {
  var g = PW.voorkeur.tekstgrootte();
  document.documentElement.classList.toggle('tekst-groot', g === 'groot');
  document.documentElement.classList.toggle('tekst-extra', g === 'extra');
}
pasTekstgrootteToe();

// ============================================================
// Onderblad (bottom sheet)
// ============================================================
PW.openBlad = function(bouw) {
  var achter = PW.el('div', { class: 'blad-achter' });
  var blad = PW.el('div', { class: 'blad', role: 'dialog', 'aria-modal': 'true' }, [PW.el('div', { class: 'blad-greep' })]);
  achter.appendChild(blad);
  var vorigeFocus = document.activeElement;
  function sluit() {
    if (!achter.parentNode) return;
    achter.parentNode.removeChild(achter);
    document.removeEventListener('keydown', toets);
    if (vorigeFocus && vorigeFocus.focus) vorigeFocus.focus();
  }
  function toets(e) { if (e.key === 'Escape') sluit(); }
  achter.addEventListener('click', function(e) { if (e.target === achter) sluit(); });
  document.addEventListener('keydown', toets);
  bouw(blad, sluit);
  document.body.appendChild(achter);
  var eerste = blad.querySelector('h2');
  if (eerste) { eerste.setAttribute('tabindex', '-1'); eerste.focus(); }
  return sluit;
};

// ============================================================
// Tabbladen en schermen
// ============================================================
// Elk scherm registreert zichzelf. Schermen met een `tabblad` staan in de tabbalk;
// alleen tabbladen die af zijn, worden geregistreerd.
var views = {};

// view: { kop: 'titel' of functie(param), toon: functie(param), terug: '#hash' of functie(param),
//         verhaalKnop: bool, tab: id van het tabblad dat oplicht, tabblad: { titel, icoon, volgorde } }
PW.registreerView = function(id, view) { views[id] = view; };

function bouwTabbalk() {
  var nav = document.getElementById('tabbalk');
  nav.innerHTML = '';
  Object.keys(views).filter(function(id) { return views[id].tabblad; })
    .sort(function(a, b) { return views[a].tabblad.volgorde - views[b].tabblad.volgorde; })
    .forEach(function(id) {
      var t = views[id].tabblad;
      nav.appendChild(PW.el('a', { href: '#' + id, 'data-tab': id, html: PW.icoon(t.icoon, { maat: 26 }) + '<span>' + t.titel + '</span>' }));
    });
}

// Tellertje op een tabblad (bijv. nieuwe meldingen); 0 = weg
PW.zetTeller = function(tabId, n) {
  var a = document.querySelector('#tabbalk a[data-tab="' + tabId + '"]');
  if (!a) return;
  var t = a.querySelector('.teller');
  if (!n) { if (t) t.remove(); a.removeAttribute('aria-description'); return; }
  if (!t) { t = PW.el('span', { class: 'teller', 'aria-hidden': 'true' }); a.appendChild(t); }
  t.textContent = n > 9 ? '9+' : String(n);
  a.setAttribute('aria-description', n + ' nieuw');
};

// Aan/uit-schakelaar (role=switch)
PW.schakelaar = function(label, aan, bijWissel) {
  var knop = PW.el('button', { type: 'button', role: 'switch', class: 'switch', 'aria-checked': aan ? 'true' : 'false', 'aria-label': label });
  knop.onclick = function() {
    var nieuw = knop.getAttribute('aria-checked') !== 'true';
    knop.setAttribute('aria-checked', nieuw ? 'true' : 'false');
    bijWissel(nieuw);
  };
  return knop;
};

PW.huidigeView = null;
PW.ga = function(hash) { if (location.hash === hash) route(); else location.hash = hash; };

function route() {
  var h = (location.hash || '').replace(/^#/, '');
  var delen = h.split('/');
  var id = views[delen[0]] ? delen[0] : 'chat';
  var param = delen.slice(1).map(decodeURIComponent).join('/') || null;
  var view = views[id];
  Object.keys(views).forEach(function(k) {
    var el = document.getElementById('view-' + k);
    if (el) el.hidden = k !== id;
  });
  var scherm = document.getElementById('view-' + id);
  if (scherm && PW.huidigeView !== id) { var sc = scherm.querySelector('.view-scroll'); if (sc) sc.scrollTop = 0; }
  var tabId = view.tab || id;
  document.querySelectorAll('#tabbalk a').forEach(function(a) {
    if (a.getAttribute('data-tab') === tabId) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  var kop = typeof view.kop === 'function' ? view.kop(param) : view.kop;
  document.getElementById('kopTitel').textContent = kop || 'Boswachter Assistent';
  var terug = typeof view.terug === 'function' ? view.terug(param) : view.terug;
  var terugKnop = document.getElementById('kopTerug');
  terugKnop.hidden = !terug;
  terugKnop.onclick = function() { PW.ga(terug); };
  document.getElementById('kopLogo').hidden = !!terug;
  document.getElementById('storyToggle').hidden = !view.verhaalKnop;
  PW.huidigeView = id;
  if (view.toon) view.toon(param);
}

PW.start = function() {
  bouwTabbalk();
  document.getElementById('kopLogo').innerHTML = PW.LOGO;
  document.getElementById('kopTerug').innerHTML = PW.icoon('terug', { maat: 24, kleur: '#FFFFFF', dikte: 2.4 });
  window.addEventListener('hashchange', route);
  route();
  PW.controleerLogin();
};

// Tabbalk verbergen zolang het toetsenbord open is (meer ruimte op de telefoon)
document.addEventListener('focusin', function(e) {
  if (e.target && (e.target.tagName === 'TEXTAREA' || (e.target.tagName === 'INPUT' && /text|search/.test(e.target.type))) && window.innerWidth < 768) {
    document.body.classList.add('typt');
  }
});
// Pas na een korte pauze terugzetten: anders verspringt de knop waarop net getikt wordt.
document.addEventListener('focusout', function() {
  setTimeout(function() {
    var a = document.activeElement;
    if (!a || !(a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) document.body.classList.remove('typt');
  }, 250);
});

// PWA: service worker registreren (installeerbaar + basis-offline)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').catch(function() {});
  });
}
