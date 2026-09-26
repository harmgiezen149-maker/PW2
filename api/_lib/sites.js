// Startlijst met toegestane websites voor webzoeken (vraag 3b van het verbeterplan).
// De actuele lijst staat in de database en is te beheren in het beheerpaneel.
const STANDAARD_SITES = [
  // Natuurmonumenten
  'natuurmonumenten.nl',
  // Officiële instanties
  'bij12.nl', 'gelderland.nl', 'ede.nl', 'rijksoverheid.nl',
  // Soortenorganisaties
  'wolveninnederland.nl', 'sovon.nl', 'vogelbescherming.nl', 'vlinderstichting.nl',
  'ravon.nl', 'zoogdiervereniging.nl', 'waarneming.nl',
  // Regionaal nieuws
  'gld.nl', 'edestad.nl', 'barneveldsekrant.nl'
];

module.exports = { STANDAARD_SITES };
