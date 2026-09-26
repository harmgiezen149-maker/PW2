// Beheerpaneel: foto's in de app. De avatar van de assistent, en de achtergrond achter de chat
// (één staande foto voor telefoons en één liggende voor tablet en computer). Elke afbeelding
// wordt in de browser verkleind voordat hij wordt verstuurd.
// Gebruikt de hulpfuncties uit beheer.html (el, api, melding, fout, datumNL, toonTab).
(function() {
// Doelmaat in pixels: groot genoeg om het vak scherp te vullen, niet groter
var DOEL = { staand: [1080, 1920], liggend: [1920, 1080], avatar: [400, 400] };
var MAX_ZIJDE = { staand: 2560, liggend: 2560, avatar: 800 };
var MAX_BYTES = { staand: 1200 * 1024, liggend: 1200 * 1024, avatar: 250 * 1024 };
var VULKLEUR = { staand: '#BCCAD6', liggend: '#BCCAD6', avatar: '#DCE7F5' };  // achter doorzichtige delen
var POSITIE_CSS = { boven: 'center top', midden: 'center center', onder: 'center bottom' };
var STANDAARD_AVATAR = '/assets/boswachter.svg';

function laadBeeld(bestand) {
  return new Promise(function(ok, nee) {
    if (!bestand) return nee(new Error('Kies eerst een foto.'));
    if (bestand.size > 40e6) return nee(new Error('Dit bestand is te groot (meer dan 40 MB).'));
    var url = URL.createObjectURL(bestand);
    var img = new Image();
    img.onload = function() { ok(img); };
    img.onerror = function() { URL.revokeObjectURL(url); nee(new Error('Deze afbeelding kan de browser niet openen. Kies een JPG, PNG of WebP (een iPhone-foto eerst als JPG bewaren).')); };
    img.src = url;
  });
}

function bytesVan(dataUrl) { return Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4); }

// Verkleinen zodat de afbeelding het vak nog vult (geen vergroting), daarna comprimeren tot hij klein genoeg is
function verklein(img, soort) {
  var w = img.naturalWidth, h = img.naturalHeight;
  var d = DOEL[soort];
  var schaal = Math.min(1, Math.max(d[0] / w, d[1] / h), MAX_ZIJDE[soort] / Math.max(w, h));
  for (var poging = 0; poging < 6; poging++) {
    var cw = Math.max(1, Math.round(w * schaal)), ch = Math.max(1, Math.round(h * schaal));
    var c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    var ctx = c.getContext('2d');
    ctx.fillStyle = VULKLEUR[soort];
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    var kwaliteiten = [0.88, 0.8, 0.72, 0.64];
    for (var i = 0; i < kwaliteiten.length; i++) {
      var data = c.toDataURL('image/jpeg', kwaliteiten[i]);
      if (bytesVan(data) <= MAX_BYTES[soort]) return { data: data, breedte: cw, hoogte: ch, bytes: bytesVan(data) };
    }
    schaal *= 0.8;
  }
  throw new Error('De afbeelding kon niet klein genoeg worden gemaakt.');
}

// Voorbeeld achtergrond: foto met een donkere balk en een witte kaart erover, zoals in de app
function voorbeeldAchtergrond(soort) {
  var v = el('div', { class: 'ag-voorbeeld ag-' + soort });
  v.appendChild(el('div', { class: 'ag-balk' }));
  v.appendChild(el('div', { class: 'ag-kaart' }, [el('b', { text: 'Goedemiddag!' }), el('span'), el('span')]));
  v.appendChild(el('div', { class: 'ag-invoer' }));
  return v;
}

// Voorbeeld avatar: groot rondje (begroeting) en klein rondje naast een antwoord
function voorbeeldAvatar() {
  var groot = el('div', { class: 'av-rond av-groot' });
  var klein = el('div', { class: 'av-rond av-klein' });
  var v = el('div', { class: 'av-voorbeeld' }, [
    el('div', { class: 'av-groet' }, [groot, el('div', { class: 'av-groettekst' }, [el('b', { text: 'Goedemiddag!' }), el('span'), el('span')])]),
    el('div', { class: 'av-antwoord' }, [klein, el('div', { class: 'av-bubbel' }, [el('span'), el('span'), el('span')])])
  ]);
  v.zet = function(bron, pos) {
    [groot, klein].forEach(function(r) {
      r.style.backgroundImage = 'url("' + bron + '")';
      r.style.backgroundPosition = pos;
    });
  };
  return v;
}

var TEKST = {
  staand: {
    titel: 'Achtergrond · telefoon (staande foto)',
    uitleg: 'Voor schermen die hoger zijn dan breed. Ideaal: een staande foto van minstens 1080 × 1920 pixels.',
    posLabel: 'Welk deel van de foto is het belangrijkst?',
    posHint: 'Bepaalt welk deel zichtbaar blijft als de foto niet precies op het scherm past.',
    makerLabel: 'Foto van (verplicht)',
    makerVb: 'Bijv. Natuurmonumenten / naam fotograaf',
    makerHint: 'Gebruik alleen foto\'s die je mag gebruiken. De naam staat klein in de hoek van de chat.',
    weg: 'Foto weghalen',
    wegVraag: 'Deze achtergrondfoto weghalen? Telefoons tonen dan de liggende foto, of de tekening als er geen foto is.'
  },
  liggend: {
    titel: 'Achtergrond · tablet en computer (liggende foto)',
    uitleg: 'Voor schermen die breder zijn dan hoog. Ideaal: een liggende foto van minstens 1920 × 1080 pixels.',
    posLabel: 'Welk deel van de foto is het belangrijkst?',
    posHint: 'Bepaalt welk deel zichtbaar blijft als de foto niet precies op het scherm past.',
    makerLabel: 'Foto van (verplicht)',
    makerVb: 'Bijv. Natuurmonumenten / naam fotograaf',
    makerHint: 'Gebruik alleen foto\'s die je mag gebruiken. De naam staat klein in de hoek van de chat.',
    weg: 'Foto weghalen',
    wegVraag: 'Deze achtergrondfoto weghalen? Tablets en computers tonen dan de staande foto, of de tekening als er geen foto is.'
  },
  avatar: {
    titel: 'Avatar van de assistent',
    uitleg: 'Het rondje bij de begroeting en naast elk antwoord. Kies bij voorkeur een tekening of illustratie, geen foto van een echt persoon: zo blijft duidelijk dat er een computer antwoordt. Vierkant werkt het best, minstens 400 × 400 pixels.',
    posLabel: 'Welk deel komt in het rondje?',
    posHint: 'Alleen van belang als de afbeelding niet vierkant is: bij een staande afbeelding met het gezicht bovenaan kies je "Bovenkant tonen".',
    makerLabel: 'Gemaakt door (verplicht)',
    makerVb: 'Bijv. Natuurmonumenten / naam illustrator',
    makerHint: 'Gebruik alleen beeld dat je mag gebruiken. De naam staat in de app bij Profiel.',
    weg: 'Terug naar de getekende boswachter',
    wegVraag: 'De eigen avatar weghalen? De app toont dan weer de getekende boswachter.'
  }
};

function waarschuwing(img, soort) {
  var w = img.naturalWidth, h = img.naturalHeight;
  if (soort === 'avatar') {
    var verhouding = Math.max(w, h) / Math.min(w, h);
    return (verhouding > 1.4 ? ' Let op: de afbeelding is niet vierkant; alleen het gekozen deel komt in het rondje.' : '') +
      (Math.min(w, h) < 200 ? ' De afbeelding is vrij klein en kan wat onscherp worden.' : '');
  }
  var liggend = w > h;
  return ((soort === 'staand' && liggend) ? ' Let op: dit is een liggende foto; op telefoons zie je alleen een smalle strook.'
    : (soort === 'liggend' && !liggend) ? ' Let op: dit is een staande foto; op brede schermen zie je alleen een brede strook.' : '') +
    (Math.max(w, h) < Math.max(DOEL[soort][0], DOEL[soort][1]) ? ' De foto is vrij klein en kan wat onscherp worden.' : '');
}

function blok(soort, huidig, posities) {
  var t = TEKST[soort];
  var s = el('div', { class: 'section ag-blok' + (soort === 'avatar' ? ' av-blok' : '') }, [el('h2', { text: t.titel }), el('p', { class: 'uitleg', text: t.uitleg })]);
  var vb = soort === 'avatar' ? voorbeeldAvatar() : voorbeeldAchtergrond(soort);
  var nieuw = null;   // { data, breedte, hoogte, bytes }
  var bestand = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/*' });
  var status = el('div', { class: 'hint' });
  var positie = el('select');
  posities.forEach(function(p) {
    var o = el('option', { value: p, text: { boven: 'Bovenkant tonen', midden: 'Midden tonen', onder: 'Onderkant tonen' }[p] });
    if ((huidig ? huidig.positie : 'midden') === p) o.selected = true;
    positie.appendChild(o);
  });
  var maker = el('input', { placeholder: t.makerVb });
  maker.value = huidig ? huidig.fotoBron : '';

  function toon() {
    var bron = nieuw ? nieuw.data : (huidig ? '/api/achtergrond?soort=' + soort + '&v=' + encodeURIComponent(huidig.versie) : null);
    if (soort === 'avatar') { vb.zet(bron || STANDAARD_AVATAR, bron ? POSITIE_CSS[positie.value] : 'center center'); return; }
    vb.style.backgroundImage = bron ? 'url("' + bron + '")' : 'url(/assets/landschap.svg)';
    vb.style.backgroundPosition = bron ? POSITIE_CSS[positie.value] : 'center bottom';
  }
  positie.onchange = toon;
  bestand.onchange = function() {
    status.textContent = 'Afbeelding verwerken…';
    laadBeeld(bestand.files[0]).then(function(img) {
      nieuw = verklein(img, soort);
      status.textContent = 'Klaar om op te slaan: ' + nieuw.breedte + ' × ' + nieuw.hoogte + ' pixels, ' + Math.round(nieuw.bytes / 1024) + ' kB.' + waarschuwing(img, soort);
      toon();
    }).catch(function(e) { nieuw = null; status.textContent = e.message; toon(); });
  };

  var opslaan = el('button', { class: 'btn primair', text: 'Opslaan' });
  opslaan.onclick = function() {
    if (!nieuw && !huidig) { melding('Kies eerst een afbeelding', true); return; }
    opslaan.disabled = true;
    var body = { soort: soort, fotoBron: maker.value, positie: positie.value };
    if (nieuw) { body.data = nieuw.data; body.breedte = nieuw.breedte; body.hoogte = nieuw.hoogte; }
    api('achtergrond-opslaan', body).then(function() {
      melding('Opgeslagen. Binnen een minuut zichtbaar in de app.');
      toonTab('fotos');
    }).catch(function(e) { opslaan.disabled = false; fout(e); });
  };
  var acties = el('div', { class: 'acties' }, [opslaan]);
  if (huidig) acties.appendChild(el('button', { class: 'btn gevaar', text: t.weg, onclick: function() {
    if (!confirm(t.wegVraag)) return;
    api('achtergrond-verwijderen', { soort: soort }).then(function() { melding('Weggehaald'); toonTab('fotos'); }).catch(fout);
  } }));

  var form = el('div', { class: 'ag-form' }, [
    el('label', { text: soort === 'avatar' ? 'Afbeelding kiezen' : 'Foto kiezen' }), bestand, status,
    el('label', { text: t.posLabel }), positie,
    el('div', { class: 'hint', text: t.posHint }),
    el('label', { text: t.makerLabel }), maker,
    el('div', { class: 'hint', text: t.makerHint }),
    acties
  ]);
  var nu = soort === 'avatar' ? 'Huidige avatar: ' : 'Huidige foto: ';
  form.insertBefore(el('div', { class: 'meta', text: huidig
    ? nu + (huidig.breedte ? huidig.breedte + ' × ' + huidig.hoogte + ' pixels, ' : '') +
      Math.round((huidig.bytes || 0) / 1024) + ' kB · opgeslagen ' + datumNL(huidig.datum) + (huidig.door ? ' door ' + huidig.door : '')
    : nu + (soort === 'avatar' ? 'de getekende boswachter (standaard).' : 'geen; de app toont de tekening of de andere foto.') }), form.firstChild);
  s.appendChild(el('div', { class: 'ag-indeling' }, [vb, el('div', { class: 'form ag-velden' }, [form])]));
  toon();
  return s;
}

window.tabFotos = function(inhoud) {
  api('achtergrond').then(function(d) {
    inhoud.innerHTML = '';
    inhoud.appendChild(el('h1', { text: 'Foto\'s' }));
    inhoud.appendChild(el('p', { class: 'intro', text: 'De avatar van de assistent en de foto achter de chat. Wijzigingen zijn binnen een minuut zichtbaar in de app. De achtergrond staat stil; vragen en antwoorden schuiven eroverheen, altijd op een witte kaart of een donkere balk, dus een drukke natuurfoto kan gerust. Is er maar één achtergrondfoto, dan geldt die voor alle schermen; zonder foto toont de app een getekend heidelandschap.' }));
    inhoud.appendChild(blok('avatar', d.achtergrond.avatar || null, d.posities));
    inhoud.appendChild(blok('staand', d.achtergrond.staand || null, d.posities));
    inhoud.appendChild(blok('liggend', d.achtergrond.liggend || null, d.posities));
  }).catch(fout);
};
})();
