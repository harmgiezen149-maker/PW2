// Beheer-API: kennisbank, voorstellen en toegestane websites. Alleen voor de beheerder.
const kv = require('./_lib/kv');
const kb = require('./_lib/kennisbank');
const auth = require('./_lib/auth');
const { setSecurityHeaders, vandaagISO } = require('./_lib/http');

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

function tekstVeld(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// Controleert en normaliseert een feit uit het beheerpaneel. Geeft { feit } of { fout }.
function valideerFeit(inv) {
  const f = {
    tekst: tekstVeld(inv.tekst, 2000),
    onderwerp: inv.onderwerp,
    deelgebied: inv.deelgebied || 'heel',
    type: inv.type,
    bron: tekstVeld(inv.bron, 200),
    bronUrl: tekstVeld(inv.bronUrl, 500),
    bronDatum: tekstVeld(inv.bronDatum, 10),
    zichtbaarheid: inv.zichtbaarheid === 'intern' ? 'intern' : 'openbaar',
    einddatum: tekstVeld(inv.einddatum, 10),
    startdatum: tekstVeld(inv.startdatum, 10),
    vervaltOp: tekstVeld(inv.vervaltOp, 10),
    maanden: Array.isArray(inv.maanden) ? [...new Set(inv.maanden.map(Number).filter(m => m >= 1 && m <= 12))].sort((a, b) => a - b) : []
  };
  if (f.tekst.length < 5) return { fout: 'De tekst van het feit is te kort.' };
  if (!kb.ONDERWERPEN.some(o => o.slug === f.onderwerp)) return { fout: 'Kies een onderwerp.' };
  if (!kb.DEELGEBIEDEN.some(d => d.slug === f.deelgebied)) return { fout: 'Onbekend deelgebied.' };
  if (!kb.TYPES[f.type]) return { fout: 'Kies een type (vast, jaarlijks, seizoen of tijdelijk).' };
  if (!f.bron) return { fout: 'Vul de bron in (bijv. Kiek-document, nm.nl-pagina of naam boswachter).' };
  if (f.bronUrl && !/^https?:\/\/\S+$/.test(f.bronUrl)) return { fout: 'De bron-URL moet met http:// of https:// beginnen.' };
  for (const k of ['bronDatum', 'einddatum', 'startdatum', 'vervaltOp']) {
    if (f[k] && !DATUM.test(f[k])) return { fout: `Datum ${k} moet de vorm JJJJ-MM-DD hebben.` };
    if (!f[k]) delete f[k];
  }
  if (f.type === 'tijdelijk' && !f.einddatum) return { fout: 'Een tijdelijk feit heeft een einddatum nodig.' };
  if (f.type !== 'tijdelijk') { delete f.einddatum; delete f.startdatum; }
  if (f.type !== 'seizoen') delete f.maanden;
  if (!f.bronUrl) delete f.bronUrl;
  return { feit: f };
}

function metBeoordeling(f, vandaag) {
  return Object.assign({}, f, { beoordeling: kb.beoordeel(f, vandaag) });
}

module.exports = async function handler(req, res) {
  setSecurityHeaders(res, req.headers.origin, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const gebruiker = await auth.beheerder(req);
  if (!gebruiker) {
    return res.status(401).json({ error: 'Geen toegang. Open je persoonlijke beheerderslink.' });
  }

  const body = req.body || {};
  const door = gebruiker.naam;
  const vandaag = vandaagISO();

  try {
    switch (body.actie) {
      case 'overzicht': {
        const [feiten, voorstellen, sites] = await Promise.all([kb.alleFeiten(), kb.alleVoorstellen(), kb.getSites()]);
        const lijst = Object.values(feiten);
        const actief = lijst.filter(f => f.status === 'actief');
        return res.json({
          gebruiker,
          aantallen: {
            feiten: lijst.length,
            actief: actief.length,
            verlopen: actief.filter(f => kb.beoordeel(f, vandaag).verlopen).length,
            afgelopen: actief.filter(f => kb.beoordeel(f, vandaag).afgelopen).length,
            voorstellen: Object.keys(voorstellen).length
          },
          onderwerpen: kb.ONDERWERPEN, deelgebieden: kb.DEELGEBIEDEN,
          types: Object.entries(kb.TYPES).map(([slug, t]) => ({ slug, titel: t.titel, maanden: t.maanden })),
          sites
        });
      }

      case 'feiten': {
        const feiten = await kb.alleFeiten();
        return res.json({ feiten: Object.values(feiten).map(f => metBeoordeling(f, vandaag)) });
      }

      case 'feit-opslaan': {
        const { feit, fout } = valideerFeit(body.feit || {});
        if (fout) return res.status(400).json({ error: fout });
        const feiten = await kb.alleFeiten();
        const id = body.feit && body.feit.id;
        let doel;
        if (id) {
          const oud = feiten[id];
          if (!oud) return res.status(404).json({ error: 'Feit niet gevonden' });
          doel = Object.assign({}, oud, feit);
          for (const k of ['einddatum', 'startdatum', 'vervaltOp', 'maanden', 'bronUrl', 'bronDatum']) if (!(k in feit)) delete doel[k];
          kb.metHistorie(doel, door, 'gewijzigd en gecontroleerd', oud.tekst !== feit.tekst ? { oudeTekst: oud.tekst } : {});
        } else {
          doel = Object.assign({ id: kb.nieuwId('feit'), status: 'actief', aangemaakt: new Date().toISOString() }, feit);
          kb.metHistorie(doel, door, 'aangemaakt');
        }
        doel.gecontroleerdOp = vandaag;
        doel.gecontroleerdDoor = door;
        await kv.hsetJSON(kb.K_FEITEN, doel.id, doel);
        return res.json({ ok: true, feit: metBeoordeling(doel, vandaag) });
      }

      case 'feit-gecontroleerd':
      case 'feit-intrekken':
      case 'feit-heractiveren': {
        const feiten = await kb.alleFeiten();
        const f = feiten[body.id];
        if (!f) return res.status(404).json({ error: 'Feit niet gevonden' });
        if (body.actie === 'feit-gecontroleerd') {
          f.gecontroleerdOp = vandaag; f.gecontroleerdDoor = door;
          kb.metHistorie(f, door, 'gecontroleerd');
        } else if (body.actie === 'feit-intrekken') {
          f.status = 'ingetrokken';
          kb.metHistorie(f, door, 'ingetrokken', body.reden ? { reden: tekstVeld(body.reden, 300) } : {});
        } else {
          f.status = 'actief';
          kb.metHistorie(f, door, 'heractiveerd');
        }
        await kv.hsetJSON(kb.K_FEITEN, f.id, f);
        return res.json({ ok: true, feit: metBeoordeling(f, vandaag) });
      }

      case 'voorstellen': {
        const [voorstellen, feiten] = await Promise.all([kb.alleVoorstellen(), kb.alleFeiten()]);
        const lijst = Object.values(voorstellen)
          .map(v => Object.assign({}, v, { huidigFeit: v.feitId && feiten[v.feitId] ? feiten[v.feitId] : null }))
          .sort((a, b) => (b.aangemaakt || '').localeCompare(a.aangemaakt || ''));
        return res.json({ voorstellen: lijst });
      }

      case 'voorstel-goedkeuren': {
        const voorstellen = await kb.alleVoorstellen();
        const v = voorstellen[body.id];
        if (!v) return res.status(404).json({ error: 'Voorstel niet gevonden' });
        const { feit, fout } = valideerFeit(body.feit || {});
        if (fout) return res.status(400).json({ error: fout });
        const feiten = await kb.alleFeiten();
        let doel;
        if (v.feitId && feiten[v.feitId]) {
          // Wijziging van een bestaand feit: de nieuwste gecontroleerde bron wint.
          const oud = feiten[v.feitId];
          doel = Object.assign({}, oud, feit, { status: 'actief' });
          for (const k of ['einddatum', 'startdatum', 'vervaltOp', 'maanden', 'bronUrl', 'bronDatum']) if (!(k in feit)) delete doel[k];
          kb.metHistorie(doel, door, 'gewijzigd via voorstel', { oudeTekst: oud.tekst, herkomst: v.herkomst });
        } else {
          doel = Object.assign({ id: kb.nieuwId('feit'), status: 'actief', aangemaakt: new Date().toISOString() }, feit);
          kb.metHistorie(doel, door, 'aangemaakt via voorstel', { herkomst: v.herkomst });
        }
        doel.gecontroleerdOp = vandaag;
        doel.gecontroleerdDoor = door;
        await kv.pipeline([
          ['HSET', kb.K_FEITEN, doel.id, JSON.stringify(doel)],
          ['HDEL', kb.K_VOORSTELLEN, v.id]
        ]);
        return res.json({ ok: true, feit: metBeoordeling(doel, vandaag) });
      }

      case 'voorstel-afwijzen': {
        await kv.cmd('HDEL', kb.K_VOORSTELLEN, String(body.id || ''));
        return res.json({ ok: true });
      }

      case 'sites-opslaan': {
        if (!Array.isArray(body.sites)) return res.status(400).json({ error: 'Geen lijst ontvangen' });
        const sites = [...new Set(body.sites.map(kb.normaliseerSite).filter(Boolean))];
        if (sites.length === 0) return res.status(400).json({ error: 'De lijst mag niet leeg zijn.' });
        if (sites.length > 60) return res.status(400).json({ error: 'Maximaal 60 websites.' });
        await kv.setJSON(kb.K_SITES, sites);
        return res.json({ ok: true, sites });
      }

      case 'gebruikers': {
        const alle = await auth.alleGebruikers();
        const lijst = Object.values(alle).map(auth.zonderGeheim)
          .sort((a, b) => (a.ingetrokken - b.ingetrokken) || a.naam.localeCompare(b.naam));
        return res.json({ gebruikers: lijst });
      }

      case 'gebruiker-maken': {
        const naam = tekstVeld(body.naam, 60);
        if (naam.length < 2) return res.status(400).json({ error: 'Vul een naam in.' });
        if (!auth.ROLLEN.includes(body.rol)) return res.status(400).json({ error: 'Kies een rol.' });
        return res.json(await auth.maakLink({ naam, rol: body.rol, door }));
      }

      case 'gebruiker-nieuwe-link': {
        return res.json(await auth.maakLink({ id: String(body.id || ''), door }));
      }

      case 'gebruiker-intrekken': {
        const alle = await auth.alleGebruikers();
        const doel = alle[body.id];
        if (!doel) return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        const actieveBeheerders = Object.values(alle).filter(g => g.rol === 'beheerder' && !g.ingetrokken);
        if (doel.rol === 'beheerder' && !doel.ingetrokken && actieveBeheerders.length === 1) {
          return res.status(400).json({ error: 'Dit is de laatste beheerder. Maak eerst een andere beheerder aan.' });
        }
        return res.json({ ok: true, gebruiker: await auth.intrekken(doel.id, door) });
      }

      default:
        return res.status(400).json({ error: 'Onbekende actie' });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
