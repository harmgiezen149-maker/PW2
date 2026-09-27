// Beheerpaneel: alle afbeeldingen in de app op één plek.
// - Logo in de kopbalk en app-icoon (tabblad en beginscherm)
// - Avatar van de assistent
// - Achtergrond achter de chat: staand (telefoon) en liggend (tablet en computer)
// - Foto per deelgebied (lijst en kop van het tabblad Gebieden)
// - Foto's bij kennisbankfeiten (Gebieden, Meldingen en de kaart)
// Elke afbeelding wordt in de browser verkleind voordat hij wordt verstuurd.
// Gebruikt de hulpfuncties uit beheer.html (el, api, melding, fout, datumNL, toonTab, OV, takjeSvg, pasBeheerLogo).
(function() {
var POSITIE_CSS = { boven: 'center top', midden: 'center center', onder: 'center bottom' };
var POSITIE_LABEL = { boven: 'Bovenkant tonen', midden: 'Midden tonen', onder: 'Onderkant tonen' };
var VLAK_LABEL = { blauw: 'Blauw vlak (zoals het takje nu)', wit: 'Wit vlak', geen: 'Geen vlak: los logo, mag breder zijn' };
var STANDAARD_AVATAR = '/assets/boswachter.svg';
var KB = 1024;
// Verkleinen tot het vak scherp gevuld is (geen vergroting) en comprimeren tot onder de grens
var JPEG = {
  staand: { doel: [1080, 1920], max: 2560, bytes: 1200 * KB, vul: '#BCCAD6' },
  liggend: { doel: [1920, 1080], max: 2560, bytes: 1200 * KB, vul: '#BCCAD6' },
  avatar: { doel: [400, 400], max: 800, bytes: 250 * KB, vul: '#DCE7F5' },
  gebied: { doel: [1600, 900], max: 2000, bytes: 600 * KB, vul: '#BCCAD6' },
  feit: { doel: [1200, 800], max: 1600, bytes: 500 * KB, vul: '#EDE8DC' }
};

function laadBeeld(bestand) {
  return new Promise(function(ok, nee) {
    if (!bestand) return nee(new Error('Kies eerst een afbeelding.'));
    if (bestand.size > 40e6) return nee(new Error('Dit bestand is te groot (meer dan 40 MB).'));
    var url = URL.createObjectURL(bestand);
    var img = new Image();
    img.onload = function() {
      if (!img.naturalWidth) { nee(new Error('Deze afbeelding heeft geen afmetingen. Kies een JPG, PNG of WebP.')); return; }
      ok(img);
    };
    img.onerror = function() { URL.revokeObjectURL(url); nee(new Error('Deze afbeelding kan de browser niet openen. Kies een JPG, PNG, WebP of SVG (een iPhone-foto eerst als JPG bewaren).')); };
    img.src = url;
  });
}

function bytesVan(dataUrl) { return Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4); }
function kb(n) { return Math.round(n / 1024) + ' kB'; }

function doek(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Foto's (achtergrond, avatar, gebied, feit): JPEG
function verkleinJpeg(img, soort) {
  var cfg = JPEG[soort];
  var w = img.naturalWidth, h = img.naturalHeight;
  var schaal = Math.min(1, Math.max(cfg.doel[0] / w, cfg.doel[1] / h), cfg.max / Math.max(w, h));
  for (var poging = 0; poging < 6; poging++) {
    var cw = Math.max(1, Math.round(w * schaal)), ch = Math.max(1, Math.round(h * schaal));
    var c = doek(cw, ch), ctx = c.getContext('2d');
    ctx.fillStyle = cfg.vul; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    var kwaliteiten = [0.86, 0.78, 0.7, 0.62];
    for (var i = 0; i < kwaliteiten.length; i++) {
      var data = c.toDataURL('image/jpeg', kwaliteiten[i]);
      if (bytesVan(data) <= cfg.bytes) return { data: data, breedte: cw, hoogte: ch, bytes: bytesVan(data) };
    }
    schaal *= 0.8;
  }
  throw new Error('De afbeelding kon niet klein genoeg worden gemaakt.');
}

// Logo: doorzichtigheid bewaren (PNG, anders WebP), hoogstens 600 × 180 pixels
function verkleinLogo(img) {
  var w = img.naturalWidth, h = img.naturalHeight;
  var schaal = Math.min(1, 600 / w, 180 / h);
  for (var poging = 0; poging < 5; poging++) {
    var cw = Math.max(1, Math.round(w * schaal)), ch = Math.max(1, Math.round(h * schaal));
    var c = doek(cw, ch);
    c.getContext('2d').drawImage(img, 0, 0, cw, ch);
    var data = c.toDataURL('image/png');
    if (bytesVan(data) > 190 * KB) data = c.toDataURL('image/webp', 0.9);
    if (data.indexOf('data:image/webp') === 0 || data.indexOf('data:image/png') === 0) {
      if (bytesVan(data) <= 190 * KB) return { data: data, breedte: cw, hoogte: ch, bytes: bytesVan(data) };
    }
    schaal *= 0.75;
  }
  throw new Error('Het logo kon niet klein genoeg worden gemaakt.');
}

// App-icoon: vierkant op een achtergrondkleur. 'vullend' = afbeelding vult het vlak; 'rand' = met ruimte eromheen.
// Het maskable-icoon krijgt altijd ruimte, want telefoons knippen daar een cirkel of druppel uit.
function maakIcoon(img, maat, vorm, kleur, maskable) {
  var c = doek(maat, maat), ctx = c.getContext('2d');
  ctx.fillStyle = kleur; ctx.fillRect(0, 0, maat, maat);
  var w = img.naturalWidth, h = img.naturalHeight;
  var ruimte = maskable ? (vorm === 'vullend' ? 0.8 : 0.58) : (vorm === 'vullend' ? 1 : 0.72);
  var s = vorm === 'vullend' && !maskable ? Math.max(maat / w, maat / h) : Math.min(maat * ruimte / w, maat * ruimte / h);
  if (vorm === 'vullend' && maskable) s = Math.max(maat * ruimte / w, maat * ruimte / h);
  var dw = w * s, dh = h * s;
  ctx.drawImage(img, (maat - dw) / 2, (maat - dh) / 2, dw, dh);
  var data = c.toDataURL('image/png');
  var grens = maat > 200 ? 480 * KB : 140 * KB;
  if (bytesVan(data) > grens) data = c.toDataURL('image/jpeg', 0.9);
  return { data: data, breedte: maat, hoogte: maat, bytes: bytesVan(data) };
}

function url(soort, m) { return '/api/achtergrond?soort=' + encodeURIComponent(soort) + '&v=' + encodeURIComponent(m.versie); }

function select(opties, waarde) {
  var s = el('select');
  opties.forEach(function(o) { var op = el('option', { value: o[0], text: o[1] }); if (o[0] === waarde) op.selected = true; s.appendChild(op); });
  return s;
}

function metaTekst(huidig, link, leeg) {
  if (huidig) {
    return 'Nu: ' + (huidig.breedte ? huidig.breedte + ' × ' + huidig.hoogte + ' pixels, ' : '') + kb(huidig.bytes || 0) +
      ' · opgeslagen ' + datumNL(huidig.datum) + (huidig.door ? ' door ' + huidig.door : '');
  }
  if (link) return 'Nu: een foto via een link (' + link.foto + '). Upload hier een eigen foto om die te vervangen.';
  return 'Nu: ' + leeg;
}

// ------------------------------------------------ voorbeelden
function voorbeeldAchtergrond(soort) {
  var v = el('div', { class: 'ag-voorbeeld ag-' + soort }, [el('div', { class: 'ag-balk' }),
    el('div', { class: 'ag-kaart' }, [el('b', { text: 'Goedemiddag!' }), el('span'), el('span')]), el('div', { class: 'ag-invoer' })]);
  v.zet = function(bron, pos) {
    v.style.backgroundImage = bron ? 'url("' + bron + '")' : 'url(/assets/landschap.svg)';
    v.style.backgroundPosition = bron ? pos : 'center bottom';
  };
  return v;
}

function voorbeeldAvatar() {
  var groot = el('div', { class: 'av-rond av-groot' }), klein = el('div', { class: 'av-rond av-klein' });
  var v = el('div', { class: 'av-voorbeeld' }, [
    el('div', { class: 'av-groet' }, [groot, el('div', { class: 'av-groettekst' }, [el('b', { text: 'Goedemiddag!' }), el('span'), el('span')])]),
    el('div', { class: 'av-antwoord' }, [klein, el('div', { class: 'av-bubbel' }, [el('span'), el('span'), el('span')])])
  ]);
  v.zet = function(bron, pos) {
    [groot, klein].forEach(function(r) { r.style.backgroundImage = 'url("' + (bron || STANDAARD_AVATAR) + '")'; r.style.backgroundPosition = bron ? pos : 'center'; });
  };
  return v;
}

function voorbeeldLogo() {
  var vak = el('div', { class: 'fo-logovak' });
  var v = el('div', { class: 'fo-kopbalk' }, [vak, el('span', { class: 'fo-koptitel', text: 'Boswachter Assistent' })]);
  v.zet = function(bron, pos, vlak) {
    vak.className = 'fo-logovak' + (bron ? ' logo-eigen logo-' + (vlak || 'blauw') : '');
    vak.innerHTML = '';
    if (bron) vak.appendChild(el('img', { src: bron, alt: '' }));
    else vak.innerHTML = takjeSvg();
  };
  return v;
}

function voorbeeldGebied(titel) {
  var banner = el('div', { class: 'fo-banner' }, [el('span', { class: 'fo-bron' })]);
  var mini = el('div', { class: 'fo-mini' });
  var v = el('div', { class: 'fo-gebiedvoorbeeld' }, [banner, el('div', { class: 'fo-gebiedrij' }, [mini, el('div', null, [el('b', { text: titel }), el('span', { text: 'Zo staat het in de lijst' })])])]);
  v.zet = function(bron, pos, vlak, maker) {
    [banner, mini].forEach(function(x) {
      x.style.backgroundImage = bron ? 'url("' + bron + '")' : '';
      x.style.backgroundPosition = pos || 'center';
      x.classList.toggle('fo-leeg', !bron);
    });
    banner.firstChild.textContent = bron ? (maker ? 'Foto: ' + maker : '') : 'Nu: getekende illustratie';
  };
  return v;
}

function voorbeeldFeit(tekst) {
  var beeld = el('div', { class: 'fo-feitbeeld' });
  var bron = el('div', { class: 'fo-feitbron' });
  var v = el('div', { class: 'fo-feitkaart' }, [beeld, bron, el('p', { text: tekst.length > 160 ? tekst.slice(0, 157) + '…' : tekst })]);
  v.zet = function(bron2, pos, vlak, maker) {
    beeld.style.display = bron2 ? '' : 'none';
    bron.style.display = bron2 ? '' : 'none';
    beeld.style.backgroundImage = bron2 ? 'url("' + bron2 + '")' : '';
    beeld.style.backgroundPosition = pos || 'center';
    bron.textContent = 'Foto: ' + (maker || '…');
  };
  return v;
}

// ------------------------------------------------ één afbeelding: kiezen, uitsnede, maker, opslaan, weghalen
// o: { soort, soortGroep, titel, uitleg, huidig, link, posities, vlakken, voorbeeld, maker: {label, vb, hint}, weg, wegVraag, leeg, terug, kaal }
function blok(o) {
  var s = el('div', { class: o.kaal ? 'ag-blok fo-kaal' : 'section ag-blok', 'data-soort': o.soort });
  if (o.titel) s.appendChild(el('h2', { text: o.titel }));
  if (o.uitleg) s.appendChild(el('p', { class: 'uitleg', text: o.uitleg }));
  var vb = o.voorbeeld;
  var nieuw = null;
  var groep = o.soortGroep || o.soort;
  var bestand = el('input', { type: 'file', accept: groep === 'logo' ? 'image/png,image/webp,image/svg+xml,image/jpeg,image/*' : 'image/jpeg,image/png,image/webp,image/*' });
  var status = el('div', { class: 'hint' });
  var positie = o.posities ? select(o.posities.map(function(p) { return [p, POSITIE_LABEL[p]]; }), o.huidig && o.huidig.positie || 'midden') : null;
  var vlak = o.vlakken ? select(o.vlakken.map(function(p) { return [p, VLAK_LABEL[p]]; }), o.huidig && o.huidig.vlak || 'blauw') : null;
  var maker = el('input', { placeholder: o.maker.vb });
  maker.value = o.huidig ? o.huidig.fotoBron : (o.link && o.link.fotoBron) || '';

  function toon() {
    var bron = nieuw ? nieuw.data : o.huidig ? url(o.soort, o.huidig) : o.link ? o.link.foto : null;
    vb.zet(bron, positie ? POSITIE_CSS[positie.value] : 'center', vlak ? vlak.value : null, maker.value);
  }
  if (positie) positie.onchange = toon;
  if (vlak) vlak.onchange = toon;
  maker.oninput = toon;
  bestand.onchange = function() {
    status.textContent = 'Afbeelding verwerken…';
    laadBeeld(bestand.files[0]).then(function(img) {
      nieuw = groep === 'logo' ? verkleinLogo(img) : verkleinJpeg(img, groep);
      status.textContent = 'Klaar om op te slaan: ' + nieuw.breedte + ' × ' + nieuw.hoogte + ' pixels, ' + kb(nieuw.bytes) + '.' + waarschuwing(img, groep);
      toon();
    }).catch(function(e) { nieuw = null; status.textContent = e.message; toon(); });
  };

  var opslaan = el('button', { class: 'btn primair', text: 'Opslaan' });
  opslaan.onclick = function() {
    if (!nieuw && !o.huidig) { melding('Kies eerst een afbeelding', true); return; }
    opslaan.disabled = true;
    var body = { soort: o.soort, fotoBron: maker.value };
    if (positie) body.positie = positie.value;
    if (vlak) body.vlak = vlak.value;
    if (nieuw) { body.data = nieuw.data; body.breedte = nieuw.breedte; body.hoogte = nieuw.hoogte; }
    api('achtergrond-opslaan', body).then(function() {
      melding('Opgeslagen. Binnen een minuut zichtbaar in de app.');
      toonTab('fotos', o.terug);
    }).catch(function(e) { opslaan.disabled = false; fout(e); });
  };
  var acties = el('div', { class: 'acties' }, [opslaan]);
  if (o.huidig || o.link) acties.appendChild(el('button', { class: 'btn gevaar', type: 'button', text: o.weg, onclick: function() {
    if (!confirm(o.wegVraag)) return;
    api('achtergrond-verwijderen', { soort: o.soort }).then(function() { melding('Weggehaald'); toonTab('fotos', o.terug); }).catch(fout);
  } }));

  var form = el('div', { class: 'ag-form' }, [el('div', { class: 'meta', text: metaTekst(o.huidig, o.link, o.leeg) }),
    el('label', { text: 'Afbeelding kiezen' }), bestand, status]);
  if (positie) {
    form.appendChild(el('label', { text: 'Welk deel is het belangrijkst?' }));
    form.appendChild(positie);
    form.appendChild(el('div', { class: 'hint', text: 'Bepaalt welk deel zichtbaar blijft als de afbeelding niet precies in het vak past.' }));
  }
  if (vlak) {
    form.appendChild(el('label', { text: 'Achter het logo' }));
    form.appendChild(vlak);
    form.appendChild(el('div', { class: 'hint', text: 'Een wit of gekleurd logo past op het blauwe vlak; een logo met eigen achtergrond op "wit" of "geen".' }));
  }
  form.appendChild(el('label', { text: o.maker.label }));
  form.appendChild(maker);
  form.appendChild(el('div', { class: 'hint', text: o.maker.hint }));
  form.appendChild(acties);
  s.appendChild(el('div', { class: 'ag-indeling' }, [vb, el('div', { class: 'form ag-velden' }, [form])]));
  toon();
  return s;
}

function waarschuwing(img, groep) {
  var w = img.naturalWidth, h = img.naturalHeight;
  if (groep === 'avatar') {
    return (Math.max(w, h) / Math.min(w, h) > 1.4 ? ' Let op: de afbeelding is niet vierkant; alleen het gekozen deel komt in het rondje.' : '') +
      (Math.min(w, h) < 200 ? ' De afbeelding is vrij klein en kan wat onscherp worden.' : '');
  }
  if (groep === 'logo') return h < 60 ? ' Het logo is vrij klein en kan wat onscherp worden.' : '';
  var liggend = w > h;
  if (groep === 'staand' && liggend) return ' Let op: dit is een liggende foto; op telefoons zie je alleen een smalle strook.';
  if ((groep === 'liggend' || groep === 'gebied') && !liggend) return ' Let op: dit is een staande foto; in het brede vak zie je alleen een strook.';
  var doel = JPEG[groep] && JPEG[groep].doel;
  return doel && Math.max(w, h) < Math.max(doel[0], doel[1]) * 0.6 ? ' De foto is vrij klein en kan wat onscherp worden.' : '';
}

// ------------------------------------------------ app-icoon: drie formaten uit één afbeelding
function icoonBlok(meta) {
  var huidig = meta['icoon-512'] && meta['icoon-192'] && meta['icoon-maskable'] ? meta['icoon-512'] : null;
  var s = el('div', { class: 'section ag-blok', 'data-soort': 'icoon' }, [el('h2', { text: 'App-icoon' }),
    el('p', { class: 'uitleg', text: 'Het icoon op het beginscherm van telefoons en in het tabblad van de browser. Kies een vierkante afbeelding van minstens 512 × 512 pixels, bijvoorbeeld het logo. Telefoons die de app al hebben geïnstalleerd, nemen een nieuw icoon soms pas na een tijd over.' })]);
  var img = null;
  var bestand = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml,image/*' });
  var status = el('div', { class: 'hint' });
  var vorm = select([['rand', 'Met ruimte eromheen, op de achtergrondkleur'], ['vullend', 'Afbeelding vult het hele icoon']], 'rand');
  var kleur = el('input', { type: 'color', value: '#1B2A55' });
  var maker = el('input', { placeholder: 'Bijv. Natuurmonumenten' });
  maker.value = huidig ? huidig.fotoBron : '';
  var groot = el('div', { class: 'fo-icoon' }), rond = el('div', { class: 'fo-icoon fo-rond' }), klein = el('div', { class: 'fo-icoon fo-klein' });
  var vb = el('div', { class: 'fo-iconen' }, [
    el('div', null, [groot, el('span', { text: 'Beginscherm' })]),
    el('div', null, [rond, el('span', { text: 'Android (rond)' })]),
    el('div', null, [klein, el('span', { text: 'Tabblad' })])
  ]);
  var gemaakt = null;
  function toon() {
    if (img) {
      gemaakt = { '192': maakIcoon(img, 192, vorm.value, kleur.value, false), '512': maakIcoon(img, 512, vorm.value, kleur.value, false),
        maskable: maakIcoon(img, 512, vorm.value, kleur.value, true) };
    }
    var b512 = gemaakt ? gemaakt['512'].data : huidig ? url('icoon-512', meta['icoon-512']) : '/icons/icon-512.png';
    var bM = gemaakt ? gemaakt.maskable.data : huidig ? url('icoon-maskable', meta['icoon-maskable']) : '/icons/icon-maskable-512.png';
    var b192 = gemaakt ? gemaakt['192'].data : huidig ? url('icoon-192', meta['icoon-192']) : '/icons/icon-192.png';
    groot.style.backgroundImage = 'url("' + b512 + '")';
    rond.style.backgroundImage = 'url("' + bM + '")';
    klein.style.backgroundImage = 'url("' + b192 + '")';
  }
  vorm.onchange = toon; kleur.oninput = toon;
  bestand.onchange = function() {
    status.textContent = 'Afbeelding verwerken…';
    laadBeeld(bestand.files[0]).then(function(i) {
      img = i;
      var w = i.naturalWidth, h = i.naturalHeight;
      status.textContent = 'Klaar om op te slaan: drie formaten (192, 512 en een rond bij te snijden versie).' +
        (Math.max(w, h) / Math.min(w, h) > 1.2 ? ' Let op: de afbeelding is niet vierkant.' : '') +
        (Math.min(w, h) < 256 ? ' De afbeelding is vrij klein en kan wat onscherp worden.' : '');
      toon();
    }).catch(function(e) { img = null; gemaakt = null; status.textContent = e.message; toon(); });
  };
  var opslaan = el('button', { class: 'btn primair', text: 'Opslaan' });
  opslaan.onclick = function() {
    if (!gemaakt) {
      if (!huidig) { melding('Kies eerst een afbeelding', true); return; }
    }
    opslaan.disabled = true;
    var stappen = [['icoon-192', '192'], ['icoon-512', '512'], ['icoon-maskable', 'maskable']];
    var keten = Promise.resolve();
    stappen.forEach(function(st) {
      keten = keten.then(function() {
        var body = { soort: st[0], fotoBron: maker.value };
        if (gemaakt) { body.data = gemaakt[st[1]].data; body.breedte = gemaakt[st[1]].breedte; body.hoogte = gemaakt[st[1]].hoogte; }
        return api('achtergrond-opslaan', body);
      });
    });
    keten.then(function() { melding('Opgeslagen. Het nieuwe icoon verschijnt binnen een minuut.'); toonTab('fotos', { naar: 'fo-logo' }); })
      .catch(function(e) { opslaan.disabled = false; fout(e); });
  };
  var acties = el('div', { class: 'acties' }, [opslaan]);
  if (huidig) acties.appendChild(el('button', { class: 'btn gevaar', type: 'button', text: 'Terug naar het standaardicoon', onclick: function() {
    if (!confirm('Het eigen app-icoon weghalen? De app toont dan weer het takje.')) return;
    Promise.all(['icoon-192', 'icoon-512', 'icoon-maskable'].map(function(x) { return api('achtergrond-verwijderen', { soort: x }); }))
      .then(function() { melding('Weggehaald'); toonTab('fotos', { naar: 'fo-logo' }); }).catch(fout);
  } }));
  var form = el('div', { class: 'ag-form' }, [
    el('div', { class: 'meta', text: huidig ? metaTekst(huidig) : 'Nu: het getekende takje (standaard).' }),
    el('label', { text: 'Afbeelding kiezen' }), bestand, status,
    el('label', { text: 'Vorm' }), vorm,
    el('label', { text: 'Achtergrondkleur' }), kleur,
    el('div', { class: 'hint', text: 'Zichtbaar rond de afbeelding en achter doorzichtige delen.' }),
    el('label', { text: 'Gemaakt door (verplicht)' }), maker,
    el('div', { class: 'hint', text: 'Gebruik alleen beeld dat je mag gebruiken. De naam staat in de app bij Profiel.' }),
    acties
  ]);
  s.appendChild(el('div', { class: 'ag-indeling' }, [vb, el('div', { class: 'form ag-velden' }, [form])]));
  toon();
  return s;
}

// ------------------------------------------------ inklapbaar item (deelgebied of feit)
function uitklap(id, kop, sub, beeldUrl, pos, inhoud, open) {
  var d = el('details', { class: 'section fo-item', id: id });
  if (open) d.setAttribute('open', '');
  var mini = el('span', { class: 'fo-duim' + (beeldUrl ? '' : ' fo-leeg') });
  if (beeldUrl) { mini.style.backgroundImage = 'url("' + beeldUrl + '")'; mini.style.backgroundPosition = pos || 'center'; }
  d.appendChild(el('summary', null, [mini, el('span', { class: 'fo-kop' }, [el('b', { text: kop }), el('span', { text: sub })])]));
  d.appendChild(inhoud);
  return d;
}

function groepKop(id, titel, uitleg) {
  var w = el('div', { class: 'fo-groep', id: id }, [el('h2', { text: titel })]);
  if (uitleg) w.appendChild(el('p', { class: 'uitleg', text: uitleg }));
  return w;
}

// ------------------------------------------------ het tabblad
window.tabFotos = function(inhoud, opties) {
  opties = opties || {};
  Promise.all([api('achtergrond'), api('kaart').catch(function() { return null; }), api('feiten').catch(function() { return null; })]).then(function(r) {
    var d = r[0], kaartData = r[1], feitenData = r[2];
    var meta = d.achtergrond || {};
    if (window.pasBeheerLogo) pasBeheerLogo(meta.logo ? { versie: meta.logo.versie, vlak: meta.logo.vlak } : null);
    inhoud.innerHTML = '';
    inhoud.appendChild(el('h1', { text: 'Foto\'s' }));
    inhoud.appendChild(el('p', { class: 'intro', text: 'Alle afbeeldingen in de app. Wijzigingen zijn binnen een minuut zichtbaar. Gebruik alleen beeld dat je mag gebruiken; de naam van de maker staat erbij in de app.' }));
    var nav = el('div', { class: 'fo-nav' });
    [['fo-logo', 'Logo en app-icoon'], ['fo-avatar', 'Avatar'], ['fo-achtergrond', 'Achtergrond'], ['fo-gebieden', 'Deelgebieden'], ['fo-feiten', 'Foto\'s bij feiten']].forEach(function(x) {
      nav.appendChild(el('button', { type: 'button', text: x[1], onclick: function() { document.getElementById(x[0]).scrollIntoView({ behavior: 'smooth', block: 'start' }); } }));
    });
    inhoud.appendChild(nav);

    // Logo en app-icoon
    inhoud.appendChild(groepKop('fo-logo', 'Logo en app-icoon'));
    inhoud.appendChild(blok({ soort: 'logo', titel: 'Logo in de kopbalk', huidig: meta.logo || null, vlakken: d.vlakken || ['blauw', 'wit', 'geen'],
      uitleg: 'Linksboven in de app en in het beheerpaneel. Het liefst een PNG of SVG met doorzichtige achtergrond. Zonder eigen logo toont de app het getekende takje.',
      voorbeeld: voorbeeldLogo(), leeg: 'het getekende takje (standaard).',
      maker: { label: 'Van (verplicht)', vb: 'Bijv. Natuurmonumenten', hint: 'Gebruik alleen een logo dat je mag gebruiken. De naam staat in de app bij Profiel.' },
      weg: 'Terug naar het takje', wegVraag: 'Het eigen logo weghalen? De app toont dan weer het getekende takje.', terug: { naar: 'fo-logo' } }));
    inhoud.appendChild(icoonBlok(meta));

    // Avatar
    inhoud.appendChild(groepKop('fo-avatar', 'Avatar'));
    inhoud.appendChild(blok({ soort: 'avatar', titel: 'Avatar van de assistent', huidig: meta.avatar || null, posities: d.posities,
      uitleg: 'Het rondje bij de begroeting en naast elk antwoord. Kies bij voorkeur een tekening of illustratie, geen foto van een echt persoon: zo blijft duidelijk dat er een computer antwoordt. Vierkant werkt het best, minstens 400 × 400 pixels.',
      voorbeeld: voorbeeldAvatar(), leeg: 'de getekende boswachter (standaard).',
      maker: { label: 'Gemaakt door (verplicht)', vb: 'Bijv. Natuurmonumenten / naam illustrator', hint: 'De naam staat in de app bij Profiel.' },
      weg: 'Terug naar de getekende boswachter', wegVraag: 'De eigen avatar weghalen? De app toont dan weer de getekende boswachter.', terug: { naar: 'fo-avatar' } }));

    // Achtergrond
    inhoud.appendChild(groepKop('fo-achtergrond', 'Achtergrond achter de chat',
      'De foto staat stil; vragen en antwoorden schuiven eroverheen, altijd op een witte kaart of een donkere balk, dus een drukke natuurfoto kan gerust. Is er maar één foto, dan geldt die voor alle schermen; zonder foto toont de app een getekend heidelandschap.'));
    [['staand', 'Telefoon (staande foto)', 'Voor schermen die hoger zijn dan breed. Ideaal: een staande foto van minstens 1080 × 1920 pixels.', 'Telefoons tonen dan de liggende foto, of de tekening als er geen foto is.'],
     ['liggend', 'Tablet en computer (liggende foto)', 'Voor schermen die breder zijn dan hoog. Ideaal: een liggende foto van minstens 1920 × 1080 pixels.', 'Tablets en computers tonen dan de staande foto, of de tekening als er geen foto is.']].forEach(function(x) {
      inhoud.appendChild(blok({ soort: x[0], titel: x[1], uitleg: x[2], huidig: meta[x[0]] || null, posities: d.posities,
        voorbeeld: voorbeeldAchtergrond(x[0]), leeg: 'geen; de app toont de tekening of de andere foto.',
        maker: { label: 'Foto van (verplicht)', vb: 'Bijv. Natuurmonumenten / naam fotograaf', hint: 'De naam staat klein in de hoek van de chat.' },
        weg: 'Foto weghalen', wegVraag: 'Deze achtergrondfoto weghalen? ' + x[3], terug: { naar: 'fo-achtergrond' } }));
    });

    // Deelgebieden
    inhoud.appendChild(groepKop('fo-gebieden', 'Deelgebieden',
      'Eén liggende foto per deelgebied: klein in de lijst van het tabblad Gebieden en groot bovenaan de pagina van het gebied. Zonder foto toont de app een tekening. Ideaal: minstens 1600 × 900 pixels.'));
    var cfgGebieden = (kaartData && kaartData.gebieden) || {};
    (OV && OV.deelgebieden || []).filter(function(g) { return g.slug !== 'heel'; }).forEach(function(g) {
      var soort = 'gebied-' + g.slug, huidig = meta[soort] || null;
      var c = cfgGebieden[g.slug] || {};
      var link = !huidig && c.foto ? { foto: c.foto, fotoBron: c.fotoBron } : null;
      var sub = huidig ? 'Eigen foto · ' + huidig.fotoBron : link ? 'Foto via een link · ' + (link.fotoBron || '') : 'Nog geen foto (tekening)';
      var inhoudBlok = blok({ soort: soort, soortGroep: 'gebied', huidig: huidig, link: link, posities: d.posities, kaal: true,
        voorbeeld: voorbeeldGebied(g.titel), leeg: 'geen foto; de app toont een tekening.',
        maker: { label: 'Foto van (verplicht)', vb: 'Bijv. Natuurmonumenten / naam fotograaf', hint: 'De naam staat onder de foto op de pagina van het gebied.' },
        weg: 'Foto weghalen', wegVraag: 'De foto van ' + g.titel + ' weghalen? De app toont dan weer de tekening.', terug: { naar: 'fo-gebied-' + g.slug, gebied: g.slug } });
      inhoud.appendChild(uitklap('fo-gebied-' + g.slug, g.titel, sub, huidig ? url(soort, huidig) : link ? link.foto : null,
        huidig ? POSITIE_CSS[huidig.positie] : null, inhoudBlok, opties.gebied === g.slug));
    });

    // Foto's bij feiten
    inhoud.appendChild(groepKop('fo-feiten', 'Foto\'s bij feiten',
      'Een foto bij een feit verschijnt bij dat feit in Gebieden, Meldingen en op de kaart. Handig bij plekken, soorten en afsluitingen.'));
    var feiten = (feitenData && feitenData.feiten) || [];
    var perId = {};
    feiten.forEach(function(f) { perId[f.id] = f; });
    function feitBlok(f, open) {
      var soort = 'feit-' + f.id, huidig = meta[soort] || null;
      var link = !huidig && f.foto ? { foto: f.foto, fotoBron: f.fotoBron } : null;
      return blok({ soort: soort, soortGroep: 'feit', huidig: huidig, link: link, posities: d.posities, kaal: true,
        voorbeeld: voorbeeldFeit(f.tekst), leeg: 'geen foto.',
        maker: { label: 'Foto van (verplicht)', vb: 'Bijv. Natuurmonumenten / naam fotograaf', hint: 'De naam staat onder de foto.' },
        weg: 'Foto weghalen', wegVraag: 'De foto bij dit feit weghalen?', terug: { naar: 'fo-feit-' + f.id, feit: f.id } });
    }
    var metFoto = feiten.filter(function(f) { return meta['feit-' + f.id] || f.foto; });
    if (!metFoto.length) inhoud.appendChild(el('p', { class: 'leeg', text: 'Er staan nog geen foto\'s bij feiten.' }));
    metFoto.forEach(function(f) {
      var huidig = meta['feit-' + f.id];
      inhoud.appendChild(uitklap('fo-feit-' + f.id, f.tekst.length > 90 ? f.tekst.slice(0, 87) + '…' : f.tekst,
        (huidig ? 'Eigen foto · ' + huidig.fotoBron : 'Foto via een link · ' + (f.fotoBron || '')) + (f.status === 'ingetrokken' ? ' · feit ingetrokken' : ''),
        huidig ? url('feit-' + f.id, huidig) : f.foto, huidig ? POSITIE_CSS[huidig.positie] : null, feitBlok(f), opties.feit === f.id));
    });
    // Nieuw: feit kiezen
    var zonder = feiten.filter(function(f) { return f.status === 'actief' && !meta['feit-' + f.id] && !f.foto; });
    var kies = el('select', null, [el('option', { value: '', text: '— kies een feit —' })]);
    (OV && OV.onderwerpen || []).forEach(function(o) {
      var lijst = zonder.filter(function(f) { return f.onderwerp === o.slug; });
      if (!lijst.length) return;
      var og = el('optgroup', { label: o.titel });
      lijst.forEach(function(f) { og.appendChild(el('option', { value: f.id, text: f.tekst.length > 110 ? f.tekst.slice(0, 107) + '…' : f.tekst })); });
      kies.appendChild(og);
    });
    var plek = el('div');
    kies.onchange = function() { plek.innerHTML = ''; if (perId[kies.value]) plek.appendChild(feitBlok(perId[kies.value])); };
    var nieuwVak = el('div', { class: 'section', id: 'fo-feit-nieuw' }, [el('h2', { text: 'Foto bij een feit zetten' }),
      el('div', { class: 'form', style: 'margin-top:0' }, [el('label', { text: 'Feit' }), kies,
        el('div', { class: 'hint', text: 'Alleen actieve feiten zonder foto. Een nieuw feit maak je eerst in de Kennisbank.' })]), plek]);
    inhoud.appendChild(nieuwVak);
    if (opties.feit && perId[opties.feit] && !metFoto.some(function(f) { return f.id === opties.feit; })) {
      kies.value = opties.feit;
      if (kies.value === opties.feit) kies.onchange();
      opties.naar = 'fo-feit-nieuw';
    }
    if (!feitenData) inhoud.appendChild(el('p', { class: 'leeg', text: 'De feiten konden niet worden geladen.' }));

    // Naar het gevraagde onderdeel
    var doel = opties.naar ? document.getElementById(opties.naar) : opties.gebied ? document.getElementById('fo-gebied-' + opties.gebied) : opties.feit ? document.getElementById('fo-feit-' + opties.feit) : null;
    if (doel) {
      if (doel.tagName === 'DETAILS') doel.setAttribute('open', '');
      setTimeout(function() { doel.scrollIntoView({ block: 'start' }); }, 30);
    }
  }).catch(fout);
};
})();
