require('dotenv').config();
const store = require('./dataStore');
const { getFormations } = require('./planning');

// data.json (attributions uniquement) est créé automatiquement (structure
// vide) au premier accès par dataStore. Les classes viennent du planning de
// l'école et les salles sont une liste fixe (src/salles.js) : ce script sert
// de point d'entrée explicite (npm run init-data) et peut semer quelques
// attributions de démonstration si l'option --seed est passée.

async function seed() {
  const data = await store.readData();

  if (data.attributions.length) {
    console.log('data.json contient déjà des attributions, seed ignoré.');
    return;
  }

  const [formation1, formation2] = getFormations();
  if (!formation1) {
    console.log('Aucune formation trouvée dans public/planning-ecole.json, seed ignoré.');
    return;
  }

  await store.insert('attributions', { classeId: formation1, salleId: 'A', jourSemaine: null });
  if (formation2) {
    await store.insert('attributions', { classeId: formation2, salleId: 'B', jourSemaine: null });
    await store.insert('attributions', { classeId: formation2, salleId: 'Studio', jourSemaine: 'mardi' });
  }

  console.log('data.json initialisé avec des attributions de démonstration.');
}

async function main() {
  if (process.argv.includes('--seed')) {
    await seed();
  } else {
    await store.readData(); // crée data.json (structure vide) si nécessaire
    console.log('data.json prêt (structure vide créée si nécessaire). Utilisez --seed pour ajouter des attributions de démo.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
