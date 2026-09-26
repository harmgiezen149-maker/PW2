// Beheerpaneel: achtergrondfoto achter de chat. Eén staande foto voor telefoons en één liggende
// voor tablet en computer. De foto wordt in de browser verkleind voordat hij wordt verstuurd.
// Gebruikt de hulpfuncties uit beheer.html (el, api, melding, fout, datumNL).
(function() {
var DOEL = { staand: [1080, 1920], liggend: [1920, 1080] };  // schermvullend, in pixels
var MAX_ZIJDE = 2560;
var MAX_BYTES = 1200 * 1024;
var POSITIE_CSS = { boven: 'center top', midden: 'center center', onder: 'center bottom' };

function laadBeeld(bestand) {
  return new Promise(function(ok, nee) {
    if (!bestand) return nee(new Error('Kies eerst een foto.'));
    if (bestand.size > 40e6) return nee(new Error('Dit bestand is te groot (meer dan 40 MB).'));
    var url = URL.createObjectURL(bestand);
    var img = new Image();
    img.onload = function() { ok(img); };
    img.onerror = function() { URL.revokeObjectURL(url); nee(new Error('Deze foto kan de browser niet openen. Kies een JPG, PNG of WebP (een iPhone-foto eerst als JPG bewaren).')); };
    img.src = url;
  });
}

function bytesVan(dataUrl) { return Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4); }

// Verkleinen zodat de foto het scherm nog vult (geen vergroting), daarna comprimeren tot hij klein genoeg is
function verklein(img, soort) {
  var w = img.naturalWidth, h = img.naturalHeight;
  var d = DOEL[soort];
  var schaal = Math.min(1, Math.max(d[0] / w, d[1] / h), MAX_ZIJDE / Math.max(w, h));
  for (var poging = 0; poging < 6; poging++) {
    var cw = Math.max(1, Math.round(w * schaal)), ch = Math.max(1, Math.round(h * schaal));
    var c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#BCCAD6';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    var kwaliteiten = [0.84, 0.76, 0.68, 0.6];
    for (var i = 0; i < kwaliteiten.length; i++) {
      var data = c.toDataURL('image/jpeg', kwaliteiten[i]);
      if (bytesVan(data) <= MAX_BYTES) return { data: data, breedte: cw, hoogte: ch, bytes: bytesVan(data) };
    }
    schaal *= 0.8;
  }
  throw new Error('De foto kon niet klein genoeg worden gemaakt.');
}

// Voorbeeld: foto met een donkere balk en een witte kaart erover, zoals in de app
function voorbeeld(soort) {
  var v = el('div', { class: 'ag-voorbeeld ag-' + soort });
  v.appendChild(el('div', { class: 'ag-balk' }));
  v.appendChild(el('div', { class: 'ag-kaart' }, [el('b', { text: 'Goedemiddag!' }), el('span'), el('span')]));
  v.appendChild(el('div', { class: 'ag-invoer' }));
  return v;
}

function blok(soort, huidig, posities) {
  var titel = soort === 'staand' ? 'Telefoon (staande foto)' : 'Tablet en computer (liggende foto)';
  var uitleg = soort === 'staand'
    ? 'Voor schermen die hoger zijn dan breed. Ideaal: een staande foto van minstens 1080 × 1920 pixels.'
    : 'Voor schermen die breder zijn dan hoog. Ideaal: een liggende foto van minstens 1920 × 1080 pixels.';
  var s = el('div', { class: 'section ag-blok' }, [el('h2', { text: titel }), el('p', { class: 'uitleg', text: uitleg })]);
  var vb = voorbeeld(soort);
  var nieuw = null;   // { data, breedte, hoogte, bytes }
  var bestand = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/*' });
  var status = el('div', { class: 'hint' });
  var positie = el('select');
  posities.forEach(function(p) {
    var o = el('option', { value: p, text: { boven: 'Bovenkant tonen', midden: 'Midden tonen', onder: 'Onderkant tonen' }[p] });
    if ((huidig ? huidig.positie : 'midden') === p) o.selected = true;
    positie.appendChild(o);
  });
  var maker = el('input', { placeholder: 'Bijv. Natuurmonumenten / naam fotograaf' });
  maker.value = huidig ? huidig.fotoBron : '';

  function toon() {
    var bron = nieuw ? nieuw.data : (huidig ? '/api/achtergrond?soort=' + soort + '&v=' + encodeURIComponent(huidig.versie) : null);
    vb.style.backgroundImage = bron ? 'url("' + bron + '")' : 'url(/assets/landschap.svg)';
    vb.style.backgroundPosition = bron ? POSITIE_CSS[positie.value] : 'center bottom';
  }
  positie.onchange = toon;
  bestand.onchange = function() {
    status.textContent = 'Foto verwerken…';
    laadBeeld(bestand.files[0]).then(function(img) {
      var liggend = img.naturalWidth > img.naturalHeight;
      nieuw = verklein(img, soort);
      var waarschuwing = (soort === 'staand' && liggend) ? ' Let op: dit is een liggende foto; op telefoons zie je alleen een smalle strook.'
        : (soort === 'liggend' && !liggend) ? ' Let op: dit is een staande foto; op brede schermen zie je alleen een brede strook.' : '';
      var klein = Math.max(img.naturalWidth, img.naturalHeight) < Math.max(DOEL[soort][0], DOEL[soort][1]) ? ' De foto is vrij klein en kan wat onscherp worden.' : '';
      status.textContent = 'Klaar om op te slaan: ' + nieuw.breedte + ' × ' + nieuw.hoogte + ' pixels, ' + Math.round(nieuw.bytes / 1024) + ' kB.' + waarschuwing + klein;
      toon();
    }).catch(function(e) { nieuw = null; status.textContent = e.message; toon(); });
  };

  var opslaan = el('button', { class: 'btn primair', text: 'Opslaan' });
  opslaan.onclick = function() {
    if (!nieuw && !huidig) { melding('Kies eerst een foto', true); return; }
    opslaan.disabled = true;
    var body = { soort: soort, fotoBron: maker.value, positie: positie.value };
    if (nieuw) { body.data = nieuw.data; body.breedte = nieuw.breedte; body.hoogte = nieuw.hoogte; }
    api('achtergrond-opslaan', body).then(function() {
      melding('Opgeslagen. Binnen een minuut zichtbaar in de app.');
      toonTab('achtergrond');
    }).catch(function(e) { opslaan.disabled = false; fout(e); });
  };
  var acties = el('div', { class: 'acties' }, [opslaan]);
  if (huidig) acties.appendChild(el('button', { class: 'btn gevaar', text: 'Foto weghalen', onclick: function() {
    if (!confirm('Deze achtergrondfoto weghalen? ' + (soort === 'staand' ? 'Telefoons' : 'Tablets en computers') + ' tonen dan de andere foto, of de tekening als er geen foto is.')) return;
    api('achtergrond-verwijderen', { soort: soort }).then(function() { melding('Weggehaald'); toonTab('achtergrond'); }).catch(fout);
  } }));

  var form = el('div', { class: 'ag-form' }, [
    el('label', { text: 'Foto kiezen' }), bestand, status,
    el('label', { text: 'Welk deel van de foto is het belangrijkst?' }), positie,
    el('div', { class: 'hint', text: 'Bepaalt welk deel zichtbaar blijft als de foto niet precies op het scherm past.' }),
    el('label', { text: 'Foto van (verplicht)' }), maker,
    el('div', { class: 'hint', text: 'Gebruik alleen foto\'s die je mag gebruiken. De naam staat klein in de hoek van de chat.' }),
    acties
  ]);
  if (huidig) form.insertBefore(el('div', { class: 'meta', text: 'Huidige foto: ' + (huidig.breedte ? huidig.breedte + ' × ' + huidig.hoogte + ' pixels, ' : '') +
    Math.round((huidig.bytes || 0) / 1024) + ' kB · opgeslagen ' + datumNL(huidig.datum) + (huidig.door ? ' door ' + huidig.door : '') }), form.firstChild);
  s.appendChild(el('div', { class: 'ag-indeling' }, [vb, el('div', { class: 'form ag-velden' }, [form])]));
  toon();
  return s;
}

window.tabAchtergrond = function(inhoud) {
  api('achtergrond').then(function(d) {
    inhoud.innerHTML = '';
    inhoud.appendChild(el('h1', { text: 'Achtergrondfoto' }));
    inhoud.appendChild(el('p', { class: 'intro', text: 'De foto staat stil achter de chat; vragen en antwoorden schuiven eroverheen. Tekst staat altijd op een witte kaart of een donkere balk, dus kies gerust een drukke natuurfoto. Is er maar één foto, dan geldt die voor alle schermen. Zonder foto toont de app een getekend heidelandschap.' }));
    inhoud.appendChild(blok('staand', d.achtergrond.staand || null, d.posities));
    inhoud.appendChild(blok('liggend', d.achtergrond.liggend || null, d.posities));
  }).catch(fout);
};
})();
