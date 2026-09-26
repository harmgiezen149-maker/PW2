// Beheer-API: kennisbank, voorstellen en toegestane websites. Alleen voor de beheerder.
const kv = require('./_lib/kv');
const kb = require('./_lib/kennisbank');
const auth = require('./_lib/auth');
const logboek = require('./_lib/logboek');
const backup = require('./_lib/backup');
const nmcheck = require('./_lib/nmcheck');
const documentimport = require('./_lib/documentimport');
const meldstatus = require('./_lib/meldstatus');

const K_MELDINGEN = 'kb:meldingen';
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

// Welk melder-id hoort bij een voorstel: de oorspronkelijke melding, of de suggestie zelf.
function meldingVanVoorstel(v) {
  if (v.meldingId && meldstatus.geldigId(v.meldingId)) return v.meldingId;
  if (v.herkomst === 'gebruiker' && meldstatus.geldigId(v.id)) return v.id;
  return null;
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
        const [feiten, voorstellen, sites, meldingen, cronStatus, nmPaginas] = await Promise.all([
          kb.alleFeiten(), kb.alleVoorstellen(), kb.getSites(), kv.cmd('HLEN', K_MELDINGEN),
          kv.getJSON('cron:status', null), nmcheck.getPaginas()
        ]);
        const lijst = Object.values(feiten);
        const actief = lijst.filter(f => f.status === 'actief');
        return res.json({
          gebruiker,
          aantallen: {
            feiten: lijst.length,
            actief: actief.length,
            verlopen: actief.filter(f => kb.beoordeel(f, vandaag).verlopen).length,
            afgelopen: actief.filter(f => kb.beoordeel(f, vandaag).afgelopen).length,
            voorstellen: Object.keys(voorstellen).length,
            meldingen: meldingen || 0
          },
          cronStatus, nmPaginas,
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
        const cmds = [
          ['HSET', kb.K_FEITEN, doel.id, JSON.stringify(doel)],
          ['HDEL', kb.K_VOORSTELLEN, v.id]
        ];
        // Melder kan onder "Mijn meldingen" zien dat het verwerkt is
        const statusId = meldingVanVoorstel(v);
        if (statusId) cmds.push(meldstatus.cmd(statusId, 'verwerkt'));
        await kv.pipeline(cmds);
        return res.json({ ok: true, feit: metBeoordeling(doel, vandaag) });
      }

      case 'voorstel-afwijzen': {
        const v = kv.parse(await kv.cmd('HGET', kb.K_VOORSTELLEN, String(body.id || '')));
        const cmds = [['HDEL', kb.K_VOORSTELLEN, String(body.id || '')]];
        const statusId = v && meldingVanVoorstel(v);
        if (statusId) cmds.push(meldstatus.cmd(statusId, v.meldingId ? 'afgehandeld' : 'afgewezen'));
        await kv.pipeline(cmds);
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

      case 'meldingen': {
        const m = Object.values(await kv.hgetallJSON(K_MELDINGEN)).sort((a, b) => (b.tijd || '').localeCompare(a.tijd || ''));
        return res.json({ meldingen: m });
      }

      case 'melding-afhandelen': {
        const id = String(body.id || '');
        const cmds = [['HDEL', K_MELDINGEN, id]];
        if (meldstatus.geldigId(id)) cmds.push(meldstatus.cmd(id, 'afgehandeld'));
        await kv.pipeline(cmds);
        return res.json({ ok: true });
      }

      case 'melding-naar-voorstel': {
        const m = kv.parse(await kv.cmd('HGET', K_MELDINGEN, String(body.id || '')));
        if (!m) return res.status(404).json({ error: 'Melding niet gevonden' });
        const id = kb.nieuwId('fb');
        await kv.pipeline([
          ['HSET', kb.K_VOORSTELLEN, id, JSON.stringify({
            id, soort: 'nieuw', tekst: m.toelichting || '', herkomst: 'feedback', deelgebied: 'heel', type: 'jaarlijks',
            zichtbaarheid: 'openbaar', aangemaakt: new Date().toISOString(), meldingId: m.id,
            toelichting: m.vraag
              ? `Melding "klopt niet" bij de vraag: "${m.vraag.slice(0, 200)}". Schrijf het juiste feit en vul de bron in.`
              : 'Melding vanuit het tabblad Meldingen. Schrijf het juiste feit en vul de bron in.'
          })],
          ['HDEL', K_MELDINGEN, m.id],
          meldstatus.cmd(m.id, 'in-behandeling')
        ]);
        return res.json({ ok: true });
      }

      case 'logboek': {
        const vanaf = Math.max(0, Number(body.vanaf) || 0);
        const [items, totaal, recent] = await Promise.all([logboek.lijst(vanaf, 50), logboek.aantal(), logboek.lijst(0, 1000)]);
        const grens = new Date(Date.now() - 30 * 86400000).toISOString();
        const maand = recent.filter(e => e.tijd >= grens);
        const kosten = maand.reduce((t, e) => t + (e.kosten || 0) + ((e.aanvulling && e.aanvulling.kosten) || 0), 0);
        return res.json({ items, totaal, samenvatting: { vragen30: maand.length, kosten30: Math.round(kosten * 100) / 100 } });
      }

      case 'nm-paginas-opslaan': {
        if (!Array.isArray(body.paginas)) return res.status(400).json({ error: 'Geen lijst ontvangen' });
        const paginas = [...new Set(body.paginas.map(p => String(p).trim()).filter(p => /^https:\/\/www\.natuurmonumenten\.nl\/\S+$/.test(p)))];
        if (paginas.length === 0 || paginas.length > 10) return res.status(400).json({ error: 'Geef 1 tot 10 pagina\'s op natuurmonumenten.nl (https://www.natuurmonumenten.nl/…).' });
        await kv.setJSON(nmcheck.K_PAGINAS, paginas);
        return res.json({ ok: true, paginas });
      }

      case 'nm-controleren': {
        const nm = await nmcheck.controleer();
        const vorig = (await kv.getJSON('cron:status', null)) || {};
        await kv.setJSON('cron:status', Object.assign(vorig, { tijd: new Date().toISOString(), nm, handmatig: door }));
        return res.json({ ok: true, nm });
      }

      case 'document-importeren': {
        const bronNaam = tekstVeld(body.bronNaam, 200);
        const tekst = typeof body.tekst === 'string' ? body.tekst.trim() : '';
        if (bronNaam.length < 3) return res.status(400).json({ error: 'Vul de naam van het document in (wordt de bron).' });
        if (tekst.length < 50) return res.status(400).json({ error: 'Plak de tekst van het document.' });
        if (tekst.length > documentimport.MAX_TEKST) return res.status(400).json({ error: 'Tekst te lang voor één deel.' });
        const bronUrl = tekstVeld(body.bronUrl, 500);
        if (bronUrl && !/^https?:\/\/\S+$/.test(bronUrl)) return res.status(400).json({ error: 'De link moet met http:// of https:// beginnen.' });
        const bronDatum = DATUM.test(body.bronDatum || '') ? body.bronDatum : '';
        const r = await documentimport.importeer({ bronNaam, bronUrl, bronDatum, zichtbaarheid: body.zichtbaarheid, tekst, deel: tekstVeld(body.deel, 20) });
        return res.json(Object.assign({ ok: true }, r));
      }

      case 'backups': {
        return res.json({ backups: await backup.lijst(), laatste: await kv.cmd('GET', 'backup:laatste') });
      }

      case 'backup-maken': {
        return res.json(Object.assign({ ok: true }, await backup.maak('handmatig')));
      }

      case 'backup-download': {
        const inhoud = body.id === 'nu' ? await backup.maakInhoud() : await backup.get(body.id);
        if (!inhoud) return res.status(404).json({ error: 'Back-up niet gevonden' });
        return res.json({ inhoud });
      }

      case 'backup-terugzetten': {
        return res.json(Object.assign({ ok: true }, await backup.terugzetten(body.id)));
      }

      default:
        return res.status(400).json({ error: 'Onbekende actie' });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
