// Toegang: wie is de gebruiker en is hij beheerder?
const crypto = require('crypto');

function gelijk(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Beheerder via het beheerwachtwoord (header X-Beheer-Wachtwoord).
async function beheerder(req) {
  const pw = req.headers['x-beheer-wachtwoord'];
  if (pw && process.env.BEHEER_WACHTWOORD && gelijk(pw, process.env.BEHEER_WACHTWOORD)) {
    return { id: 'wachtwoord', naam: 'beheerder', rol: 'beheerder' };
  }
  return null;
}

module.exports = { beheerder, gelijk };
