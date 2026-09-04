const express = require('express');
const router = express.Router();
const { SALLES } = require('../salles');
const { getFormations, getFormationsAvecCoursAujourdhui } = require('../planning');
const { resolveSallePourSemaine } = require('../resolveSalle');

// Liste des classes pour la page publique (sélection) : uniquement les
// formations qui ont cours aujourd'hui, selon public/planning-ecole.json.
router.get('/classes', (req, res) => {
  const classes = getFormationsAvecCoursAujourdhui().map((nom) => ({ id: nom, nom }));
  res.json(classes);
});

// Salle(s) d'une classe, telle qu'actuellement en vigueur (jamais une
// attribution programmée pour le futur) : détail par jour si la salle
// change selon le jour, sinon une salle unique valable toute la semaine.
router.get('/classes/:id/salle', async (req, res) => {
  const classeId = req.params.id;
  if (!getFormations().includes(classeId)) {
    return res.status(404).json({ error: 'Classe introuvable' });
  }

  const salleById = new Map(SALLES.map((s) => [s.id, s]));
  const semaine = await resolveSallePourSemaine(classeId);
  const salleNom = (attribution) => (attribution ? salleById.get(attribution.salleId)?.nom || null : null);

  const salleIds = semaine.map((j) => j.attribution?.salleId || null);
  const uniforme = salleIds.every((id) => id === salleIds[0]);

  if (uniforme) {
    return res.json({
      classe: classeId,
      uniforme: true,
      salle: salleNom(semaine[0].attribution),
    });
  }

  res.json({
    classe: classeId,
    uniforme: false,
    parJour: semaine.map((j) => ({ jour: j.jour, salle: salleNom(j.attribution) })),
  });
});

module.exports = router;
