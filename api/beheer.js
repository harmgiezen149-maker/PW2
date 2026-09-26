// Beheer-API: kennisbank, voorstellen en toegestane websites. Alleen voor de beheerder.
const kv = require('./_lib/kv');
const kb = require('./_lib/kennisbank');
const auth = require('./_lib/auth');
const logboek = require('./_lib/logboek');
const backup = require('./_lib/backup');
const nmcheck = require('./_lib/nmcheck');
const documentimport = require('./_lib/documentimport');
const meldstatus = require('./_lib/meldstatus');
const kaart = require('./_lib/kaart');

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
    plekId: tekstVeld(inv.plekId, 60),
    foto: tekstVeld(inv.foto, 500),
    fotoBron: tekstVeld(inv.fotoBron, 120),
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
  if (!f.plekId) delete f.plekId;
  if (f.foto && !/^https:\/\/\S+$/.test(f.foto)) return { fout: 'De foto-link moet met https:// beginnen.' };
  if (f.foto && !f.fotoBron) return { fout: 'Vermeld van wie de foto is (je moet hem mogen gebruiken).' };
  if (!f.foto) { delete f.foto; delete f.fotoBron; }
  return { feit: f };
}

// Plek bij een feit: moet bestaan, en feiten over de wolf krijgen nooit een plek.
async function controleerPlek(feit) {
  if (!feit.plekId) return null;
  if (feit.onderwerp === 'wolf') return 'Feiten over de wolf krijgen geen plek op de kaart.';
  const p = kv.parse(await kv.cmd('HGET', kaart.K_PLEKKEN, feit.plekId));
  if (!p || p.status === 'ingetrokken') return 'De gekozen plek bestaat niet (meer).';
  return null;
}

const OPTIONELE_VELDEN = ['einddatum', 'startdatum', 'vervaltOp', 'maanden', 'bronUrl', 'bronDatum', 'plekId', 'foto', 'fotoBron'];

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
        const [feiten, voorstellen, sites, meldingen, cronStatus, nmPaginas, plekken, aantalRoutes] = await Promise.all([
          kb.alleFeiten(), kb.alleVoorstellen(), kb.getSites(), kv.cmd('HLEN', K_MELDINGEN),
          kv.getJSON('cron:status', null), nmcheck.getPaginas(), kaart.plekken(), kv.cmd('HLEN', kaart.K_ROUTES)
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
            meldingen: meldingen || 0,
            plekken: Object.keys(plekken).length,
            routes: aantalRoutes || 0
          },
          soorten: Object.entries(kaart.SOORTEN).map(([slug, titel]) => ({ slug, titel })),
          // Voor het feitformulier: aan welke plek hangt een feit
          plekkenKort: Object.values(plekken).filter(p => p.status !== 'ingetrokken')
            .map(p => ({ id: p.id, naam: p.naam, soort: p.soort })).sort((a, b) => a.naam.localeCompare(b.naam)),
          kaartMidden: kaart.MIDDEN,
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
        const plekFout = await controleerPlek(feit);
        if (plekFout) return res.status(400).json({ error: plekFout });
        const feiten = await kb.alleFeiten();
        const id = body.feit && body.feit.id;
        let doel;
        if (id) {
          const oud = feiten[id];
          if (!oud) return res.status(404).json({ error: 'Feit niet gevonden' });
          doel = Object.assign({}, oud, feit);
          for (const k of OPTIONELE_VELDEN) if (!(k in feit)) delete doel[k];
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
        const plekFout = await controleerPlek(feit);
        if (plekFout) return res.status(400).json({ error: plekFout });
        const feiten = await kb.alleFeiten();
        let doel;
        if (v.feitId && feiten[v.feitId]) {
          // Wijziging van een bestaand feit: de nieuwste gecontroleerde bron wint.
          const oud = feiten[v.feitId];
          doel = Object.assign({}, oud, feit, { status: 'actief' });
          for (const k of OPTIONELE_VELDEN) if (!(k in feit)) delete doel[k];
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

      // ------------------------------------------------ kaart en plekken
      case 'kaart': {
        const [plekken, routes, gebieden, grenzen, feiten] = await Promise.all([
          kaart.plekken(), kaart.routes(), kaart.gebiedInstellingen(), kaart.grenzen(), kb.alleFeiten()
        ]);
        // Per plek: welke actieve feiten eraan hangen
        const perPlek = {};
        for (const f of Object.values(feiten)) {
          if (f.plekId && f.status === 'actief') (perPlek[f.plekId] = perPlek[f.plekId] || []).push({ id: f.id, tekst: f.tekst, type: f.type });
        }
        return res.json({
          plekken: Object.values(plekken).map(p => Object.assign({}, p, { feiten: perPlek[p.id] || [] })).sort((a, b) => a.naam.localeCompare(b.naam)),
          routes: Object.values(routes).sort((a, b) => a.naam.localeCompare(b.naam)),
          gebieden, grenzen, soorten: kaart.SOORTEN, midden: kaart.MIDDEN, grenzenKaart: kaart.GRENZEN
        });
      }

      case 'plek-opslaan': {
        const { plek, fout } = kaart.valideerPlek(body.plek || {});
        if (fout) return res.status(400).json({ error: fout });
        const id = body.plek && body.plek.id;
        let doel;
        if (id) {
          const oud = kv.parse(await kv.cmd('HGET', kaart.K_PLEKKEN, String(id)));
          if (!oud) return res.status(404).json({ error: 'Plek niet gevonden' });
          doel = Object.assign({}, oud, plek);
          if (!('toelichting' in plek)) delete doel.toelichting;
          kb.metHistorie(doel, door, 'gewijzigd en gecontroleerd');
        } else {
          doel = Object.assign({ id: kb.nieuwId('plek'), status: 'actief', aangemaakt: new Date().toISOString() }, plek);
          kb.metHistorie(doel, door, 'aangemaakt');
        }
        doel.gecontroleerdOp = vandaag;
        doel.gecontroleerdDoor = door;
        await kv.hsetJSON(kaart.K_PLEKKEN, doel.id, doel);
        return res.json({ ok: true, plek: doel });
      }

      case 'plek-verwijderen': {
        // Verwijderen, en feiten die naar deze plek wezen loskoppelen (de feiten zelf blijven)
        const id = String(body.id || '');
        const feiten = await kb.alleFeiten();
        const cmds = [['HDEL', kaart.K_PLEKKEN, id]];
        for (const f of Object.values(feiten)) {
          if (f.plekId !== id) continue;
          delete f.plekId;
          kb.metHistorie(f, door, 'plek losgekoppeld (plek verwijderd)');
          cmds.push(['HSET', kb.K_FEITEN, f.id, JSON.stringify(f)]);
        }
        await kv.pipeline(cmds);
        return res.json({ ok: true, losgekoppeld: cmds.length - 1 });
      }

      case 'route-opslaan': {
        const { route, fout } = kaart.valideerRoute(body.route || {});
        if (fout) return res.status(400).json({ error: fout });
        const id = body.route && body.route.id;
        let doel;
        if (id) {
          const oud = kv.parse(await kv.cmd('HGET', kaart.K_ROUTES, String(id)));
          if (!oud) return res.status(404).json({ error: 'Route niet gevonden' });
          doel = Object.assign({}, oud, route);
          for (const k of ['bronUrl', 'feitId']) if (!(k in route)) delete doel[k];
          kb.metHistorie(doel, door, 'gewijzigd en gecontroleerd');
        } else {
          doel = Object.assign({ id: kb.nieuwId('route'), aangemaakt: new Date().toISOString() }, route);
          kb.metHistorie(doel, door, 'aangemaakt');
        }
        doel.gecontroleerdOp = vandaag;
        doel.gecontroleerdDoor = door;
        await kv.hsetJSON(kaart.K_ROUTES, doel.id, doel);
        return res.json({ ok: true, route: doel });
      }

      case 'route-verwijderen': {
        await kv.cmd('HDEL', kaart.K_ROUTES, String(body.id || ''));
        return res.json({ ok: true });
      }

      case 'gebied-opslaan': {
        const slug = String(body.slug || '');
        if (!kb.DEELGEBIEDEN.some(d => d.slug === slug && slug !== 'heel')) return res.status(400).json({ error: 'Onbekend deelgebied.' });
        const g = body.gebied || {};
        const c = { beschrijving: tekstVeld(g.beschrijving, 200), foto: tekstVeld(g.foto, 500), fotoBron: tekstVeld(g.fotoBron, 120) };
        if (c.foto && !/^https:\/\/\S+$/.test(c.foto)) return res.status(400).json({ error: 'De foto-link moet met https:// beginnen.' });
        if (c.foto && !c.fotoBron) return res.status(400).json({ error: 'Vermeld van wie de foto is (gebruiksrecht).' });
        if (g.lat !== undefined && g.lat !== null && g.lat !== '') {
          const lat = Math.round(Number(g.lat) * 1e6) / 1e6, lon = Math.round(Number(g.lon) * 1e6) / 1e6;
          if (!kaart.binnenGebied(lat, lon)) return res.status(400).json({ error: 'Het label ligt niet in of bij Planken Wambuis.' });
          c.lat = lat; c.lon = lon;
        }
        for (const k of Object.keys(c)) if (c[k] === '') delete c[k];
        const alle = await kaart.gebiedInstellingen();
        alle[slug] = c;
        const cmds = [['SET', kaart.K_GEBIEDEN, JSON.stringify(alle)]];
        if (g.grens !== undefined) {
          const { grens, fout } = kaart.valideerGrens(g.grens);
          if (fout) return res.status(400).json({ error: fout });
          cmds.push(grens ? ['SET', kaart.K_GRENS + slug, JSON.stringify(grens)] : ['DEL', kaart.K_GRENS + slug]);
        }
        await kv.pipeline(cmds);
        return res.json({ ok: true, gebied: c });
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
