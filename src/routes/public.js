const express = require('express');
const router = express.Router();
const store = require('../dataStore');
const { JOURS } = require('../jours');
const { SALLES } = require('../salles');
const { getFormations, getFormationsAvecCoursAujourdhui } = require('../planning');

// Liste des classes pour la page publique (sélection) : uniquement les
// formations qui ont cours aujourd'hui, selon public/planning-ecole.json.
router.get('/classes', (req, res) => {
  const classes = getFormationsAvecCoursAujourdhui().map((nom) => ({ id: nom, nom }));
  res.json(classes);
});

// Salle(s) d'une classe : détail par jour si des surcharges existent,
// sinon une salle unique valable toute la semaine.
router.get('/classes/:id/salle', async (req, res) => {
  const classeId = req.params.id;
  if (!getFormations().includes(classeId)) {
    return res.status(404).json({ error: 'Classe introuvable' });
  }

  const attributions = await store.findAll('attributions');
  const salleById = new Map(SALLES.map((s) => [s.id, s]));

  const classeAttributions = attributions
    .filter((a) => a.classeId === classeId)
    .map((a) => ({ jour: a.jourSemaine, salle: salleById.get(a.salleId)?.nom || null }));

  const defaut = classeAttributions.find((a) => a.jour === null) || null;
  const surcharges = classeAttributions.filter((a) => a.jour !== null);

  if (surcharges.length === 0) {
    return res.json({
      classe: classeId,
      uniforme: true,
      salle: defaut ? defaut.salle : null,
    });
  }

  const parJour = JOURS.map((jour) => {
    const surcharge = surcharges.find((s) => s.jour === jour);
    const salle = surcharge ? surcharge.salle : (defaut ? defaut.salle : null);
    return { jour, salle };
  });

  res.json({
    classe: classeId,
    uniforme: false,
    parJour,
  });
});

module.exports = router;
