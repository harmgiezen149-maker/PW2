// Profiel: inlogstatus, voorkeuren (verhaalmodus, voorlezen, tekstgrootte), hulp en
// het beheerpaneel voor beheerders. Vervangt het oude tandwielvenster.
(function() {
var GROOTTES = [
  { id: 'normaal', titel: 'Normaal' },
  { id: 'groot', titel: 'Groot' },
  { id: 'extra', titel: 'Extra groot' }
];

function rij(opties) {
  var inhoud = PW.el('span', { class: 'lijst-tekst' }, [PW.el('span', { class: 'lijst-titel', tekst: opties.titel })]);
  if (opties.uitleg) inhoud.appendChild(PW.el('span', { class: 'lijst-uitleg', tekst: opties.uitleg }));
  var kinderen = [];
  if (opties.icoon) kinderen.push(PW.el('span', { class: 'lijst-icoon', html: PW.icoon(opties.icoon, { maat: 22, kleur: '#2256A0' }) }));
  kinderen.push(inhoud);
  if (opties.waarde) kinderen.push(PW.el('span', { class: 'lijst-waarde', tekst: opties.waarde }));
  if (opties.schakelaar) kinderen.push(opties.schakelaar);
  else kinderen.push(PW.el('span', { class: 'lijst-pijl', html: PW.icoon('rechts', { maat: 18, kleur: '#8A9199', dikte: 2.2 }) }));
  if (opties.schakelaar) return PW.el('div', { class: 'lijst-rij' }, kinderen);
  var a = PW.el(opties.href ? 'a' : 'button', { class: 'lijst-rij', href: opties.href || null, type: opties.href ? null : 'button',
    target: opties.nieuwVenster ? '_blank' : null, rel: opties.nieuwVenster ? 'noopener' : null }, kinderen);
  if (opties.klik) a.addEventListener('click', opties.klik);
  return a;
}

function openTekstgrootte() {
  PW.openBlad(function(blad, sluit) {
    blad.appendChild(PW.el('h2', { tekst: 'Tekstgrootte' }));
    blad.appendChild(PW.el('p', { class: 'uitleg', tekst: 'Geldt voor de hele app op dit apparaat.' }));
    var huidig = PW.voorkeur.tekstgrootte();
    var lijst = PW.el('div', { class: 'keuzes keuzes-1' });
    GROOTTES.forEach(function(g, i) {
      var k = PW.el('button', { type: 'button', class: 'keuze', 'aria-pressed': g.id === huidig ? 'true' : 'false',
        html: '<b style="font-size:' + [1, 1.125, 1.25][i] + 'rem">' + g.titel + '</b><span>Zo ziet tekst in antwoorden eruit.</span>' });
      k.onclick = function() { PW.voorkeur.zetTekstgrootte(g.id); sluit(); toon(); };
      lijst.appendChild(k);
    });
    blad.appendChild(lijst);
    blad.appendChild(PW.el('button', { type: 'button', class: 'knop knop-rand blad-sluit', tekst: 'Sluiten', onclick: sluit }));
  });
}

PW.uitlegBronnen = function() {
  PW.openBlad(function(blad, sluit) {
    blad.appendChild(PW.el('h2', { tekst: 'Waar komen de antwoorden vandaan?' }));
    var punten = [
      ['Gecontroleerde kennisbank', 'De assistent antwoordt met feiten die een beheerder heeft gecontroleerd. Bij elk feit staat een voetnootnummer; onderaan het antwoord zie je de bron en de datum van controle.'],
      ['Betrouwbare websites', 'Voor actuele informatie zoekt de assistent alleen op een vaste lijst websites, zoals natuurmonumenten.nl. Die informatie heet "niet gecontroleerd door een boswachter".'],
      ['Liever eerlijk dan gokken', 'Staat iets niet in de kennisbank, dan zegt de assistent dat het dat niet weet en verwijst naar de boswachter of natuurmonumenten.nl.'],
      ['Klopt er iets niet?', 'Meld het onder het antwoord of via Meldingen. De beheerder bekijkt het; niets komt in de app zonder goedkeuring.'],
      ['Interne informatie', 'Wie is ingelogd met een persoonlijke link, krijgt ook interne informatie. Die is gemarkeerd als "Intern".'],
      ['Privacy', 'Vragen en antwoorden worden 90 dagen bewaard om de antwoorden te verbeteren, zonder naam of IP-adres.']
    ];
    var lijst = PW.el('div', { class: 'uitleg-lijst' });
    punten.forEach(function(p) { lijst.appendChild(PW.el('div', {}, [PW.el('b', { tekst: p[0] }), PW.el('p', { tekst: p[1] })])); });
    blad.appendChild(lijst);
    blad.appendChild(PW.el('button', { type: 'button', class: 'knop knop-rand blad-sluit', tekst: 'Sluiten', onclick: sluit }));
  });
};

function toon() {
  var box = document.getElementById('profielInhoud');
  box.innerHTML = '';
  var g = PW.gebruiker;

  // Wie ben ik
  var kaart = PW.el('section', { class: 'kaart profiel-kaart' });
  kaart.appendChild(PW.el('div', { class: 'profiel-icoon' + (g ? '' : ' uit'), html: PW.icoon('profiel', { maat: 30, kleur: '#FFFFFF' }) }));
  var info = PW.el('div', { class: 'profiel-info' });
  if (g) {
    info.appendChild(PW.el('div', { class: 'profiel-naam', tekst: g.naam }));
    info.appendChild(PW.el('div', { class: 'profiel-rol', tekst: g.rol === 'beheerder' ? 'Beheerder' : 'Boswachter / vrijwilliger' }));
    info.appendChild(PW.el('div', { class: 'gecontroleerd', html: PW.icoon('slot', { maat: 15, dikte: 2.2 }) + 'Ingelogd · je krijgt ook interne informatie' }));
  } else {
    info.appendChild(PW.el('div', { class: 'profiel-naam', tekst: 'Niet ingelogd' }));
    info.appendChild(PW.el('div', { class: 'profiel-rol', tekst: 'Boswachters en vrijwilligers loggen in met hun persoonlijke link van de beheerder. Daarna krijg je ook interne informatie.' }));
  }
  kaart.appendChild(info);
  box.appendChild(kaart);

  // Voorkeuren
  var vk = PW.el('section', { class: 'kaart lijst' }, [PW.el('h2', { class: 'lijst-kop', tekst: 'Voorkeuren' })]);
  vk.appendChild(rij({ titel: 'Verhaalmodus', uitleg: 'Antwoorden als verhaal voor bezoekers',
    schakelaar: PW.schakelaar('Verhaalmodus', PW.voorkeur.verhaal(), PW.voorkeur.zetVerhaal) }));
  vk.appendChild(rij({ titel: 'Antwoorden voorlezen', uitleg: 'Lees elk antwoord automatisch voor',
    schakelaar: PW.schakelaar('Antwoorden voorlezen', PW.voorkeur.voorlezen(), PW.voorkeur.zetVoorlezen) }));
  var gr = GROOTTES.find(function(x) { return x.id === PW.voorkeur.tekstgrootte(); }) || GROOTTES[0];
  vk.appendChild(rij({ titel: 'Tekstgrootte', waarde: gr.titel, klik: openTekstgrootte }));
  box.appendChild(vk);

  // Hulp en beheer
  var hulp = PW.el('section', { class: 'kaart lijst' }, [PW.el('h2', { class: 'lijst-kop', tekst: 'Hulp en beheer' })]);
  hulp.appendChild(rij({ icoon: 'boek', titel: 'Handleiding', uitleg: 'Pdf, voor gebruikers en beheerders', href: '/docs/handleiding-boswachter-assistent.pdf', nieuwVenster: true }));
  hulp.appendChild(rij({ icoon: 'info', titel: 'Waar komen de antwoorden vandaan?', klik: PW.uitlegBronnen }));
  hulp.appendChild(rij({ icoon: 'meldingen', titel: 'Iets melden', uitleg: 'Iets klopt niet, of je hebt een suggestie', klik: function() { PW.ietsMelden(); } }));
  if (g && g.rol === 'beheerder') {
    hulp.appendChild(rij({ icoon: 'beheer', titel: 'Beheerpaneel', uitleg: 'Kennisbank, voorstellen en gebruikers', href: '/beheer.html' }));
  }
  box.appendChild(hulp);

  if (g) {
    box.appendChild(PW.el('button', { type: 'button', class: 'knop uitlog-knop', html: PW.icoon('uitloggen', { maat: 20 }) + 'Uitloggen',
      onclick: function() {
        if (!confirm('Uitloggen? Je hebt je persoonlijke link nodig om weer in te loggen.')) return;
        PW.uitloggen();
      } }));
  }
  box.appendChild(PW.el('p', { class: 'versie', tekst: 'Versie ' + PW.VERSIE + ' · Planken Wambuis · Natuurmonumenten' }));
}

document.getElementById('view-profiel').innerHTML = '<div class="view-scroll"><div class="view-inhoud" id="profielInhoud"></div></div>';
PW.registreerView('profiel', { kop: 'Profiel', tabblad: { titel: 'Profiel', icoon: 'profiel', volgorde: 5 }, toon: toon });
PW.op('login', function() { if (PW.huidigeView === 'profiel') toon(); });
})();
