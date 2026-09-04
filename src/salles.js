// Salles physiques de l'école : liste fixe, pas de gestion CRUD.
const SALLES = ['A', 'B', 'D', 'E', 'Studio'].map((nom) => ({ id: nom, nom }));

module.exports = { SALLES };
