const express = require('express');
const router = express.Router();
const store = require('../dataStore');
const { requireAdmin } = require('../middleware/auth');
const { JOURS } = require('../jours');
const { SALLES } = require('../salles');
const { getFormations } = require('../planning');

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

  const enriched = getFormations().map((nom) => {
    const defaut = attributions.find((a) => a.classeId === nom && a.jourSemaine === null);
    const nbSurcharges = attributions.filter((a) => a.classeId === nom && a.jourSemaine !== null).length;
    return {
      id: nom,
      nom,
      salleParDefaut: defaut ? salleById.get(defaut.salleId)?.nom || null : null,
      nbSurcharges,
    };
  });
  res.json(enriched);
});

// ---------- Attributions ----------

// Détail des attributions d'une classe (défaut + surcharges par jour)
router.get('/classes/:id/attributions', async (req, res) => {
  const classeId = req.params.id;
  if (!getFormations().includes(classeId)) {
    return res.status(404).json({ error: 'Classe introuvable' });
  }

  const attributions = await store.findAll('attributions');
  const salleById = new Map(SALLES.map((s) => [s.id, s]));

  const rows = attributions
    .filter((a) => a.classeId === classeId)
    .map((a) => ({ jour: a.jourSemaine, salleId: a.salleId, salle: salleById.get(a.salleId)?.nom || null }));

  res.json({
    defaut: rows.find((r) => r.jour === null) || null,
    surcharges: rows.filter((r) => r.jour !== null),
    joursDisponibles: JOURS,
  });
});

// Assigne une salle à une classe : jour_semaine = null (défaut, toute la semaine)
// ou un jour précis ('lundi'..'vendredi') pour une surcharge ponctuelle.
router.put('/classes/:id/attribution', async (req, res) => {
  const classeId = req.params.id;
  const { salle_id, jour_semaine } = req.body || {};

  if (!getFormations().includes(classeId)) {
    return res.status(404).json({ error: 'Classe introuvable' });
  }

  const salle = SALLES.find((s) => s.id === salle_id);
  if (!salle) return res.status(400).json({ error: 'Salle introuvable' });

  const jour = jour_semaine || null;
  if (jour !== null && !JOURS.includes(jour)) {
    return res.status(400).json({ error: 'Jour invalide' });
  }

  await store.removeWhere('attributions', (a) => a.classeId === classeId && a.jourSemaine === jour);
  await store.insert('attributions', { classeId, salleId: salle.id, jourSemaine: jour });

  res.json({ ok: true });
});

// Supprime une attribution (retire le défaut, ou retire une surcharge de jour)
router.delete('/classes/:id/attribution', async (req, res) => {
  const classeId = req.params.id;
  const jour = req.query.jour || null;

  const removed = await store.removeWhere('attributions', (a) => a.classeId === classeId && a.jourSemaine === jour);

  if (removed === 0) return res.status(404).json({ error: 'Attribution introuvable' });
  res.json({ ok: true });
});

module.exports = router;
