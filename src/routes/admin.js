const express = require('express');
const router = express.Router();
const store = require('../dataStore');
const { requireAdmin } = require('../middleware/auth');
const { JOURS } = require('../jours');
const { SALLES } = require('../salles');
const { getFormations } = require('../planning');
const { todayISO, resolveAttributionPourJour } = require('../resolveSalle');

router.use(requireAdmin);

// ---------- Salles ----------
// Liste fixe (A, B, D, E, Studio) : pas de création/modification/suppression.

router.get('/salles', (req, res) => {
  res.json(SALLES);
});

// ---------- Classes ----------
// Dérivées du planning de l'école (public/planning-ecole.json) : pas de
// création/modification/suppression, seule l'attribution de salle est gérée.

router.get('/classes', async (req, res) => {
  const attributions = await store.findAll('attributions');
  const salleById = new Map(SALLES.map((s) => [s.id, s]));
  const dateRefISO = todayISO();

  const enriched = getFormations().map((nom) => {
    const defautActuel = resolveAttributionPourJour(attributions, nom, dateRefISO, null);

    const nbSurchargesActives = JOURS.filter((jour) => {
      const resolved = resolveAttributionPourJour(attributions, nom, dateRefISO, jour);
      return resolved && resolved.jourSemaine === jour;
    }).length;

    const prochainChangement = attributions
      .filter((a) => a.classeId === nom && a.dateDebut > dateRefISO)
      .sort((a, b) => (a.dateDebut < b.dateDebut ? -1 : 1))[0] || null;

    return {
      id: nom,
      nom,
      salleParDefaut: defautActuel ? salleById.get(defautActuel.salleId)?.nom || null : null,
      nbSurchargesActives,
      changementProgramme: prochainChangement
        ? {
            dateDebut: prochainChangement.dateDebut,
            jourSemaine: prochainChangement.jourSemaine,
            salle: salleById.get(prochainChangement.salleId)?.nom || null,
          }
        : null,
    };
  });
  res.json(enriched);
});

// ---------- Attributions ----------

// Détail des attributions d'une classe : ce qui est actuellement en
// vigueur (défaut + éventuelles surcharges par jour), et les changements
// programmés pour une date future (pas encore appliqués).
router.get('/classes/:id/attributions', async (req, res) => {
  const classeId = req.params.id;
  if (!getFormations().includes(classeId)) {
    return res.status(404).json({ error: 'Classe introuvable' });
  }

  const attributions = await store.findAll('attributions');
  const salleById = new Map(SALLES.map((s) => [s.id, s]));
  const dateRefISO = todayISO();

  const toRow = (a) =>
    a && {
      id: a.id,
      salleId: a.salleId,
      salle: salleById.get(a.salleId)?.nom || null,
      dateDebut: a.dateDebut,
    };

  const defaut = toRow(resolveAttributionPourJour(attributions, classeId, dateRefISO, null));

  const parJour = JOURS.map((jour) => {
    const resolved = resolveAttributionPourJour(attributions, classeId, dateRefISO, jour);
    return {
      jour,
      estSurcharge: !!resolved && resolved.jourSemaine === jour,
      ...toRow(resolved),
    };
  });

  const planifiees = attributions
    .filter((a) => a.classeId === classeId && a.dateDebut > dateRefISO)
    .sort((a, b) => (a.dateDebut < b.dateDebut ? -1 : 1))
    .map((a) => ({
      id: a.id,
      jourSemaine: a.jourSemaine,
      salleId: a.salleId,
      salle: salleById.get(a.salleId)?.nom || null,
      dateDebut: a.dateDebut,
    }));

  res.json({ defaut, parJour, planifiees, joursDisponibles: JOURS, aujourdhui: dateRefISO });
});

// Programme une salle pour une classe à partir d'une date donnée :
// jour_semaine = null (défaut, toute la semaine) ou un jour précis
// ('lundi'..'vendredi') pour une surcharge. On ne supprime jamais les
// attributions passées : une nouvelle attribution avec une date_debut plus
// récente vient simplement remplacer la précédente à partir de cette date.
router.put('/classes/:id/attribution', async (req, res) => {
  const classeId = req.params.id;
  const { salle_id, jour_semaine, date_debut } = req.body || {};

  if (!getFormations().includes(classeId)) {
    return res.status(404).json({ error: 'Classe introuvable' });
  }

  const salle = SALLES.find((s) => s.id === salle_id);
  if (!salle) return res.status(400).json({ error: 'Salle introuvable' });

  const jour = jour_semaine || null;
  if (jour !== null && !JOURS.includes(jour)) {
    return res.status(400).json({ error: 'Jour invalide' });
  }

  const dateDebut = date_debut || todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateDebut)) {
    return res.status(400).json({ error: "Date d'entrée en vigueur invalide" });
  }

  const attributions = await store.findAll('attributions');
  const existante = attributions.find(
    (a) => a.classeId === classeId && a.jourSemaine === jour && a.dateDebut === dateDebut
  );

  if (existante) {
    await store.update('attributions', existante.id, { salleId: salle.id });
  } else {
    await store.insert('attributions', { classeId, salleId: salle.id, jourSemaine: jour, dateDebut });
  }

  res.json({ ok: true });
});

// Supprime une attribution (en vigueur ou programmée pour le futur). Si
// c'était l'attribution actuellement en vigueur, la classe retombe sur la
// précédente attribution valide (défaut ou surcharge de jour), s'il y en a
// une, sinon elle n'a plus de salle.
router.delete('/attributions/:attribId', async (req, res) => {
  const attribution = await store.findById('attributions', req.params.attribId);
  if (!attribution) return res.status(404).json({ error: 'Attribution introuvable' });

  await store.remove('attributions', attribution.id);
  res.json({ ok: true });
});

module.exports = router;
